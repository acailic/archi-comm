import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Copy,
  ExternalLink,
  Monitor,
  Activity,
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  MemoryStick,
  Cpu,
  HardDrive,
  Globe,
  Settings,
  Bug,
  Zap,
  FileText,
  BarChart3,
  Terminal,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring';
import { errorStore } from '../lib/errorStore';
import { 
  isDevelopment, 
  isProduction, 
  isTauriEnvironment, 
  isWebEnvironment,
  RUNTIME_ENV,
  FEATURES,
  CONFIG,
  DEBUG
} from '../lib/environment';
import { logger, LogLevel } from '../lib/logger';

// Types
interface TabConfig {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  component: React.ComponentType<any>;
  badge?: number;
}

interface LogEntry {
  id: string;
  timestamp: number;
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  scope?: string;
  data?: any;
  stack?: string;
}

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

// Using centralized logger via ../lib/logger

// Environment Info Tab
const EnvironmentTab: React.FC = () => {
  const environmentData = useMemo(() => ({
    runtime: {
      environment: RUNTIME_ENV,
      isDevelopment: isDevelopment(),
      isProduction: isProduction(),
      isTauri: isTauriEnvironment(),
      isWeb: isWebEnvironment(),
    },
    features: FEATURES,
    config: CONFIG,
    buildInfo: {
      mode: import.meta.env.MODE,
      dev: import.meta.env.DEV,
      prod: import.meta.env.PROD,
      ssr: import.meta.env.SSR,
      baseUrl: import.meta.env.BASE_URL,
    },
  }), []);

  const copyToClipboard = useCallback((data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Environment Information</h3>
        <button
          onClick={() => copyToClipboard(environmentData)}
          className="flex items-center space-x-2 px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          <Copy className="w-4 h-4" />
          <span>Copy All</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Runtime Environment */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Monitor className="w-4 h-4 text-blue-500" />
            <h4 className="font-medium">Runtime Environment</h4>
          </div>
          <div className="space-y-2 text-sm">
            {Object.entries(environmentData.runtime).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-muted-foreground">{key}:</span>
                <span className={`font-mono ${value ? 'text-green-600' : 'text-red-600'}`}>
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Build Information */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Settings className="w-4 h-4 text-purple-500" />
            <h4 className="font-medium">Build Information</h4>
          </div>
          <div className="space-y-2 text-sm">
            {Object.entries(environmentData.buildInfo).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-muted-foreground">{key}:</span>
                <span className="font-mono">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Flags */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Zap className="w-4 h-4 text-yellow-500" />
            <h4 className="font-medium">Feature Flags</h4>
          </div>
          <div className="space-y-2 text-sm">
            {Object.entries(environmentData.features).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-muted-foreground">{key}:</span>
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${value ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="font-mono">{String(value)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Configuration */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Settings className="w-4 h-4 text-gray-500" />
            <h4 className="font-medium">Configuration</h4>
          </div>
          <div className="space-y-2 text-sm max-h-48 overflow-y-auto">
            <pre className="text-xs bg-muted p-2 rounded font-mono">
              {JSON.stringify(environmentData.config, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

// Performance Metrics Tab
const PerformanceTab: React.FC = () => {
  const { data, controls, isMonitoring } = usePerformanceMonitoring({
    enableDebugLogging: true,
    pollingInterval: 1000,
  });

  const createBaseline = useCallback(() => {
    const baseline = {
      name: `Baseline ${new Date().toLocaleTimeString()}`,
      timestamp: Date.now(),
      data: { ...data },
    };
    console.log('Created performance baseline:', baseline);
  }, [data]);

  const exportData = useCallback(() => {
    const exportData = controls.exportData();
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [controls]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Performance Metrics</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={createBaseline}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Create Baseline
          </button>
          <button
            onClick={exportData}
            className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
          >
            Export Data
          </button>
          <button
            onClick={controls.clearHistory}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear History
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">FPS</span>
          </div>
          <div className="text-2xl font-bold">{data.fps}</div>
          <div className="text-xs text-muted-foreground">Frames per second</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium">Render Time</span>
          </div>
          <div className="text-2xl font-bold">{data.avgRenderTime.toFixed(1)}ms</div>
          <div className="text-xs text-muted-foreground">Average render duration</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <MemoryStick className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium">Memory</span>
          </div>
          <div className="text-2xl font-bold">{data.memoryUsage.toFixed(1)}MB</div>
          <div className="text-xs text-muted-foreground">Heap memory usage</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Activity className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">Health Score</span>
          </div>
          <div className="text-2xl font-bold">{data.healthScore}</div>
          <div className="text-xs text-muted-foreground">Overall performance</div>
        </div>
      </div>

      {/* Performance History Chart */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h4 className="font-medium mb-4">Performance History</h4>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Performance charts would be rendered here</p>
            <p className="text-xs">Reusing charts from PerformanceDashboard.tsx</p>
          </div>
        </div>
      </div>

      {/* Active Measurements */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h4 className="font-medium mb-4">Active Measurements</h4>
        <div className="text-sm text-muted-foreground">
          {data.activeMeasurements} active measurements
        </div>
      </div>
    </div>
  );
};

// Error Logs Tab
const ErrorLogsTab: React.FC = () => {
  const [errors, setErrors] = useState(errorStore.getState().errors);
  const [filter, setFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  useEffect(() => {
    const unsubscribe = errorStore.subscribe((state) => {
      setErrors(state.errors);
    });
    return unsubscribe;
  }, []);

  const filteredErrors = useMemo(() => {
    return errors.filter(error => {
      const matchesSearch = !filter || 
        error.message.toLowerCase().includes(filter.toLowerCase()) ||
        error.stack?.toLowerCase().includes(filter.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || error.category === categoryFilter;
      const matchesSeverity = severityFilter === 'all' || error.severity === severityFilter;
      
      return matchesSearch && matchesCategory && matchesSeverity;
    });
  }, [errors, filter, categoryFilter, severityFilter]);

  const clearErrors = useCallback(() => {
    errorStore.clearErrors();
  }, []);

  const exportErrors = useCallback(() => {
    const data = errorStore.exportErrors();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const resolveError = useCallback((errorId: string) => {
    errorStore.resolveError(errorId);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Error Logs</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={exportErrors}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Export
          </button>
          <button
            onClick={clearErrors}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search errors..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-md"
            />
          </div>
        </div>
        
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-border rounded-md"
        >
          <option value="all">All Categories</option>
          <option value="react">React</option>
          <option value="global">Global</option>
          <option value="performance">Performance</option>
          <option value="network">Network</option>
          <option value="unknown">Unknown</option>
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 border border-border rounded-md"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Error List */}
      <div className="space-y-3">
        {filteredErrors.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bug className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No errors found</p>
          </div>
        ) : (
          filteredErrors.map((error) => (
            <div
              key={error.id}
              className={`border rounded-lg p-4 ${error.resolved ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded border ${getSeverityColor(error.severity)}`}>
                    {error.severity.toUpperCase()}
                  </span>
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                    {error.category}
                  </span>
                  {error.count > 1 && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                      {error.count}x
                    </span>
                  )}
                  {error.resolved && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(error.timestamp).toLocaleTimeString()}
                  </span>
                  {!error.resolved && (
                    <button
                      onClick={() => resolveError(error.id)}
                      className="text-xs text-green-600 hover:text-green-700"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
              
              <div className="mb-2">
                <p className="font-medium text-sm">{error.message}</p>
              </div>
              
              {error.stack && (
                <details className="mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer">
                    Stack trace
                  </summary>
                  <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                    {error.stack}
                  </pre>
                </details>
              )}
              
              {error.context && Object.keys(error.context).length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer">
                    Context
                  </summary>
                  <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                    {JSON.stringify(error.context, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Application Logs Tab
const ApplicationLogsTab: React.FC = () => {
  const [filter, setFilter] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [, forceRefresh] = useState<number>(0);

  const mapLevel = useCallback((val: string): LogLevel | undefined => {
    switch (val) {
      case 'trace': return LogLevel.TRACE;
      case 'debug': return LogLevel.DEBUG;
      case 'info': return LogLevel.INFO;
      case 'warn': return LogLevel.WARN;
      case 'error': return LogLevel.ERROR;
      case 'fatal': return LogLevel.FATAL;
      default: return undefined;
    }
  }, []);

  const filteredLogs = useMemo(() => {
    const level = mapLevel(levelFilter);
    const scope = scopeFilter === 'all' ? undefined : scopeFilter;
    const search = filter || undefined;
    // getFilteredLogs uses level as minimum severity filter
    const entries = logger.getFilteredLogs({ level, scope, search });
    // Map centralized entry type to local UI LogEntry shape
    return entries.map((e: any, idx: number) => ({
      id: `${e.timestamp}-${idx}`,
      timestamp: e.timestamp,
      level: (e.levelName || '').toLowerCase() as LogEntry['level'],
      message: e.message,
      scope: e.scope,
      data: e.data,
      stack: e.stack,
    }));
  }, [filter, levelFilter, scopeFilter, mapLevel]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': case 'fatal': return 'text-red-600';
      case 'warn': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      case 'debug': return 'text-purple-600';
      case 'trace': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const exportLogs = useCallback(() => {
    const data = logger.exportLogs('json');
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `application-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const clearLogs = useCallback(() => {
    logger.clearLogs();
    forceRefresh(x => x + 1);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Application Logs</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={exportLogs}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Export
          </button>
          <button
            onClick={clearLogs}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search logs..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-md"
            />
          </div>
        </div>
        
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="px-3 py-2 border border-border rounded-md"
        >
          <option value="all">All Levels</option>
          <option value="trace">Trace</option>
          <option value="debug">Debug</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
          <option value="fatal">Fatal</option>
        </select>

        <select
          value={scopeFilter}
          onChange={(e) => setScopeFilter(e.target.value)}
          className="px-3 py-2 border border-border rounded-md"
        >
          <option value="all">All Scopes</option>
          <option value="app">App</option>
          <option value="performance">Performance</option>
          <option value="react">React</option>
          <option value="network">Network</option>
        </select>
      </div>

      {/* Log List */}
      <div className="bg-card border border-border rounded-lg">
        <div className="max-h-96 overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No logs found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredLogs.map((log) => (
                <div key={log.id} className="p-3 hover:bg-muted/50">
                  <div className="flex items-start space-x-3">
                    <span className="text-xs text-muted-foreground min-w-20">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`text-xs font-medium min-w-12 ${getLevelColor(log.level)}`}>
                      {log.level.toUpperCase()}
                    </span>
                    {log.scope && (
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        {log.scope}
                      </span>
                    )}
                    <div className="flex-1">
                      <p className="text-sm">{log.message}</p>
                      {log.data && (
                        <details className="mt-1">
                          <summary className="text-xs text-muted-foreground cursor-pointer">
                            Data
                          </summary>
                          <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </details>
                      )}
                      {log.stack && (
                        <details className="mt-1">
                          <summary className="text-xs text-muted-foreground cursor-pointer">
                            Stack
                          </summary>
                          <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                            {log.stack}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// System Information Tab
const SystemInfoTab: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const collectSystemInfo = async () => {
      try {
        const info: SystemInfo = {
          browser: {
            name: navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                  navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                  navigator.userAgent.includes('Safari') ? 'Safari' : 'Unknown',
            version: navigator.userAgent.match(/(?:Chrome|Firefox|Safari)\/(\d+)/)?.[1] || 'Unknown',
            userAgent: navigator.userAgent,
          },
          platform: {
            os: navigator.platform,
            architecture: navigator.userAgent.includes('x64') ? 'x64' : 'x86',
            cores: navigator.hardwareConcurrency || 1,
          },
          memory: {
            total: (performance as any).memory?.totalJSHeapSize || 0,
            used: (performance as any).memory?.usedJSHeapSize || 0,
            available: (performance as any).memory?.totalJSHeapSize - (performance as any).memory?.usedJSHeapSize || 0,
            percentage: (performance as any).memory ? 
              Math.round(((performance as any).memory.usedJSHeapSize / (performance as any).memory.totalJSHeapSize) * 100) : 0,
          },
          performance: {
            hardwareConcurrency: navigator.hardwareConcurrency || 1,
            deviceMemory: (navigator as any).deviceMemory,
            connection: (navigator as any).connection ? {
              effectiveType: (navigator as any).connection.effectiveType,
              downlink: (navigator as any).connection.downlink,
              rtt: (navigator as any).connection.rtt,
            } : undefined,
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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!systemInfo) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Failed to collect system information</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">System Information</h3>
        <button
          onClick={runDiagnostics}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Run Diagnostics
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Browser Info */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Globe className="w-4 h-4 text-blue-500" />
            <h4 className="font-medium">Browser</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span>{systemInfo.browser.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version:</span>
              <span>{systemInfo.browser.version}</span>
            </div>
            <div className="mt-2">
              <span className="text-muted-foreground text-xs">User Agent:</span>
              <p className="text-xs font-mono bg-muted p-2 rounded mt-1 break-all">
                {systemInfo.browser.userAgent}
              </p>
            </div>
          </div>
        </div>

        {/* Platform Info */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Cpu className="w-4 h-4 text-green-500" />
            <h4 className="font-medium">Platform</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">OS:</span>
              <span>{systemInfo.platform.os}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Architecture:</span>
              <span>{systemInfo.platform.architecture}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">CPU Cores:</span>
              <span>{systemInfo.platform.cores}</span>
            </div>
          </div>
        </div>

        {/* Memory Info */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <MemoryStick className="w-4 h-4 text-red-500" />
            <h4 className="font-medium">Memory</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total:</span>
              <span>{formatBytes(systemInfo.memory.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Used:</span>
              <span>{formatBytes(systemInfo.memory.used)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Available:</span>
              <span>{formatBytes(systemInfo.memory.available)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Usage:</span>
              <span className={systemInfo.memory.percentage > 80 ? 'text-red-600' : 'text-green-600'}>
                {systemInfo.memory.percentage}%
              </span>
            </div>
          </div>
        </div>

        {/* Performance Capabilities */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Activity className="w-4 h-4 text-purple-500" />
            <h4 className="font-medium">Performance</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hardware Concurrency:</span>
              <span>{systemInfo.performance.hardwareConcurrency}</span>
            </div>
            {systemInfo.performance.deviceMemory && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Device Memory:</span>
                <span>{systemInfo.performance.deviceMemory} GB</span>
              </div>
            )}
            {systemInfo.performance.connection && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Connection Type:</span>
                  <span>{systemInfo.performance.connection.effectiveType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Downlink:</span>
                  <span>{systemInfo.performance.connection.downlink} Mbps</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">RTT:</span>
                  <span>{systemInfo.performance.connection.rtt} ms</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tauri Info (if available) */}
        {systemInfo.tauri && (
          <div className="bg-card border border-border rounded-lg p-4 md:col-span-2">
            <div className="flex items-center space-x-2 mb-3">
              <HardDrive className="w-4 h-4 text-orange-500" />
              <h4 className="font-medium">Tauri Runtime</h4>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version:</span>
                <span>{systemInfo.tauri.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform:</span>
                <span>{systemInfo.tauri.platform}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Architecture:</span>
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
    const unsubscribe = errorStore.subscribe((state) => {
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
      component: ApplicationLogsTab,
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
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
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
          <div className="flex items-center justify-between p-4 border-b border-border bg-card/50">
            <div className="flex items-center space-x-3">
              <Terminal className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold">Developer Diagnostics</h1>
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                DEV MODE
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 rounded-md hover:bg-muted transition-colors"
                title="Toggle fullscreen (Ctrl+F)"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-md hover:bg-muted transition-colors"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex h-full overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 border-r border-border bg-card/30 p-4">
              <nav className="space-y-2">
                {tabs.map((tab) => {
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
                      <div className="flex items-center space-x-2">
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                      </div>
                      {tab.badge && tab.badge > 0 && (
                        <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="mt-8 pt-4 border-t border-border">
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Keyboard Shortcuts</h4>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>Ctrl+1-5 - Switch tabs</div>
                  <div>Ctrl+F - Toggle fullscreen</div>
                  <div>Esc - Close</div>
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-auto">
              <div className="p-6">
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
