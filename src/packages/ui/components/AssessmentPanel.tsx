import React, { useCallback, useMemo } from 'react';
import { evaluateRubric } from '@/lib/analysis/rubric';
import type { DesignData } from '@/shared/contracts';
import type { LintIssue } from '@/lib/analysis/linter';

type AssessmentResults = {
  rubric: ReturnType<typeof evaluateRubric>;
  issues: LintIssue[];
};

interface AssessmentPanelProps {
  isOpen: boolean;
  assessmentResults: AssessmentResults;
  baselineDesign: DesignData | null;
  onSaveBaseline: () => void;
  onClose: () => void;
  onApplyFix: (issueId: string) => void;
}

const AssessmentPanelComponent = ({
  isOpen,
  assessmentResults,
  baselineDesign,
  onSaveBaseline,
  onClose,
  onApplyFix,
}: AssessmentPanelProps) => {
  const baselineDiffs = useMemo(() => {
    if (!baselineDesign) {
      return null;
    }

    try {
      const before = evaluateRubric(baselineDesign);
      const diffs = assessmentResults.rubric.scores
        .map((score) => {
          const priorScore = before.scores.find((s) => s.axis === score.axis)?.score ?? 0;
          const delta = score.score - priorScore;
          return delta === 0 ? null : { axis: score.axis, diff: delta };
        })
        .filter(Boolean) as Array<{ axis: string; diff: number }>;

      return diffs.length > 0 ? diffs : [];
    } catch (error) {
      console.error('Failed to compute baseline diff', error);
      return [];
    }
  }, [assessmentResults.rubric, baselineDesign]);

  const handleApplyFix = useCallback(
    (issueId: string) => {
      try {
        onApplyFix(issueId);
      } catch (error) {
        console.error('Failed to apply automated fix', error);
      }
    },
    [onApplyFix]
  );

  const handleSaveBaseline = useCallback(() => {
    try {
      onSaveBaseline();
    } catch (error) {
      console.error('Failed to save baseline design', error);
    }
  }, [onSaveBaseline]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed right-4 top-16 w-96 bg-card border border-border/40 rounded-lg shadow-lg z-30">
      <div className="p-3 border-b border-border/30 flex items-center justify-between">
        <div className="text-sm font-semibold">Assessment & Feedback</div>
        <div className="flex items-center gap-2">
          <button
            className="text-xs px-2 py-0.5 rounded bg-accent/40 hover:bg-accent/60"
            onClick={handleSaveBaseline}
          >
            Save Baseline
          </button>
          <button
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
      <div className="p-3 space-y-3 text-xs">
        <div>
          <div className="mb-1 text-muted-foreground">Rubric</div>
          {assessmentResults.rubric.scores.map((score) => (
            <div key={score.axis} className="mb-1">
              <div className="flex justify-between"><span className="capitalize">{score.axis}</span><span>{score.score}</span></div>
              <div className="h-1.5 bg-muted rounded">
                <div
                  className="h-1.5 bg-primary rounded"
                  style={{ width: `${score.score}%` }}
                />
              </div>
              {score.tips.length > 0 && (
                <div className="text-[11px] text-muted-foreground mt-1">Tip: {score.tips[0]}</div>
              )}
            </div>
          ))}
          <div className="mt-2 text-[11px]">
            Overall: <span className="font-medium">{assessmentResults.rubric.overall}</span>
            {assessmentResults.rubric.achievements.length > 0 && (
              <span className="ml-2">🏅 {assessmentResults.rubric.achievements.join(', ')}</span>
            )}
          </div>
          {baselineDesign && (
            <div className="mt-2">
              <div className="text-muted-foreground mb-1">Before/After</div>
              {baselineDiffs && baselineDiffs.length > 0 ? (
                <ul className="list-disc pl-4">
                  {baselineDiffs.map((diff) => (
                    <li key={diff.axis}>{diff.axis}: {diff.diff > 0 ? '+' : ''}{diff.diff}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-[11px]">No changes since baseline.</div>
              )}
            </div>
          )}
        </div>
        <div>
          <div className="mb-1 text-muted-foreground">Anti-patterns</div>
          {assessmentResults.issues.length === 0 ? (
            <div className="text-[11px]">No issues detected.</div>
          ) : (
            <ul className="list-disc pl-4 space-y-1">
              {assessmentResults.issues.map((issue) => (
                <li key={issue.id} className="text-[11px] flex items-start gap-2">
                  <div>
                    <span className="font-medium">{issue.title}:</span> {issue.description}{' '}
                    {issue.fixHint && <em className="text-muted-foreground">({issue.fixHint})</em>}
                  </div>
                  <button
                    className="ml-auto text-[11px] px-1.5 py-0.5 rounded bg-accent/40 hover:bg-accent/60"
                    onClick={() => handleApplyFix(issue.id)}
                  >
                    Show me a fix
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export const AssessmentPanel = React.memo(
  AssessmentPanelComponent,
  (prev, next) =>
    prev.isOpen === next.isOpen &&
    prev.baselineDesign === next.baselineDesign &&
    prev.assessmentResults === next.assessmentResults &&
    prev.onClose === next.onClose &&
    prev.onApplyFix === next.onApplyFix &&
    prev.onSaveBaseline === next.onSaveBaseline
);

AssessmentPanel.displayName = 'AssessmentPanel';
