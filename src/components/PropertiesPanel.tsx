// src/components/PropertiesPanel.tsx
// Properties panel with tabbed interface for MVP version
// Provides component library and properties editing in separate tabs
// RELEVANT FILES: ComponentPalette.tsx, DesignCanvas.tsx

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { ComponentPalette } from './ComponentPalette';
import { 
  Settings, 
  Trash2, 
  Edit3, 
  Link, 
  Palette,
  Info,
  Layers
} from 'lucide-react';
import type { DesignComponent, Connection } from '../shared/contracts';

interface PropertiesPanelProps {
  selectedComponent: string | null;
  components: DesignComponent[];
  onLabelChange: (id: string, label: string) => void;
  onDelete: (id: string) => void;
}

export function PropertiesPanel({
  selectedComponent,
  components,
  onLabelChange,
  onDelete,
}: PropertiesPanelProps) {
  const [activeTab, setActiveTab] = useState('components');
  
  const selectedComponentData = selectedComponent 
    ? components.find(c => c.id === selectedComponent)
    : null;

  return (
    <div className="w-80 bg-card/30 backdrop-blur-sm border-l border-border/30 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border/30">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Properties
          </h3>
          {selectedComponent && (
            <Badge variant="outline" className="text-xs">
              {components.length} components
            </Badge>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="components" className="text-xs">
              <Layers className="w-3 h-3 mr-1" />
              Library
            </TabsTrigger>
            <TabsTrigger value="properties" className="text-xs">
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
            <ComponentPalette />
          </TabsContent>

          {/* Properties Tab */}
          <TabsContent value="properties" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {/* Selected Component Properties */}
                {selectedComponentData ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="bg-card/50 backdrop-blur-sm border-border/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Palette className="w-4 h-4 text-accent" />
                          Component Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-4">
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
                            className="w-full text-xs"
                          >
                            <Trash2 className="w-3 h-3 mr-2" />
                            Delete Component
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <Card className="bg-muted/20 backdrop-blur-sm border-border/30">
                    <CardContent className="p-6 text-center">
                      <Info className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground mb-1">No component selected</p>
                      <p className="text-xs text-muted-foreground">
                        Click on a component to view and edit its properties
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Design Overview */}
                <Card className="bg-card/50 backdrop-blur-sm border-border/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Info className="w-4 h-4 text-primary" />
                      Design Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="text-center p-2 bg-muted/30 rounded">
                        <div className="font-semibold text-sm">{components.length}</div>
                        <div className="text-muted-foreground">Components</div>
                      </div>
                      <div className="text-center p-2 bg-muted/30 rounded">
                        <div className="font-semibold text-sm">
                          {components.filter(c => c.label !== c.type.charAt(0).toUpperCase() + c.type.slice(1)).length}
                        </div>
                        <div className="text-muted-foreground">Customized</div>
                      </div>
                    </div>
                    
                    {components.length > 0 && (
                      <div>
                        <label className="text-xs font-medium block mb-2 text-muted-foreground">
                          Component Types
                        </label>
                        <div className="flex flex-wrap gap-1">
                          {Array.from(new Set(components.map(c => c.type))).map(type => (
                            <Badge key={type} variant="outline" className="text-xs">
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