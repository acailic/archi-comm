import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Monitor,
  Activity,
  Bug,
  FileText,
  Cpu,
  Terminal,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { errorStore } from '@/lib/errorStore';
import { isDevelopment } from '@/lib/environment';
import { EnvironmentTab } from './diagnostics/tabs/EnvironmentTab';
import { PerformanceTab } from './diagnostics/tabs/PerformanceTab';
import { ErrorLogsTab } from './diagnostics/tabs/ErrorLogsTab';
import { AppLogsTab } from './diagnostics/tabs/AppLogsTab';
import { SystemInfoTab } from './diagnostics/tabs/SystemInfoTab';

// Types
interface TabConfig {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  component: React.ComponentType<any>;
  badge?: number;
}

// System Information Tab
const SystemInfoTab: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const collectSystemInfo = async () => {
      try {
        const info: SystemInfo = {
          browser: {
            name: navigator.userAgent.includes('Chrome')
              ? 'Chrome'
              : navigator.userAgent.includes('Firefox')
                ? 'Firefox'
                : navigator.userAgent.includes('Safari')
                  ? 'Safari'
                  : 'Unknown',
            version:
              navigator.userAgent.match(/(?:Chrome|Firefox|Safari)\/(\d+)/)?.[1] || 'Unknown',
            userAgent: navigator.userAgent,
          },
          platform: {
            os: navigator.platform,
            architecture: navigator.userAgent.includes('x64') ? 'x64' : 'x86',
            cores: navigator.hardwareConcurrency || 1,
          },
          memory: (() => {
            const perfMem = (performance as any).memory;
            const total = (perfMem?.totalJSHeapSize ?? 0) as number;
            const used = (perfMem?.usedJSHeapSize ?? 0) as number;
            const available = Math.max(total - used, 0);
            const percentage = total > 0 ? Math.round((used / total) * 100) : 0;
            return { total, used, available, percentage };
          })(),
          performance: {
            hardwareConcurrency: navigator.hardwareConcurrency || 1,
            deviceMemory: (navigator as any).deviceMemory,
            connection: (navigator as any).connection
              ? {
                  effectiveType: (navigator as any).connection.effectiveType,
                  downlink: (navigator as any).connection.downlink,
                  rtt: (navigator as any).connection.rtt,
                }
              : undefined,
          },
        };

        // Add Tauri info if available
        if (isTauriEnvironment()) {
          try {
            // Mock Tauri info (would use actual Tauri APIs)
            info.tauri = {
              version: '1.0.0',
              platform: 'desktop',
              arch: 'x86_64',
            };
          } catch (error) {
            console.warn('Failed to get Tauri info:', error);
          }
        }

        setSystemInfo(info);
      } catch (error) {
        console.error('Failed to collect system info:', error);
      } finally {
        setLoading(false);
      }
    };

    collectSystemInfo();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const runDiagnostics = useCallback(() => {
    console.log('Running system diagnostics...');
    // Would run actual diagnostics
  }, []);

  if (loading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary' />
      </div>
    );
  }

  if (!systemInfo) {
    return (
      <div className='text-center py-12 text-muted-foreground'>
        <AlertTriangle className='w-12 h-12 mx-auto mb-2 opacity-50' />
        <p>Failed to collect system information</p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-semibold'>System Information</h3>
        <button
          onClick={runDiagnostics}
          className='px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600'
        >
          Run Diagnostics
        </button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {/* Browser Info */}
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
            <div className='mt-2'>
              <span className='text-muted-foreground text-xs'>User Agent:</span>
              <p className='text-xs font-mono bg-muted p-2 rounded mt-1 break-all'>
                {systemInfo.browser.userAgent}
              </p>
            </div>
          </div>
        </div>

        {/* Platform Info */}
        <div className='bg-card border border-border rounded-lg p-4'>
          <div className='flex items-center space-x-2 mb-3'>
            <Cpu className='w-4 h-4 text-green-500' />
            <h4 className='font-medium'>Platform</h4>
          </div>
          <div className='space-y-2 text-sm'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>OS:</span>
              <span>{systemInfo.platform.os}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Architecture:</span>
              <span>{systemInfo.platform.architecture}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>CPU Cores:</span>
              <span>{systemInfo.platform.cores}</span>
            </div>
          </div>
        </div>

        {/* Memory Info */}
        <div className='bg-card border border-border rounded-lg p-4'>
          <div className='flex items-center space-x-2 mb-3'>
            <MemoryStick className='w-4 h-4 text-red-500' />
            <h4 className='font-medium'>Memory</h4>
          </div>
          <div className='space-y-2 text-sm'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Total:</span>
              <span>{formatBytes(systemInfo.memory.total)}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Used:</span>
              <span>{formatBytes(systemInfo.memory.used)}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Available:</span>
              <span>{formatBytes(systemInfo.memory.available)}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Usage:</span>
              <span
                className={systemInfo.memory.percentage > 80 ? 'text-red-600' : 'text-green-600'}
              >
                {systemInfo.memory.percentage}%
              </span>
            </div>
          </div>
        </div>

        {/* Performance Capabilities */}
        <div className='bg-card border border-border rounded-lg p-4'>
          <div className='flex items-center space-x-2 mb-3'>
            <Activity className='w-4 h-4 text-purple-500' />
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
            {systemInfo.performance.connection && (
              <>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Connection Type:</span>
                  <span>{systemInfo.performance.connection.effectiveType}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Downlink:</span>
                  <span>{systemInfo.performance.connection.downlink} Mbps</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>RTT:</span>
                  <span>{systemInfo.performance.connection.rtt} ms</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tauri Info (if available) */}
        {systemInfo.tauri && (
          <div className='bg-card border border-border rounded-lg p-4 md:col-span-2'>
            <div className='flex items-center space-x-2 mb-3'>
              <HardDrive className='w-4 h-4 text-orange-500' />
              <h4 className='font-medium'>Tauri Runtime</h4>
            </div>
            <div className='grid grid-cols-3 gap-4 text-sm'>
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

// Main Developer Diagnostics Page Component
export const DeveloperDiagnosticsPage: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('environment');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  // Track error count for badge
  useEffect(() => {
    const unsubscribe = errorStore.subscribe(state => {
      setErrorCount(state.errors.filter(e => !e.resolved).length);
    });
    return unsubscribe;
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'f':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setIsFullscreen(!isFullscreen);
          }
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const tabIndex = parseInt(e.key) - 1;
            const tabs = ['environment', 'performance', 'errors', 'logs', 'system'];
            if (tabs[tabIndex]) {
              setActiveTab(tabs[tabIndex]);
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, isFullscreen, onClose]);

  const tabs: TabConfig[] = [
    {
      id: 'environment',
      label: 'Environment',
      icon: Monitor,
      component: EnvironmentTab,
    },
    {
      id: 'performance',
      label: 'Performance',
      icon: Activity,
      component: PerformanceTab,
    },
    {
      id: 'errors',
      label: 'Error Logs',
      icon: Bug,
      component: ErrorLogsTab,
      badge: errorCount,
    },
    {
      id: 'logs',
      label: 'App Logs',
      icon: FileText,
      component: AppLogsTab,
    },
    {
      id: 'system',
      label: 'System Info',
      icon: Cpu,
      component: SystemInfoTab,
    },
  ];

  const ActiveTabComponent = tabs.find(tab => tab.id === activeTab)?.component || EnvironmentTab;

  if (!isOpen || !isDevelopment()) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4'
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`bg-background border border-border rounded-lg shadow-2xl overflow-hidden ${
            isFullscreen ? 'w-full h-full' : 'w-[95vw] h-[90vh] max-w-7xl'
          }`}
        >
          {/* Header */}
          <div className='flex items-center justify-between p-4 border-b border-border bg-card/50'>
            <div className='flex items-center space-x-3'>
              <Terminal className='w-5 h-5 text-primary' />
              <h1 className='text-lg font-semibold'>Developer Diagnostics</h1>
              <span className='px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded'>DEV MODE</span>
            </div>

            <div className='flex items-center space-x-2'>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className='p-2 rounded-md hover:bg-muted transition-colors'
                title='Toggle fullscreen (Ctrl+F)'
              >
                {isFullscreen ? (
                  <Minimize2 className='w-4 h-4' />
                ) : (
                  <Maximize2 className='w-4 h-4' />
                )}
              </button>

              <button
                onClick={onClose}
                className='p-2 rounded-md hover:bg-muted transition-colors'
                title='Close (Esc)'
              >
                <X className='w-4 h-4' />
              </button>
            </div>
          </div>

          <div className='flex h-full overflow-hidden'>
            {/* Sidebar */}
            <div className='w-64 border-r border-border bg-card/30 p-4'>
              <nav className='space-y-2'>
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${
                        activeTab === tab.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className='flex items-center space-x-2'>
                        <Icon className='w-4 h-4' />
                        <span>{tab.label}</span>
                      </div>
                      {tab.badge && tab.badge > 0 && (
                        <span className='px-2 py-0.5 text-xs bg-red-500 text-white rounded-full'>
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className='mt-8 pt-4 border-t border-border'>
                <h4 className='text-xs font-medium text-muted-foreground mb-2'>
                  Keyboard Shortcuts
                </h4>
                <div className='space-y-1 text-xs text-muted-foreground'>
                  <div>Ctrl+1-5 - Switch tabs</div>
                  <div>Ctrl+F - Toggle fullscreen</div>
                  <div>Esc - Close</div>
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className='flex-1 overflow-auto'>
              <div className='p-6'>
                <ActiveTabComponent />
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DeveloperDiagnosticsPage;
