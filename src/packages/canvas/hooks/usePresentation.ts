/**
 * src/packages/canvas/hooks/usePresentation.ts
 * Hook for managing presentation mode and slides
 * Enables walkthrough of canvas sections with smooth transitions
 * RELEVANT FILES: PresentationModeModal.tsx, presentation-utils.ts, shared/contracts/index.ts
 */

import { useCallback, useState } from 'react';
import type { PresentationSlide } from '@/shared/contracts';

export interface PresentationState {
  isActive: boolean;
  currentSlideIndex: number;
  slides: PresentationSlide[];
}

export const usePresentation = () => {
  const [state, setState] = useState<PresentationState>({
    isActive: false,
    currentSlideIndex: 0,
    slides: [],
  });

  const startPresentation = useCallback((slides: PresentationSlide[]) => {
    if (slides.length === 0) {
      console.warn('Cannot start presentation with no slides');
      return;
    }

    setState({
      isActive: true,
      currentSlideIndex: 0,
      slides: slides.sort((a, b) => a.order - b.order),
    });
  }, []);

  const endPresentation = useCallback(() => {
    setState((prev) => ({ ...prev, isActive: false }));
  }, []);

  const nextSlide = useCallback(() => {
    setState((prev) => {
      if (prev.currentSlideIndex >= prev.slides.length - 1) {
        return prev; // Already at last slide
      }
      return { ...prev, currentSlideIndex: prev.currentSlideIndex + 1 };
    });
  }, []);

  const previousSlide = useCallback(() => {
    setState((prev) => {
      if (prev.currentSlideIndex <= 0) {
        return prev; // Already at first slide
      }
      return { ...prev, currentSlideIndex: prev.currentSlideIndex - 1 };
    });
  }, []);

  const goToSlide = useCallback((index: number) => {
    setState((prev) => {
      if (index < 0 || index >= prev.slides.length) {
        console.warn('Invalid slide index:', index);
        return prev;
      }
      return { ...prev, currentSlideIndex: index };
    });
  }, []);

  const createSlide = useCallback((
    name: string,
    viewport: PresentationSlide['viewport'],
    options?: {
      frameId?: string;
      duration?: number;
      transition?: PresentationSlide['transition'];
      notes?: string;
    }
  ): PresentationSlide => {
    const slide: PresentationSlide = {
      id: `slide-${Date.now()}`,
      name,
      viewport,
      order: state.slides.length,
      frameId: options?.frameId,
      duration: options?.duration,
      transition: options?.transition || 'fade',
      notes: options?.notes,
    };

    setState((prev) => ({
      ...prev,
      slides: [...prev.slides, slide],
    }));

    return slide;
  }, [state.slides.length]);

  const updateSlide = useCallback((slideId: string, updates: Partial<PresentationSlide>) => {
    setState((prev) => ({
      ...prev,
      slides: prev.slides.map((slide) =>
        slide.id === slideId ? { ...slide, ...updates } : slide
      ),
    }));
  }, []);

  const deleteSlide = useCallback((slideId: string) => {
    setState((prev) => ({
      ...prev,
      slides: prev.slides.filter((slide) => slide.id !== slideId),
    }));
  }, []);

  const reorderSlides = useCallback((slideIds: string[]) => {
    setState((prev) => {
      const slideMap = new Map(prev.slides.map((s) => [s.id, s]));
      const reordered = slideIds
        .map((id, index) => {
          const slide = slideMap.get(id);
          return slide ? { ...slide, order: index } : null;
        })
        .filter((s): s is PresentationSlide => s !== null);

      return { ...prev, slides: reordered };
    });
  }, []);

  const currentSlide = state.slides[state.currentSlideIndex] || null;
  const hasNext = state.currentSlideIndex < state.slides.length - 1;
  const hasPrevious = state.currentSlideIndex > 0;

  return {
    isActive: state.isActive,
    currentSlide,
    currentSlideIndex: state.currentSlideIndex,
    slides: state.slides,
    totalSlides: state.slides.length,
    hasNext,
    hasPrevious,
    startPresentation,
    endPresentation,
    nextSlide,
    previousSlide,
    goToSlide,
    createSlide,
    updateSlide,
    deleteSlide,
    reorderSlides,
  };
};
