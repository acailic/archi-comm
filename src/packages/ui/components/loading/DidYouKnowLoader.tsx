// src/packages/ui/components/loading/DidYouKnowLoader.tsx
// Loading component that shows "Did You Know?" facts during loading states
// Makes loading times educational and engaging instead of boring
// RELEVANT FILES: src/lib/education/educational-content.ts, src/packages/ui/components/ui/skeleton.tsx

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getRandomDidYouKnowFact, type DidYouKnowFact } from '@/lib/education/educational-content';

interface DidYouKnowLoaderProps {
  message?: string;
  showFacts?: boolean;
  variant?: 'fullscreen' | 'inline' | 'skeleton';
  minDisplayTime?: number;
}

const FACT_ROTATION_INTERVAL = 4000; // 4 seconds

export function DidYouKnowLoader({
  message = 'Loading...',
  showFacts = true,
  variant = 'inline',
  minDisplayTime = 500,
}: DidYouKnowLoaderProps) {
  const [currentFact, setCurrentFact] = useState<DidYouKnowFact | null>(null);
  const [shownFactIds, setShownFactIds] = useState<Set<string>>(new Set());

  // Get new fact
  useEffect(() => {
    if (!showFacts) return;

    const getNewFact = () => {
      const fact = getRandomDidYouKnowFact();
      // Track shown facts to avoid immediate repeats
      setShownFactIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(fact.id);
        // Reset if we've shown too many
        if (newSet.size > 5) {
          return new Set([fact.id]);
        }
        return newSet;
      });
      setCurrentFact(fact);
    };

    // Get initial fact
    getNewFact();

    // Rotate facts
    const interval = setInterval(getNewFact, FACT_ROTATION_INTERVAL);

    return () => clearInterval(interval);
  }, [showFacts]);

  if (variant === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-6 max-w-md px-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="w-12 h-12 text-blue-500" />
          </motion.div>

          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-gray-900">{message}</p>
            {showFacts && currentFact && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentFact.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="pt-4"
                >
                  <p className="text-sm text-gray-700 font-medium">Did you know?</p>
                  <p className="text-sm text-gray-600 mt-2">{currentFact.fact}</p>
                  {currentFact.source && (
                    <p className="text-xs text-gray-500 mt-2">— {currentFact.source}</p>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-8 h-8 text-blue-500" />
        </motion.div>

        <div className="text-center space-y-2 max-w-sm">
          <p className="text-sm font-medium text-gray-700">{message}</p>
          {showFacts && currentFact && (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentFact.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.3 }}
                className="pt-2"
              >
                <p className="text-xs text-gray-600 font-medium">💡 {currentFact.fact}</p>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    );
  }

  // Skeleton variant
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-full"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      {showFacts && currentFact && (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentFact.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pt-2 border-t border-gray-200 mt-4"
          >
            <p className="text-xs text-gray-600">{currentFact.fact}</p>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
