// src/components/AssignmentPanel.tsx
// Assignment panel component showing comprehensive challenge details with hints
// Displays full challenge information including examples, constraints, and solution hints
// RELEVANT FILES: DesignCanvas.tsx, LeetCodeStylePanel.tsx, SolutionHints.tsx

import React, { useState } from 'react';
import { 
  BookOpen, 
  Target, 
  Users, 
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Award
} from 'lucide-react';
import type { Challenge, DesignComponent } from '../shared/contracts';
import { ExtendedChallenge, challengeManager } from '../lib/challenge-config';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';

interface AssignmentPanelProps {
  challenge: Challenge;
  progress: {
    componentsCount: number;
    connectionsCount: number;
    timeElapsed: number;
  };
  currentComponents: DesignComponent[];
}

export function AssignmentPanel({ challenge, progress, currentComponents }: AssignmentPanelProps) {
  const [expandedSections, setExpandedSections] = useState({
    description: true,
    requirements: true,
    examples: false,
    constraints: false,
    hints: false
  });

  // Get extended challenge data
  const extendedChallenge = challengeManager.getChallengeById(challenge.id) as ExtendedChallenge || challenge;

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
    <div className="h-full bg-card/50 backdrop-blur-sm border-r border-border/30 flex flex-col overflow-hidden">
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

      {/* Scrollable Content */}
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

          {/* Examples */}
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

          {/* Constraints */}
          <Card>
            <CardHeader 
              className="pb-2 cursor-pointer" 
              onClick={() => toggleSection('constraints')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Constraints
                </CardTitle>
                {expandedSections.constraints ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </CardHeader>
            {expandedSections.constraints && (
              <CardContent className="pt-0">
                <ul className="space-y-2 text-sm text-foreground/80">
                  <li>• Must handle 100M+ URLs per day</li>
                  <li>• 99.9% uptime requirement</li>
                  <li>• Custom domain support</li>
                  <li>• Real-time analytics tracking</li>
                </ul>
              </CardContent>
            )}
          </Card>

          {/* Solution Hints */}
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader 
              className="pb-2 cursor-pointer" 
              onClick={() => toggleSection('hints')}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Solution Hints
                  <Badge variant="outline" className="text-xs">
                    {extendedChallenge.hints?.length || 3}
                  </Badge>
                </CardTitle>
                {expandedSections.hints ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </CardHeader>
            {expandedSections.hints && (
              <CardContent className="pt-0">
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
                    <>
                      <div className="bg-amber-50/50 border border-amber-200/50 p-3 rounded text-sm">
                        <div className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs flex items-center justify-center font-medium flex-shrink-0 mt-0.5">
                            1
                          </div>
                          <div>
                            <div className="font-medium text-amber-800 mb-1">Start with Core Components</div>
                            <div className="text-amber-700/80 text-xs leading-relaxed">Begin by adding a load balancer and API gateway to handle incoming requests efficiently.</div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-amber-50/50 border border-amber-200/50 p-3 rounded text-sm">
                        <div className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs flex items-center justify-center font-medium flex-shrink-0 mt-0.5">
                            2
                          </div>
                          <div>
                            <div className="font-medium text-amber-800 mb-1">Add Storage Layer</div>
                            <div className="text-amber-700/80 text-xs leading-relaxed">Include a database for storing URL mappings and a cache for frequently accessed URLs.</div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-amber-50/50 border border-amber-200/50 p-3 rounded text-sm">
                        <div className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs flex items-center justify-center font-medium flex-shrink-0 mt-0.5">
                            3
                          </div>
                          <div>
                            <div className="font-medium text-amber-800 mb-1">Consider Scalability</div>
                            <div className="text-amber-700/80 text-xs leading-relaxed">Think about horizontal scaling, CDN integration, and analytics services for a complete solution.</div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}