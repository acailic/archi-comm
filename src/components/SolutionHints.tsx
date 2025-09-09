import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import {
  Lightbulb,
  ChevronRight,
  ChevronDown,
  Clock,
  Target,
  Zap,
  BookOpen,
  Eye,
  EyeOff,
  RotateCcw,
  HelpCircle,
} from 'lucide-react';
import { ExtendedChallenge, SolutionHint } from '../lib/challenge-config';

// Lazy load heavy animation components
const LazyMotionDiv = React.lazy(() =>
  import('framer-motion').then(m => ({ default: m.motion.div }))
);
const LazyAnimatePresence = React.lazy(() =>
  import('framer-motion').then(m => ({ default: m.AnimatePresence }))
);

// Lightweight loading states
const HintsLoadingSkeleton = () => (
  <div className='space-y-3 animate-pulse'>
    {[...Array(3)].map((_, i) => (
      <div key={i} className='p-3 bg-muted/30 rounded-lg'>
        <div className='w-3/4 h-4 bg-muted rounded mb-2' />
        <div className='w-1/2 h-3 bg-muted/60 rounded' />
      </div>
    ))}
  </div>
);

const TemplateLoadingSkeleton = () => (
  <div className='p-4 bg-muted/20 rounded-lg animate-pulse'>
    <div className='w-2/3 h-4 bg-muted rounded mb-2' />
    <div className='w-full h-3 bg-muted/60 rounded mb-3' />
    <div className='flex flex-wrap gap-2 mb-3'>
      {[...Array(4)].map((_, i) => (
        <div key={i} className='w-16 h-6 bg-muted rounded' />
      ))}
    </div>
  </div>
);

interface SolutionHintsProps {
  challenge: ExtendedChallenge;
  currentComponents?: any[];
  onHintViewed?: (hintId: string) => void;
  onTemplateRequest?: () => void;
  onClose?: () => void;
  className?: string;
  lightweightMode?: boolean;
}

const hintTypeIcons = {
  architecture: Target,
  scaling: Zap,
  technology: BookOpen,
  tradeoff: HelpCircle,
  optimization: RotateCcw,
};

const hintTypeColors = {
  architecture: 'from-blue-500 to-blue-600',
  scaling: 'from-green-500 to-green-600',
  technology: 'from-purple-500 to-purple-600',
  tradeoff: 'from-orange-500 to-orange-600',
  optimization: 'from-red-500 to-red-600',
};

// Performance optimization hooks
const useAnimations = (enabled: boolean = true) => {
  const [animationsReady, setAnimationsReady] = useState(false);
  const [motionComponents, setMotionComponents] = useState<any>(null);

  useEffect(() => {
    if (enabled && !animationsReady) {
      // Load framer-motion only when needed
      import('framer-motion').then(framerMotion => {
        setMotionComponents(framerMotion);
        setAnimationsReady(true);
      });
    }
  }, [enabled, animationsReady]);

  return {
    animationsReady,
    motionComponents,
    motion: motionComponents?.motion,
    AnimatePresence: motionComponents?.AnimatePresence,
  };
};

const useProgressCalculation = (currentComponents: any[]) => {
  return useMemo(() => {
    return {
      componentsCount: currentComponents.length,
      connectionsCount: 0, // This would need to be passed in if available
      timeElapsed: 0, // This would need to be calculated if session timing is available
    };
  }, [currentComponents]);
};

const useVisibilityOptimization = (hints: SolutionHint[]) => {
  const [visibleHints, setVisibleHints] = useState<SolutionHint[]>(hints.slice(0, 5));

  useEffect(() => {
    // Progressive loading of hints
    const timer = setTimeout(() => {
      setVisibleHints(hints);
    }, 100);

    return () => clearTimeout(timer);
  }, [hints]);

  return visibleHints;
};

const useSolutionHintsReady = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Mark as ready after initial render
    const timer = setTimeout(() => setIsReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return isReady;
};

