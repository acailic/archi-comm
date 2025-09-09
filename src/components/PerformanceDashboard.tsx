import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  Play,
  Pause,
  RotateCcw,
  Settings,
  TrendingUp,
  Activity,
  Zap,
  Clock,
  MemoryStick,
  Target,
  AlertTriangle,
  CheckCircle,
  Info,
  Maximize2,
  Minimize2,
  BarChart3,
  LineChart,
  PieChart,
  Monitor,
} from 'lucide-react';
import { PerformanceMonitor, MemoryOptimizer } from '../lib/performance/PerformanceOptimizer';

interface PerformanceDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleRecording?: (recording: boolean) => void;
}

interface PerformanceData {
  timestamp: number;
  fps: number;
  renderTime: number;
  memoryUsage: number;
  dirtyRegions: number;
  renderCommands: number;
  workerUtilization: number;
}

interface PerformanceBaseline {
  name: string;
  timestamp: number;
  avgFps: number;
  avgRenderTime: number;
  avgMemoryUsage: number;
}

interface ChartProps {
  data: PerformanceData[];
  width: number;
  height: number;
  metric: keyof PerformanceData;
  color: string;
  targetLines?: number[];
  label: string;
  unit: string;
}

const Chart: React.FC<ChartProps> = ({
  data,
  width,
  height,
  metric,
  color,
  targetLines = [],
  label,
  unit,
}) => {
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const values = data.map(d => d[metric] as number);
  const maxValue = Math.max(...values, ...targetLines) * 1.1;
  const minValue = Math.min(...values, 0);
  const valueRange = maxValue - minValue;

  const points = data
    .map((d, i) => {
      const x = padding + (i / (data.length - 1)) * chartWidth;
      const y =
        padding + chartHeight - (((d[metric] as number) - minValue) / valueRange) * chartHeight;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className='relative'>
      <svg width={width} height={height} className='border border-border rounded'>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
          <g key={ratio}>
            <line
              x1={padding}
              y1={padding + chartHeight * ratio}
              x2={padding + chartWidth}
              y2={padding + chartHeight * ratio}
              stroke='currentColor'
              strokeOpacity={0.1}
              strokeWidth={1}
            />
            <text
              x={padding - 5}
              y={padding + chartHeight * ratio + 4}
              textAnchor='end'
              className='text-xs fill-muted-foreground'
            >
              {Math.round(maxValue - (maxValue - minValue) * ratio)}
            </text>
          </g>
        ))}

        {/* Target lines */}
        {targetLines.map(target => {
          const y = padding + chartHeight - ((target - minValue) / valueRange) * chartHeight;
          return (
            <line
              key={target}
              x1={padding}
              y1={y}
              x2={padding + chartWidth}
              y2={y}
              stroke='red'
              strokeDasharray='4,4'
              strokeOpacity={0.6}
              strokeWidth={1}
            />
          );
        })}

        {/* Chart line */}
        {data.length > 1 && (
          <polyline
            points={points}
            fill='none'
            stroke={color}
            strokeWidth={2}
            className='drop-shadow-sm'
          />
        )}

        {/* Data points */}
        {data.map((d, i) => {
          const x = padding + (i / (data.length - 1)) * chartWidth;
          const y =
            padding + chartHeight - (((d[metric] as number) - minValue) / valueRange) * chartHeight;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={3}
              fill={color}
              className='hover:r-4 transition-all cursor-pointer'
              title={`${label}: ${d[metric]}${unit} at ${new Date(d.timestamp).toLocaleTimeString()}`}
            />
          );
        })}

        {/* Axis labels */}
        <text
          x={width / 2}
          y={height - 5}
          textAnchor='middle'
          className='text-xs fill-muted-foreground'
        >
          Time
        </text>
        <text
          x={15}
          y={height / 2}
          textAnchor='middle'
          transform={`rotate(-90, 15, ${height / 2})`}
          className='text-xs fill-muted-foreground'
        >
          {label} ({unit})
        </text>
      </svg>
    </div>
  );
};

const PerformanceCard: React.FC<{
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ComponentType<any>;
  color: string;
  trend?: 'up' | 'down' | 'stable';
  description?: string;
}> = ({ title, value, unit = '', icon: Icon, color, trend, description }) => (
  <div className='bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow'>
    <div className='flex items-center justify-between mb-2'>
      <div className='flex items-center space-x-2'>
        <Icon className={`w-4 h-4 ${color}`} />
        <span className='text-sm font-medium'>{title}</span>
      </div>
      {trend && (
        <TrendingUp
          className={`w-3 h-3 ${
            trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500'
          } ${trend === 'down' ? 'rotate-180' : ''}`}
        />
      )}
    </div>
    <div className='text-2xl font-bold'>
      {value}
      {unit}
    </div>
    {description && <p className='text-xs text-muted-foreground mt-1'>{description}</p>}
  </div>
);

