/**
 * src/__tests__/design-comparison.test.ts
 * Unit tests for the design comparison utility that validates user solutions against templates
 * Tests component matching, connection validation, scoring, and edge cases
 * RELEVANT FILES: src/lib/design/design-comparison.ts, src/shared/contracts/index.ts, src/lib/config/challenge-config.ts
 */

import { compareDesigns } from '../lib/design/design-comparison';
import type { ArchitectureTemplate } from '../lib/config/challenge-config';
import type { DesignData } from '@/shared/contracts';

describe('Design Comparison', () => {
  // Mock template for testing
  const mockTemplate: ArchitectureTemplate = {
    name: 'Test Template',
    description: 'Template for testing',
    components: [
      {
        type: 'api-gateway',
        label: 'API Gateway',
        description: 'Main gateway',
        position: { x: 100, y: 100 }
      },
      {
        type: 'server',
        label: 'Web Server',
        description: 'Web server',
        position: { x: 200, y: 100 }
      },
      {
        type: 'database',
        label: 'Primary DB',
        description: 'Main database',
        position: { x: 300, y: 100 }
      },
      {
        type: 'cache',
        label: 'Redis Cache',
        description: 'Cache layer',
        position: { x: 200, y: 200 }
      }
    ],
    connections: [
      {
        from: 'API Gateway',
        to: 'Web Server',
        label: 'HTTP',
        type: 'sync',
        description: 'API requests'
      },
      {
        from: 'Web Server',
        to: 'Primary DB',
        label: 'Query',
        type: 'sync',
        description: 'Database queries'
      },
      {
        from: 'Web Server',
        to: 'Redis Cache',
        label: 'Cache',
        type: 'sync',
        description: 'Cache operations'
      }
    ]
  };

  // Mock perfect user design that matches template exactly
  const perfectUserDesign: DesignData = {
    components: [
      {
        id: 'comp1',
        type: 'api-gateway',
        label: 'API Gateway',
        x: 150,
        y: 150,
        description: 'User API gateway'
      },
      {
        id: 'comp2',
        type: 'server',
        label: 'Web Server',
        x: 250,
        y: 150,
        description: 'User web server'
      },
      {
        id: 'comp3',
        type: 'database',
        label: 'Primary DB',
        x: 350,
        y: 150,
        description: 'User database'
      },
      {
        id: 'comp4',
        type: 'cache',
        label: 'Redis Cache',
        x: 250,
        y: 250,
        description: 'User cache'
      }
    ],
    connections: [
      {
        id: 'conn1',
        from: 'comp1',
        to: 'comp2',
        label: 'HTTP',
        type: 'sync'
      },
      {
        id: 'conn2',
        from: 'comp2',
        to: 'comp3',
        label: 'Query',
        type: 'sync'
      },
      {
        id: 'conn3',
        from: 'comp2',
        to: 'comp4',
        label: 'Cache',
        type: 'sync'
      }
    ],
    layers: [],
    metadata: {}
  };

  // Mock partial user design missing some components and connections
  const partialUserDesign: DesignData = {
    components: [
      {
        id: 'comp1',
        type: 'api-gateway',
        label: 'API Gateway',
        x: 150,
        y: 150,
        description: 'User API gateway'
      },
      {
        id: 'comp2',
        type: 'server',
        label: 'Web Server',
        x: 250,
        y: 150,
        description: 'User web server'
      },
      {
        id: 'comp3',
        type: 'database',
        label: 'Primary DB',
        x: 350,
        y: 150,
        description: 'User database'
      }
      // Missing Redis Cache
    ],
    connections: [
      {
        id: 'conn1',
        from: 'comp1',
        to: 'comp2',
        label: 'HTTP',
        type: 'sync'
      }
      // Missing other connections
    ],
    layers: [],
    metadata: {}
  };

  // Mock user design with extra components
  const userDesignWithExtras: DesignData = {
    components: [
      ...perfectUserDesign.components,
      {
        id: 'comp5',
        type: 'load-balancer',
        label: 'Load Balancer',
        x: 50,
        y: 150,
        description: 'Extra load balancer'
      }
    ],
    connections: perfectUserDesign.connections,
    layers: [],
    metadata: {}
  };

  describe('Perfect Match', () => {
    it('should return 100% score for perfect match', () => {
      const result = compareDesigns(perfectUserDesign, mockTemplate);

      expect(result.percentage).toBe(100);
      expect(result.componentMatches).toHaveLength(4);
      expect(result.componentMatches.every(match => match.matched)).toBe(true);
      expect(result.connectionMatches).toHaveLength(3);
      expect(result.connectionMatches.every(match => match.found)).toBe(true);
      expect(result.missingComponents).toHaveLength(0);
      expect(result.extraComponents).toHaveLength(0);
      expect(result.incorrectConnections).toHaveLength(0);
    });

    it('should have correct score calculation for perfect match', () => {
      const result = compareDesigns(perfectUserDesign, mockTemplate);

      // 4 components * 10 points + 3 connections * 5 points = 55 points
      expect(result.score).toBe(55);
      expect(result.maxScore).toBe(55);
    });

    it('should generate positive feedback for perfect match', () => {
      const result = compareDesigns(perfectUserDesign, mockTemplate);

      expect(result.feedback).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('Great job')
        })
      );
    });
  });

  describe('Partial Match', () => {
    it('should handle missing components correctly', () => {
      const result = compareDesigns(partialUserDesign, mockTemplate);

      expect(result.percentage).toBeLessThan(100);
      expect(result.missingComponents).toContain('Redis Cache');
      expect(result.componentMatches.filter(m => !m.matched)).toHaveLength(1);
    });

    it('should handle missing connections correctly', () => {
      const result = compareDesigns(partialUserDesign, mockTemplate);

      expect(result.connectionMatches.filter(m => !m.found)).toHaveLength(2);
      expect(result.incorrectConnections).toContain('Web Server → Primary DB');
      expect(result.incorrectConnections).toContain('Web Server → Redis Cache');
    });

    it('should apply penalty for missing components', () => {
      const result = compareDesigns(partialUserDesign, mockTemplate);

      // 3 matched components * 10 - 1 missing * 5 + 1 connection * 5 = 30 points
      expect(result.score).toBe(30);
      expect(result.maxScore).toBe(55);
    });

    it('should provide helpful feedback for missing elements', () => {
      const result = compareDesigns(partialUserDesign, mockTemplate);

      expect(result.feedback).toContainEqual(
        expect.objectContaining({
          category: 'component',
          type: 'missing',
          message: expect.stringContaining('Redis Cache')
        })
      );
    });
  });

  describe('Design with Extra Components', () => {
    it('should identify extra components', () => {
      const result = compareDesigns(userDesignWithExtras, mockTemplate);

      expect(result.extraComponents).toContain('Load Balancer');
      expect(result.extraComponents).toHaveLength(1);
    });

    it('should still score well with extra components', () => {
      const result = compareDesigns(userDesignWithExtras, mockTemplate);

      // Extra components don't reduce score, only missing components do
      expect(result.score).toBe(55);
      expect(result.percentage).toBe(100);
    });
  });

  describe('Component Matching Logic', () => {
    it('should match components with exact label match (case insensitive)', () => {
      const userDesign: DesignData = {
        components: [
          {
            id: 'comp1',
            type: 'api-gateway',
            label: 'api gateway', // lowercase
            x: 100,
            y: 100
          }
        ],
        connections: [],
        layers: [],
        metadata: {}
      };

      const template: ArchitectureTemplate = {
        name: 'Test',
        description: 'Test',
        components: [
          {
            type: 'api-gateway',
            label: 'API Gateway', // uppercase
            description: 'Test gateway'
          }
        ],
        connections: []
      };

      const result = compareDesigns(userDesign, template);
      expect(result.componentMatches[0].matched).toBe(true);
    });

    it('should match components by type when labels differ', () => {
      const userDesign: DesignData = {
        components: [
          {
            id: 'comp1',
            type: 'database',
            label: 'User Database',
            x: 100,
            y: 100
          }
        ],
        connections: [],
        layers: [],
        metadata: {}
      };

      const template: ArchitectureTemplate = {
        name: 'Test',
        description: 'Test',
        components: [
          {
            type: 'database',
            label: 'Primary DB',
            description: 'Main database'
          }
        ],
        connections: []
      };

      const result = compareDesigns(userDesign, template);
      expect(result.componentMatches[0].matched).toBe(true);
    });

    it('should normalize component types correctly', () => {
      const userDesign: DesignData = {
        components: [
          {
            id: 'comp1',
            type: 'service', // Should match 'server'
            label: 'My Service',
            x: 100,
            y: 100
          }
        ],
        connections: [],
        layers: [],
        metadata: {}
      };

      const template: ArchitectureTemplate = {
        name: 'Test',
        description: 'Test',
        components: [
          {
            type: 'server',
            label: 'Web Server',
            description: 'Main server'
          }
        ],
        connections: []
      };

      const result = compareDesigns(userDesign, template);
      expect(result.componentMatches[0].matched).toBe(true);
    });
  });

  describe('Connection Matching Logic', () => {
    it('should match bidirectional connections', () => {
      const userDesign: DesignData = {
        components: [
          { id: 'comp1', type: 'server', label: 'Server A', x: 100, y: 100 },
          { id: 'comp2', type: 'server', label: 'Server B', x: 200, y: 100 }
        ],
        connections: [
          // User has connection from B to A
          { id: 'conn1', from: 'comp2', to: 'comp1', label: 'API', type: 'sync' }
        ],
        layers: [],
        metadata: {}
      };

      const template: ArchitectureTemplate = {
        name: 'Test',
        description: 'Test',
        components: [
          { type: 'server', label: 'Server A', description: 'First server' },
          { type: 'server', label: 'Server B', description: 'Second server' }
        ],
        connections: [
          // Template has connection from A to B
          { from: 'Server A', to: 'Server B', label: 'API', type: 'sync' }
        ]
      };

      const result = compareDesigns(userDesign, template);
      expect(result.connectionMatches[0].found).toBe(true);
    });

    it('should match connections when user labels differ but IDs connect correctly', () => {
      const userDesign: DesignData = {
        components: [
          { id: 'gateway-1', type: 'api-gateway', label: 'User Gateway', x: 100, y: 100 },
          { id: 'server-1', type: 'server', label: 'User Server', x: 200, y: 100 }
        ],
        connections: [
          // User has connection using IDs (different labels than template)
          { id: 'conn1', from: 'gateway-1', to: 'server-1', label: 'HTTP', type: 'sync' }
        ],
        layers: [],
        metadata: {}
      };

      const template: ArchitectureTemplate = {
        name: 'Test',
        description: 'Test',
        components: [
          { type: 'api-gateway', label: 'API Gateway', description: 'Main gateway' },
          { type: 'server', label: 'Web Server', description: 'Main server' }
        ],
        connections: [
          // Template has connection from API Gateway to Web Server
          { from: 'API Gateway', to: 'Web Server', label: 'HTTP', type: 'sync' }
        ]
      };

      const result = compareDesigns(userDesign, template);
      expect(result.connectionMatches[0].found).toBe(true);
      expect(result.componentMatches.every(match => match.matched)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty user design gracefully', () => {
      const emptyDesign: DesignData = {
        components: [],
        connections: [],
        layers: [],
        metadata: {}
      };

      const result = compareDesigns(emptyDesign, mockTemplate);

      expect(result.score).toBe(0);
      expect(result.percentage).toBe(0);
      expect(result.missingComponents).toHaveLength(4);
      expect(result.extraComponents).toHaveLength(0);
    });

    it('should handle null/undefined inputs', () => {
      const result = compareDesigns(null as any, mockTemplate);

      expect(result.score).toBe(0);
      expect(result.percentage).toBe(0);
      expect(result.feedback).toContainEqual(
        expect.objectContaining({
          message: 'No template available for comparison'
        })
      );
    });

    it('should handle empty template gracefully', () => {
      const emptyTemplate: ArchitectureTemplate = {
        name: 'Empty',
        description: 'Empty template',
        components: [],
        connections: []
      };

      const result = compareDesigns(perfectUserDesign, emptyTemplate);

      expect(result.score).toBe(0);
      expect(result.maxScore).toBe(0);
      expect(result.percentage).toBe(0);
    });

    it('should handle template without connections', () => {
      const templateNoConnections: ArchitectureTemplate = {
        name: 'Test',
        description: 'Template without connections',
        components: [
          {
            type: 'server',
            label: 'Single Server',
            description: 'Standalone server'
          }
        ],
        connections: []
      };

      const userDesign: DesignData = {
        components: [
          {
            id: 'comp1',
            type: 'server',
            label: 'Single Server',
            x: 100,
            y: 100
          }
        ],
        connections: [],
        layers: [],
        metadata: {}
      };

      const result = compareDesigns(userDesign, templateNoConnections);

      expect(result.score).toBe(10); // 1 component * 10 points
      expect(result.percentage).toBe(100);
    });
  });

  describe('Scoring Algorithm', () => {
    it('should calculate maximum possible score correctly', () => {
      const result = compareDesigns(perfectUserDesign, mockTemplate);

      // 4 components * 10 + 3 connections * 5 = 55
      expect(result.maxScore).toBe(55);
    });

    it('should never allow negative scores', () => {
      const userDesignManyMissing: DesignData = {
        components: [
          {
            id: 'comp1',
            type: 'server',
            label: 'Wrong Server',
            x: 100,
            y: 100
          }
        ],
        connections: [],
        layers: [],
        metadata: {}
      };

      const result = compareDesigns(userDesignManyMissing, mockTemplate);

      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should handle large templates efficiently', () => {
      const largeTemplate: ArchitectureTemplate = {
        name: 'Large Template',
        description: 'Template with many components',
        components: Array.from({ length: 50 }, (_, i) => ({
          type: 'server',
          label: `Server ${i}`,
          description: `Server number ${i}`
        })),
        connections: []
      };

      const userDesign: DesignData = {
        components: Array.from({ length: 25 }, (_, i) => ({
          id: `comp${i}`,
          type: 'server',
          label: `Server ${i}`,
          x: 100 + i * 50,
          y: 100
        })),
        connections: [],
        layers: [],
        metadata: {}
      };

      const startTime = Date.now();
      const result = compareDesigns(userDesign, largeTemplate);
      const endTime = Date.now();

      // Should complete within reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      expect(result.componentMatches).toHaveLength(50);
      expect(result.componentMatches.filter(m => m.matched)).toHaveLength(25);
    });
  });

  describe('Feedback Generation', () => {
    it('should provide specific feedback for missing components', () => {
      const result = compareDesigns(partialUserDesign, mockTemplate);

      const missingComponentFeedback = result.feedback.find(f =>
        f.category === 'component' && f.type === 'missing' && f.message.includes('Redis Cache')
      );

      expect(missingComponentFeedback).toBeDefined();
      expect(missingComponentFeedback?.suggestion).toContain('Consider adding');
    });

    it('should provide feedback for missing connections', () => {
      const result = compareDesigns(partialUserDesign, mockTemplate);

      const missingConnectionFeedback = result.feedback.filter(f =>
        f.category === 'connection' && f.type === 'missing'
      );

      expect(missingConnectionFeedback.length).toBeGreaterThan(0);
      expect(missingConnectionFeedback[0].suggestion).toContain('Review the data flow');
    });
  });
});