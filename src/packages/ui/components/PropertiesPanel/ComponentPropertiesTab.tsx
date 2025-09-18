import React from 'react';
import { motion } from 'framer-motion';
import { Edit3, Eye, EyeOff, Info, Palette, Trash2 } from 'lucide-react';
import type { DesignComponent } from '@/shared/contracts';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { EmojiPicker } from '../ui/emoji-picker';
import { ColorPicker } from '../ui/color-picker';
import { WhatIfPanel } from '@ui/components/panels/WhatIfPanel';

interface ComponentPropertiesTabProps {
  selectedComponentData: DesignComponent | null;
  onLabelChange: (id: string, label: string) => void;
  onDelete: (id: string) => void;
  onShowLabelToggle?: (id: string, visible: boolean) => void;
  onStickerToggle?: (id: string, enabled: boolean) => void;
  onStickerEmojiChange?: (id: string, emoji: string) => void;
  onBgColorChange?: (id: string, color: string) => void;
  onNodeBgChange?: (id: string, color: string) => void;
}

export function ComponentPropertiesTab({
  selectedComponentData,
  onLabelChange,
  onDelete,
  onShowLabelToggle,
  onStickerToggle,
  onStickerEmojiChange,
  onBgColorChange,
  onNodeBgChange,
}: ComponentPropertiesTabProps) {
  if (!selectedComponentData) {
    return (
      <Card className="bg-muted/10 border-border/30">
        <CardContent className="p-4 text-center">
          <Info className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground mb-1">No component selected</p>
          <p className="text-xs text-muted-foreground">
            Click on a component to view and edit its properties
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
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

          {/* Playful Sticker Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">
              Sticker
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStickerToggle?.(
                selectedComponentData.id,
                !(selectedComponentData.properties as any)?.sticker
              )}
              className="h-6 px-2"
            >
              {((selectedComponentData.properties as any)?.sticker) ? (
                <span className="text-sm">⭐</span>
              ) : (
                <span className="text-xs text-muted-foreground">Off</span>
              )}
            </Button>
          </div>

          {/* Sticker Emoji Picker */}
          <div>
            <label className="text-xs font-medium block mb-1 text-muted-foreground">Choose Sticker</label>
            <EmojiPicker
              value={(selectedComponentData.properties as any)?.stickerEmoji || '⭐'}
              onChange={(e) => onStickerEmojiChange?.(selectedComponentData.id, e)}
            />
          </div>

          {/* Background Color Picker */}
          <div>
            <label className="text-xs font-medium block mb-1 text-muted-foreground">Background Accent</label>
            <ColorPicker
              value={(selectedComponentData.properties as any)?.bgHex || '#3b82f6'}
              onChange={(hex) => onBgColorChange?.(selectedComponentData.id, hex)}
            />
            <p className="text-[11px] text-muted-foreground mt-1">Overrides node header accent color.</p>
          </div>

          {/* Node Body Background */}
          <div>
            <label className="text-xs font-medium block mb-1 text-muted-foreground">Node Background</label>
            <ColorPicker
              value={(selectedComponentData.properties as any)?.bodyBgHex || '#ffffff'}
              onChange={(hex) => onNodeBgChange?.(selectedComponentData.id, hex)}
            />
            <p className="text-[11px] text-muted-foreground mt-1">Sets the card body background on the canvas.</p>
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

          {/* Inline What-if Playground */}
          <div className="pt-2 border-t border-border/30">
            <WhatIfPanel component={selectedComponentData} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