export function SolutionHints({
  challenge,
  currentComponents = [],
  onHintViewed,
  onTemplateRequest,
  onClose,
  className = '',
  lightweightMode = false,
}: SolutionHintsProps) {
  const [viewedHints, setViewedHints] = useState<Set<string>>(new Set());
  const [expandedHints, setExpandedHints] = useState<Set<string>>(new Set());
  const [currentTab, setCurrentTab] = useState('hints');

  // Progressive enhancement
  const isReady = useSolutionHintsReady();
  const { animationsReady, motion, AnimatePresence } = useAnimations(!lightweightMode && isReady);
  const designProgress = useProgressCalculation(currentComponents);

  // Memoized filtering and grouping for performance
  const availableHints = useMemo(() => {
    return (challenge.solutionHints || []).filter(hint => {
      // Progressive hints logic
      if (hint.triggerCondition) {
        switch (hint.triggerCondition) {
          case 'components_added':
            return designProgress.componentsCount > 0;
          case 'connections_made':
            return designProgress.connectionsCount > 0;
          case 'time_elapsed_30s':
            return designProgress.timeElapsed > 30;
          case 'design_started':
            return designProgress.componentsCount > 2;
          case 'complex_design':
            return designProgress.componentsCount > 5 && designProgress.connectionsCount > 3;
          default:
            return true;
        }
      }
      return true;
    });
  }, [challenge.solutionHints, designProgress]);

  // Progressive hint loading
  const visibleHints = useVisibilityOptimization(availableHints);

  // Memoized grouping by type
  const hintsByType = useMemo(() => {
    return visibleHints.reduce(
      (acc, hint) => {
        if (!acc[hint.type]) {
          acc[hint.type] = [];
        }
        acc[hint.type].push(hint);
        return acc;
      },
      {} as Record<string, SolutionHint[]>
    );
  }, [visibleHints]);

  // Optimized auto-show hints based on progress
  useEffect(() => {
    if (designProgress.timeElapsed > 60 && visibleHints.length > 0) {
      // Auto-show logic removed - showHints is controlled by parent component
    }
  }, [designProgress.timeElapsed, visibleHints.length]);

  const handleHintView = (hintId: string) => {
    const newViewedHints = new Set(viewedHints);
    newViewedHints.add(hintId);
    setViewedHints(newViewedHints);
    onHintViewed?.(hintId);
  };

  const toggleHintExpansion = useMemo(
    () => (hintId: string) => {
      const newExpanded = new Set(expandedHints);
      if (newExpanded.has(hintId)) {
        newExpanded.delete(hintId);
      } else {
        newExpanded.add(hintId);
        handleHintView(hintId);
      }
      setExpandedHints(newExpanded);
    },
    [expandedHints, handleHintView]
  );

  const progressMessage = useMemo(() => {
    const { componentsCount, connectionsCount, timeElapsed } = designProgress;
    const minutes = Math.floor(timeElapsed / 60);

    if (componentsCount === 0) {
      return 'Start by adding some components to your design';
    }
    if (connectionsCount === 0 && componentsCount > 0) {
      return 'Great start! Now try connecting your components';
    }
    if (componentsCount > 0 && connectionsCount > 0) {
      return `Good progress! ${componentsCount} components, ${connectionsCount} connections in ${minutes}m`;
    }
    return `Design time: ${minutes}m`;
  }, [designProgress]);

  if (!visibleHints.length && !challenge.architectureTemplate) {
    return null;
  }

  const ContainerComponent = animationsReady && motion ? motion.div : 'div';
  const containerProps =
    animationsReady && motion
      ? {
          initial: { opacity: 0, x: 20 },
          animate: { opacity: 1, x: 0 },
          transition: { duration: 0.3 },
        }
      : {};

  return (
    <ContainerComponent
      className={`h-full bg-card/50 backdrop-blur-sm border-l border-border/30 ${className}`}
      {...containerProps}
    >
      {/* Header */}
      <div className='flex items-center justify-between p-4 border-b border-border/30 bg-gradient-to-r from-muted/20 to-card/80 backdrop-blur-sm'>
        <div className='flex items-center space-x-3'>
          <div className='p-2 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-200/30'>
            <Lightbulb className='w-4 h-4 text-amber-600' />
          </div>
          <div>
            <h3 className='font-medium text-foreground'>Solution Hints</h3>
            <p className='text-xs text-muted-foreground'>{progressMessage}</p>
          </div>
        </div>

        <Button variant='ghost' size='sm' onClick={onClose} className='px-2 hover:bg-muted/50'>
          <EyeOff className='w-4 h-4' />
        </Button>
      </div>

      {/* Content with conditional animations */}
      {animationsReady && motion ? (
        <Suspense
          fallback={
            <div className='p-4'>
              <HintsLoadingSkeleton />
            </div>
          }
        >
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
            className='overflow-hidden'
          >
            <SolutionHintsContent />
          </motion.div>
        </Suspense>
      ) : (
        <div className='overflow-hidden'>
          <SolutionHintsContent />
        </div>
      )}
    </ContainerComponent>
  );

  function SolutionHintsContent() {
    return (
      <Tabs value={currentTab} onValueChange={setCurrentTab} className='p-4'>
        <TabsList className='grid w-full grid-cols-2'>
          <TabsTrigger value='hints' className='text-xs'>
            Hints ({visibleHints.length})
          </TabsTrigger>
          <TabsTrigger
            value='template'
            className='text-xs'
            disabled={!challenge.architectureTemplate}
          >
            Template
          </TabsTrigger>
        </TabsList>

        <TabsContent value='hints' className='mt-4 space-y-3'>
          {isReady ? (
            <ScrollArea className='h-96'>
              {Object.entries(hintsByType).map(([type, hints]) => (
                <div key={type} className='mb-4'>
                  <div className='flex items-center space-x-2 mb-2'>
                    {React.createElement(hintTypeIcons[type as keyof typeof hintTypeIcons], {
                      className: 'w-3 h-3',
                    })}
                    <span className='text-xs font-medium capitalize'>{type.replace('-', ' ')}</span>
                    <Badge variant='outline' className='text-xs'>
                      {hints.length}
                    </Badge>
                  </div>

                  <div className='space-y-2'>
                    {hints.map(hint => {
                      const isExpanded = expandedHints.has(hint.id);
                      const isViewed = viewedHints.has(hint.id);
                      const HintIcon = hintTypeIcons[hint.type];

                      const HintCard = ({ children }: { children: React.ReactNode }) => {
                        if (animationsReady && motion) {
                          return (
                            <motion.div key={hint.id} layout className='group'>
                              {children}
                            </motion.div>
                          );
                        }
                        return <div className='group'>{children}</div>;
                      };

                      return (
                        <HintCard key={hint.id}>
                          <Card
                            className={`cursor-pointer transition-all duration-200 hover:shadow-md border-l-4 ${
                              isViewed ? 'border-l-green-500 bg-green-50/50' : 'border-l-gray-300'
                            }`}
                            onClick={() => toggleHintExpansion(hint.id)}
                          >
                            <CardHeader className='pb-2'>
                              <div className='flex items-center justify-between'>
                                <div className='flex items-center space-x-2'>
                                  <div
                                    className={`p-1 rounded bg-gradient-to-r ${hintTypeColors[hint.type]} bg-opacity-10`}
                                  >
                                    <HintIcon className='w-3 h-3' />
                                  </div>
                                  <CardTitle className='text-sm'>{hint.title}</CardTitle>
                                  {!isViewed && (
                                    <div className='w-2 h-2 bg-blue-500 rounded-full' />
                                  )}
                                </div>

                                <div className='flex items-center space-x-1'>
                                  <Badge
                                    variant='outline'
                                    className='text-xs'
                                    style={{
                                      color:
                                        hint.difficulty === 'beginner'
                                          ? '#10b981'
                                          : hint.difficulty === 'intermediate'
                                            ? '#f59e0b'
                                            : '#ef4444',
                                    }}
                                  >
                                    {hint.difficulty}
                                  </Badge>
                                  {isExpanded ? (
                                    <ChevronDown className='w-4 h-4' />
                                  ) : (
                                    <ChevronRight className='w-4 h-4' />
                                  )}
                                </div>
                              </div>
                            </CardHeader>

                            {/* Conditional animation for hint expansion */}
                            {isExpanded &&
                              (animationsReady && AnimatePresence ? (
                                <Suspense fallback={<div className='p-2'>Loading...</div>}>
                                  <AnimatePresence>
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      <CardContent className='pt-0'>
                                        <Separator className='mb-3' />
                                        <CardDescription className='text-sm leading-relaxed'>
                                          {hint.content}
                                        </CardDescription>
                                      </CardContent>
                                    </motion.div>
                                  </AnimatePresence>
                                </Suspense>
                              ) : (
                                <CardContent className='pt-0'>
                                  <Separator className='mb-3' />
                                  <CardDescription className='text-sm leading-relaxed'>
                                    {hint.content}
                                  </CardDescription>
                                </CardContent>
                              ))}
                          </Card>
                        </HintCard>
                      );
                    })}
                  </div>
                </div>
              ))}

              {Object.keys(hintsByType).length === 0 && (
                <div className='text-center py-6 text-muted-foreground'>
                  <Clock className='w-8 h-8 mx-auto mb-2 opacity-50' />
                  <p className='text-sm'>Hints will appear as you work on your design</p>
                </div>
              )}
            </ScrollArea>
          ) : (
            <HintsLoadingSkeleton />
          )}
        </TabsContent>

        <TabsContent value='template' className='mt-4'>
          {isReady ? (
            challenge.architectureTemplate ? (
              <Card>
                <CardHeader>
                  <div className='flex items-center justify-between'>
                    <div>
                      <CardTitle className='text-sm'>
                        {challenge.architectureTemplate.name}
                      </CardTitle>
                      <CardDescription className='text-xs'>
                        {challenge.architectureTemplate.description}
                      </CardDescription>
                    </div>

                    <Button
                      size='sm'
                      onClick={onTemplateRequest}
                      className='bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                    >
                      Load Template
                    </Button>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className='space-y-3'>
                    <div>
                      <h4 className='text-xs font-medium mb-1'>
                        Components ({challenge.architectureTemplate.components.length})
                      </h4>
                      <div className='flex flex-wrap gap-1'>
                        {challenge.architectureTemplate.components.map((comp, index) => (
                          <Badge key={index} variant='secondary' className='text-xs'>
                            {comp.label}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className='text-xs font-medium mb-1'>
                        Connections ({challenge.architectureTemplate.connections.length})
                      </h4>
                      <div className='space-y-1'>
                        {challenge.architectureTemplate.connections
                          .slice(0, 3)
                          .map((conn, index) => (
                            <div
                              key={index}
                              className='text-xs text-muted-foreground flex items-center'
                            >
                              <span className='w-1 h-1 bg-primary rounded-full mr-2' />
                              {conn.from} → {conn.to} ({conn.protocol || conn.type})
                            </div>
                          ))}
                        {challenge.architectureTemplate.connections.length > 3 && (
                          <div className='text-xs text-muted-foreground/60'>
                            +{challenge.architectureTemplate.connections.length - 3} more...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className='text-center py-6 text-muted-foreground'>
                <BookOpen className='w-8 h-8 mx-auto mb-2 opacity-50' />
                <p className='text-sm'>No template available for this challenge</p>
              </div>
            )
          ) : (
            <TemplateLoadingSkeleton />
          )}
        </TabsContent>
      </Tabs>
    );
  }
}
