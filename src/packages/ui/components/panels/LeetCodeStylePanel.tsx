// src/components/LeetCodeStylePanel.tsx
// LeetCode-style left sidebar with assignment details and hints
// Combines challenge information with solution hints in a vertical layout
// RELEVANT FILES: DesignCanvas.tsx, SolutionHints.tsx, AssignmentPanel.tsx

import React, { useState } from 'react';
import { 
  BookOpen, 
  Target, 
  Lightbulb,
  ChevronDown,
  ChevronRight,
  Users,
  TrendingUp
} from 'lucide-react';
import type { Challenge, DesignComponent } from '@shared/contracts';
import { ExtendedChallenge, challengeManager } from '@/lib/config/challenge-config';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/ui/card';
import { Badge } from '@ui/components/ui/badge';
import { Progress } from '@ui/components/ui/progress';
import { Button } from '@ui/components/ui/button';
import { ScrollArea } from '@ui/components/ui/scroll-area';

interface LeetCodeStylePanelProps {
  challenge: Challenge;
  progress: {
    componentsCount: number;
    connectionsCount: number;
    timeElapsed: number;
  };
  currentComponents: DesignComponent[];
}

export function LeetCodeStylePanel({ challenge, progress, currentComponents }: LeetCodeStylePanelProps) {
  const [showHints, setShowHints] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    description: true,
    requirements: true,
    examples: false,
    constraints: false,
    hints: false
  });

  // Get extended challenge data
  const extendedChallenge = challengeManager.getChallengeById(challenge.id) as ExtendedChallenge || challenge;
  const completionPercentage = Math.min((progress.componentsCount / 5) * 100, 100);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'medium': return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'hard': return 'bg-red-500/10 text-red-700 border-red-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-card/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Problem</span>
          </div>
          <Badge className={`text-xs ${getDifficultyColor(challenge.difficulty)}`}>
            {challenge.difficulty}
          </Badge>
        </div>
        <h1 className="text-lg font-semibold leading-tight">{challenge.title}</h1>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>System Design</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>{challenge.category}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          
          {/* Description */}
          <Card className="border-l-4 border-l-primary">
            <CardHeader 
              className="pb-2 cursor-pointer" 
              onClick={() => toggleSection('description')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Description
                </CardTitle>
                {expandedSections.description ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </CardHeader>
            {expandedSections.description && (
              <CardContent className="pt-0">
                <p className="text-sm leading-relaxed text-foreground/80">
                  {challenge.description}
                </p>
              </CardContent>
            )}
          </Card>

          {/* Requirements */}
          {challenge.requirements && challenge.requirements.length > 0 && (
            <Card>
              <CardHeader 
                className="pb-2 cursor-pointer" 
                onClick={() => toggleSection('requirements')}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Requirements</CardTitle>
                  {expandedSections.requirements ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </CardHeader>
              {expandedSections.requirements && (
                <CardContent className="pt-0">
                  <ul className="space-y-2 text-sm">
                    {challenge.requirements.map((req, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <span className="text-foreground/80">{req}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              )}
            </Card>
          )}

          {/* Progress Section */}
          <Card className="bg-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Your Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Completion</span>
                  <span className="text-sm text-muted-foreground">{Math.round(completionPercentage)}%</span>
                </div>
                <Progress value={completionPercentage} className="h-2" />
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center p-2 bg-background rounded border">
                  <div className="font-semibold text-sm">{progress.componentsCount}</div>
                  <div className="text-muted-foreground">Components</div>
                </div>
                <div className="text-center p-2 bg-background rounded border">
                  <div className="font-semibold text-sm">{progress.connectionsCount}</div>
                  <div className="text-muted-foreground">Connections</div>
                </div>
                <div className="text-center p-2 bg-background rounded border">
                  <div className="font-semibold text-sm">{progress.timeElapsed}</div>
                  <div className="text-muted-foreground">Minutes</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Cases / Examples */}
          <Card>
            <CardHeader 
              className="pb-2 cursor-pointer" 
              onClick={() => toggleSection('examples')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Examples</CardTitle>
                {expandedSections.examples ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </CardHeader>
            {expandedSections.examples && (
              <CardContent className="pt-0">
                <div className="bg-muted/30 p-3 rounded text-sm font-mono">
                  <div className="text-muted-foreground mb-1">Example Architecture:</div>
                  <div>• Load Balancer → API Gateway</div>
                  <div>• API Gateway → Microservices</div>
                  <div>• Microservices → Database</div>
                  <div>• Add Cache for performance</div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </ScrollArea>

      {/* Hints Section at Bottom */}
      <div className="border-t bg-card/30">
        <Button
          variant="ghost"
          className="w-full p-4 justify-start text-left"
          onClick={() => setShowHints(!showHints)}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span className="font-medium">Solution Hints</span>
              <Badge variant="outline" className="text-xs">
                {extendedChallenge.hints?.length || 0}
              </Badge>
            </div>
            {showHints ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </Button>
        
        {showHints && (
          <div className="px-4 pb-4">
            <ScrollArea className="max-h-48">
              <div className="space-y-3">
                {extendedChallenge.hints?.map((hint, index) => (
                  <div key={index} className="bg-amber-50/50 border border-amber-200/50 p-3 rounded text-sm">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs flex items-center justify-center font-medium flex-shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-amber-800 mb-1">{hint.title}</div>
                        <div className="text-amber-700/80 text-xs leading-relaxed">{hint.content}</div>
                      </div>
                    </div>
                  </div>
                )) || (
                  <div className="text-sm text-muted-foreground text-center py-2">
                    No hints available for this challenge.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
