/**
 * src/lib/transcript-comparison.ts
 * Utility for comparing user transcripts with reference transcripts
 * Provides simple text analysis for transcript feedback without complex scoring
 * RELEVANT FILES: src/shared/contracts/index.ts, src/components/ReviewScreen.tsx, src/lib/challenge-config.ts, src/dev/testData.ts
 */

import { Challenge, TranscriptFeedback } from '@/shared/contracts';

/**
 * Compare user transcript with challenge reference transcript
 * Returns structured feedback with simple metrics
 */
export function compareTranscripts(userTranscript: string, challenge: Challenge): TranscriptFeedback {
  // Return empty feedback if no reference transcript exists
  if (!challenge.referenceTranscript || !challenge.keyConcepts) {
    return {
      wordAccuracy: 0,
      keyConceptsCovered: 0,
      totalKeyConcepts: 0,
      lengthDifference: 0,
      missingConcepts: []
    };
  }

  // Tokenize transcripts - simple word splitting
  const userWords = tokenizeText(userTranscript);
  const referenceWords = tokenizeText(challenge.referenceTranscript);
  
  // Calculate word accuracy using set intersection
  const userWordsSet = new Set(userWords);
  const referenceWordsSet = new Set(referenceWords);
  const intersection = new Set([...userWordsSet].filter(word => referenceWordsSet.has(word)));
  const union = new Set([...userWordsSet, ...referenceWordsSet]);
  const wordAccuracy = union.size > 0 ? (intersection.size / union.size) * 100 : 0;

  // Check key concept coverage
  const userText = userTranscript.toLowerCase();
  const coveredConcepts = challenge.keyConcepts.filter(concept => 
    userText.includes(concept.toLowerCase())
  );
  const missingConcepts = challenge.keyConcepts.filter(concept => 
    !userText.includes(concept.toLowerCase())
  );

  // Calculate length difference
  const lengthDifference = userWords.length - referenceWords.length;

  return {
    wordAccuracy: Math.round(wordAccuracy * 100) / 100, // Round to 2 decimals
    keyConceptsCovered: coveredConcepts.length,
    totalKeyConcepts: challenge.keyConcepts.length,
    lengthDifference,
    missingConcepts
  };
}

/**
 * Simple text tokenization - split by whitespace and punctuation
 * Convert to lowercase for case-insensitive comparison
 */
function tokenizeText(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s.,;!?()-]+/)
    .filter(word => word.length > 2) // Filter out short words and empty strings
    .map(word => word.trim());
}