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
      variants: [
        {
          id: 'enterprise',
          name: 'Enterprise Scale',
          description: 'Handle 1B URLs per day with custom domains',
          additionalRequirements: [
            'Support custom branded domains',
            'Enterprise SSO integration',
            'Advanced analytics dashboard'
          ],
          scalingFactor: 10,
          complexityModifier: 'harder'
        }
      ]
    }
    ,
    {
      id: 'news-feed',
      title: 'Social Media News Feed',
      description: 'Design a personalized, real-time news feed like Twitter or Instagram supporting ranking, fan-out, and timelines.',
      requirements: [
        '100M DAU with 10k posts/sec peak',
        'Latency: p95 < 200ms to render initial feed',
        'Personalized ranking with recency and engagement signals',
        'Support write amplification (fan-out/fan-in trade-offs)',
        'Backfill, pagination, and timeline invalidation'
      ],
      difficulty: 'advanced',
      estimatedTime: 60,
      category: 'system-design',
      tags: ['ranking', 'caching', 'fanout', 'search', 'feed'],
      learningObjectives: [
        'Compare fan-out on write vs fan-in on read',
        'Design cache hierarchies for hot feeds',
        'Model timelines and invalidation strategies',
        'Balance consistency and freshness'
      ],
      solutionHints: [
        {
          id: 'news-feed-cache',
          title: 'Multi-tier Caching',
          content: 'Cache user timelines (Redis) and consider per-shard hot timelines. Use write-through for hot users and compute-on-read for tail users.',
          type: 'optimization',
          difficulty: 'intermediate'
        },
        {
          id: 'news-feed-fanout',
          title: 'Fan-out Strategy',
          content: 'High-follower producers use fan-in-on-read to avoid write storms. Long-tail posts can use fan-out-on-write via a queue.',
          type: 'tradeoff',
          difficulty: 'advanced'
        }
      ],
      architectureTemplate: {
        name: 'Ranked Feed (Hybrid Fan-out)',
        description: 'Hybrid fan-out with cached timelines and background ranking jobs',
        components: [
          { type: 'api-gateway', label: 'API Gateway', description: 'Auth, rate limit', position: { x: 120, y: 90 } },
          { type: 'server', label: 'Feed Service', description: 'Assemble timelines', position: { x: 320, y: 90 } },
          { type: 'redis', label: 'Timeline Cache', description: 'Per-user timelines', position: { x: 520, y: 90 } },
          { type: 'message-queue', label: 'Queue', description: 'Ingest posts/events', position: { x: 320, y: 240 } },
          { type: 'elasticsearch', label: 'Search/Ranking', description: 'Feature store / rank', position: { x: 520, y: 240 } },
          { type: 'postgresql', label: 'Feed DB', description: 'Timeline and edges', position: { x: 720, y: 180 } }
        ],
        connections: [
          { from: 'API Gateway', to: 'Feed Service', label: 'REST', type: 'sync', protocol: 'REST' },
          { from: 'Feed Service', to: 'Timeline Cache', label: 'Read/Write', type: 'sync' },
          { from: 'Feed Service', to: 'Queue', label: 'Events', type: 'async' },
          { from: 'Queue', to: 'Search/Ranking', label: 'Consumers', type: 'async' },
          { from: 'Feed Service', to: 'Feed DB', label: 'Persist', type: 'sync' }
        ]
      },
      resources: [
        { title: 'Designing a News Feed', url: 'https://example.com/news-feed', type: 'case-study' }
      ]
    },
    {
      id: 'chat-system',
      title: 'Real-time Chat and Presence',
      description: 'Design a WhatsApp/Slack-like chat service with real-time messaging, presence, and typing indicators.',
      requirements: [
        'WebSocket connections at 1M concurrent users',
        'Message delivery p99 < 150ms within a region',
        'Message persistence with read receipts',
        'Online/offline presence and typing indicators',
        'Backpressure and retries for mobile clients'
      ],
      difficulty: 'intermediate',
      estimatedTime: 45,
      category: 'system-design',
      tags: ['realtime', 'websocket', 'presence', 'messaging', 'queues'],
      learningObjectives: [
        'Architect low-latency real-time messaging',
        'Plan session affinity and scale WebSockets',
        'Handle backpressure and retries',
        'Persist messages and receipts efficiently'
      ],
      solutionHints: [
        {
          id: 'chat-presence',
          title: 'Presence Storage',
          content: 'Keep presence in Redis with short TTL heartbeats; shard by userId. Broadcast changes via pub/sub.',
          type: 'architecture',
          difficulty: 'beginner'
        },
        {
          id: 'chat-ws-scale',
          title: 'WebSocket Scaling',
          content: 'Use a WS gateway tier with sticky LB to a connection manager. Fan-out via MQ to server groups subscribed to rooms.',
          type: 'scaling',
          difficulty: 'intermediate'
        }
      ],
      architectureTemplate: {
        name: 'Chat with WS Gateway',
        description: 'Gateway + chat service + Redis pub/sub + durable store',
        components: [
          { type: 'api-gateway', label: 'WS Gateway', description: 'Sticky sessions', position: { x: 120, y: 90 } },
          { type: 'websocket', label: 'WS Endpoint', description: 'Upgrade connections', position: { x: 260, y: 90 } },
          { type: 'server', label: 'Chat Service', description: 'Rooms, routing', position: { x: 420, y: 90 } },
          { type: 'redis', label: 'Redis Pub/Sub', description: 'Presence + fan-out', position: { x: 600, y: 90 } },
          { type: 'postgresql', label: 'Messages DB', description: 'Durable storage', position: { x: 420, y: 240 } },
          { type: 'message-queue', label: 'Async Queue', description: 'Retries/Buffer', position: { x: 600, y: 240 } }
        ],
        connections: [
          { from: 'WS Gateway', to: 'WS Endpoint', label: 'Upgrade', type: 'sync', protocol: 'WebSocket' },
          { from: 'WS Endpoint', to: 'Chat Service', label: 'Session', type: 'sync' },
          { from: 'Chat Service', to: 'Redis Pub/Sub', label: 'Publish', type: 'async' },
          { from: 'Chat Service', to: 'Messages DB', label: 'Persist', type: 'sync' },
          { from: 'Chat Service', to: 'Async Queue', label: 'Retry', type: 'async' }
        ]
      }
    },
    {
      id: 'ride-hailing',
      title: 'Ride-hailing Dispatch System',
      description: 'Design Uber/Lyft-style dispatch: matching drivers to riders, live location updates, surge pricing.',
      requirements: [
        'Real-time location updates at >50k events/sec',
        'Match latency under 500ms at p95',
        'Geo-partitioning and nearest-neighbor search',
        'Resilient to mobile disconnects and retries',
        'Support surge pricing calculations'
      ],
      difficulty: 'advanced',
      estimatedTime: 60,
      category: 'scaling',
      tags: ['geospatial', 'stream-processing', 'matching', 'caching'],
      learningObjectives: [
        'Partition by geography for scale',
        'Maintain driver location indexes',
        'Design matching and pricing pipelines',
        'Handle mobile networking challenges'
      ],
      solutionHints: [
        {
          id: 'ride-geo',
          title: 'Geo Indexing',
          content: 'Use geohash or H3 to shard location updates and query nearby drivers efficiently.',
          type: 'architecture',
          difficulty: 'intermediate'
        },
        {
          id: 'ride-stream',
          title: 'Streaming Updates',
          content: 'Buffer updates on a message queue; aggregate per cell and push deltas to clients to control bandwidth.',
          type: 'optimization',
          difficulty: 'advanced'
        }
      ],
      architectureTemplate: {
        name: 'Geo-partitioned Dispatch',
        description: 'Geo-sharded services with streaming updates and caching',
        components: [
          { type: 'api-gateway', label: 'API Gateway', description: 'Auth/Rate limit', position: { x: 120, y: 90 } },
          { type: 'server', label: 'Dispatch Service', description: 'Matching logic', position: { x: 320, y: 90 } },
          { type: 'server', label: 'Location Service', description: 'Geo index', position: { x: 520, y: 90 } },
          { type: 'message-queue', label: 'Updates Queue', description: 'Ingest telemetry', position: { x: 320, y: 240 } },
          { type: 'redis', label: 'Hot Cache', description: 'Nearby drivers', position: { x: 520, y: 240 } },
          { type: 'postgresql', label: 'Rides DB', description: 'Trips/History', position: { x: 720, y: 180 } }
        ],
        connections: [
          { from: 'API Gateway', to: 'Dispatch Service', label: 'REST', type: 'sync', protocol: 'REST' },
          { from: 'Dispatch Service', to: 'Location Service', label: 'Query', type: 'sync' },
          { from: 'Location Service', to: 'Updates Queue', label: 'Ingest', type: 'async' },
          { from: 'Dispatch Service', to: 'Hot Cache', label: 'Read/Write', type: 'sync' },
          { from: 'Dispatch Service', to: 'Rides DB', label: 'Persist', type: 'sync' }
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
