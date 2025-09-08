import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import type { DesignComponent } from '../App';

interface PropertiesPanelProps {
  selectedComponent: string | null;
  components: DesignComponent[];
  onLabelChange: (id: string, label: string) => void;
  onDelete: (id: string) => void;
}

export function PropertiesPanel({ selectedComponent, components, onLabelChange, onDelete }: PropertiesPanelProps) {
  if (!selectedComponent) {
    return null;
  }

  const component = components.find(c => c.id === selectedComponent);
  if (!component) {
    return null;
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent"></div>
          Properties
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1">Label</label>
            <Input
              value={component.label}
              onChange={(e) => onLabelChange(component.id, e.target.value)}
              size="sm"
              className="text-xs"
            />
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(component.id)}
            className="w-full text-xs"
          >
            Delete Component
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
