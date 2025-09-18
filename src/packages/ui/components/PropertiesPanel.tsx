// src/components/PropertiesPanel.tsx
// Properties panel with tabbed interface for MVP version
// Provides component library and properties editing in separate tabs
// RELEVANT FILES: ComponentPalette.tsx, DesignCanvas.tsx

import React from 'react';
import {
  Edit3,
  Layers,
  Settings,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { wrapSetStateWithGuard } from '../../../lib/performance/StateUpdateGuard';
import type { DesignComponent } from '../shared/contracts';
import { ComponentPalette } from './ComponentPalette';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ComponentPropertiesTab } from './PropertiesPanel/ComponentPropertiesTab';
import { DesignOverviewCard } from './PropertiesPanel/DesignOverviewCard';

interface PropertiesPanelProps {
  selectedComponent: string | null;
  components: DesignComponent[];
  onLabelChange: (id: string, label: string) => void;
  onDelete: (id: string) => void;
  onShowLabelToggle?: (id: string, visible: boolean) => void;
  onStickerToggle?: (id: string, enabled: boolean) => void;
  onStickerEmojiChange?: (id: string, emoji: string) => void;
  onBgColorChange?: (id: string, color: string) => void;
  onNodeBgChange?: (id: string, color: string) => void;
  // Optional: tags from the selected challenge to prefilter the component library
  challengeTags?: string[];
}

export const PropertiesPanel = React.memo(function PropertiesPanel({
  selectedComponent,
  components,
  onLabelChange,
  onDelete,
  onShowLabelToggle,
  onStickerToggle,
  onStickerEmojiChange,
  onBgColorChange,
  onNodeBgChange,
  challengeTags,
}: PropertiesPanelProps) {
  const [activeTab, setActiveTab] = useState('components');

  // Create guarded setter to prevent rapid tab switching loops
  const guardedSetActiveTab = wrapSetStateWithGuard(setActiveTab, {
    componentName: 'PropertiesPanel',
    stateName: 'activeTab',
    enableDeduplication: true,
    enableThrottling: true,
    maxUpdatesPerSecond: 10,
    debugMode: false,
  });

  const selectedComponentData = selectedComponent
    ? components.find(c => c.id === selectedComponent)
    : null;

  // Automatically switch to properties tab when a component is selected
  useEffect(() => {
    if (selectedComponent) {
      const result = guardedSetActiveTab('properties');
      if (!result.success && result.blocked) {
        console.warn('PropertiesPanel: Tab switch blocked due to rate limiting');
      }
    }
  }, [selectedComponent, guardedSetActiveTab]);

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        const result = guardedSetActiveTab(value);
        if (!result.success) {
          console.warn('PropertiesPanel: Manual tab change blocked:', result.reason);
        }
      }}
      className="h-full bg-card border-l border-border/30 flex flex-col overflow-hidden"
    >
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
      </div>

      <div className="flex-1 overflow-hidden">
        {/* Component Library Tab */}
        <TabsContent value="components" className="flex-1 m-0 overflow-hidden">
          <ComponentPalette defaultTags={challengeTags} />
        </TabsContent>

        {/* Properties Tab */}
        <TabsContent value="properties" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {/* Selected Component Properties */}
              <ComponentPropertiesTab
                selectedComponentData={selectedComponentData}
                onLabelChange={onLabelChange}
                onDelete={onDelete}
                onShowLabelToggle={onShowLabelToggle}
                onStickerToggle={onStickerToggle}
                onStickerEmojiChange={onStickerEmojiChange}
                onBgColorChange={onBgColorChange}
                onNodeBgChange={onNodeBgChange}
              />

              {/* Design Overview */}
              <DesignOverviewCard components={components} />
            </div>
          </ScrollArea>
        </TabsContent>
      </div>
    </Tabs>
  );
});
