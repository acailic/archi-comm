// src/components/AssignmentPanel.tsx
// Assignment panel component showing challenge details and progress
// Displays challenge information, requirements, and current design progress
// RELEVANT FILES: DesignCanvas.tsx, Challenge.tsx

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Clock, Target, CheckCircle, FileText } from 'lucide-react';
import type { Challenge, DesignComponent } from '../shared/contracts';

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
  const completionPercentage = Math.min((progress.componentsCount / 5) * 100, 100);

  return (
    <div className="w-80 bg-card/50 backdrop-blur-sm border-r border-border/30 p-4 overflow-y-auto">
      <div className="space-y-6">
        {/* Challenge Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Challenge
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h3 className="font-medium">{challenge.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{challenge.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={'secondary'}>
                {challenge.difficulty}
              </Badge>
              <Badge variant="outline">
                {challenge.category}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Design Completion</span>
                <span className="text-sm text-muted-foreground">{Math.round(completionPercentage)}%</span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="text-center p-2 bg-muted/50 rounded">
                <div className="font-semibold text-lg">{progress.componentsCount}</div>
                <div className="text-muted-foreground">Components</div>
              </div>
              <div className="text-center p-2 bg-muted/50 rounded">
                <div className="font-semibold text-lg">{progress.connectionsCount}</div>
                <div className="text-muted-foreground">Connections</div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{progress.timeElapsed} minutes elapsed</span>
            </div>
          </CardContent>
        </Card>

        {/* Requirements */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${progress.componentsCount > 0 ? 'bg-green-500' : 'bg-muted'}`} />
                <span className={progress.componentsCount > 0 ? 'text-foreground' : 'text-muted-foreground'}>
                  Add system components
                </span>
              </li>
              <li className="flex items-start gap-2">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${progress.connectionsCount > 0 ? 'bg-green-500' : 'bg-muted'}`} />
                <span className={progress.connectionsCount > 0 ? 'text-foreground' : 'text-muted-foreground'}>
                  Connect components
                </span>
              </li>
              <li className="flex items-start gap-2">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${progress.componentsCount >= 3 ? 'bg-green-500' : 'bg-muted'}`} />
                <span className={progress.componentsCount >= 3 ? 'text-foreground' : 'text-muted-foreground'}>
                  Create complete architecture
                </span>
              </li>
              <li className="flex items-start gap-2">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${currentComponents.some(c => c.label !== c.type.charAt(0).toUpperCase() + c.type.slice(1)) ? 'bg-green-500' : 'bg-muted'}`} />
                <span className={currentComponents.some(c => c.label !== c.type.charAt(0).toUpperCase() + c.type.slice(1)) ? 'text-foreground' : 'text-muted-foreground'}>
                  Label components appropriately
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}