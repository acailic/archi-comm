// Cache keys for challenge caching
export const CACHE_KEYS = {
  CHALLENGES: 'archicomm_cached_challenges',
  CACHE_VERSION: 'archicomm_cache_version',
  LAST_UPDATE: 'archicomm_last_update',
};

// Remove dynamic require and use strict types
import { invoke } from '@tauri-apps/api/tauri';
import { isTauriEnvironment } from './environment';
import type { Challenge, DesignComponent, Connection } from '@/shared/contracts';

// Tauri integration

// ArchiComm Community Edition - Challenge Configuration
// This file contains the challenge system configuration for the community version
// Includes basic educational challenges suitable for learning system design fundamentals

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

// Configuration for the challenge system - Community Edition
export interface ChallengeConfig {
  version: string;
  categories: ChallengeCategory[];
  challenges: ExtendedChallenge[];
  globalResources?: Resource[];
  settings?: {
    enableHints: boolean;
    enableTemplates: boolean;
    autoSave: boolean;
    hintDelay: number; // seconds
  };
}

// Default challenge configuration - Community Edition
// Contains basic educational challenges for learning system design
export const defaultChallengeConfig: ChallengeConfig = {
  version: '1.0.0-community',
  categories: [
    {
      id: 'system-design',
      name: 'System Design',
      description: 'Basic system design patterns and architectures for learning',
      icon: 'Target',
      color: 'blue',
    },
    {
      id: 'architecture',
      name: 'Architecture',
      description: 'Fundamental software architecture principles',
      icon: 'Database',
      color: 'purple',
    },
  ],
  challenges: [
    {
      id: 'url-shortener',
      title: 'URL Shortener Service',
      description:
        'Design a scalable URL shortening service like bit.ly or tinyurl.com with analytics and custom domains.',
      requirements: [
        'Handle 100M URLs shortened per day',
        'Support custom aliases and domains',
        'Provide real-time analytics and click tracking',
        'Ensure high availability (99.9% uptime)',
        'Implement rate limiting and spam protection',
      ],
      difficulty: 'intermediate',
      estimatedTime: 45,
      category: 'system-design',
      tags: ['web-services', 'databases', 'caching', 'analytics'],
      learningObjectives: [
        'Design scalable web APIs',
        'Implement efficient database schemas',
        'Apply caching strategies',
        'Handle high-throughput scenarios',
      ],
      solutionHints: [
        {
          id: 'url-shortener-hint-1',
          title: 'Database Design',
          content:
            'Consider using a simple key-value store for URL mappings. Think about how to generate unique short codes efficiently.',
          type: 'architecture',
          difficulty: 'beginner',
        },
        {
          id: 'url-shortener-hint-2',
          title: 'Caching Strategy',
          content:
            'Popular URLs should be cached to reduce database load. Consider using Redis or Memcached for frequently accessed mappings.',
          type: 'optimization',
          difficulty: 'intermediate',
        },
        {
          id: 'url-shortener-hint-3',
          title: 'Analytics Architecture',
          content:
            'Analytics data can be processed asynchronously. Consider using a message queue to handle click events and batch process analytics.',
          type: 'architecture',
          difficulty: 'advanced',
        },
      ],
      architectureTemplate: {
        name: 'Basic URL Shortener',
        description: 'A simple architecture for a URL shortening service',
        components: [
          {
            type: 'api-gateway',
            label: 'API Gateway',
            description: 'Handles rate limiting and routing',
            position: { x: 100, y: 100 },
          },
          {
            type: 'server',
            label: 'URL Service',
            description: 'Core URL shortening logic',
            position: { x: 300, y: 100 },
          },
          {
            type: 'database',
            label: 'Primary DB',
            description: 'Stores URL mappings',
            position: { x: 500, y: 200 },
          },
          {
            type: 'cache',
            label: 'Redis Cache',
            description: 'Caches popular URLs',
            position: { x: 300, y: 300 },
          },
        ],
        connections: [
          {
            from: 'API Gateway',
            to: 'URL Service',
            label: 'HTTP',
            type: 'sync',
            protocol: 'REST',
          },
          {
            from: 'URL Service',
            to: 'Primary DB',
            label: 'Query',
            type: 'sync',
          },
          {
            from: 'URL Service',
            to: 'Redis Cache',
            label: 'Cache',
            type: 'sync',
          },
        ],
      },
      resources: [
        {
          title: 'System Design: URL Shortener',
          url: 'https://example.com/url-shortener-design',
          type: 'tutorial',
          description: 'Complete guide to designing a URL shortener',
        },
      ],
      variants: [],
    },
    {
      id: 'chat-system',
      title: 'Simple Real-time Chat System',
      description: 'Design a basic chat application with real-time messaging and user presence.',
      requirements: [
        'Real-time messaging between users',
        'Message persistence and history',
        'Online/offline status indicators',
        'Support for multiple chat rooms',
        'Basic message delivery confirmation',
      ],
      difficulty: 'beginner',
      estimatedTime: 30,
      category: 'system-design',
      tags: ['realtime', 'websocket', 'messaging', 'chat'],
      learningObjectives: [
        'Understand real-time communication patterns',
        'Learn WebSocket implementation basics',
        'Design simple message storage',
        'Implement basic presence tracking',
      ],
      solutionHints: [
        {
          id: 'chat-websocket',
          title: 'WebSocket Connection',
          content:
            'Use WebSockets to maintain real-time connections between clients and server for instant message delivery.',
          type: 'architecture',
          difficulty: 'beginner',
        },
        {
          id: 'chat-storage',
          title: 'Message Storage',
          content:
            'Store messages in a database with timestamps and room/user information for message history.',
          type: 'architecture',
          difficulty: 'beginner',
        },
      ],
      architectureTemplate: {
        name: 'Simple Chat System',
        description: 'Basic chat server with WebSocket connections and message storage',
        components: [
          {
            type: 'server',
            label: 'Chat Server',
            description: 'WebSocket server',
            position: { x: 200, y: 100 },
          },
          {
            type: 'database',
            label: 'Message DB',
            description: 'Store messages and users',
            position: { x: 200, y: 250 },
          },
          {
            type: 'cache',
            label: 'Session Store',
            description: 'Active user sessions',
            position: { x: 400, y: 100 },
          },
        ],
        connections: [
          { from: 'Chat Server', to: 'Message DB', label: 'Store/Retrieve', type: 'sync' },
          { from: 'Chat Server', to: 'Session Store', label: 'Sessions', type: 'sync' },
        ],
      },
    },
    // Community edition includes these basic educational challenges
    // Additional challenges can be added through the challenge manager
  ],
  settings: {
    enableHints: true,
    enableTemplates: true,
    autoSave: true,
    hintDelay: 30, // Show hints after 30 seconds of inactivity
  },
};

