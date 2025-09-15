// e2e/demo-scenarios/demo-config.ts
// Configuration and utilities for video demo generation
// Provides standardized demo settings, recording utilities, and quality assurance tools
// RELEVANT FILES: playwright.config.ts, e2e/utils/test-helpers.ts, e2e/utils/video-helpers.ts, package.json

import { Page, BrowserContext } from '@playwright/test';

/**
 * Demo configuration interface defining video quality and recording settings
 */
export interface DemoConfig {
  /** Video resolution quality setting */
  videoQuality: 'HD' | 'FHD' | '4K';
  /** Frame rate for video recording */
  frameRate: 30 | 60;
  /** Demo duration category */
  duration: 'short' | 'medium' | 'long'; // 2min, 5min, 10min
  /** Demo pacing speed */
  pacing: 'fast' | 'normal' | 'slow';
  /** Include audio narration */
  includeAudio: boolean;
  /** Show performance metrics overlay */
  showMetrics: boolean;
  /** Include explanatory annotations */
  includeAnnotations: boolean;
  /** Show UI element highlights */
  showHighlights: boolean;
  /** Enable smooth transitions */
  smoothTransitions: boolean;
}

/**
 * Default demo configuration optimized for high-quality demonstrations
 */
export const DEFAULT_DEMO_CONFIG: DemoConfig = {
  videoQuality: 'FHD',
  frameRate: 60,
  duration: 'medium',
  pacing: 'normal',
  includeAudio: false,
  showMetrics: true,
  includeAnnotations: true,
  showHighlights: true,
  smoothTransitions: true
};

/**
 * Predefined demo configurations for different use cases
 */
export const DEMO_PRESETS = {
  /** High-quality marketing demo */
  MARKETING: {
    ...DEFAULT_DEMO_CONFIG,
    videoQuality: '4K' as const,
    pacing: 'slow' as const,
    includeAnnotations: true,
    showHighlights: true,
    smoothTransitions: true
  },

  /** Quick feature demonstration */
  FEATURE_DEMO: {
    ...DEFAULT_DEMO_CONFIG,
    videoQuality: 'FHD' as const,
    duration: 'short' as const,
    pacing: 'normal' as const,
    showMetrics: false
  },

  /** Performance showcase */
  PERFORMANCE: {
    ...DEFAULT_DEMO_CONFIG,
    videoQuality: 'FHD' as const,
    frameRate: 60 as const,
    showMetrics: true,
    includeAnnotations: true,
    pacing: 'normal' as const
  },

  /** Educational/tutorial demo */
  TUTORIAL: {
    ...DEFAULT_DEMO_CONFIG,
    videoQuality: 'FHD' as const,
    duration: 'long' as const,
    pacing: 'slow' as const,
    includeAnnotations: true,
    showHighlights: true
  },

  /** Mobile/touch demo */
  MOBILE: {
    ...DEFAULT_DEMO_CONFIG,
    videoQuality: 'FHD' as const,
    pacing: 'normal' as const,
    showHighlights: true,
    smoothTransitions: true
  }
};

/**
 * Video recording utilities for managing optimal demo recording
 */
export class DemoRecorder {
  private page: Page;
  private config: DemoConfig;
  private recordingActive: boolean = false;

  constructor(page: Page, config: DemoConfig = DEFAULT_DEMO_CONFIG) {
    this.page = page;
    this.config = config;
  }

  /**
   * Initialize demo recording environment with optimal settings
   */
  async startRecording(): Promise<void> {
    this.recordingActive = true;

    // Set demo mode flags
    await this.page.evaluate((config) => {
      window.DEMO_MODE = true;
      window.DEMO_CONFIG = config;
      window.VIDEO_RECORDING = true;

      // Performance optimizations for recording
      if (config.showMetrics) {
        window.SHOW_PERFORMANCE_METRICS = true;
      }

      // Enable smooth transitions
      if (config.smoothTransitions) {
        document.documentElement.style.setProperty('--demo-transition-speed', '0.3s');
      }
    }, this.config);

    // Configure video quality
    await this.configureVideoQuality();

    // Set up performance monitoring if enabled
    if (this.config.showMetrics) {
      await this.enablePerformanceMonitoring();
    }

    // Initialize annotation system if enabled
    if (this.config.includeAnnotations) {
      await this.initializeAnnotationSystem();
    }

    console.log(`🎬 Demo recording started with ${this.config.videoQuality} quality at ${this.config.frameRate}fps`);
  }

