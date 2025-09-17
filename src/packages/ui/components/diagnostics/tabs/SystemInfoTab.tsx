// src/components/diagnostics/tabs/SystemInfoTab.tsx
// System information tab for developer diagnostics
// Asynchronously collects and displays detailed system information
// RELEVANT FILES: DeveloperDiagnosticsPage.tsx, ../../../lib/environment.ts

import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Globe,
  Monitor,
  AlertTriangle,
} from 'lucide-react';

interface SystemInfo {
  browser: {
    name: string;
    version: string;
    userAgent: string;
  };
  platform: {
    os: string;
    architecture: string;
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    available: number;
    percentage: number;
  };
  performance: {
    hardwareConcurrency: number;
    deviceMemory?: number;
    connection?: {
      effectiveType: string;
      downlink: number;
      rtt: number;
    };
  };
  tauri?: {
    version: string;
    platform: string;
    arch: string;
  };
}

export const SystemInfoTab: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const collectSystemInfo = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const info: SystemInfo = {
        browser: {
          name: 'Unknown',
          version: 'Unknown',
          userAgent: navigator.userAgent,
        },
        platform: {
          os: navigator.platform,
          architecture: 'Unknown',
          cores: navigator.hardwareConcurrency || 0,
        },
        memory: {
          total: 0,
          used: 0,
          available: 0,
          percentage: 0,
        },
        performance: {
          hardwareConcurrency: navigator.hardwareConcurrency || 0,
        },
      };

      // Browser detection
      const ua = navigator.userAgent;
      if (ua.includes('Chrome')) {
        info.browser.name = 'Chrome';
        const match = ua.match(/Chrome\/(\d+\.\d+)/);
        if (match) info.browser.version = match[1];
      } else if (ua.includes('Firefox')) {
        info.browser.name = 'Firefox';
        const match = ua.match(/Firefox\/(\d+\.\d+)/);
        if (match) info.browser.version = match[1];
      } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
        info.browser.name = 'Safari';
        const match = ua.match(/Version\/(\d+\.\d+)/);
        if (match) info.browser.version = match[1];
      }

      // Memory information (if available)
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        if (memory) {
          info.memory.used = memory.usedJSHeapSize / 1024 / 1024;
          info.memory.total = memory.totalJSHeapSize / 1024 / 1024;
          info.memory.available = info.memory.total - info.memory.used;
          info.memory.percentage = (info.memory.used / info.memory.total) * 100;
        }
      }

      // Device memory (if available)
      if ('deviceMemory' in navigator) {
        info.performance.deviceMemory = (navigator as any).deviceMemory;
      }

      // Network information (if available)
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          info.performance.connection = {
            effectiveType: connection.effectiveType || 'unknown',
            downlink: connection.downlink || 0,
            rtt: connection.rtt || 0,
          };
        }
      }

      // Tauri information (if available)
      try {
        // Check if we're in a Tauri environment
        if (window.__TAURI__) {
          const { invoke } = window.__TAURI__.tauri;
          const tauriInfo = await invoke('get_system_info');
          info.tauri = tauriInfo;
        }
      } catch (e) {
        // Not in Tauri environment or failed to get info
      }

      setSystemInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to collect system information');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    collectSystemInfo();
  }, [collectSystemInfo]);

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4'></div>
          <p className='text-muted-foreground'>Collecting system information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='text-center'>
          <AlertTriangle className='w-12 h-12 mx-auto mb-4 text-red-500' />
          <p className='text-red-600'>Error: {error}</p>
          <button
            onClick={collectSystemInfo}
            className='mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90'
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!systemInfo) return null;

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-semibold'>System Information</h3>
        <button
          onClick={collectSystemInfo}
          className='px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90'
        >
          Refresh
        </button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {/* Browser Information */}
        <div className='bg-card border border-border rounded-lg p-4'>
          <div className='flex items-center space-x-2 mb-3'>
            <Globe className='w-4 h-4 text-blue-500' />
            <h4 className='font-medium'>Browser</h4>
          </div>
          <div className='space-y-2 text-sm'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Name:</span>
              <span>{systemInfo.browser.name}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Version:</span>
              <span>{systemInfo.browser.version}</span>
            </div>
          </div>
        </div>

        {/* Platform Information */}
        <div className='bg-card border border-border rounded-lg p-4'>
          <div className='flex items-center space-x-2 mb-3'>
            <Monitor className='w-4 h-4 text-green-500' />
            <h4 className='font-medium'>Platform</h4>
          </div>
          <div className='space-y-2 text-sm'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>OS:</span>
              <span>{systemInfo.platform.os}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Cores:</span>
              <span>{systemInfo.platform.cores}</span>
            </div>
          </div>
        </div>

        {/* Memory Information */}
        <div className='bg-card border border-border rounded-lg p-4'>
          <div className='flex items-center space-x-2 mb-3'>
            <MemoryStick className='w-4 h-4 text-purple-500' />
            <h4 className='font-medium'>Memory</h4>
          </div>
          <div className='space-y-2 text-sm'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Used:</span>
              <span>{systemInfo.memory.used.toFixed(1)} MB</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Total:</span>
              <span>{systemInfo.memory.total.toFixed(1)} MB</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Usage:</span>
              <span>{systemInfo.memory.percentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Performance Information */}
        <div className='bg-card border border-border rounded-lg p-4'>
          <div className='flex items-center space-x-2 mb-3'>
            <Cpu className='w-4 h-4 text-orange-500' />
            <h4 className='font-medium'>Performance</h4>
          </div>
          <div className='space-y-2 text-sm'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Hardware Concurrency:</span>
              <span>{systemInfo.performance.hardwareConcurrency}</span>
            </div>
            {systemInfo.performance.deviceMemory && (
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Device Memory:</span>
                <span>{systemInfo.performance.deviceMemory} GB</span>
              </div>
            )}
          </div>
        </div>

        {/* Tauri Information */}
        {systemInfo.tauri && (
          <div className='bg-card border border-border rounded-lg p-4'>
            <div className='flex items-center space-x-2 mb-3'>
              <HardDrive className='w-4 h-4 text-gray-500' />
              <h4 className='font-medium'>Tauri Runtime</h4>
            </div>
            <div className='space-y-2 text-sm'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Version:</span>
                <span>{systemInfo.tauri.version}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Platform:</span>
                <span>{systemInfo.tauri.platform}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Architecture:</span>
                <span>{systemInfo.tauri.arch}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};