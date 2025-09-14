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
  Award,
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
    resources: false,
    hints: false,
  });

  // Get extended challenge data
  const extendedChallenge =
    (challengeManager.getChallengeById(challenge.id) as ExtendedChallenge) || challenge;

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'bg-green-500/10 text-green-700 border-green-200';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'hard':
        return 'bg-red-500/10 text-red-700 border-red-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className='h-full bg-card/50 backdrop-blur-sm border-r border-border/30 flex flex-col overflow-hidden'>
      {/* Header */}
      <div className='p-4 border-b bg-card/50'>
        <div className='flex items-center justify-between mb-2'>
          <div className='flex items-center gap-2'>
            <BookOpen className='w-5 h-5 text-primary' />
            <span className='text-sm font-medium text-muted-foreground'>Problem</span>
          </div>
          <Badge className={`text-xs ${getDifficultyColor(challenge.difficulty)}`}>
            {challenge.difficulty}
          </Badge>
        </div>
        <h1 className='text-lg font-semibold leading-tight'>{challenge.title}</h1>
        <div className='flex items-center gap-4 mt-2 text-xs text-muted-foreground'>
          <div className='flex items-center gap-1'>
            <Users className='w-3 h-3' />
            <span>System Design</span>
          </div>
          <div className='flex items-center gap-1'>
            <TrendingUp className='w-3 h-3' />
            <span>{challenge.category}</span>
          </div>
          <div className='flex items-center gap-1'>
            <span>{challenge.estimatedTime}min</span>
          </div>
        </div>

        {/* Tags */}
        {extendedChallenge.tags && extendedChallenge.tags.length > 0 && (
          <div className='flex flex-wrap gap-1 mt-2'>
            {extendedChallenge.tags.map((tag, index) => (
              <Badge key={index} variant='secondary' className='text-xs'>
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <ScrollArea className='flex-1'>
        <div className='p-4 space-y-4'>
          {/* Description */}
          <Card className='border-l-4 border-l-primary'>
            <CardHeader
              className='pb-2 cursor-pointer'
              onClick={() => toggleSection('description')}
            >
              <div className='flex items-center justify-between'>
                <CardTitle className='text-base flex items-center gap-2'>
                  <Target className='w-4 h-4' />
                  Description
                </CardTitle>
                {expandedSections.description ? (
                  <ChevronDown className='w-4 h-4' />
                ) : (
                  <ChevronRight className='w-4 h-4' />
                )}
              </div>
            </CardHeader>
            {expandedSections.description && (
              <CardContent className='pt-0'>
                <p className='text-sm leading-relaxed text-foreground/80'>
                  {challenge.description}
                </p>
              </CardContent>
            )}
          </Card>

          {/* Requirements */}
          {challenge.requirements && challenge.requirements.length > 0 && (
            <Card>
              <CardHeader
                className='pb-2 cursor-pointer'
                onClick={() => toggleSection('requirements')}
              >
                <div className='flex items-center justify-between'>
                  <CardTitle className='text-base'>Requirements</CardTitle>
                  {expandedSections.requirements ? (
                    <ChevronDown className='w-4 h-4' />
                  ) : (
                    <ChevronRight className='w-4 h-4' />
                  )}
                </div>
              </CardHeader>
              {expandedSections.requirements && (
                <CardContent className='pt-0'>
                  <ul className='space-y-2 text-sm'>
                    {challenge.requirements.map((req, index) => (
                      <li key={index} className='flex items-start gap-2'>
                        <div className='w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0' />
                        <span className='text-foreground/80'>{req}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              )}
            </Card>
          )}

          {/* Examples */}
          {extendedChallenge.architectureTemplate && (
            <Card>
              <CardHeader className='pb-2 cursor-pointer' onClick={() => toggleSection('examples')}>
                <div className='flex items-center justify-between'>
                  <CardTitle className='text-base'>Architecture Template</CardTitle>
                  {expandedSections.examples ? (
                    <ChevronDown className='w-4 h-4' />
                  ) : (
                    <ChevronRight className='w-4 h-4' />
                  )}
                </div>
              </CardHeader>
              {expandedSections.examples && (
                <CardContent className='pt-0'>
                  <div className='space-y-3'>
                    <div className='bg-muted/30 p-3 rounded text-sm'>
                      <div className='font-medium text-foreground mb-2'>
                        {extendedChallenge.architectureTemplate.name}
                      </div>
                      <div className='text-muted-foreground text-xs mb-3'>
                        {extendedChallenge.architectureTemplate.description}
                      </div>

                      <div className='space-y-2'>
                        <div className='text-xs font-medium text-muted-foreground'>Components:</div>
                        {extendedChallenge.architectureTemplate.components.map((comp, index) => (
                          <div key={index} className='flex items-start gap-2 text-xs'>
                            <div className='w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0' />
                            <div>
                              <span className='font-medium'>{comp.label}</span>
                              {comp.description && (
                                <span className='text-muted-foreground ml-2'>
                                  - {comp.description}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {extendedChallenge.architectureTemplate.connections.length > 0 && (
                        <div className='mt-3 space-y-2'>
                          <div className='text-xs font-medium text-muted-foreground'>
                            Key Connections:
                          </div>
                          {extendedChallenge.architectureTemplate.connections.map((conn, index) => (
                            <div key={index} className='flex items-center gap-2 text-xs'>
                              <div className='w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0' />
                              <span>
                                {conn.from} → {conn.to}
                              </span>
                              <span className='text-muted-foreground'>({conn.label})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Learning Objectives & Key Concepts */}
          {extendedChallenge.learningObjectives &&
            extendedChallenge.learningObjectives.length > 0 && (
              <Card>
                <CardHeader
                  className='pb-2 cursor-pointer'
                  onClick={() => toggleSection('constraints')}
                >
                  <div className='flex items-center justify-between'>
                    <CardTitle className='text-base flex items-center gap-2'>
                      <Award className='w-4 h-4' />
                      Learning Objectives
                    </CardTitle>
                    {expandedSections.constraints ? (
                      <ChevronDown className='w-4 h-4' />
                    ) : (
                      <ChevronRight className='w-4 h-4' />
                    )}
                  </div>
                </CardHeader>
                {expandedSections.constraints && (
                  <CardContent className='pt-0'>
                    <ul className='space-y-2 text-sm text-foreground/80'>
                      {extendedChallenge.learningObjectives.map((objective, index) => (
                        <li key={index} className='flex items-start gap-2'>
                          <div className='w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0' />
                          <span>{objective}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                )}
              </Card>
            )}

          {/* Resources */}
          {extendedChallenge.resources && extendedChallenge.resources.length > 0 && (
            <Card>
              <CardHeader
                className='pb-2 cursor-pointer'
                onClick={() => toggleSection('resources')}
              >
                <div className='flex items-center justify-between'>
                  <CardTitle className='text-base flex items-center gap-2'>
                    <BookOpen className='w-4 h-4' />
                    Resources
                  </CardTitle>
                  {expandedSections.resources ? (
                    <ChevronDown className='w-4 h-4' />
                  ) : (
                    <ChevronRight className='w-4 h-4' />
                  )}
                </div>
              </CardHeader>
              {expandedSections.resources && (
                <CardContent className='pt-0'>
                  <div className='space-y-2'>
                    {extendedChallenge.resources.map((resource, index) => (
                      <div
                        key={index}
                        className='border border-border/50 rounded p-2 hover:bg-muted/30 transition-colors'
                      >
                        <div className='flex items-start gap-2'>
                          <div className='w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0' />
                          <div className='flex-1'>
                            <div className='font-medium text-sm'>{resource.title}</div>
                            {resource.description && (
                              <div className='text-xs text-muted-foreground mt-1'>
                                {resource.description}
                              </div>
                            )}
                            <div className='flex items-center gap-2 mt-1'>
                              <Badge variant='outline' className='text-xs'>
                                {resource.type}
                              </Badge>
                              <a
                                href={resource.url}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='text-xs text-primary hover:underline'
                              >
                                View Resource
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Solution Hints */}
          <Card className='border-l-4 border-l-amber-500'>
            <CardHeader className='pb-2 cursor-pointer' onClick={() => toggleSection('hints')}>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-base flex items-center gap-2'>
                  <Lightbulb className='w-4 h-4 text-amber-500' />
                  Solution Hints
                  <Badge variant='outline' className='text-xs'>
                    {extendedChallenge.solutionHints?.length || 0}
                  </Badge>
                </CardTitle>
                {expandedSections.hints ? (
                  <ChevronDown className='w-4 h-4' />
                ) : (
                  <ChevronRight className='w-4 h-4' />
                )}
              </div>
            </CardHeader>
            {expandedSections.hints && (
              <CardContent className='pt-0'>
                <div className='space-y-3'>
                  {extendedChallenge.solutionHints && extendedChallenge.solutionHints.length > 0 ? (
                    extendedChallenge.solutionHints.map((hint, index) => (
                      <div
                        key={hint.id || index}
                        className='bg-amber-50/50 border border-amber-200/50 p-3 rounded text-sm'
                      >
                        <div className='flex items-start gap-2'>
                          <div className='w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs flex items-center justify-center font-medium flex-shrink-0 mt-0.5'>
                            {index + 1}
                          </div>
                          <div className='flex-1'>
                            <div className='flex items-center gap-2 mb-1'>
                              <div className='font-medium text-amber-800'>{hint.title}</div>
                              <Badge
                                variant='outline'
                                className='text-xs px-1.5 py-0.5 bg-amber-100/50 border-amber-300 text-amber-700'
                              >
                                {hint.type}
                              </Badge>
                              <Badge
                                variant={
                                  hint.difficulty === 'beginner'
                                    ? 'secondary'
                                    : hint.difficulty === 'advanced'
                                      ? 'destructive'
                                      : 'default'
                                }
                                className='text-xs px-1.5 py-0.5'
                              >
                                {hint.difficulty}
                              </Badge>
                            </div>
                            <div className='text-amber-700/80 text-xs leading-relaxed'>
                              {hint.content}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className='text-center text-muted-foreground text-sm py-6'>
                      No hints available for this challenge yet.
                    </div>
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
