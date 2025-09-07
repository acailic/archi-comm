import { Challenge, DesignComponent, Connection } from '../App';

// Extended challenge interface with solution hints and templates
export interface ExtendedChallenge extends Challenge {
  solutionHints?: SolutionHint[];
  architectureTemplate?: ArchitectureTemplate;
  tags?: string[];
  prerequisites?: string[];
  learningObjectives?: string[];
  resources?: Resource[];
  variants?: ChallengeVariant[];
}

export interface SolutionHint {
  id: string;
  title: string;
  content: string;
  type: 'architecture' | 'scaling' | 'technology' | 'tradeoff' | 'optimization';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  triggered?: boolean; // For progressive hints
  triggerCondition?: string; // When to show this hint
}

export interface ArchitectureTemplate {
  name: string;
  description: string;
  components: TemplateComponent[];
  connections: TemplateConnection[];
  notes?: string[];
}

export interface TemplateComponent {
  type: DesignComponent['type'];
  label: string;
  description: string;
  position?: { x: number; y: number };
  properties?: Record<string, any>;
  isOptional?: boolean;
}

export interface TemplateConnection {
  from: string;
  to: string;
  label: string;
  type: Connection['type'];
  protocol?: string;
  description?: string;
}

export interface Resource {
  title: string;
  url: string;
  type: 'documentation' | 'tutorial' | 'case-study' | 'paper' | 'tool';
  description?: string;
}

export interface ChallengeVariant {
  id: string;
  name: string;
  description: string;
  additionalRequirements: string[];
  scalingFactor?: number;
  complexityModifier?: 'easier' | 'harder';
}

// Challenge categories with metadata
export interface ChallengeCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  prerequisites?: string[];
}

// Configuration for the entire challenge system
export interface ChallengeConfig {
  version: string;
  categories: ChallengeCategory[];
  challenges: ExtendedChallenge[];
  globalResources?: Resource[];
  settings?: {
    enableHints: boolean;
    enableTemplates: boolean;
    progressiveHints: boolean;
    autoSave: boolean;
    hintDelay: number; // seconds
  };
}

