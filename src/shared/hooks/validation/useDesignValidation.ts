/**
 * src/shared/hooks/validation/useDesignValidation.ts
 * React hook for design validation that compares user solutions against challenge templates
 * This hook memoizes validation results to avoid unnecessary recalculations
 * RELEVANT FILES: src/lib/design/design-comparison.ts, src/shared/contracts/index.ts, src/lib/config/challenge-config.ts, src/components/ReviewScreen.tsx
 */

import { useMemo } from 'react';
import type { DesignData, DesignValidationResult } from '@/shared/contracts';
import type { ExtendedChallenge } from '@/lib/config/challenge-config';
import { compareDesigns } from '@/lib/design/design-comparison';

/**
 * Hook parameters
 */
interface UseDesignValidationParams {
  designData: DesignData | null;
  challenge: ExtendedChallenge | null;
}

/**
 * Hook return type
 */
interface UseDesignValidationReturn {
  validationResult: DesignValidationResult | null;
  isValidationAvailable: boolean;
  hasTemplate: boolean;
}

/**
 * Custom hook for design validation
 *
 * @param designData The user's design data to validate
 * @param challenge The challenge containing the architecture template
 * @returns Validation result with memoization
 */
export function useDesignValidation({
  designData,
  challenge
}: UseDesignValidationParams): UseDesignValidationReturn {

  // Memoize validation result to avoid recalculation on every render
  const validationResult = useMemo(() => {
    // Check if we have the required data
    if (!designData || !challenge?.architectureTemplate) {
      return null;
    }

    // Check if design has any components to validate
    if (!designData.components || designData.components.length === 0) {
      return null;
    }

    try {
      // Perform the comparison
      return compareDesigns(designData, challenge.architectureTemplate);
    } catch (error) {
      console.error('Design validation failed:', error);
      return null;
    }
  }, [designData, challenge]);

  // Check if validation is available
  const isValidationAvailable = useMemo(() => {
    return validationResult !== null;
  }, [validationResult]);

  // Check if challenge has a template
  const hasTemplate = useMemo(() => {
    return !!(challenge?.architectureTemplate);
  }, [challenge]);

  return {
    validationResult,
    isValidationAvailable,
    hasTemplate
  };
}