// Challenge loading and management functions - Community Edition
// Provides basic challenge management for educational use
export class ChallengeManager {
  private config: ChallengeConfig;
  private customChallenges: ExtendedChallenge[] = [];

  constructor(config: ChallengeConfig = defaultChallengeConfig) {
    this.config = config;
  }

  // Load challenges from cache with version check
  async loadCachedChallenges(): Promise<ExtendedChallenge[]> {
    try {
      // Check if localStorage is available
      if (typeof localStorage === 'undefined') {
        console.warn('localStorage not available, skipping cache');
        return [];
      }

      const cached = localStorage.getItem(CACHE_KEYS.CHALLENGES);
      if (!cached) return [];

      const cacheVersion = localStorage.getItem(CACHE_KEYS.CACHE_VERSION);
      if (cacheVersion !== this.config.version) {
        this.clearCache();
        return [];
      }

      const parsedChallenges = JSON.parse(cached);
      if (!Array.isArray(parsedChallenges)) {
        console.warn('Invalid cached challenge format, clearing cache');
        this.clearCache();
        return [];
      }

      return parsedChallenges.filter(challenge => {
        try {
          return this.validateChallenge(challenge);
        } catch (e) {
          console.warn('Invalid cached challenge, filtering out:', e);
          return false;
        }
      });
    } catch (e) {
      console.error('Cache load failed:', e);
      this.clearCache(); // Clear potentially corrupted cache
      return [];
    }
  }

  // Get only default challenges immediately (no async calls)
  getDefaultChallenges(): ExtendedChallenge[] {
    return [...this.config.challenges];
  }