// Default challenge configuration
export const defaultChallengeConfig: ChallengeConfig = {
  version: '1.0.0',
  categories: [
    {
      id: 'system-design',
      name: 'System Design',
      description: 'Core system design patterns and architectures',
      icon: 'Target',
      color: 'blue',
    },
    {
      id: 'architecture',
      name: 'Architecture',
      description: 'Software architecture and design principles',
      icon: 'Database',
      color: 'purple',
    },
    {
      id: 'scaling',
      name: 'Scaling',
      description: 'Performance and scalability challenges',
      icon: 'TrendingUp',
      color: 'green',
    },
  ],
  challenges: [
    {
      id: 'url-shortener',
      title: 'URL Shortener Service',
      description: 'Design a scalable URL shortening service like bit.ly or tinyurl.com with analytics and custom domains.',
      requirements: [
        'Handle 100M URLs shortened per day',
        'Support custom aliases and domains',
        'Provide real-time analytics and click tracking',
        'Ensure high availability (99.9% uptime)',
        'Implement rate limiting and spam protection'
      ],
      difficulty: 'intermediate',
      estimatedTime: 45,
      category: 'system-design',
      tags: ['web-services', 'databases', 'caching', 'analytics'],
      learningObjectives: [
        'Design scalable web APIs',
        'Implement efficient database schemas',
        'Apply caching strategies',
        'Handle high-throughput scenarios'
      ],
      solutionHints: [
        {
          id: 'url-shortener-hint-1',
          title: 'Database Design',
          content: 'Consider using a simple key-value store for URL mappings. Think about how to generate unique short codes efficiently.',
          type: 'architecture',
          difficulty: 'beginner',
        },
        {
          id: 'url-shortener-hint-2',
          title: 'Caching Strategy',
          content: 'Popular URLs should be cached to reduce database load. Consider using Redis or Memcached for frequently accessed mappings.',
          type: 'optimization',
          difficulty: 'intermediate',
        },
        {
          id: 'url-shortener-hint-3',
          title: 'Analytics Architecture',
          content: 'Analytics data can be processed asynchronously. Consider using a message queue to handle click events and batch process analytics.',
          type: 'architecture',
          difficulty: 'advanced',
        }
      ],
      architectureTemplate: {
        name: 'Basic URL Shortener',
        description: 'A simple architecture for a URL shortening service',
        components: [
          {
            type: 'api-gateway',
            label: 'API Gateway',
            description: 'Handles rate limiting and routing',
            position: { x: 100, y: 100 }
          },
          {
            type: 'server',
            label: 'URL Service',
            description: 'Core URL shortening logic',
            position: { x: 300, y: 100 }
          },
          {
            type: 'database',
            label: 'Primary DB',
            description: 'Stores URL mappings',
            position: { x: 500, y: 200 }
          },
          {
            type: 'cache',
            label: 'Redis Cache',
            description: 'Caches popular URLs',
            position: { x: 300, y: 300 }
          }
        ],
        connections: [
          {
            from: 'API Gateway',
            to: 'URL Service',
            label: 'HTTP',
            type: 'sync',
            protocol: 'REST'
          },
          {
            from: 'URL Service',
            to: 'Primary DB',
            label: 'Query',
            type: 'sync'
          },
          {
            from: 'URL Service',
            to: 'Redis Cache',
            label: 'Cache',
            type: 'sync'
          }
        ]
      },
      resources: [
        {
          title: 'System Design: URL Shortener',
          url: 'https://example.com/url-shortener-design',
          type: 'tutorial',
          description: 'Complete guide to designing a URL shortener'
        }
      ],
      variants: []
    }
    ,
    {
      id: 'chat-system',
      title: 'Simple Real-time Chat System',
      description: 'Design a basic chat application with real-time messaging and user presence.',
      requirements: [
        'Real-time messaging between users',
        'Message persistence and history',
        'Online/offline status indicators',
        'Support for multiple chat rooms',
        'Basic message delivery confirmation'
      ],
      difficulty: 'beginner',
      estimatedTime: 30,
      category: 'system-design',
      tags: ['realtime', 'websocket', 'messaging', 'chat'],
      learningObjectives: [
        'Understand real-time communication patterns',
        'Learn WebSocket implementation basics',
        'Design simple message storage',
        'Implement basic presence tracking'
      ],
      solutionHints: [
        {
          id: 'chat-websocket',
          title: 'WebSocket Connection',
          content: 'Use WebSockets to maintain real-time connections between clients and server for instant message delivery.',
          type: 'architecture',
          difficulty: 'beginner'
        },
        {
          id: 'chat-storage',
          title: 'Message Storage',
          content: 'Store messages in a database with timestamps and room/user information for message history.',
          type: 'architecture',
          difficulty: 'beginner'
        }
      ],
      architectureTemplate: {
        name: 'Simple Chat System',
        description: 'Basic chat server with WebSocket connections and message storage',
        components: [
          { type: 'server', label: 'Chat Server', description: 'WebSocket server', position: { x: 200, y: 100 } },
          { type: 'database', label: 'Message DB', description: 'Store messages and users', position: { x: 200, y: 250 } },
          { type: 'cache', label: 'Session Store', description: 'Active user sessions', position: { x: 400, y: 100 } }
        ],
        connections: [
          { from: 'Chat Server', to: 'Message DB', label: 'Store/Retrieve', type: 'sync' },
          { from: 'Chat Server', to: 'Session Store', label: 'Sessions', type: 'sync' }
        ]
      }
    }
    // Additional challenges may be loaded from external sources
  ],
  settings: {
    enableHints: true,
    enableTemplates: true,
    progressiveHints: true,
    autoSave: true,
    hintDelay: 30 // Show hints after 30 seconds of inactivity
  }
};

// Challenge loading and management functions
export class ChallengeManager {
  private config: ChallengeConfig;
  private customChallenges: ExtendedChallenge[] = [];

  constructor(config: ChallengeConfig = defaultChallengeConfig) {
    this.config = config;
  }

  // Load challenges from external source (Tauri, API, file)
  async loadChallengesFromSource(source: 'tauri' | 'api' | 'file', path?: string): Promise<ExtendedChallenge[]> {
    try {
      switch (source) {
        case 'tauri':
          // In a real Tauri app, this would call Tauri commands
          // return await invoke('load_challenges');
          return this.loadChallengesFromFile(path || 'challenges.json');
        
        case 'api':
          const response = await fetch(path || '/api/challenges');
          const data = await response.json();
          return data.challenges || [];
        
        case 'file':
          // This would typically be handled by Tauri file system APIs
          return this.loadChallengesFromFile(path || 'challenges.json');
        
        default:
          throw new Error(`Unsupported source: ${source}`);
      }
    } catch (error) {
      console.error('Failed to load challenges from source:', error);
      return [];
    }
  }

