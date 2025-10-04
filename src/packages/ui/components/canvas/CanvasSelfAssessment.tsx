/**
 * File: src/packages/ui/components/canvas/CanvasSelfAssessment.tsx
 * Purpose: Self-assessment overlay for canvas allowing users to evaluate their design against challenge requirements
 * Why: Provides a structured way for users to assess their own work and track completion
 * Related: DesignCanvasCore.tsx, CanvasToolbar.tsx, useDesignValidation.ts, dialog.tsx
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import type { Challenge, DesignData } from "../../../../shared/contracts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Progress } from "../ui/progress";
import { Badge } from "../ui/badge";

/**
 * Self-assessment data structure
 */
export interface SelfAssessment {
  checklist: Record<string, boolean>;
  notes: Record<string, string>;
  score: number;
  timestamp: number;
}

/**
 * Props for CanvasSelfAssessment component
 */
export interface CanvasSelfAssessmentProps {
  challenge: Challenge;
  designData: DesignData;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (assessment: SelfAssessment) => void;
}

/**
 * Storage key for persisting assessments
 */
const STORAGE_KEY_PREFIX = "archicomm_self_assessment_";

/**
 * Canvas self-assessment overlay component
 * Displays checklist of requirements with notes and computed score
 */
export function CanvasSelfAssessment({
  challenge,
  designData,
  isOpen,
  onClose,
  onComplete,
}: CanvasSelfAssessmentProps) {
  // State for checklist items (requirement ID -> completed)
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  // State for notes (requirement ID -> note text)
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Load saved assessment from localStorage on mount
  useEffect(() => {
    if (!isOpen || !challenge?.id) return;

    try {
      const storageKey = `${STORAGE_KEY_PREFIX}${challenge.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const assessment: SelfAssessment = JSON.parse(saved);
        setChecklist(assessment.checklist || {});
        setNotes(assessment.notes || {});
      } else {
        // Initialize empty checklist
        const initialChecklist: Record<string, boolean> = {};
        challenge.requirements.forEach((_, index) => {
          initialChecklist[`req-${index}`] = false;
        });
        setChecklist(initialChecklist);
        setNotes({});
      }
    } catch (error) {
      console.error("Failed to load self-assessment:", error);
      // Initialize empty on error
      const initialChecklist: Record<string, boolean> = {};
      challenge.requirements.forEach((_, index) => {
        initialChecklist[`req-${index}`] = false;
      });
      setChecklist(initialChecklist);
      setNotes({});
    }
  }, [isOpen, challenge?.id, challenge.requirements]);

  // Compute progress and score
  const { completedCount, totalCount, progressPercentage, score } = useMemo(() => {
    const total = challenge.requirements.length;
    const completed = Object.values(checklist).filter(Boolean).length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    const computedScore = Math.round(percentage);

    return {
      completedCount: completed,
      totalCount: total,
      progressPercentage: percentage,
      score: computedScore,
    };
  }, [checklist, challenge.requirements]);

  // Toggle requirement completion
  const toggleRequirement = useCallback((reqId: string) => {
    setChecklist((prev) => ({
      ...prev,
      [reqId]: !prev[reqId],
    }));
  }, []);

  // Update note for a requirement
  const updateNote = useCallback((reqId: string, note: string) => {
    setNotes((prev) => ({
      ...prev,
      [reqId]: note,
    }));
  }, []);

  // Save assessment to localStorage
  const saveAssessment = useCallback(() => {
    if (!challenge?.id) return;

    const assessment: SelfAssessment = {
      checklist,
      notes,
      score,
      timestamp: Date.now(),
    };

    try {
      const storageKey = `${STORAGE_KEY_PREFIX}${challenge.id}`;
      localStorage.setItem(storageKey, JSON.stringify(assessment));

      // Call onComplete callback if provided
      if (onComplete) {
        onComplete(assessment);
      }
    } catch (error) {
      console.error("Failed to save self-assessment:", error);
    }
  }, [challenge?.id, checklist, notes, score, onComplete]);

  // Handle save and close
  const handleSave = useCallback(() => {
    saveAssessment();
    onClose();
  }, [saveAssessment, onClose]);

  // Determine score badge variant
  const scoreBadgeVariant = useMemo(() => {
    if (score >= 80) return "default"; // Green/primary
    if (score >= 50) return "secondary"; // Yellow/warning
    return "destructive"; // Red/danger
  }, [score]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Self-Assessment: {challenge.title}</DialogTitle>
          <DialogDescription>
            Review your design against the challenge requirements and track your progress.
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="space-y-2 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              Progress: {completedCount} / {totalCount} completed
            </span>
            <Badge variant={scoreBadgeVariant}>
              Score: {score}%
            </Badge>
          </div>
          <Progress value={progressPercentage} className="h-3" />
        </div>

        {/* Requirements checklist */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Requirements Checklist</h3>

          {challenge.requirements.map((requirement, index) => {
            const reqId = `req-${index}`;
            const isCompleted = checklist[reqId] || false;
            const note = notes[reqId] || "";

            return (
              <div
                key={reqId}
                className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white hover:shadow-sm transition-shadow"
              >
                {/* Requirement text with checkbox */}
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleRequirement(reqId)}
                    className="mt-0.5 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    aria-label={`Mark requirement ${index + 1} as ${isCompleted ? "incomplete" : "complete"}`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  <div className="flex-1">
                    <p
                      className={`text-sm ${
                        isCompleted
                          ? "text-gray-600 line-through"
                          : "text-gray-900"
                      }`}
                    >
                      {requirement}
                    </p>
                  </div>
                </div>

                {/* Notes textarea */}
                <div>
                  <label
                    htmlFor={`note-${reqId}`}
                    className="text-xs font-medium text-gray-700 mb-1 block"
                  >
                    Notes (optional)
                  </label>
                  <textarea
                    id={`note-${reqId}`}
                    value={note}
                    onChange={(e) => updateNote(reqId, e.target.value)}
                    placeholder="Add notes about how you addressed this requirement..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={2}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Design stats */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">Design Statistics</h4>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-gray-600">Components:</span>
              <span className="ml-1 font-medium">{designData.components?.length || 0}</span>
            </div>
            <div>
              <span className="text-gray-600">Connections:</span>
              <span className="ml-1 font-medium">{designData.connections?.length || 0}</span>
            </div>
            <div>
              <span className="text-gray-600">Annotations:</span>
              <span className="ml-1 font-medium">{designData.annotations?.length || 0}</span>
            </div>
          </div>
        </div>

        {/* Info message */}
        {completedCount < totalCount && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Complete all requirements to achieve 100% score. Your progress is saved automatically.
            </p>
          </div>
        )}

        <DialogFooter>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Save & Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