  // Check cache freshness without loading
  isCacheFresh(): boolean {
    try {
      if (typeof localStorage === 'undefined') {
        return false;
      }

      const lastUpdate = localStorage.getItem(CACHE_KEYS.LAST_UPDATE);
      if (!lastUpdate) return false;

      const cacheTime = new Date(lastUpdate).getTime();
      if (isNaN(cacheTime)) {
        console.warn('Invalid cache timestamp, treating as stale');
        return false;
      }

      const now = Date.now();
      const maxAge = 1000 * 60 * 30; // 30 minutes
      return now - cacheTime < maxAge;
    } catch (e) {
      console.warn('Cache freshness check failed:', e);
      return false;
    }
  }

  // Get cache loading statistics
  getCacheStats(): { hasCached: boolean; isFresh: boolean; size: number } {
    try {
      if (typeof localStorage === 'undefined') {
        return { hasCached: false, isFresh: false, size: 0 };
      }

      const cached = localStorage.getItem(CACHE_KEYS.CHALLENGES);
      if (!cached) {
        return { hasCached: false, isFresh: false, size: 0 };
      }

      let size = 0;
      try {
        const parsedCache = JSON.parse(cached);
        size = Array.isArray(parsedCache) ? parsedCache.length : 0;
      } catch (parseError) {
        console.warn('Failed to parse cached challenges for stats:', parseError);
      }

      return {
        hasCached: true,
        isFresh: this.isCacheFresh(),
        size,
      };
    } catch (e) {
      console.error('Failed to get cache stats:', e);
      return { hasCached: false, isFresh: false, size: 0 };
    }
  }

  // Save challenges to cache
  async cacheChallenges(challenges: ExtendedChallenge[]) {
    try {
      if (typeof localStorage === 'undefined') {
        console.warn('localStorage not available, skipping cache save');
        return;
      }

      if (!Array.isArray(challenges)) {
        console.warn('Invalid challenges data for caching');
        return;
      }

      // Validate challenges before caching
      const validChallenges = challenges.filter(challenge => {
        try {
          return this.validateChallenge(challenge);
        } catch (e) {
          console.warn('Invalid challenge filtered out during caching:', e);
          return false;
        }
      });

      const challengeData = JSON.stringify(validChallenges);
      const timestamp = new Date().toISOString();

      localStorage.setItem(CACHE_KEYS.CHALLENGES, challengeData);
      localStorage.setItem(CACHE_KEYS.CACHE_VERSION, this.config.version);
      localStorage.setItem(CACHE_KEYS.LAST_UPDATE, timestamp);

      console.log(`Cached ${validChallenges.length} challenges successfully`);
    } catch (e) {
      console.error('Cache save failed:', e);
      // Attempt to clear potentially corrupted cache
      this.clearCache();
    }
  }

