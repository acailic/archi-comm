/**
 * File: src/packages/ui/components/canvas/QuickValidationPanel.tsx
 * Purpose: Advanced validation panel for world-class canvas design validation and feedback
 * Why: Provides comprehensive real-time validation with pattern detection, performance analysis, security checks, and interactive fixes
 * Related: DesignCanvasCore.tsx, CanvasToolbar.tsx, useDesignValidation.ts, sheet.tsx, advanced-validation-engine.ts
 */

import { useMemo, useState, useCallback } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Lightbulb,
  Target,
  Shield,
  Zap,
  DollarSign,
  Wrench,
  Clock,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Challenge, DesignData } from "../../../../shared/contracts";
import type { ExtendedChallenge } from "../../../../lib/config/challenge-config";
import { useDesignValidation } from "../../../../shared/hooks/validation/useDesignValidation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import { Progress } from "../ui/progress";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { advancedValidationEngine } from "../../../../lib/validation/advanced-validation-engine";
import { useRealtimeValidation } from "../../../../shared/hooks/validation/useRealtimeValidation";

/**
 * Props for QuickValidationPanel component
 */
export interface QuickValidationPanelProps {
  designData: DesignData;
  challenge: Challenge | ExtendedChallenge;
  isOpen: boolean;
  onClose: () => void;
  onRunFullReview?: () => void;
  onApplyFix?: (fixData: Partial<DesignData>) => void;
}

/**
 * Validation check item type
 */
interface ValidationCheck {
  id: string;
  label: string;
  status: "pass" | "warning" | "fail";
  message: string;
}

/**
 * Quick validation panel component
 * Shows instant design validation with basic checks and suggestions
 */
