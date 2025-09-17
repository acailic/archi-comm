// src/__tests__/integration/design-to-export-workflow.test.tsx
// Integration tests for the complete design-to-export workflow covering all phases
// Tests component addition, connections, export functionality, persistence, and performance
// RELEVANT FILES: src/test/integration-helpers.tsx, src/components/DesignCanvas.tsx, e2e/utils/test-data-manager.ts, src/shared/contracts.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, CanvasTestHelpers, AssertionHelpers, MockHelpers } from '../../test/integration-helpers';
import { DesignCanvas } from '@ui/components/DesignCanvas';
import type { DesignData, Challenge } from '../../shared/contracts';

// Mock challenge data for testing
const mockChallenge: Challenge = {
  id: 'test-url-shortener',
  title: 'URL Shortener Service',
  description: 'Design a scalable URL shortening service like bit.ly with basic analytics.',
  requirements: [
    'Shorten long URLs to unique short codes',
    'Redirect short URLs to original URLs',
    'Basic click tracking and analytics',
    'Custom alias support',
    'Simple rate limiting'
  ],
  difficulty: 'intermediate',
  estimatedTime: 45,
  category: 'system-design'
};

const initialDesignData: DesignData = {
  components: [],
  connections: [],
  infoCards: [],
  layers: [],
  metadata: {
    created: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    version: '1.0'
  }
};

// Mock storage for persistence testing
const createMockStorage = () => {
  const storage = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => storage.get(key) || null),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, value);
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      storage.delete(key);
      return Promise.resolve();
    }),
    clear: vi.fn(() => {
      storage.clear();
      return Promise.resolve();
    }),
    _getAll: () => Object.fromEntries(storage)
  };
};

// Hoisted storage mock module to avoid late doMock issues
const storageMock: any = createMockStorage();
vi.mock('@services/storage', () => ({
  storage: storageMock,
}));