  /**
   * Stop demo recording and cleanup
   */
  async stopRecording(): Promise<void> {
    this.recordingActive = false;

    await this.page.evaluate(() => {
      window.DEMO_MODE = false;
      window.VIDEO_RECORDING = false;
      delete window.DEMO_CONFIG;
    });

    console.log('🛑 Demo recording stopped');
  }

  /**
   * Configure video quality settings based on demo config
   */
  private async configureVideoQuality(): Promise<void> {
    const qualitySettings = {
      'HD': { width: 1280, height: 720 },
      'FHD': { width: 1920, height: 1080 },
      '4K': { width: 3840, height: 2160 }
    };

    const settings = qualitySettings[this.config.videoQuality];

    await this.page.setViewportSize(settings);

    // Set frame rate preference
    await this.page.evaluate((frameRate) => {
      if ('requestAnimationFrame' in window) {
        window.PREFERRED_FRAME_RATE = frameRate;
      }
    }, this.config.frameRate);
  }

  /**
   * Enable performance monitoring overlay for demo
   */
  private async enablePerformanceMonitoring(): Promise<void> {
    await this.page.evaluate(() => {
      // Create performance overlay
      const overlay = document.createElement('div');
      overlay.id = 'demo-performance-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-family: monospace;
        font-size: 12px;
        z-index: 10000;
        min-width: 200px;
      `;

      // Performance metrics
      let fps = 0;
      let frameCount = 0;
      let lastTime = performance.now();

      const updateMetrics = () => {
        const now = performance.now();
        frameCount++;

        if (now >= lastTime + 1000) {
          fps = Math.round((frameCount * 1000) / (now - lastTime));
          frameCount = 0;
          lastTime = now;

          const memory = (performance as any).memory;
          const memoryMB = memory ? Math.round(memory.usedJSHeapSize / 1024 / 1024) : 'N/A';

          overlay.innerHTML = `
            <div>FPS: ${fps}</div>
            <div>Memory: ${memoryMB} MB</div>
            <div>Components: ${document.querySelectorAll('[data-testid*="component-"]').length}</div>
            <div>Recording: Active</div>
          `;
        }

        requestAnimationFrame(updateMetrics);
      };

      updateMetrics();
      document.body.appendChild(overlay);
    });
  }

  /**
   * Initialize annotation system for demo explanations
   */
  private async initializeAnnotationSystem(): Promise<void> {
    await this.page.evaluate(() => {
      window.demoAnnotations = [];

      // Create annotation manager
      window.addDemoAnnotation = (text: string, x: number, y: number, duration: number = 3000) => {
        const annotation = document.createElement('div');
        annotation.className = 'demo-annotation';
        annotation.style.cssText = `
          position: absolute;
          left: ${x}px;
          top: ${y}px;
          background: rgba(0, 102, 204, 0.9);
          color: white;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          max-width: 300px;
          z-index: 9999;
          animation: fadeInOut ${duration}ms ease-in-out;
          pointer-events: none;
        `;

        annotation.textContent = text;
        document.body.appendChild(annotation);

        setTimeout(() => {
          if (annotation.parentNode) {
            annotation.parentNode.removeChild(annotation);
          }
        }, duration);
      };

      // CSS for annotations
      const style = document.createElement('style');
      style.textContent = `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-10px); }
          20% { opacity: 1; transform: translateY(0); }
          80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
      `;
      document.head.appendChild(style);
    });
  }

  /**
   * Add timing delays based on demo pacing configuration
   */
  async pace(baseDelay: number = 1000): Promise<void> {
    if (!this.recordingActive) return;

    const multipliers = {
      'fast': 0.5,
      'normal': 1.0,
      'slow': 1.5
    };

    const delay = baseDelay * multipliers[this.config.pacing];
    await this.page.waitForTimeout(delay);
  }

  /**
   * Highlight UI element for demo clarity
   */
  async highlightElement(selector: string, duration: number = 2000): Promise<void> {
    if (!this.config.showHighlights) return;

    await this.page.evaluate(({ selector, duration }) => {
      const element = document.querySelector(selector);
      if (element) {
        const highlight = document.createElement('div');
        highlight.style.cssText = `
          position: absolute;
          border: 3px solid #ff6b35;
          border-radius: 8px;
          pointer-events: none;
          z-index: 9998;
          box-shadow: 0 0 20px rgba(255, 107, 53, 0.5);
          animation: pulse 1s infinite;
        `;

        const rect = element.getBoundingClientRect();
        highlight.style.left = (rect.left - 5) + 'px';
        highlight.style.top = (rect.top - 5) + 'px';
        highlight.style.width = (rect.width + 10) + 'px';
        highlight.style.height = (rect.height + 10) + 'px';

        document.body.appendChild(highlight);

        setTimeout(() => {
          if (highlight.parentNode) {
            highlight.parentNode.removeChild(highlight);
          }
        }, duration);
      }
    }, { selector, duration });
  }
}

/**
 * Demo data management for consistent scenarios
 */
export class DemoDataManager {
  /**
   * Get demo-optimized component data
   */
  static getDemoComponents() {
    return {
      ecommerce: [
        { type: 'web-app', name: 'Customer Portal', category: 'frontend' },
        { type: 'mobile-app', name: 'Mobile App', category: 'frontend' },
        { type: 'api-gateway', name: 'API Gateway', category: 'gateway' },
        { type: 'microservice', name: 'User Service', category: 'service' },
        { type: 'microservice', name: 'Product Service', category: 'service' },
        { type: 'microservice', name: 'Order Service', category: 'service' },
        { type: 'microservice', name: 'Payment Service', category: 'service' },
        { type: 'database', name: 'User Database', category: 'data' },
        { type: 'database', name: 'Product Database', category: 'data' },
        { type: 'cache', name: 'Redis Cache', category: 'data' },
        { type: 'message-queue', name: 'Event Bus', category: 'integration' },
        { type: 'monitoring', name: 'Application Monitoring', category: 'infrastructure' }
      ],

      microservices: [
        { type: 'api-gateway', name: 'Kong Gateway', category: 'gateway' },
        { type: 'service-mesh', name: 'Istio Service Mesh', category: 'infrastructure' },
        { type: 'microservice', name: 'User Management', category: 'service' },
        { type: 'microservice', name: 'Authentication', category: 'service' },
        { type: 'microservice', name: 'Authorization', category: 'service' },
        { type: 'microservice', name: 'Notification', category: 'service' },
        { type: 'database', name: 'User DB (PostgreSQL)', category: 'data' },
        { type: 'database', name: 'Session Store (Redis)', category: 'data' },
        { type: 'monitoring', name: 'Distributed Tracing', category: 'infrastructure' }
      ],

      cloud: [
        { type: 'load-balancer', name: 'Application Load Balancer', category: 'networking' },
        { type: 'cdn', name: 'CloudFront CDN', category: 'networking' },
        { type: 'compute', name: 'EC2 Auto Scaling', category: 'compute' },
        { type: 'container', name: 'EKS Cluster', category: 'compute' },
        { type: 'database', name: 'RDS PostgreSQL', category: 'data' },
        { type: 'storage', name: 'S3 Object Storage', category: 'data' },
        { type: 'monitoring', name: 'CloudWatch', category: 'monitoring' },
        { type: 'security', name: 'WAF & Shield', category: 'security' }
      ]
    };
  }

  /**
   * Generate realistic demo scenario data
   */
  static generateScenario(type: 'startup' | 'enterprise' | 'education') {
    const scenarios = {
      startup: {
        title: 'FinTech Startup MVP',
        description: 'Design a minimal viable product for a financial technology startup',
        constraints: ['Limited budget: $50k/month', 'Small team: 5 engineers', 'Fast iteration: 2-week sprints'],
        requirements: ['10k users in year 1', 'Mobile-first design', 'Regulatory compliance'],
        timeline: '6 months to MVP',
        components: ['web-app', 'mobile-app', 'api', 'database', 'payment-gateway']
      },

      enterprise: {
        title: 'Enterprise E-commerce Platform',
        description: 'Large-scale e-commerce architecture for 1M+ concurrent users',
        constraints: ['High availability: 99.9%', 'Global scale', 'Regulatory compliance'],
        requirements: ['1M concurrent users', 'Real-time inventory', 'Multi-region deployment'],
        timeline: '18 months implementation',
        components: ['microservices', 'databases', 'caching', 'monitoring', 'security']
      },

      education: {
        title: 'System Design Assignment',
        description: 'CS 301: Design a social media platform',
        constraints: ['Consider CAP theorem', 'Scalability requirements', 'Cost optimization'],
        requirements: ['1M daily active users', 'Real-time messaging', 'Content feed'],
        timeline: '2 weeks to complete',
        components: ['frontend', 'backend', 'database', 'caching', 'real-time']
      }
    };

    return scenarios[type];
  }
}

/**
 * Timing configuration for different demo paces
 */
export const DEMO_TIMING = {
  fast: {
    componentAdd: 300,
    connectionCreate: 400,
    transition: 500,
    annotation: 1000,
    pause: 800
  },
  normal: {
    componentAdd: 600,
    connectionCreate: 800,
    transition: 1000,
    annotation: 1500,
    pause: 1500
  },
  slow: {
    componentAdd: 1000,
    connectionCreate: 1200,
    transition: 1500,
    annotation: 2500,
    pause: 2000
  }
};

/**
 * Demo quality assurance utilities
 */
export class DemoQualityValidator {
  /**
   * Validate video quality and performance metrics
   */
  static async validateDemoQuality(page: Page): Promise<boolean> {
    const metrics = await page.evaluate(() => {
      const performanceEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      return {
        loadTime: performanceEntry.loadEventEnd - performanceEntry.loadEventStart,
        fps: window.lastKnownFPS || 60,
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
        componentCount: document.querySelectorAll('[data-testid*="component-"]').length
      };
    });

    // Quality thresholds
    const thresholds = {
      maxLoadTime: 5000, // 5 seconds
      minFPS: 30,
      maxMemoryMB: 500,
      maxComponents: 1000
    };

    const issues: string[] = [];

    if (metrics.loadTime > thresholds.maxLoadTime) {
      issues.push(`Load time too high: ${metrics.loadTime}ms`);
    }

    if (metrics.fps < thresholds.minFPS) {
      issues.push(`FPS too low: ${metrics.fps}`);
    }

    const memoryMB = metrics.memoryUsage / 1024 / 1024;
    if (memoryMB > thresholds.maxMemoryMB) {
      issues.push(`Memory usage too high: ${memoryMB.toFixed(1)}MB`);
    }

    if (metrics.componentCount > thresholds.maxComponents) {
      issues.push(`Too many components: ${metrics.componentCount}`);
    }

    if (issues.length > 0) {
      console.warn('Demo quality issues detected:', issues);
      return false;
    }

    console.log('✅ Demo quality validation passed');
    return true;
  }

  /**
   * Generate demo quality report
   */
  static async generateQualityReport(page: Page): Promise<object> {
    return await page.evaluate(() => {
      const report = {
        timestamp: new Date().toISOString(),
        performance: {
          fps: window.lastKnownFPS || 'N/A',
          memoryUsage: (performance as any).memory?.usedJSHeapSize || 'N/A',
          loadTime: performance.timing.loadEventEnd - performance.timing.loadEventStart
        },
        content: {
          componentCount: document.querySelectorAll('[data-testid*="component-"]').length,
          connectionCount: document.querySelectorAll('[data-testid*="connection-"]').length,
          annotationCount: document.querySelectorAll('.demo-annotation').length
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio
        }
      };

      return report;
    });
  }
}

/**
 * Export utilities for external access
 */
export const DemoUtils = {
  DemoRecorder,
  DemoDataManager,
  DemoQualityValidator,
  DEMO_PRESETS,
  DEMO_TIMING,
  DEFAULT_DEMO_CONFIG
};