  // Clear all challenge cache
  clearCache() {
    try {
      if (typeof localStorage === 'undefined') {
        console.warn('localStorage not available for cache clearing');
        return;
      }

      Object.values(CACHE_KEYS).forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn(`Failed to remove cache key ${key}:`, e);
        }
      });

      console.log('Challenge cache cleared successfully');
    } catch (e) {
      console.error('Failed to clear challenge cache:', e);
    }
  }

  // Optimized cache-first loading with performance tracking
  async loadChallengesWithCache(
    source: 'tauri' | 'api' | 'file',
    path?: string,
    performanceTracker?: (event: string, duration: number, meta?: any) => void
  ) {
    const startTime = Date.now();
    let cached: ExtendedChallenge[] = [];
    let cacheLoadError: any = null;

    try {
      cached = await this.loadCachedChallenges();
    } catch (e) {
      console.warn('Cache load failed, continuing with empty cache:', e);
      cacheLoadError = e;
      cached = [];
    }

    if (performanceTracker) {
      performanceTracker('cache-load', Date.now() - startTime, {
        found: cached.length,
        fresh: this.isCacheFresh(),
        error: cacheLoadError ? String(cacheLoadError) : null,
      });
    }

    // Return cached immediately if available and fresh
    if (cached.length > 0 && this.isCacheFresh()) {
      // Still try to refresh in background (non-blocking)
      this.refreshChallengesInBackground(source, path, performanceTracker).catch(e => {
        console.warn('Background refresh failed:', e);
      });
      return { challenges: cached, fromCache: true, fresh: true };
    }

    // Attempt to load fresh data
    try {
      const loadStart = Date.now();
      const fresh = await this.loadChallengesFromSource(source, path);

      if (performanceTracker) {
        performanceTracker('external-load', Date.now() - loadStart, {
          found: fresh ? fresh.length : 0,
          source,
        });
      }

      if (fresh && fresh.length > 0) {
        // Cache new data (don't await to avoid blocking)
        this.cacheChallenges(fresh).catch(e => {
          console.warn('Failed to cache fresh challenges:', e);
        });
        return { challenges: fresh, fromCache: false, fresh: true };
      }
    } catch (e) {
      console.error('Fresh load failed:', e);
      if (performanceTracker) {
        performanceTracker('external-load-error', Date.now() - startTime, {
          error: String(e),
          source,
        });
      }
    }

    // Fallback to cached data (even if stale) or defaults
    if (cached.length > 0) {
      return { challenges: cached, fromCache: true, fresh: false };
    }

    // Final fallback to built-in challenges
    const defaults = this.getDefaultChallenges();
    return { challenges: defaults, fromCache: false, fresh: false };
  }

  // Background refresh that doesn't throw errors
  private async refreshChallengesInBackground(
    source: 'tauri' | 'api' | 'file',
    path?: string,
    performanceTracker?: (event: string, duration: number, meta?: any) => void
  ): Promise<void> {
    try {
      const startTime = Date.now();
      const fresh = await this.loadChallengesFromSource(source, path);

      if (fresh && fresh.length > 0) {
        await this.cacheChallenges(fresh);

        if (performanceTracker) {
          performanceTracker('background-refresh-success', Date.now() - startTime, {
            found: fresh.length,
          });
        }

        // Emit event for listeners that new challenges are available
        try {
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(
              new CustomEvent('challenges-updated', {
                detail: { challenges: fresh, source: 'background' },
              })
            );
          }
        } catch (eventError) {
          console.warn('Failed to dispatch challenges-updated event:', eventError);
        }
      }
    } catch (e) {
      // Silent fail for background operations
      console.warn('Background challenge refresh failed:', e);
      if (performanceTracker) {
        performanceTracker('background-refresh-error', 0, { error: String(e) });
      }
    }
  }

  // Load challenges from external source (Tauri, API, file)
  async loadChallengesFromSource(
    source: 'tauri' | 'api' | 'file',
    path?: string
  ): Promise<ExtendedChallenge[]> {
    const timeout = 10000; // 10 second timeout

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Challenge loading timeout')), timeout);
      });

      const loadPromise = this.executeLoadFromSource(source, path);

      const result = await Promise.race([loadPromise, timeoutPromise]);

      // Validate result
      if (!Array.isArray(result)) {
        console.warn('Invalid challenge data received from source:', source);
        return [];
      }

      // Filter and validate challenges
      const validChallenges = result.filter(challenge => {
        try {
          return this.validateChallenge(challenge);
        } catch (e) {
          console.warn('Invalid challenge from source, filtering out:', e);
          return false;
        }
      });

      console.log(`Loaded ${validChallenges.length} valid challenges from ${source}`);
      return validChallenges;
    } catch (error) {
      console.error('Failed to load challenges from source:', source, error);
      return [];
    }
  }

  private async executeLoadFromSource(
    source: 'tauri' | 'api' | 'file',
    path?: string
  ): Promise<ExtendedChallenge[]> {
    switch (source) {
      case 'tauri':
        return tauriChallengeAPI.loadChallengesFromFile(path || 'challenges.json');

      case 'api': {
        if (typeof fetch === 'undefined') {
          console.warn('fetch not available, cannot load from API');
          return [];
        }

        const response = await fetch(path || '/api/challenges', {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.challenges || data || [];
      }

      case 'file':
        return tauriChallengeAPI.loadChallengesFromFile(path || 'challenges.json');

      default:
        throw new Error(`Unsupported source: ${source}`);
    }
  }

  // Load challenges from a JSON file (simulated for web version)
  private async loadChallengesFromFile(path: string): Promise<ExtendedChallenge[]> {
    return tauriChallengeAPI.loadChallengesFromFile(path);
  }

  // Add a custom challenge
  addCustomChallenge(challenge: ExtendedChallenge): void {
    this.customChallenges.push(challenge);
  }

  // Get all challenges (built-in + custom) - optimized for frequent calls
  getAllChallenges(): ExtendedChallenge[] {
    return [...this.config.challenges, ...this.customChallenges];
  }

  // Get challenge count for performance monitoring
  getChallengeCount(): { total: number; builtin: number; custom: number } {
    return {
      total: this.config.challenges.length + this.customChallenges.length,
      builtin: this.config.challenges.length,
      custom: this.customChallenges.length,
    };
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
    return this.getAllChallenges().filter(
      challenge =>
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
      exportedAt: new Date().toISOString(),
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
    try {
      if (!challenge || typeof challenge !== 'object') {
        return false;
      }

      // Required fields validation
      const requiredFields = {
        id: 'string',
        title: 'string',
        description: 'string',
        difficulty: ['beginner', 'intermediate', 'advanced'],
        estimatedTime: 'number',
        category: 'string',
      };

      for (const [field, expectedType] of Object.entries(requiredFields)) {
        const value = challenge[field];

        if (Array.isArray(expectedType)) {
          if (!expectedType.includes(value)) {
            console.warn(`Invalid challenge ${field}: ${value}`);
            return false;
          }
        } else if (typeof value !== expectedType) {
          console.warn(
            `Invalid challenge ${field} type: expected ${expectedType}, got ${typeof value}`
          );
          return false;
        }
      }

      // Requirements must be an array
      if (!Array.isArray(challenge.requirements)) {
        console.warn('Challenge requirements must be an array');
        return false;
      }

      // Validate optional arrays if present
      const optionalArrays = ['tags', 'prerequisites', 'learningObjectives', 'requirements'];
      for (const field of optionalArrays) {
        if (challenge[field] !== undefined && !Array.isArray(challenge[field])) {
          console.warn(`Challenge ${field} must be an array if present`);
          return false;
        }
      }

      // Basic value validation
      if (challenge.estimatedTime <= 0) {
        console.warn('Challenge estimatedTime must be positive');
        return false;
      }

      if (challenge.id.length === 0 || challenge.title.length === 0) {
        console.warn('Challenge id and title cannot be empty');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Challenge validation error:', error);
      return false;
    }
  }
}

// Global challenge manager instance with error handling
let challengeManager: ChallengeManager;

try {
  challengeManager = new ChallengeManager();
} catch (error) {
  console.error('Failed to initialize challenge manager:', error);
  // Create a minimal fallback instance
  challengeManager = {
    getDefaultChallenges: () => [],
    getAllChallenges: () => [],
    getChallengeById: () => undefined,
    loadCachedChallenges: async () => [],
    cacheChallenges: async () => {},
    clearCache: () => {},
    getCacheStats: () => ({ hasCached: false, isFresh: false, size: 0 }),
    isCacheFresh: () => false,
    getConfig: () => defaultChallengeConfig,
    getChallengeCount: () => ({ total: 0, builtin: 0, custom: 0 }),
  } as any;
}

export { challengeManager };

// Basic file operations for community edition
// Simplified API for basic challenge import/export functionality
export const tauriChallengeAPI = {
  // Load challenges from local file (basic functionality)
  async loadChallengesFromFile(filePath: string): Promise<ExtendedChallenge[]> {
    try {
      if (!filePath || typeof filePath !== 'string') {
        console.warn('Invalid file path provided');
        return [];
      }

      if (!isTauriEnvironment()) {
        console.warn('loadChallengesFromFile called outside Tauri, returning []');
        return [];
      }
      const result = await invoke<any>('load_challenges_from_file', { path: filePath });
      if (!Array.isArray(result)) return [];
      return result as ExtendedChallenge[];
    } catch (error) {
      console.error('Failed to load challenges from file:', error);
      return [];
    }
  },

  // Save challenges to local file (basic functionality)
  async saveChallenges(challenges: ExtendedChallenge[], filePath: string): Promise<void> {
    try {
      if (!Array.isArray(challenges)) {
        throw new Error('Challenges must be an array');
      }
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path provided');
      }
      if (!isTauriEnvironment()) {
        console.warn('saveChallenges called outside Tauri, skipping');
        return;
      }
      // Validate before sending
      const manager = new ChallengeManager();
      const validChallenges = challenges.filter(ch => manager['validateChallenge'](ch));
      await invoke('save_challenges_to_file', {
        path: filePath,
        challenges: validChallenges as any,
      });
    } catch (error) {
      console.error('Failed to save challenges to file:', error);
      throw error;
    }
  },
};