export function PerformanceDashboard({
  isOpen,
  onClose,
  onToggleRecording,
}: PerformanceDashboardProps) {
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [isRecording, setIsRecording] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<keyof PerformanceData>('fps');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [baselines, setBaselines] = useState<PerformanceBaseline[]>([]);
  const [selectedBaseline, setSelectedBaseline] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [maxDataPoints, setMaxDataPoints] = useState(100);
  const [updateInterval, setUpdateInterval] = useState(500);

  const performanceMonitor = PerformanceMonitor.getInstance();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Collect performance data
  const collectPerformanceData = useCallback(() => {
    if (!isRecording) return;

    const newDataPoint: PerformanceData = {
      timestamp: Date.now(),
      fps: performanceMonitor.getCurrentFPS(),
      renderTime: performanceMonitor.getAverageMetric('canvas-render') || 0,
      memoryUsage: (performance as any).memory
        ? Math.round(
            ((performance as any).memory.usedJSHeapSize /
              (performance as any).memory.totalJSHeapSize) *
              100
          )
        : 0,
      dirtyRegions: performanceMonitor.getAverageMetric('dirty-regions') || 0,
      renderCommands: performanceMonitor.getAverageMetric('render-commands') || 0,
      workerUtilization: performanceMonitor.getAverageMetric('worker-utilization') || 0,
    };

    setPerformanceData(prev => {
      const updated = [...prev, newDataPoint];
      return updated.slice(-maxDataPoints);
    });
  }, [isRecording, maxDataPoints, performanceMonitor]);

  // Start/stop data collection
  useEffect(() => {
    if (isRecording && isOpen) {
      intervalRef.current = setInterval(collectPerformanceData, updateInterval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording, isOpen, collectPerformanceData, updateInterval]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case ' ':
          e.preventDefault();
          toggleRecording();
          break;
        case 'r':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            clearData();
          }
          break;
        case 's':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            exportReport();
          }
          break;
        case 'f':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setIsFullscreen(!isFullscreen);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, isFullscreen, onClose]);

  const toggleRecording = () => {
    const newRecording = !isRecording;
    setIsRecording(newRecording);
    onToggleRecording?.(newRecording);
  };

  const clearData = () => {
    setPerformanceData([]);
  };

  const createBaseline = () => {
    if (performanceData.length === 0) return;

    const avgFps = performanceData.reduce((sum, d) => sum + d.fps, 0) / performanceData.length;
    const avgRenderTime =
      performanceData.reduce((sum, d) => sum + d.renderTime, 0) / performanceData.length;
    const avgMemoryUsage =
      performanceData.reduce((sum, d) => sum + d.memoryUsage, 0) / performanceData.length;

    const baseline: PerformanceBaseline = {
      name: `Baseline ${new Date().toLocaleString()}`,
      timestamp: Date.now(),
      avgFps,
      avgRenderTime,
      avgMemoryUsage,
    };

    setBaselines(prev => [...prev, baseline]);
  };

  const exportReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        dataPoints: performanceData.length,
        avgFps: performanceData.reduce((sum, d) => sum + d.fps, 0) / performanceData.length,
        avgRenderTime:
          performanceData.reduce((sum, d) => sum + d.renderTime, 0) / performanceData.length,
        avgMemoryUsage:
          performanceData.reduce((sum, d) => sum + d.memoryUsage, 0) / performanceData.length,
        minFps: Math.min(...performanceData.map(d => d.fps)),
        maxRenderTime: Math.max(...performanceData.map(d => d.renderTime)),
      },
      data: performanceData,
      baselines,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Performance analysis
  const analysis = useMemo(() => {
    if (performanceData.length === 0) return null;

    const recent = performanceData.slice(-20);
    const avgFps = recent.reduce((sum, d) => sum + d.fps, 0) / recent.length;
    const avgRenderTime = recent.reduce((sum, d) => sum + d.renderTime, 0) / recent.length;
    const avgMemoryUsage = recent.reduce((sum, d) => sum + d.memoryUsage, 0) / recent.length;

    const bottlenecks = [];
    if (avgFps < 30) bottlenecks.push('Low FPS - Consider reducing visual complexity');
    if (avgRenderTime > 16) bottlenecks.push('High render times - Optimize drawing operations');
    if (avgMemoryUsage > 80) bottlenecks.push('High memory usage - Check for memory leaks');

    const suggestions = [];
    if (avgFps < 50) suggestions.push('Enable performance mode in settings');
    if (avgRenderTime > 10) suggestions.push('Use dirty region rendering');
    if (avgMemoryUsage > 60) suggestions.push('Clear unused objects periodically');

    return {
      avgFps: Math.round(avgFps),
      avgRenderTime: Math.round(avgRenderTime * 10) / 10,
      avgMemoryUsage: Math.round(avgMemoryUsage),
      bottlenecks,
      suggestions,
      health:
        avgFps > 50 && avgRenderTime < 16 && avgMemoryUsage < 70
          ? 'good'
          : avgFps > 30 && avgRenderTime < 25 && avgMemoryUsage < 85
            ? 'warning'
            : 'critical',
    };
  }, [performanceData]);

  if (!isOpen) return null;

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
            isFullscreen ? 'w-full h-full' : 'w-[90vw] h-[85vh] max-w-6xl'
          }`}
        >
          {/* Header */}
          <div className='flex items-center justify-between p-4 border-b border-border bg-card/50'>
            <div className='flex items-center space-x-3'>
              <Monitor className='w-5 h-5 text-primary' />
              <h2 className='text-lg font-semibold'>Performance Dashboard</h2>
              {analysis && (
                <div
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    analysis.health === 'good'
                      ? 'bg-green-100 text-green-800'
                      : analysis.health === 'warning'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                  }`}
                >
                  {analysis.health.toUpperCase()}
                </div>
              )}
            </div>

            <div className='flex items-center space-x-2'>
              {/* Recording controls */}
              <button
                onClick={toggleRecording}
                className={`p-2 rounded-md transition-colors ${
                  isRecording
                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                    : 'bg-green-100 text-green-600 hover:bg-green-200'
                }`}
                title={isRecording ? 'Stop recording (Space)' : 'Start recording (Space)'}
              >
                {isRecording ? <Pause className='w-4 h-4' /> : <Play className='w-4 h-4' />}
              </button>

              <button
                onClick={clearData}
                className='p-2 rounded-md hover:bg-muted transition-colors'
                title='Clear data (Ctrl+R)'
              >
                <RotateCcw className='w-4 h-4' />
              </button>

              <button
                onClick={exportReport}
                className='p-2 rounded-md hover:bg-muted transition-colors'
                title='Export report (Ctrl+S)'
              >
                <Download className='w-4 h-4' />
              </button>

              <button
                onClick={() => setShowSettings(!showSettings)}
                className='p-2 rounded-md hover:bg-muted transition-colors'
                title='Settings'
              >
                <Settings className='w-4 h-4' />
              </button>

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
            {/* Main content */}
            <div className='flex-1 p-4 overflow-auto'>
              {/* Performance cards */}
              {analysis && (
                <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
                  <PerformanceCard
                    title='FPS'
                    value={analysis.avgFps}
                    icon={Zap}
                    color={
                      analysis.avgFps > 50
                        ? 'text-green-500'
                        : analysis.avgFps > 30
                          ? 'text-yellow-500'
                          : 'text-red-500'
                    }
                    trend={analysis.avgFps > 50 ? 'up' : analysis.avgFps > 30 ? 'stable' : 'down'}
                    description='Frames per second'
                  />
                  <PerformanceCard
                    title='Render Time'
                    value={analysis.avgRenderTime}
                    unit='ms'
                    icon={Clock}
                    color={
                      analysis.avgRenderTime < 10
                        ? 'text-green-500'
                        : analysis.avgRenderTime < 20
                          ? 'text-yellow-500'
                          : 'text-red-500'
                    }
                    description='Average render duration'
                  />
                  <PerformanceCard
                    title='Memory'
                    value={analysis.avgMemoryUsage}
                    unit='%'
                    icon={MemoryStick}
                    color={
                      analysis.avgMemoryUsage < 60
                        ? 'text-green-500'
                        : analysis.avgMemoryUsage < 80
                          ? 'text-yellow-500'
                          : 'text-red-500'
                    }
                    description='Heap memory usage'
                  />
                  <PerformanceCard
                    title='Data Points'
                    value={performanceData.length}
                    icon={BarChart3}
                    color='text-blue-500'
                    description='Collected measurements'
                  />
                </div>
              )}

              {/* Charts */}
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6'>
                <div className='space-y-4'>
                  <div className='flex items-center justify-between'>
                    <h3 className='text-sm font-medium'>FPS Over Time</h3>
                    <div className='text-xs text-muted-foreground'>Target: 60fps</div>
                  </div>
                  <Chart
                    data={performanceData}
                    width={400}
                    height={200}
                    metric='fps'
                    color='#10b981'
                    targetLines={[60, 30]}
                    label='FPS'
                    unit=''
                  />
                </div>

                <div className='space-y-4'>
                  <div className='flex items-center justify-between'>
                    <h3 className='text-sm font-medium'>Render Time</h3>
                    <div className='text-xs text-muted-foreground'>Target: &lt;16ms</div>
                  </div>
                  <Chart
                    data={performanceData}
                    width={400}
                    height={200}
                    metric='renderTime'
                    color='#f59e0b'
                    targetLines={[16]}
                    label='Render Time'
                    unit='ms'
                  />
                </div>

                <div className='space-y-4'>
                  <h3 className='text-sm font-medium'>Memory Usage</h3>
                  <Chart
                    data={performanceData}
                    width={400}
                    height={200}
                    metric='memoryUsage'
                    color='#ef4444'
                    targetLines={[80]}
                    label='Memory'
                    unit='%'
                  />
                </div>

                <div className='space-y-4'>
                  <h3 className='text-sm font-medium'>Dirty Regions</h3>
                  <Chart
                    data={performanceData}
                    width={400}
                    height={200}
                    metric='dirtyRegions'
                    color='#8b5cf6'
                    label='Dirty Regions'
                    unit=''
                  />
                </div>
              </div>

              {/* Performance analysis */}
              {analysis && (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  {analysis.bottlenecks.length > 0 && (
                    <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
                      <div className='flex items-center space-x-2 mb-3'>
                        <AlertTriangle className='w-4 h-4 text-red-500' />
                        <h3 className='text-sm font-medium text-red-800'>Performance Issues</h3>
                      </div>
                      <ul className='space-y-1'>
                        {analysis.bottlenecks.map((issue, i) => (
                          <li key={i} className='text-xs text-red-700'>
                            • {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.suggestions.length > 0 && (
                    <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
                      <div className='flex items-center space-x-2 mb-3'>
                        <Info className='w-4 h-4 text-blue-500' />
                        <h3 className='text-sm font-medium text-blue-800'>Optimization Tips</h3>
                      </div>
                      <ul className='space-y-1'>
                        {analysis.suggestions.map((tip, i) => (
                          <li key={i} className='text-xs text-blue-700'>
                            • {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Settings sidebar */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 300, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className='border-l border-border bg-card/30 p-4 overflow-auto'
                >
                  <h3 className='text-sm font-medium mb-4'>Settings</h3>

                  <div className='space-y-4'>
                    <div>
                      <label className='text-xs text-muted-foreground'>Max Data Points</label>
                      <input
                        type='number'
                        value={maxDataPoints}
                        onChange={e => setMaxDataPoints(Number(e.target.value))}
                        className='w-full mt-1 px-2 py-1 text-xs border border-border rounded'
                        min='10'
                        max='1000'
                      />
                    </div>

                    <div>
                      <label className='text-xs text-muted-foreground'>Update Interval (ms)</label>
                      <input
                        type='number'
                        value={updateInterval}
                        onChange={e => setUpdateInterval(Number(e.target.value))}
                        className='w-full mt-1 px-2 py-1 text-xs border border-border rounded'
                        min='100'
                        max='5000'
                        step='100'
                      />
                    </div>

                    <div>
                      <button
                        onClick={createBaseline}
                        className='w-full px-3 py-2 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors'
                        disabled={performanceData.length === 0}
                      >
                        Create Baseline
                      </button>
                    </div>

                    {baselines.length > 0 && (
                      <div>
                        <label className='text-xs text-muted-foreground'>Baselines</label>
                        <div className='mt-1 space-y-1'>
                          {baselines.map((baseline, i) => (
                            <div
                              key={i}
                              className='p-2 text-xs border border-border rounded cursor-pointer hover:bg-muted'
                              onClick={() => setSelectedBaseline(baseline.name)}
                            >
                              <div className='font-medium'>{baseline.name}</div>
                              <div className='text-muted-foreground'>
                                FPS: {Math.round(baseline.avgFps)} | RT:{' '}
                                {Math.round(baseline.avgRenderTime)}ms
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className='mt-6 pt-4 border-t border-border'>
                    <h4 className='text-xs font-medium mb-2'>Keyboard Shortcuts</h4>
                    <div className='space-y-1 text-xs text-muted-foreground'>
                      <div>Space - Toggle recording</div>
                      <div>Ctrl+R - Clear data</div>
                      <div>Ctrl+S - Export report</div>
                      <div>Ctrl+F - Toggle fullscreen</div>
                      <div>Esc - Close dashboard</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