export function QuickValidationPanel({
  designData,
  challenge,
  isOpen,
  onClose,
  onRunFullReview,
  onApplyFix,
}: QuickValidationPanelProps) {
  // Use design validation hook
  const { validationResult, isValidationAvailable, hasTemplate } =
    useDesignValidation({
      designData,
      challenge: challenge as ExtendedChallenge,
    });

  // Compute basic checks
  const basicChecks = useMemo((): ValidationCheck[] => {
    const checks: ValidationCheck[] = [];
    const components = designData.components || [];
    const connections = designData.connections || [];

    // Check 1: Component count
    if (components.length === 0) {
      checks.push({
        id: "components",
        label: "Components",
        status: "fail",
        message: "No components added yet. Start designing!",
      });
    } else if (components.length < 3) {
      checks.push({
        id: "components",
        label: "Components",
        status: "warning",
        message: `Only ${components.length} component(s). Most architectures need more.`,
      });
    } else {
      checks.push({
        id: "components",
        label: "Components",
        status: "pass",
        message: `${components.length} components added`,
      });
    }

    // Check 2: Connections
    if (connections.length === 0 && components.length > 1) {
      checks.push({
        id: "connections",
        label: "Connections",
        status: "warning",
        message: "No connections between components",
      });
    } else {
      checks.push({
        id: "connections",
        label: "Connections",
        status: "pass",
        message: `${connections.length} connection(s)`,
      });
    }

    // Check 3: Database presence (common requirement)
    const hasDatabase = components.some((c) => c.type === "database");
    if (!hasDatabase && components.length > 2) {
      checks.push({
        id: "database",
        label: "Database",
        status: "warning",
        message: "No database component found",
      });
    } else if (hasDatabase) {
      checks.push({
        id: "database",
        label: "Database",
        status: "pass",
        message: "Database present",
      });
    }

    // Check 4: Cache presence (good practice)
    const hasCache = components.some((c) => c.type === "cache");
    if (!hasCache && components.length > 3) {
      checks.push({
        id: "cache",
        label: "Caching Layer",
        status: "warning",
        message: "Consider adding a cache for better performance",
      });
    } else if (hasCache) {
      checks.push({
        id: "cache",
        label: "Caching Layer",
        status: "pass",
        message: "Cache layer implemented",
      });
    }

    // Check 5: Load balancer (scalability)
    const hasLoadBalancer = components.some((c) => c.type === "load-balancer");
    if (!hasLoadBalancer && components.length > 4) {
      checks.push({
        id: "load-balancer",
        label: "Load Balancer",
        status: "warning",
        message: "Consider load balancing for high availability",
      });
    } else if (hasLoadBalancer) {
      checks.push({
        id: "load-balancer",
        label: "Load Balancer",
        status: "pass",
        message: "Load balancer present",
      });
    }

    // Check 6: Monitoring (observability)
    const hasMonitoring = components.some((c) => c.type === "monitoring");
    if (!hasMonitoring && components.length > 3) {
      checks.push({
        id: "monitoring",
        label: "Monitoring",
        status: "warning",
        message: "Add monitoring for observability",
      });
    } else if (hasMonitoring) {
      checks.push({
        id: "monitoring",
        label: "Monitoring",
        status: "pass",
        message: "Monitoring configured",
      });
    }

    // Check 7: Single point of failure (SPOF) detection
    const componentConnectionCount = new Map<string, number>();
    connections.forEach((conn) => {
      componentConnectionCount.set(
        conn.to,
        (componentConnectionCount.get(conn.to) || 0) + 1
      );
    });

    const criticalComponents = Array.from(componentConnectionCount.entries())
      .filter(([, count]) => count > 3)
      .map(([id]) => components.find((c) => c.id === id)?.label || id);

    if (criticalComponents.length > 0) {
      checks.push({
        id: "spof",
        label: "Redundancy",
        status: "warning",
        message: `Potential SPOF: ${criticalComponents[0]} has many dependencies`,
      });
    } else if (connections.length > 2) {
      checks.push({
        id: "spof",
        label: "Redundancy",
        status: "pass",
        message: "No obvious single points of failure",
      });
    }

    return checks;
  }, [designData]);

  // Compute overall score (0-100)
  const overallScore = useMemo(() => {
    if (validationResult && isValidationAvailable) {
      return validationResult.percentage;
    }

    // Fallback to basic checks score
    const passCount = basicChecks.filter((c) => c.status === "pass").length;
    const warningCount = basicChecks.filter((c) => c.status === "warning").length;

    const total = basicChecks.length;
    if (total === 0) return 0;

    // Pass = 1.0, Warning = 0.5, Fail = 0
    const score = ((passCount * 1.0 + warningCount * 0.5) / total) * 100;
    return Math.round(score);
  }, [validationResult, isValidationAvailable, basicChecks]);

  // Determine score badge variant
  const scoreBadgeVariant = useMemo(() => {
    if (overallScore >= 80) return "default";
    if (overallScore >= 50) return "secondary";
    return "destructive";
  }, [overallScore]);

  // Generate suggestions
  const suggestions = useMemo(() => {
    const sugs: string[] = [];

    // From validation result
    if (validationResult?.feedback) {
      validationResult.feedback
        .filter((f) => f.suggestion)
        .slice(0, 3)
        .forEach((f) => {
          if (f.suggestion) sugs.push(f.suggestion);
        });
    }

    // From basic checks
    basicChecks
      .filter((c) => c.status === "warning" || c.status === "fail")
      .slice(0, 3)
      .forEach((c) => {
        sugs.push(c.message);
      });

    return sugs.slice(0, 5); // Max 5 suggestions
  }, [validationResult, basicChecks]);

  // Detect architecture patterns
  const detectedPatterns = useMemo(() => {
    const patterns: string[] = [];
    const components = designData.components || [];

    const hasCache = components.some((c) => c.type === "cache");
    const hasDatabase = components.some((c) => c.type === "database");
    const hasLoadBalancer = components.some((c) => c.type === "load-balancer");
    const hasMicroservice = components.some((c) => c.type === "microservice");
    const hasMessageQueue = components.some((c) => c.type === "message-queue");
    const hasApiGateway = components.some((c) => c.type === "api-gateway");

    if (hasCache && hasDatabase) patterns.push("Caching Strategy");
    if (hasLoadBalancer) patterns.push("Load Balancing");
    if (hasMicroservice) patterns.push("Microservices");
    if (hasMessageQueue) patterns.push("Event-Driven");
    if (hasApiGateway) patterns.push("API Gateway");

    return patterns;
  }, [designData]);

  // Advanced validation results state
  const [advancedResults, setAdvancedResults] = useState<any>(null);
  const [isRunningAdvanced, setIsRunningAdvanced] = useState(false);

  // Real-time validation
  const realtimeValidation = useRealtimeValidation({
    designData,
    enabled: isOpen, // Only run when panel is open
    debounceMs: 1500, // 1.5 second debounce
    onValidationComplete: (results) => {
      setAdvancedResults(results);
    },
  });

  // Run advanced validation manually
  const handleRunAdvancedValidation = useCallback(async () => {
    setIsRunningAdvanced(true);
    try {
      const engine = advancedValidationEngine.create(designData);
      const results = await engine.validate();
      setAdvancedResults(results);
    } catch (error) {
      console.error('Advanced validation failed:', error);
    } finally {
      setIsRunningAdvanced(false);
    }
  }, [designData]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Quick Validation</SheetTitle>
          <SheetDescription>
            Instant feedback on your design quality and architecture
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Overall score */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Overall Score</h3>
              <Badge variant={scoreBadgeVariant}>{overallScore}%</Badge>
            </div>
            <Progress value={overallScore} className="h-3" />
          </div>

          {/* Validation checks */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Validation Checks
            </h3>
            <div className="space-y-2">
              {basicChecks.map((check) => (
                <div
                  key={check.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-white hover:shadow-sm transition-shadow"
                >
                  {check.status === "pass" && (
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  )}
                  {check.status === "warning" && (
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  )}
                  {check.status === "fail" && (
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{check.label}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{check.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Suggestions
              </h3>
              <ul className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <li
                    key={index}
                    className="text-xs text-gray-700 bg-blue-50 border border-blue-200 rounded-md p-2 pl-3"
                  >
                    • {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Detected patterns */}
          {detectedPatterns.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Detected Patterns
              </h3>
              <div className="flex flex-wrap gap-2">
                {detectedPatterns.map((pattern) => (
                  <Badge key={pattern} variant="outline">
                    {pattern}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Template validation result */}
          {hasTemplate && isValidationAvailable && validationResult && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Template Match
              </h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Score:</span>
                  <span className="font-medium">
                    {validationResult.score} / {validationResult.maxScore}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Components matched:</span>
                  <span className="font-medium">
                    {validationResult.componentMatches.filter((m) => m.matched).length} /{" "}
                    {validationResult.componentMatches.length}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Advanced validation section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Advanced Validation
                {realtimeValidation.isValidating && (
                  <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                )}
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRunAdvancedValidation}
                  disabled={isRunningAdvanced || realtimeValidation.isValidating}
                >
                  {isRunningAdvanced ? "Running..." : "Run Now"}
                </Button>
              </div>
            </div>

            {/* Real-time validation status */}
            {realtimeValidation.lastValidated && (
              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                Last validated: {new Date(realtimeValidation.lastValidated).toLocaleTimeString()}
              </div>
            )}

            {realtimeValidation.error && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                Validation error: {realtimeValidation.error}
              </div>
            )}

            {advancedResults && (
              <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg text-sm">
                <div className="flex flex-col sm:flex-row sm:justify-between">
                  <div className="flex-1 min-w-0 mb-2 sm:mb-0">
                    <p className="font-medium text-gray-900">
                      Advanced Validation Results
                    </p>
                    <p className="text-gray-700">
                      Overall Score:{" "}
                      <span className="font-medium">
                        {advancedResults.overallScore}%
                      </span>
                    </p>
                    <p className="text-gray-700">
                      Issues Detected:{" "}
                      <span className="font-medium">
                        {advancedResults.issues.length}
                      </span>
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => {
                        /* TODO: Implement detailed view */
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
                <div className="mt-2">
                  {advancedResults.patterns.length > 0 && (
                    <div className="text-xs text-gray-600">
                      Detected Patterns:
                      <div className="flex flex-wrap gap-2 mt-1">
                        {advancedResults.patterns.map((pattern: any) => (
                          <Badge key={pattern.id} variant="outline">
                            {pattern.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {advancedResults.issues.length > 0 && (
                    <div className="text-xs text-gray-600 mt-1">
                      Top Issues:
                      <ul className="list-disc list-inside space-y-1 mt-1">
                        {advancedResults.issues.slice(0, 3).map((issue: any, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-gray-900 font-medium">
                              {issue.severity === "critical" && "🚨"}
                              {issue.severity === "error" && "❌"}
                              {issue.severity === "warning" && "⚠️"}
                              {issue.severity === "info" && "ℹ️"}
                            </span>
                            <div className="flex-1">
                              <span className="text-gray-700">
                                {issue.title}
                              </span>
                              {issue.fixable && onApplyFix && (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-xs text-blue-600 hover:text-blue-800 ml-2"
                                  onClick={() => {
                                    if (issue.autoFix) {
                                      const fixData = issue.autoFix();
                                      onApplyFix(fixData);
                                      // Re-run validation after fix
                                      setTimeout(() => realtimeValidation.validateNow(), 100);
                                    }
                                  }}
                                >
                                  Fix
                                </Button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="flex-col sm:flex-col gap-2">
          {onRunFullReview && (
            <button
              onClick={onRunFullReview}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Run Full Review
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Close
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
