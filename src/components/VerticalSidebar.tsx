import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
} from './ui/sidebar';
import { ComponentPalette } from './ComponentPalette';
import { PropertiesPanel } from './PropertiesPanel';
import { DesignComponent } from '../App';
import { Settings, Layers } from 'lucide-react';

interface VerticalSidebarProps {
  components: DesignComponent[];
  selectedComponent: string | null;
  onLabelChange: (id: string, label: string) => void;
  onDelete: (id: string) => void;
}

export function VerticalSidebar({ components, selectedComponent, onLabelChange, onDelete }: VerticalSidebarProps) {
  return (
    <Sidebar side="left" variant="sidebar" collapsible="offcanvas">
      <SidebarContent className="flex flex-col h-full">
        <SidebarGroup className="flex-1">
          <SidebarGroupLabel>Component Library</SidebarGroupLabel>
          <div className="flex-1 p-4">
            <ComponentPalette />
          </div>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Properties
          </SidebarGroupLabel>
          <div className="p-4">
            <PropertiesPanel
              selectedComponent={selectedComponent}
              components={components}
              onLabelChange={onLabelChange}
              onDelete={onDelete}
            />
          </div>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Tools
          </SidebarGroupLabel>
          <div className="p-4 text-sm text-muted-foreground">
            Tools panel coming soon...
          </div>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Layers
          </SidebarGroupLabel>
          <div className="p-4 text-sm text-muted-foreground">
            Layers panel coming soon...
          </div>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}