  // Load challenges from a JSON file (simulated for web version)
  private async loadChallengesFromFile(path: string): Promise<ExtendedChallenge[]> {
    // In a Tauri app, this would use the file system APIs
    // For now, return empty array as external challenges would be loaded separately
    return [];
  }

  // Add a custom challenge
  addCustomChallenge(challenge: ExtendedChallenge): void {
    this.customChallenges.push(challenge);
  }

  // Get all challenges (built-in + custom)
  getAllChallenges(): ExtendedChallenge[] {
    return [...this.config.challenges, ...this.customChallenges];
  }

  // Get challenges by category
  getChallengesByCategory(categoryId: string): ExtendedChallenge[] {
    return this.getAllChallenges().filter(challenge => challenge.category === categoryId);
  }

  // Get challenges by difficulty
  getChallengesByDifficulty(difficulty: Challenge['difficulty']): ExtendedChallenge[] {
    return this.getAllChallenges().filter(challenge => challenge.difficulty === difficulty);
  }

  // Get challenge by ID
  getChallengeById(id: string): ExtendedChallenge | undefined {
    return this.getAllChallenges().find(challenge => challenge.id === id);
  }

  // Search challenges
  searchChallenges(query: string): ExtendedChallenge[] {
    const searchTerm = query.toLowerCase();
    return this.getAllChallenges().filter(challenge =>
      challenge.title.toLowerCase().includes(searchTerm) ||
      challenge.description.toLowerCase().includes(searchTerm) ||
      challenge.tags?.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      challenge.requirements.some(req => req.toLowerCase().includes(searchTerm))
    );
  }

  // Get configuration
  getConfig(): ChallengeConfig {
    return this.config;
  }

  // Update configuration
  updateConfig(newConfig: Partial<ChallengeConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Export challenges to JSON (for Tauri file saving)
  exportChallenges(): string {
    const exportData = {
      version: this.config.version,
      challenges: this.customChallenges,
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(exportData, null, 2);
  }

  // Import challenges from JSON
  importChallenges(jsonData: string): number {
    try {
      const data = JSON.parse(jsonData);
      if (data.challenges && Array.isArray(data.challenges)) {
        data.challenges.forEach((challenge: ExtendedChallenge) => {
          // Validate challenge structure
          if (this.validateChallenge(challenge)) {
            this.addCustomChallenge(challenge);
          }
        });
        return data.challenges.length;
      }
      return 0;
    } catch (error) {
      console.error('Failed to import challenges:', error);
      return 0;
    }
  }

  // Validate challenge structure
  private validateChallenge(challenge: any): challenge is ExtendedChallenge {
    return (
      typeof challenge.id === 'string' &&
      typeof challenge.title === 'string' &&
      typeof challenge.description === 'string' &&
      Array.isArray(challenge.requirements) &&
      ['beginner', 'intermediate', 'advanced'].includes(challenge.difficulty) &&
      typeof challenge.estimatedTime === 'number' &&
      typeof challenge.category === 'string'
    );
  }
}

// Global challenge manager instance
export const challengeManager = new ChallengeManager();

// Helper functions for Tauri integration
export const tauriChallengeAPI = {
  // Load challenges from local file
  async loadChallengesFromFile(filePath: string): Promise<ExtendedChallenge[]> {
    try {
      // In Tauri: return await invoke('load_challenges_from_file', { filePath });
      console.log('Loading challenges from file:', filePath);
      return [];
    } catch (error) {
      console.error('Failed to load challenges from file:', error);
      return [];
    }
  },

  // Save challenges to local file
  async saveChallenges(challenges: ExtendedChallenge[], filePath: string): Promise<void> {
    try {
      // In Tauri: await invoke('save_challenges_to_file', { challenges, filePath });
      console.log('Saving challenges to file:', filePath);
    } catch (error) {
      console.error('Failed to save challenges to file:', error);
    }
  },

  // Open file dialog to select challenge file
  async selectChallengeFile(): Promise<string | null> {
    try {
      // In Tauri: return await open({ filters: [{ name: 'Challenge Files', extensions: ['json'] }] });
      console.log('Opening file dialog for challenge selection');
      return null;
    } catch (error) {
      console.error('Failed to open file dialog:', error);
      return null;
    }
  },

  // Save file dialog to export challenges
  async saveChallengeFile(data: string): Promise<string | null> {
    try {
      // In Tauri: return await save({ filters: [{ name: 'Challenge Files', extensions: ['json'] }] });
      console.log('Opening save dialog for challenge export');
      return null;
    } catch (error) {
      console.error('Failed to open save dialog:', error);
      return null;
    }
  }
};
