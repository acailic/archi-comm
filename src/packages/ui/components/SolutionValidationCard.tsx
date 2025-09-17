/**
 * src/components/SolutionValidationCard.tsx
 * Component for displaying solution validation results with detailed feedback
 * This component shows validation scores, feedback, and example solutions
 * RELEVANT FILES: src/components/ReviewScreen.tsx, src/hooks/useDesignValidation.ts, src/shared/contracts/index.ts, src/lib/challenge-config.ts
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Target, CheckCircle, AlertCircle, XCircle, Eye } from 'lucide-react';
import type { DesignValidationResult } from '@/shared/contracts';
import type { ArchitectureTemplate } from '@/lib/challenge-config';

interface SolutionValidationCardProps {
  validationResult: DesignValidationResult;
  template: ArchitectureTemplate;
}

export function SolutionValidationCard({ validationResult, template }: SolutionValidationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showExampleSolution, setShowExampleSolution] = useState(false);

  // Get score color and icon based on percentage
  const getScoreDisplay = () => {
    const { percentage } = validationResult;

    if (percentage >= 80) {
      return { color: 'text-green-600', bgColor: 'bg-green-50', icon: CheckCircle };
    } else if (percentage >= 60) {
      return { color: 'text-yellow-600', bgColor: 'bg-yellow-50', icon: AlertCircle };
    } else {
      return { color: 'text-red-600', bgColor: 'bg-red-50', icon: XCircle };
    }
  };

  const { color, bgColor, icon: ScoreIcon } = getScoreDisplay();

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Target className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Solution Validation</h3>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <span>{isExpanded ? 'Less' : 'More'}</span>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Score Summary */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <ScoreIcon className={`h-5 w-5 ${color}`} />
            <span className="font-medium text-gray-900">Overall Score</span>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${bgColor} ${color}`}>
            {validationResult.percentage}% ({validationResult.score}/{validationResult.maxScore})
          </div>
        </div>

        {/* Score Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              validationResult.percentage >= 80
                ? 'bg-green-500'
                : validationResult.percentage >= 60
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${validationResult.percentage}%` }}
          />
        </div>

        {/* Quick Summary */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-green-600">
              {validationResult.componentMatches.filter(m => m.matched).length}
            </div>
            <div className="text-xs text-gray-500">Components Matched</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-blue-600">
              {validationResult.connectionMatches.filter(m => m.found).length}
            </div>
            <div className="text-xs text-gray-500">Connections Found</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-red-600">
              {validationResult.missingComponents.length}
            </div>
            <div className="text-xs text-gray-500">Missing Components</div>
          </div>
        </div>
      </div>

      {/* Detailed Feedback (Expandable) */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          <div className="p-4 space-y-4">

            {/* Feedback Messages */}
            {validationResult.feedback.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Detailed Feedback</h4>
                <div className="space-y-2">
                  {validationResult.feedback.map((feedback, index) => (
                    <div key={index} className="flex items-start space-x-2 text-sm">
                      <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-gray-700">{feedback.message}</div>
                        {feedback.suggestion && (
                          <div className="text-gray-500 mt-1">{feedback.suggestion}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Components */}
            {validationResult.missingComponents.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Missing Components</h4>
                <div className="flex flex-wrap gap-2">
                  {validationResult.missingComponents.map((component, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs"
                    >
                      {component}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Extra Components */}
            {validationResult.extraComponents.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Extra Components</h4>
                <div className="flex flex-wrap gap-2">
                  {validationResult.extraComponents.map((component, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                    >
                      {component}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Connections */}
            {validationResult.incorrectConnections.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Missing Connections</h4>
                <div className="space-y-1">
                  {validationResult.incorrectConnections.map((connection, index) => (
                    <div key={index} className="text-sm text-gray-600 font-mono">
                      {connection}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Example Solution Toggle */}
            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={() => setShowExampleSolution(!showExampleSolution)}
                className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
              >
                <Eye className="h-4 w-4" />
                <span>{showExampleSolution ? 'Hide' : 'Show'} Example Solution</span>
              </button>

              {showExampleSolution && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-2">{template.name}</h5>
                  <p className="text-sm text-gray-600 mb-3">{template.description}</p>

                  {/* Template Components */}
                  <div className="mb-3">
                    <h6 className="text-xs font-medium text-gray-700 mb-1">Components:</h6>
                    <div className="flex flex-wrap gap-1">
                      {template.components.map((comp, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                        >
                          {comp.label} ({comp.type})
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Template Connections */}
                  {template.connections && template.connections.length > 0 && (
                    <div>
                      <h6 className="text-xs font-medium text-gray-700 mb-1">Connections:</h6>
                      <div className="space-y-1">
                        {template.connections.map((conn, index) => (
                          <div key={index} className="text-xs text-gray-600 font-mono">
                            {conn.from} → {conn.to} ({conn.label})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Template Notes */}
                  {template.notes && template.notes.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <h6 className="text-xs font-medium text-gray-700 mb-1">Notes:</h6>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {template.notes.map((note, index) => (
                          <li key={index}>• {note}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}