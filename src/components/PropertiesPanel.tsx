// src/components/PropertiesPanel.tsx
// Properties panel with tabbed interface for MVP version
// Provides component library and properties editing in separate tabs
// RELEVANT FILES: ComponentPalette.tsx, DesignCanvas.tsx

import { motion } from 'framer-motion';
import {
  Edit3,
  Eye,
  EyeOff,
  Info,
  Layers,
  Palette,
  Settings,
  Trash2
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DesignComponent } from '../shared/contracts';
import { ComponentPalette } from './ComponentPalette';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface PropertiesPanelProps {
  selectedComponent: string | null;
  components: DesignComponent[];
  onLabelChange: (id: string, label: string) => void;
  onDelete: (id: string) => void;
  onShowLabelToggle?: (id: string, visible: boolean) => void;
  // Optional: tags from the selected challenge to prefilter the component library
  challengeTags?: string[];
}

export function PropertiesPanel({
  selectedComponent,
  components,
  onLabelChange,
  onDelete,
  onShowLabelToggle,
  challengeTags,
}: PropertiesPanelProps) {
  const [activeTab, setActiveTab] = useState('components');

  const selectedComponentData = selectedComponent
    ? components.find(c => c.id === selectedComponent)
    : null;

  // Automatically switch to properties tab when a component is selected
  useEffect(() => {
    if (selectedComponent) {
      setActiveTab('properties');
    }
  }, [selectedComponent]);

  return (
    <div className="h-full bg-card border-l border-border/30 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-border/30">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold flex items-center gap-1.5 text-sm">
            <Settings className="w-4 h-4" />
            Properties
          </h3>
          {selectedComponent ? (
            <Badge variant="default" className="text-[10px] h-5 px-1.5 bg-primary">
              Selected
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5">
              {components.length} components
            </Badge>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-7">
            <TabsTrigger value="components" className="text-[11px]">
              <Layers className="w-3 h-3 mr-1" />
              Library
            </TabsTrigger>
            <TabsTrigger value="properties" className="text-[11px]">
              <Edit3 className="w-3 h-3 mr-1" />
              Properties
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} className="h-full flex flex-col">
          {/* Component Library Tab */}
          <TabsContent value="components" className="flex-1 m-0 overflow-hidden">
            <ComponentPalette defaultTags={challengeTags} />
          </TabsContent>

          {/* Properties Tab */}
          <TabsContent value="properties" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-3 space-y-3">
                {/* Selected Component Properties */}
                {selectedComponentData ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="bg-card border-border/30">
                      <CardHeader className="pb-1 py-2">
                        <CardTitle className="text-xs flex items-center gap-2">
                          <Palette className="w-4 h-4 text-accent" />
                          Component Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        {/* Component Type */}
                        <div>
                          <label className="text-xs font-medium block mb-1 text-muted-foreground">
                            Type
                          </label>
                          <Badge variant="outline" className="text-xs">
                            {selectedComponentData.type.replace('-', ' ')}
                          </Badge>
                        </div>

                        {/* Component Label */}
                        <div>
                          <label className="text-xs font-medium block mb-1 text-muted-foreground">
                            Label
                          </label>
                          <Input
                            value={selectedComponentData.label}
                            onChange={(e) => onLabelChange(selectedComponentData.id, e.target.value)}
                            size="sm"
                            className="text-xs"
                            placeholder="Enter component label..."
                          />
                        </div>

                        {/* Label Visibility Toggle */}
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-muted-foreground">
                            Show Label
                          </label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onShowLabelToggle?.(
                              selectedComponentData.id,
                              !(selectedComponentData.properties?.showLabel !== false)
                            )}
                            className="h-6 px-2"
                          >
                            {(selectedComponentData.properties?.showLabel !== false) ? (
                              <Eye className="w-3 h-3" />
                            ) : (
                              <EyeOff className="w-3 h-3" />
                            )}
                          </Button>
                        </div>

                        {/* Position */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs font-medium block mb-1 text-muted-foreground">
                              X Position
                            </label>
                            <Input
                              value={Math.round(selectedComponentData.x)}
                              readOnly
                              size="sm"
                              className="text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium block mb-1 text-muted-foreground">
                              Y Position
                            </label>
                            <Input
                              value={Math.round(selectedComponentData.y)}
                              readOnly
                              size="sm"
                              className="text-xs"
                            />
                          </div>
                        </div>

                        {/* Component ID */}
                        <div>
                          <label className="text-xs font-medium block mb-1 text-muted-foreground">
                            ID
                          </label>
                          <div className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded font-mono">
                            {selectedComponentData.id}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-2 border-t border-border/30">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => onDelete(selectedComponentData.id)}
                            className="w-full text-[11px] h-8"
                          >
                            <Trash2 className="w-3 h-3 mr-2" />
                            Delete Component
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <Card className="bg-muted/10 border-border/30">
                    <CardContent className="p-4 text-center">
                      <Info className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                      <p className="text-xs text-muted-foreground mb-1">No component selected</p>
                      <p className="text-xs text-muted-foreground">
                        Click on a component to view and edit its properties
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Design Overview */}
                <Card className="bg-card border-border/30">
                  <CardHeader className="pb-1 py-2">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <Info className="w-4 h-4 text-primary" />
                      Design Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-center p-1.5 bg-muted/30 rounded">
                        <div className="font-semibold text-xs">{components.length}</div>
                        <div className="text-muted-foreground">Components</div>
                      </div>
                      <div className="text-center p-1.5 bg-muted/30 rounded">
                        <div className="font-semibold text-xs">
                          {components.filter(c => c.label !== c.type.charAt(0).toUpperCase() + c.type.slice(1)).length}
                        </div>
                        <div className="text-muted-foreground">Customized</div>
                      </div>
                    </div>

                    {components.length > 0 && (
                      <div>
                        <label className="text-[11px] font-medium block mb-1.5 text-muted-foreground">
                          Component Types
                        </label>
                        <div className="flex flex-wrap gap-1">
                          {Array.from(new Set(components.map(c => c.type))).map(type => (
                            <Badge key={type} variant="outline" className="text-[10px] h-5">
                              {type.replace('-', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
