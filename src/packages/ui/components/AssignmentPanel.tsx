import { useMemo, useState } from 'react';
import { BookOpen, Users, TrendingUp, Award } from 'lucide-react';
import type { Challenge, DesignComponent } from '@/shared/contracts';
import { ExtendedChallenge, challengeManager } from '@/lib/config/challenge-config';
import { Badge } from '@ui/components/ui/badge';
import { CollapsibleSection } from './AssignmentPanel/CollapsibleSection';
import { DescriptionSection } from './AssignmentPanel/sections/DescriptionSection';
import { RequirementsSection } from './AssignmentPanel/sections/RequirementsSection';
import { ArchitectureTemplateSection } from './AssignmentPanel/sections/ArchitectureTemplateSection';
import { SolutionHintsSection } from './AssignmentPanel/sections/SolutionHintsSection';

function isValidExtendedChallenge(obj: any): obj is ExtendedChallenge {
  if (!obj || typeof obj !== 'object') return false;
  if (typeof obj.id !== 'string' || !obj.id) return false;
  if (typeof obj.title !== 'string' || !obj.title) return false;
  if (typeof obj.description !== 'string') return false;
  if (!['easy', 'medium', 'hard', 'beginner', 'intermediate', 'advanced'].includes(obj.difficulty)) {
    return false;
  }
  if (typeof obj.estimatedTime !== 'number' || obj.estimatedTime <= 0) return false;
  if (typeof obj.category !== 'string' || !obj.category) return false;
  if (!Array.isArray(obj.requirements)) return false;
  if (obj.solutionHints !== undefined && !Array.isArray(obj.solutionHints)) return false;
  if (obj.architectureTemplate !== undefined && typeof obj.architectureTemplate !== 'object') return false;
  if (obj.tags !== undefined && !Array.isArray(obj.tags)) return false;
  if (obj.prerequisites !== undefined && !Array.isArray(obj.prerequisites)) return false;
  if (obj.learningObjectives !== undefined && !Array.isArray(obj.learningObjectives)) return false;
  if (obj.resources !== undefined && !Array.isArray(obj.resources)) return false;
  return true;
}

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

  const extendedChallenge = useMemo<ExtendedChallenge>(() => {
    const retrieved = challengeManager.getChallengeById(challenge.id);
    if (retrieved && isValidExtendedChallenge(retrieved)) {
      return retrieved;
    }
    return challenge as ExtendedChallenge;
  }, [challenge]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const DIFFICULTY_COLORS = {
    easy: 'bg-green-500/10 text-green-700 border-green-200',
    medium: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
    hard: 'bg-red-500/10 text-red-700 border-red-200',
  } as const;

  const getDifficultyColor = (difficulty: string) => {
    return (
      DIFFICULTY_COLORS[difficulty.toLowerCase() as keyof typeof DIFFICULTY_COLORS] ||
      'bg-gray-500/10 text-gray-700 border-gray-200'
    );
  };

  const learningObjectives = extendedChallenge.learningObjectives ?? [];
  const resources = extendedChallenge.resources ?? [];

  return (
    <div className='h-full bg-card/50 backdrop-blur-sm border-r border-border/30 flex flex-col overflow-hidden'>
      <div className='p-4 border-b bg-card/50'>
        <div className='flex items-center justify-between mb-2'>
          <div className='flex items-center gap-2'>
            <BookOpen className='w-5 h-5 text-primary' />
            <span className='text-sm font-medium text-muted-foreground'>Problem</span>
          </div>
          <Badge className={`text-xs ${getDifficultyColor(extendedChallenge.difficulty)}`}>
            {extendedChallenge.difficulty}
          </Badge>
        </div>
        <h1 className='text-lg font-semibold leading-tight'>{extendedChallenge.title}</h1>
        <div className='flex items-center gap-4 mt-2 text-xs text-muted-foreground'>
          <div className='flex items-center gap-1'>
            <Users className='w-3 h-3' />
            <span>System Design</span>
          </div>
          <div className='flex items-center gap-1'>
            <TrendingUp className='w-3 h-3' />
            <span>{extendedChallenge.category}</span>
          </div>
          <div className='flex items-center gap-1'>
            <span>{extendedChallenge.estimatedTime}min</span>
          </div>
        </div>
        {extendedChallenge.tags && extendedChallenge.tags.length > 0 && (
          <div className='flex flex-wrap gap-1 mt-2'>
            {extendedChallenge.tags.map(tag => (
              <Badge key={tag} variant='secondary' className='text-xs'>
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className='flex-1 overflow-y-auto'>
        <div className='p-4 space-y-4'>
          <DescriptionSection
            challenge={extendedChallenge}
            isExpanded={expandedSections.description}
            onToggle={() => toggleSection('description')}
          />

          <RequirementsSection
            challenge={extendedChallenge}
            isExpanded={expandedSections.requirements}
            onToggle={() => toggleSection('requirements')}
          />

          {extendedChallenge.architectureTemplate && (
            <ArchitectureTemplateSection
              extendedChallenge={extendedChallenge}
              isExpanded={expandedSections.examples}
              onToggle={() => toggleSection('examples')}
            />
          )}

          {learningObjectives.length > 0 && (
            <CollapsibleSection
              title='Learning Objectives'
              icon={Award}
              isExpanded={expandedSections.constraints}
              onToggle={() => toggleSection('constraints')}
            >
              <ul className='space-y-2 text-sm text-foreground/80'>
                {learningObjectives.map((objective, index) => (
                  <li key={index} className='flex items-start gap-2'>
                    <div className='w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0' />
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          )}

          {resources.length > 0 && (
            <CollapsibleSection
              title='Resources'
              icon={BookOpen}
              isExpanded={expandedSections.resources}
              onToggle={() => toggleSection('resources')}
            >
              <div className='space-y-2'>
                {resources.map((resource, index) => (
                  <div
                    key={resource.url ?? index}
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
            </CollapsibleSection>
          )}

          <SolutionHintsSection
            extendedChallenge={extendedChallenge}
            isExpanded={expandedSections.hints}
            onToggle={() => toggleSection('hints')}
          />
        </div>
      </div>
    </div>
  );
}
