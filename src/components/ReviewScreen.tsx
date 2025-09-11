/**
 * /src/components/ReviewScreen.tsx
 * Enhanced review phase component showing the designed system architecture
 * Provides comprehensive review with visual design preview and AI analysis
 * RELEVANT FILES: useAIReview.ts, CanvasComponent.tsx, ReviewPreviewCanvas.tsx, VerticalSidebar.tsx
 */

import React, { useMemo, useState, useRef } from 'react';
import {
  ArrowLeft,
  RotateCcw,
  Download,
  Clock,
  MessageSquare,
  Target,
  TrendingUp,
  CheckCircle,
  Eye,
  Layers,
  GitBranch,
} from 'lucide-react';
import { useAIReview } from '../hooks/useAIReview';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { SidebarProvider } from './ui/sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { CanvasComponent } from './CanvasComponent';
import type { Challenge, DesignData, AudioData } from '@/shared/contracts';

interface ReviewScreenProps {
  challenge: Challenge;
  designData: DesignData;
  audioData: AudioData;
  onStartOver: () => void;
  onBackToDesign: () => void;
  onBackToAudio: () => void;
}

export function ReviewScreen({
  challenge,
  designData,
  audioData,
  onStartOver,
  onBackToDesign,
  onBackToAudio,
}: ReviewScreenProps) {
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [reviewMode, setReviewMode] = useState<'overview' | 'detailed'>('overview');
  const canvasRef = useRef<HTMLDivElement>(null);
  const {
    loading: aiLoading,
    error: aiError,
    result: aiResult,
    history: aiHistory,
    review: requestAIReview,
    reset: resetAI
  } = useAIReview({ rateLimitMs: 2500, cache: true });
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const toggleCompare = (id: string) => {
    setCompareSelection(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };
  const selectedComparisons = useMemo(() => {
    const selected = aiHistory.filter(h => compareSelection.includes(h.id)).slice(0, 2);
    return selected.length === 2 ? selected : null;
  }, [aiHistory, compareSelection]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExport = () => {
    const exportData = {
      challenge: challenge.title,
      design: designData,
      audio: {
        transcript: audioData.transcript,
        duration: audioData.duration,
        wordCount: audioData.wordCount,
      },
      metrics: audioData.analysisMetrics,
      timestamp: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `archicomm-session-${challenge.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Enhanced solution analysis
  const designAnalysis = useMemo(() => {
    const types = Array.from(new Set(designData.components.map(c => c.type)));
    const componentsByType = types.map(type => ({
      type,
      count: designData.components.filter(c => c.type === type).length
    }));
    
    const architectureScore = Math.min(100, 
      (designData.components.length * 10) + 
      (designData.connections.length * 15) +
      (types.length * 5)
    );
    
    return {
      types,
      componentsByType,
      architectureScore,
      complexity: designData.components.length + (designData.connections.length * 2),
      hasDatabase: types.some(t => t.includes('database')),
      hasCache: types.some(t => t.includes('cache')),
      hasLoadBalancer: types.some(t => t.includes('load-balancer')),
      hasMonitoring: types.some(t => t.includes('monitoring')),
    };
  }, [designData]);
  
  const solutionText = useMemo(() => {
    return `Design Summary\nComponents: ${designData.components.length}\nConnections: ${designData.connections.length}\nTypes: ${designAnalysis.types.join(', ')}\nArchitecture Score: ${designAnalysis.architectureScore}\n`;
  }, [designData, designAnalysis]);

  // Render the detailed review panel separately to avoid JSX parsing edge cases
  const renderDetailedPanel = () => {
    if (reviewMode !== 'detailed') return null;
    return (
      <div className='border-t bg-background p-6'>
        <div className='max-w-6xl mx-auto space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Components Used</CardTitle>
                <Target className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{designData.components.length}</div>
                <p className='text-xs text-muted-foreground'>System components</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Recording Duration</CardTitle>
                <Clock className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{formatDuration(audioData.duration)}</div>
                <p className='text-xs text-muted-foreground'>Audio explanation</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Word Count</CardTitle>
                <MessageSquare className='h-4 w-4 text-muted-foreground' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{audioData.wordCount}</div>
                <p className='text-xs text-muted-foreground'>Words in transcript</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <div className='flex justify-between mb-2'>
                  <span className='text-sm font-medium'>Clarity Score</span>
                  <span className='text-sm text-muted-foreground'>
                    {Math.round(audioData.analysisMetrics.clarityScore)}%
                  </span>
                </div>
                <Progress value={audioData.analysisMetrics.clarityScore} />
              </div>

              <div>
                <div className='flex justify-between mb-2'>
                  <span className='text-sm font-medium'>Technical Depth</span>
                  <span className='text-sm text-muted-foreground'>
                    {Math.round(audioData.analysisMetrics.technicalDepth)}%
                  </span>
                </div>
                <Progress value={audioData.analysisMetrics.technicalDepth} />
              </div>

              <div>
                <div className='flex justify-between mb-2'>
                  <span className='text-sm font-medium'>Business Focus</span>
                  <span className='text-sm text-muted-foreground'>
                    {Math.round(audioData.analysisMetrics.businessFocus)}%
                  </span>
                </div>
                <Progress value={audioData.analysisMetrics.businessFocus} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Self-Assessment Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-2'>
                {(challenge.requirements || []).map((req, idx) => (
                  <label key={idx} className='flex items-start gap-2 text-sm'>
                    <input type='checkbox' className='mt-1' />
                    <span>{req}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0'>
              <CardTitle>AI Review</CardTitle>
              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={aiLoading}
                  onClick={() => requestAIReview(challenge.id, solutionText)}
                >
                  {aiLoading ? 'Reviewing…' : 'Request Review'}
                </Button>
                {aiResult && <Button variant='ghost' size='sm' onClick={resetAI}>Clear</Button>}
              </div>
            </CardHeader>
            <CardContent>
              {aiError && (
                <div className='text-sm text-red-600 mb-2'>
                  {aiError}{' '}
                  <Button variant='link' onClick={() => requestAIReview(challenge.id, solutionText)}>
                    Retry
                  </Button>
                </div>
              )}
              {!aiResult && !aiLoading && (
                <div className='text-sm text-muted-foreground'>
                  Click "Request Review" to generate AI feedback for your design.
                </div>
              )}
              {aiResult && (
                <div className='space-y-3'>
                  <div>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm font-medium'>Overall Score</span>
                      <Badge variant='secondary'>{aiResult.score}</Badge>
                    </div>
                    <Progress value={aiResult.score} className='mt-1' />
                  </div>
                  <div>
                    <div className='text-sm font-medium mb-1'>Summary</div>
                    <div className='text-sm whitespace-pre-wrap'>{aiResult.summary}</div>
                  </div>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <div className='text-sm font-medium mb-1'>Strengths</div>
                      <ul className='list-disc list-inside text-sm'>
                        {(aiResult.strengths || []).map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className='text-sm font-medium mb-1'>Risks</div>
                      <ul className='list-disc list-inside text-sm'>
                        {(aiResult.risks || []).map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {aiHistory.length > 0 && (
                    <div className='mt-4'>
                      <div className='text-sm font-medium mb-2'>Previous Results</div>
                      <div className='space-y-2'>
                        {aiHistory.map(h => (
                          <div key={h.id} className='flex items-center justify-between border rounded p-2'>
                            <div className='text-xs'>
                              <div>{new Date(h.timestamp).toLocaleString()}</div>
                              <div className='text-muted-foreground'>Score: {h.result.score}</div>
                            </div>
                            <label className='text-xs inline-flex items-center gap-2'>
                              <input
                                type='checkbox'
                                className='accent-primary'
                                checked={compareSelection.includes(h.id)}
                                onChange={() => toggleCompare(h.id)}
                              />
                              Compare
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedComparisons && (
                    <div className='mt-4 border-t pt-3'>
                      <div className='text-sm font-medium mb-2'>Comparison</div>
                      <div className='grid grid-cols-2 gap-4 text-xs'>
                        {selectedComparisons.map((h, idx) => (
                          <div key={h.id} className='border rounded p-2'>
                            <div className='flex items-center justify-between mb-1'>
                              <span className='font-medium'>Run {idx + 1}</span>
                              <Badge variant='secondary'>Score {h.result.score}</Badge>
                            </div>
                            <div className='mb-2'>
                              <div className='text-muted-foreground'>Time</div>
                              <div>{new Date(h.timestamp).toLocaleString()}</div>
                            </div>
                            <div className='mb-2'>
                              <div className='text-muted-foreground'>Summary</div>
                              <div className='whitespace-pre-wrap'>{h.result.summary}</div>
                            </div>
                            <div className='mb-2'>
                              <div className='text-muted-foreground'>Strengths</div>
                              <ul className='list-disc list-inside'>
                                {(h.result.strengths || []).map((s, i) => (
                                  <li key={i}>{s}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <div className='text-muted-foreground'>Risks</div>
                              <ul className='list-disc list-inside'>
                                {(h.result.risks || []).map((r, i) => (
                                  <li key={i}>{r}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            <Card>
              <CardHeader>
                <CardTitle>Design Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-2'>
                  <div className='flex justify-between'>
                    <span>Components:</span>
                    <Badge variant='secondary'>{designData.components.length}</Badge>
                  </div>
                  <div className='flex justify-between'>
                    <span>Connections:</span>
                    <Badge variant='secondary'>{designData.connections.length}</Badge>
                  </div>
                  <div className='flex justify-between'>
                    <span>Complexity (approx):</span>
                    <Badge variant='secondary'>
                      {designData.components.length + designData.connections.length * 2}
                    </Badge>
                  </div>
                  <div className='flex justify-between'>
                    <span>Challenge:</span>
                    <Badge variant='outline'>{challenge.difficulty}</Badge>
                  </div>
                </div>

                <div className='mt-4 pt-4 border-t'>
                  <h4 className='font-medium mb-2'>Component Types Used:</h4>
                  <div className='flex flex-wrap gap-1'>
                    {Array.from(new Set(designData.components.map(c => c.type))).map(type => (
                      <Badge key={type} variant='outline' className='text-xs'>
                        {type.replace('-', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Transcript Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='max-h-48 overflow-auto text-sm'>
                  {audioData.transcript || 'No transcript available'}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  return (
    <SidebarProvider>
      <div className='h-full flex flex-col'>
        
        <div className='border-b bg-card p-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={onStartOver}
                      className='px-3'
                      aria-label='Back to Challenges'
                      title='Back to Challenges'
                    >
                      <ArrowLeft className='w-4 h-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Back to Challenges</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={onBackToDesign}
                      className='px-3'
                      aria-label='Back to Design'
                      title='Back to Design'
                    >
                      <ArrowLeft className='w-4 h-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Back to Design</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div>
                <h2 className='flex items-center gap-2'>
                  <CheckCircle className='w-5 h-5 text-green-500' />
                  Session Complete
                </h2>
                <p className='text-sm text-muted-foreground'>
                  Review your system design and explanation for {challenge.title}
                </p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <Button variant='outline' size='sm' onClick={handleExport}>
                <Download className='w-4 h-4 mr-2' />
                Export Session
              </Button>
              <Button variant='outline' size='sm' onClick={onStartOver}>
                <RotateCcw className='w-4 h-4 mr-2' />
                Start Over
              </Button>
            </div>
          </div>
        </div>

        <div className='flex-1 flex'>
          
          <div className='w-80 border-r bg-card flex flex-col'>
            <div className='p-4 border-b'>
              <h3 className='font-semibold text-sm mb-2'>Challenge Progress</h3>
              <div className='space-y-2'>
                <div className='flex justify-between text-sm'>
                  <span>Requirements</span>
                  <span className='text-muted-foreground'>5/5</span>
                </div>
                <Progress value={100} className='h-2' />
              </div>
            </div>
            
            <div className='flex-1 overflow-auto p-4'>
              <div className='space-y-4'>
                <div>
                  <h4 className='font-medium text-sm mb-2'>✅ Requirements</h4>
                  <div className='space-y-1'>
                    {(challenge.requirements || []).map((req, idx) => (
                      <div key={idx} className='flex items-start gap-2 text-xs p-2 bg-green-50 rounded border border-green-200'>
                        <CheckCircle className='w-3 h-3 text-green-600 mt-0.5 flex-shrink-0' />
                        <span className='text-green-800'>{req}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className='font-medium text-sm mb-2'>📊 Architecture Analysis</h4>
                  <div className='space-y-2'>
                    <div className='text-xs p-2 bg-blue-50 rounded border border-blue-200'>
                      <div className='font-medium text-blue-800'>Scalability: {designAnalysis.hasLoadBalancer ? 'Good' : 'Needs Improvement'}</div>
                      <div className='text-blue-600'>Load balancing: {designAnalysis.hasLoadBalancer ? 'Implemented' : 'Missing'}</div>
                    </div>
                    
                    <div className='text-xs p-2 bg-purple-50 rounded border border-purple-200'>
                      <div className='font-medium text-purple-800'>Performance: {designAnalysis.hasCache ? 'Optimized' : 'Basic'}</div>
                      <div className='text-purple-600'>Caching: {designAnalysis.hasCache ? 'Implemented' : 'Consider adding'}</div>
                    </div>
                    
                    <div className='text-xs p-2 bg-orange-50 rounded border border-orange-200'>
                      <div className='font-medium text-orange-800'>Monitoring: {designAnalysis.hasMonitoring ? 'Good' : 'Missing'}</div>
                      <div className='text-orange-600'>Observability: {designAnalysis.hasMonitoring ? 'Covered' : 'Add monitoring'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          
          <div className='flex-1 flex flex-col'>
            <div className='border-b p-4 bg-background'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-4'>
                  <h3 className='font-semibold'>Design Review</h3>
                  <div className='flex items-center gap-1 text-sm text-muted-foreground'>
                    <Layers className='w-4 h-4' />
                    {designData.components.length} components
                    <GitBranch className='w-4 h-4 ml-2' />
                    {designData.connections.length} connections
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <Button 
                    variant={reviewMode === 'overview' ? 'default' : 'outline'} 
                    size='sm'
                    onClick={() => setReviewMode('overview')}
                  >
                    <Eye className='w-4 h-4 mr-1' />
                    Overview
                  </Button>
                  <Button 
                    variant={reviewMode === 'detailed' ? 'default' : 'outline'} 
                    size='sm'
                    onClick={() => setReviewMode('detailed')}
                  >
                    Detailed
                  </Button>
                </div>
              </div>
            </div>
            
            
            <div className='flex-1 relative bg-background overflow-auto'>
              <div 
                ref={canvasRef}
                className='w-full h-full relative'
                style={{ minWidth: '2400px', minHeight: '1800px' }}
              >
                
                {designData.components.map((component) => (
                  <div key={component.id} className='absolute'>
                    <CanvasComponent
                      component={component}
                      isSelected={selectedComponent === component.id}
                      isConnectionStart={false}
                      zoomLevel={0.6}
                      health={designAnalysis.architectureScore > 70 ? 'healthy' : 'warning'}
                      connectionCount={designData.connections.filter(c => 
                        c.from === component.id || c.to === component.id
                      ).length}
                      onSelect={() => setSelectedComponent(component.id)}
                      onLabelChange={() => {}}
                      onMove={() => {}}
                      onStartConnection={() => {}}
                      onCompleteConnection={() => {}}
                      readonly={true}
                    />
                  </div>
                ))}
                
                
                <svg 
                  className='absolute inset-0 pointer-events-none'
                  style={{ width: '2400px', height: '1800px' }}
                >
                  <defs>
                    <marker
                      id='arrowhead-review'
                      markerWidth='10'
                      markerHeight='7'
                      refX='9'
                      refY='3.5'
                      orient='auto'
                    >
                      <polygon points='0 0, 10 3.5, 0 7' fill='hsl(var(--primary))' />
                    </marker>
                  </defs>
                  
                  {designData.connections.map((connection) => {
                    const fromComponent = designData.components.find(c => c.id === connection.from);
                    const toComponent = designData.components.find(c => c.id === connection.to);
                    
                    if (!fromComponent || !toComponent) return null;
                    
                    const fromX = fromComponent.x + 110; // Component width / 2
                    const fromY = fromComponent.y + 70;  // Component height / 2
                    const toX = toComponent.x + 110;
                    const toY = toComponent.y + 70;
                    
                    return (
                      <g key={connection.id}>
                        <path
                          d={`M ${fromX} ${fromY} L ${toX} ${toY}`}
                          stroke='hsl(var(--primary))'
                          strokeWidth='2'
                          markerEnd='url(#arrowhead-review)'
                        />
                        <text
                          x={(fromX + toX) / 2}
                          y={(fromY + toY) / 2 - 8}
                          textAnchor='middle'
                          className='text-xs fill-foreground'
                        >
                          {connection.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>

          
          <div className='w-80 border-l bg-card flex flex-col'>
            <div className='p-4 border-b'>
              <h3 className='font-semibold text-sm'>Review Details</h3>
            </div>
            
            <div className='flex-1 overflow-auto p-4 space-y-4'>
              
              <Card>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-sm'>Architecture Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold text-center mb-2'>
                    {designAnalysis.architectureScore}
                    <span className='text-lg text-muted-foreground'>/100</span>
                  </div>
                  <Progress value={designAnalysis.architectureScore} className='mb-2' />
                  <p className='text-xs text-center text-muted-foreground'>
                    {designAnalysis.architectureScore >= 80 ? 'Excellent' :
                     designAnalysis.architectureScore >= 60 ? 'Good' : 'Needs Improvement'}
                  </p>
                </CardContent>
              </Card>
              
              
              {selectedComponent && (() => {
                const component = designData.components.find(c => c.id === selectedComponent);
                if (!component) return null;
                return (
                  <Card>
                    <CardHeader className='pb-2'>
                      <CardTitle className='text-sm'>Component Details</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-2'>
                      <div>
                        <div className='text-xs font-medium'>Type</div>
                        <Badge variant='secondary' className='text-xs'>
                          {component.type.replace('-', ' ')}
                        </Badge>
                      </div>
                      <div>
                        <div className='text-xs font-medium'>Label</div>
                        <div className='text-sm'>{component.label}</div>
                      </div>
                      <div>
                        <div className='text-xs font-medium'>Connections</div>
                        <div className='text-sm'>
                          {designData.connections.filter(c => 
                            c.from === component.id || c.to === component.id
                          ).length}
                        </div>
                      </div>
                      {component.description && (
                        <div>
                          <div className='text-xs font-medium'>Description</div>
                          <div className='text-xs text-muted-foreground'>{component.description}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          </div>
        </div>
        
        {renderDetailedPanel()}
        
        
        <div className='border-t bg-background p-4'>
          <div className='flex justify-between items-center'>
            <div className='flex gap-2'>
              <Button variant='outline' onClick={onBackToDesign}>
                <ArrowLeft className='w-4 h-4 mr-2' />
                Back to Design
              </Button>
              <Button variant='outline' onClick={onBackToAudio}>
                <ArrowLeft className='w-4 h-4 mr-2' />
                Back to Recording
              </Button>
            </div>
            
            <div className='flex gap-2'>
              <Button variant='outline' onClick={handleExport}>
                <Download className='w-4 h-4 mr-2' />
                Export Session
              </Button>
              <Button onClick={onStartOver}>
                <TrendingUp className='w-4 h-4 mr-2' />
                Try Another Challenge
              </Button>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