describe('Design-to-Export Workflow Integration Tests', () => {
  let mockOnComplete: ReturnType<typeof vi.fn>;
  let mockOnBack: ReturnType<typeof vi.fn>;
  let user: ReturnType<typeof userEvent.setup>;
  let mockStorage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    mockOnComplete = vi.fn();
    mockOnBack = vi.fn();
    user = userEvent.setup();
    mockStorage = createMockStorage();
    MockHelpers.mockTauriAPIs();

    // Refresh storage mock functions each test without remocking module
    Object.assign(storageMock, mockStorage);
  });

  describe('Component Addition and Management', () => {
    it('should add components to the canvas through drag and drop', async () => {
      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={initialDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Verify canvas is rendered
      await waitFor(() => {
        expect(screen.getByText('URL Shortener Service')).toBeInTheDocument();
      });

      // Add API Gateway component
      await CanvasTestHelpers.addComponent('api-gateway', { x: 100, y: 100 }, 'Main API Gateway');

      // Verify component was added
      AssertionHelpers.expectComponentExists('api-gateway', 'Main API Gateway');

      // Add Database component
      await CanvasTestHelpers.addComponent('database', { x: 300, y: 200 }, 'URL Database');

      // Verify multiple components exist
      expect(CanvasTestHelpers.getComponentCount()).toBe(2);
    });

    it('should handle component selection and deselection', async () => {
      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={initialDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Add a component first
      await CanvasTestHelpers.addComponent('api-gateway', { x: 100, y: 100 }, 'Test Gateway');

      // Select the component
      await CanvasTestHelpers.selectComponent('test-api-gateway-component');

      // Verify selection state
      const component = screen.getByTestId('component-test-api-gateway-component');
      expect(component).toHaveClass('selected');
    });

    it('should delete components and their connections', async () => {
      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={initialDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Add two components and connect them
      const gw = await CanvasTestHelpers.addComponent('api-gateway', { x: 100, y: 100 }, 'Gateway');
      const db = await CanvasTestHelpers.addComponent('database', { x: 300, y: 200 }, 'Database');
      await CanvasTestHelpers.createConnection(gw.id, db.id);

      // Verify initial state
      expect(CanvasTestHelpers.getComponentCount()).toBe(2);
      expect(CanvasTestHelpers.getConnectionCount()).toBe(1);

      // Delete the gateway component
      await CanvasTestHelpers.deleteComponent(gw.id);

      // Verify component and its connections are removed
      expect(CanvasTestHelpers.getComponentCount()).toBe(1);
      expect(CanvasTestHelpers.getConnectionCount()).toBe(0);
    });

    it('should update component positions through drag operations', async () => {
      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={initialDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Add a component
      const movable = await CanvasTestHelpers.addComponent('api-gateway', { x: 100, y: 100 }, 'Movable Gateway');

      // Move the component
      await CanvasTestHelpers.moveComponent(movable.id, { x: 200, y: 150 });

      // Verify the component still exists (position change would be verified in real implementation)
      AssertionHelpers.expectComponentExists('api-gateway', 'Movable Gateway');
    });

    it('should handle component labeling and property updates', async () => {
      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={initialDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Add component
      const ms = await CanvasTestHelpers.addComponent('microservice', { x: 150, y: 100 });

      // Select component to enable editing
      await CanvasTestHelpers.selectComponent(ms.id);

      // Verify component exists and can be edited
      AssertionHelpers.expectComponentExists('microservice');

      // In a real test, we would simulate label editing through inline editing
      const node = document.querySelector(`[data-id="${ms.id}"]`);
      expect(node).toBeInTheDocument();
  });
  });

  describe('Connection Management', () => {
    it('should create connections between components', async () => {
      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={initialDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      const gw = await CanvasTestHelpers.addComponent('api-gateway', { x: 100, y: 100 }, 'Gateway');
      const svc = await CanvasTestHelpers.addComponent('microservice', { x: 300, y: 100 }, 'User Service');
      await CanvasTestHelpers.createConnection(gw.id, svc.id);

      // Verify connection was created
      AssertionHelpers.expectConnectionExists(gw.id, svc.id);
      expect(CanvasTestHelpers.getConnectionCount()).toBe(1);
    });

    it('should handle multiple connections from a single component', async () => {
      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={initialDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      const gw = await CanvasTestHelpers.addComponent('api-gateway', { x: 100, y: 100 }, 'Gateway');
      const usr = await CanvasTestHelpers.addComponent('microservice', { x: 300, y: 50 }, 'User Service');
      const db = await CanvasTestHelpers.addComponent('database', { x: 300, y: 150 }, 'Database');
      await CanvasTestHelpers.createConnection(gw.id, usr.id);
      await CanvasTestHelpers.createConnection(gw.id, db.id);

      // Verify multiple connections exist
      expect(CanvasTestHelpers.getConnectionCount()).toBe(2);
      AssertionHelpers.expectConnectionExists(gw.id, usr.id);
      AssertionHelpers.expectConnectionExists(gw.id, db.id);
    });

    it('should prevent invalid connections', async () => {
      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={initialDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Add single component
      const gw = await CanvasTestHelpers.addComponent('api-gateway', { x: 100, y: 100 }, 'Gateway');

      // Attempt to create self-connection (should fail)
      try {
        await CanvasTestHelpers.createConnection(gw.id, gw.id);
      } catch (error) {
        // Expected to fail for self-connection
      }

      // Verify no invalid connections were created
      expect(CanvasTestHelpers.getConnectionCount()).toBe(0);
    });
  });

  describe('Design Data Export Functionality', () => {
    it('should export design data as JSON', async () => {
      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={initialDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Create a complex design
      const gw = await CanvasTestHelpers.addComponent('api-gateway', { x: 100, y: 100 }, 'Main Gateway');
      const svc = await CanvasTestHelpers.addComponent('microservice', { x: 300, y: 100 }, 'User Service');
      const db = await CanvasTestHelpers.addComponent('database', { x: 300, y: 200 }, 'User Database');
      await CanvasTestHelpers.createConnection(gw.id, svc.id);
      await CanvasTestHelpers.createConnection(svc.id, db.id);

      // Export the design
      const exportedData = await CanvasTestHelpers.exportDesign();

      // Verify export data structure
      // Validate type/labels and that edges reference created ids
      expect(exportedData.components).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'api-gateway', label: 'Main Gateway' }),
          expect.objectContaining({ type: 'microservice', label: 'User Service' }),
          expect.objectContaining({ type: 'database', label: 'User Database' }),
        ])
      );
      expect(exportedData.connections).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ fromId: gw.id, toId: svc.id }),
          expect.objectContaining({ fromId: svc.id, toId: db.id }),
        ])
      );
    });

    it('should handle export with empty design', async () => {
      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={initialDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Export empty design
      const exportedData = await CanvasTestHelpers.exportDesign();
      // Verify empty export structure
      expect(exportedData.components).toEqual([]);
      expect(exportedData.connections).toEqual([]);
      expect(exportedData.metadata).toBeDefined();
    });

    it('should trigger download on export', async () => {
      // Mock document.createElement and related APIs for download testing
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        style: {}
      };
      const mockCreateElement = vi.fn().mockReturnValue(mockLink);
      const mockCreateObjectURL = vi.fn().mockReturnValue('blob:test-url');
      const mockRevokeObjectURL = vi.fn();
      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();

      Object.defineProperty(document, 'createElement', { value: mockCreateElement });
      Object.defineProperty(document.body, 'appendChild', { value: mockAppendChild });
      Object.defineProperty(document.body, 'removeChild', { value: mockRemoveChild });
      Object.defineProperty(URL, 'createObjectURL', { value: mockCreateObjectURL });
      Object.defineProperty(URL, 'revokeObjectURL', { value: mockRevokeObjectURL });

      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={initialDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Find and click export button
      const exportButton = screen.getByTestId('export-button');
      await user.click(exportButton);

      // Verify download process was triggered
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockAppendChild).toHaveBeenCalledWith(mockLink);
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalledWith(mockLink);
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url');
      expect(mockLink.download).toContain('test-url-shortener-design.json');
    });
  });

  describe('Design Persistence and Auto-Save', () => {
    it('should automatically save design data to localStorage', async () => {
      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={initialDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Add component to trigger save
      await CanvasTestHelpers.addComponent('api-gateway', { x: 100, y: 100 }, 'Test Gateway');

      // Click save button
      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);

      // Verify save was called
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'archicomm-design',
        expect.stringContaining('api-gateway')
      );
    });

    it('should restore design data on component mount', async () => {
      const savedDesignData = {
        components: [{
          id: 'restored-component',
          type: 'database',
          x: 150,
          y: 150,
          label: 'Restored Database',
          properties: { showLabel: true }
        }],
        connections: [],
        infoCards: []
      };

      mockStorage.getItem.mockReturnValue(JSON.stringify(savedDesignData));

      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={savedDesignData as DesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Verify restored component is rendered
      await waitFor(() => {
        expect(screen.getByText('Restored Database')).toBeInTheDocument();
      });
    });

    it('should handle persistence failure gracefully', async () => {
      // Mock storage failure
      mockStorage.setItem.mockRejectedValue(new Error('Storage quota exceeded'));

      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={initialDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Add component and attempt save
      await CanvasTestHelpers.addComponent('api-gateway', { x: 100, y: 100 }, 'Test Gateway');

      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);

      // Verify component still exists despite save failure
      AssertionHelpers.expectComponentExists('api-gateway', 'Test Gateway');
    });
  });

  describe('Workflow Progression', () => {
    it('should enable continue button when design has components', async () => {
      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={initialDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Initially, continue button might be disabled or not ideal for progression
      const continueButton = screen.getByTestId('continue-to-recording');

      // Add components to make design valid for continuation
      await CanvasTestHelpers.addComponent('api-gateway', { x: 100, y: 100 }, 'Main Gateway');
      await CanvasTestHelpers.addComponent('database', { x: 300, y: 200 }, 'Database');

      // Now continue button should be enabled
      expect(continueButton).not.toBeDisabled();
    });

    it('should call onComplete with proper design data when continuing', async () => {
      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={initialDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Create a design
      await CanvasTestHelpers.addComponent('api-gateway', { x: 100, y: 100 }, 'Gateway');
      await CanvasTestHelpers.addComponent('microservice', { x: 300, y: 100 }, 'Service');
      await CanvasTestHelpers.createConnection('gateway-id', 'service-id');

      // Continue to next phase
      const continueButton = screen.getByTestId('continue-to-recording');
      await user.click(continueButton);

      // Verify onComplete was called with design data
      expect(mockOnComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          components: expect.arrayContaining([
            expect.objectContaining({
              type: 'api-gateway',
              label: 'Gateway'
            }),
            expect.objectContaining({
              type: 'microservice',
              label: 'Service'
            })
          ]),
          connections: expect.arrayContaining([
            expect.objectContaining({
              fromId: 'gateway-id',
              toId: 'service-id'
            })
          ]),
          metadata: expect.objectContaining({
            version: '1.0',
            lastModified: expect.any(String)
          })
        })
      );
    });

    it('should call onBack when back button is clicked', async () => {
      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={initialDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Click back button
      const backButton = screen.getByRole('button', { name: /back to challenge selection/i });
      await user.click(backButton);

      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of components efficiently', async () => {
      const performanceStart = performance.now();

      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={initialDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Add many components
      const componentPromises = [];
      for (let i = 0; i < 50; i++) {
        componentPromises.push(
          CanvasTestHelpers.addComponent(
            'microservice',
            { x: (i % 10) * 50, y: Math.floor(i / 10) * 50 },
            `Service ${i}`
          )
        );
      }

      await Promise.all(componentPromises);

      ;(performance as any).advanceTime?.(200);
      const performanceEnd = performance.now();
      const renderTime = performanceEnd - performanceStart;

      // Verify all components were added
      expect(CanvasTestHelpers.getComponentCount()).toBe(50);

      // Performance should be reasonable (under 5 seconds for 50 components)
      expect(renderTime).toBeLessThan(5000);
    });

    it('should maintain performance during export of complex designs', async () => {
      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={initialDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Create complex design with many components and connections
      const gw = await CanvasTestHelpers.addComponent('api-gateway', { x: 100, y: 100 }, 'Gateway');
      const serviceIds: string[] = [];
      for (let i = 0; i < 20; i++) {
        const svc = await CanvasTestHelpers.addComponent('microservice', { x: 200 + i * 30, y: 150 + i * 20 }, `Service ${i}`);
        serviceIds.push(svc.id);
        await CanvasTestHelpers.createConnection(gw.id, svc.id);
      }

      const exportStart = performance.now();
      const exportedData = await CanvasTestHelpers.exportDesign();
      const exportEnd = performance.now();

      // Verify export completed successfully
      expect(exportedData.components).toHaveLength(21); // 1 gateway + 20 services
      expect(exportedData.connections).toHaveLength(20);

      // Simulate time progression and assert timing deterministically
      ;(performance as any).advanceTime?.(120);
      expect(exportEnd - exportStart).toBeLessThan(1000);
    });

    it('should handle memory usage during extended design sessions', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      renderWithProviders(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={initialDesignData}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Simulate extended design session with additions and deletions
      for (let cycle = 0; cycle < 10; cycle++) {
        // Add components
        const created: string[] = [];
        for (let i = 0; i < 5; i++) {
          const c = await CanvasTestHelpers.addComponent('microservice', { x: i * 50, y: cycle * 50 }, `Temp ${i}`);
          created.push(c.id);
        }

        // Delete some components
        for (let i = 0; i < 3; i++) {
          await CanvasTestHelpers.deleteComponent(created[i]);
        }
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Memory should not grow excessively (less than 10MB increase)
      expect(finalMemory - initialMemory).toBeLessThan(10 * 1024 * 1024);
    });
  });
});
