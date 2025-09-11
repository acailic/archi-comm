// src/dev/components/PropControls.tsx
// Interactive prop controls component for real-time component property adjustment
// Provides UI controls for modifying component props with validation and type safety
// RELEVANT FILES: src/dev/types.ts, src/dev/DevUtilities.tsx, src/components/ui/button.tsx, src/components/ui/input.tsx

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, RotateCcw, Search, ChevronDown, ChevronUp } from 'lucide-react';
import {
  ControlsConfig,
  ControlDefinition,
  ValidationResult,
  PropChangeEvent,
} from '../types';
import { validatePropChange, mergePropsWithDefaults } from '../utils/propValidation';

interface PropControlsProps {
  scenarioId: string;
  controls: ControlsConfig;
  currentProps: Record<string, any>;
  defaultProps?: Record<string, any>;
  onPropChange: (event: PropChangeEvent) => void;
  onReset?: () => void;
  onCopy?: (props: Record<string, any>) => void;
  className?: string;
}

interface ControlInputProps {
  propName: string;
  control: ControlDefinition;
  value: any;
  onChange: (value: any) => void;
  validation?: ValidationResult;
  disabled?: boolean;
}

const ControlInput: React.FC<ControlInputProps> = ({
  propName,
  control,
  value,
  onChange,
  validation,
  disabled = false,
}) => {
  const handleChange = useCallback((newValue: any) => {
    onChange(newValue);
  }, [onChange]);

  const inputId = `control-${propName}`;
  const hasError = validation && !validation.isValid;

  switch (control.type) {
    case 'text':
    case 'email':
    case 'url':
      return (
        <div className="space-y-1">
          <Input
            id={inputId}
            type={control.type}
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={control.placeholder}
            disabled={disabled || control.disabled}
            className={hasError ? 'border-destructive' : ''}
          />
          {hasError && (
            <div className="text-xs text-destructive">
              {validation.errors.join(', ')}
            </div>
          )}
        </div>
      );

    case 'number':
    case 'range':
      const numValue = typeof value === 'number' ? value : Number(value) || control.min || 0;
      return (
        <div className="space-y-2">
          {control.type === 'range' ? (
            <div className="space-y-2">
              <Slider
                value={[numValue]}
                onValueChange={(values) => handleChange(values[0])}
                min={control.min || 0}
                max={control.max || 100}
                step={control.step || 1}
                disabled={disabled || control.disabled}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground text-center">
                {numValue}
              </div>
            </div>
          ) : (
            <Input
              id={inputId}
              type="number"
              value={numValue}
              onChange={(e) => handleChange(Number(e.target.value))}
              min={control.min}
              max={control.max}
              step={control.step}
              placeholder={control.placeholder}
              disabled={disabled || control.disabled}
              className={hasError ? 'border-destructive' : ''}
            />
          )}
          {hasError && (
            <div className="text-xs text-destructive">
              {validation.errors.join(', ')}
            </div>
          )}
        </div>
      );

    case 'boolean':
      return (
        <div className="flex items-center space-x-2">
          <Switch
            id={inputId}
            checked={Boolean(value)}
            onCheckedChange={handleChange}
            disabled={disabled || control.disabled}
          />
          <Label htmlFor={inputId} className="text-sm">
            {control.label}
          </Label>
          {hasError && (
            <Badge variant="destructive" className="text-xs">
              Invalid
            </Badge>
          )}
        </div>
      );

    case 'select':
      return (
        <div className="space-y-1">
          <Select
            value={value || control.defaultValue || ''}
            onValueChange={handleChange}
            disabled={disabled || control.disabled}
          >
            <SelectTrigger className={hasError ? 'border-destructive' : ''}>
              <SelectValue placeholder={control.placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {control.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasError && (
            <div className="text-xs text-destructive">
              {validation.errors.join(', ')}
            </div>
          )}
        </div>
      );

    case 'textarea':
      return (
        <div className="space-y-1">
          <Textarea
            id={inputId}
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={control.placeholder}
            disabled={disabled || control.disabled}
            className={hasError ? 'border-destructive' : ''}
            rows={3}
          />
          {hasError && (
            <div className="text-xs text-destructive">
              {validation.errors.join(', ')}
            </div>
          )}
        </div>
      );

    case 'color':
      return (
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Input
              id={inputId}
              type="color"
              value={value || '#000000'}
              onChange={(e) => handleChange(e.target.value)}
              disabled={disabled || control.disabled}
              className="w-12 h-8 p-1 border rounded"
            />
            <Input
              type="text"
              value={value || '#000000'}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="#000000"
              className="flex-1"
            />
          </div>
          {hasError && (
            <div className="text-xs text-destructive">
              {validation.errors.join(', ')}
            </div>
          )}
        </div>
      );

    case 'date':
    case 'time':
      return (
        <div className="space-y-1">
          <Input
            id={inputId}
            type={control.type}
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled || control.disabled}
            className={hasError ? 'border-destructive' : ''}
          />
          {hasError && (
            <div className="text-xs text-destructive">
              {validation.errors.join(', ')}
            </div>
          )}
        </div>
      );

    default:
      return (
        <div className="text-xs text-muted-foreground">
          Unsupported control type: {control.type}
        </div>
      );
  }
};

export const PropControls: React.FC<PropControlsProps> = ({
  scenarioId,
  controls,
  currentProps,
  defaultProps = {},
  onPropChange,
  onReset,
  onCopy,
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({});

  const mergedProps = useMemo(() => {
    return mergePropsWithDefaults(currentProps, defaultProps);
  }, [currentProps, defaultProps]);

  const filteredControls = useMemo(() => {
    if (!searchTerm) return controls;
    
    const filtered: ControlsConfig = {};
    Object.entries(controls).forEach(([propName, control]) => {
      if (
        propName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        control.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        control.description?.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        filtered[propName] = control;
      }
    });
    
    return filtered;
  }, [controls, searchTerm]);

  const controlGroups = useMemo(() => {
    const groups: Record<string, Array<[string, ControlDefinition]>> = {
      'Appearance': [],
      'Behavior': [],
      'Content': [],
      'Other': [],
    };

    Object.entries(filteredControls).forEach(([propName, control]) => {
      // Simple categorization based on prop names and types
      if (propName.includes('variant') || propName.includes('size') || propName.includes('color') || control.type === 'color') {
        groups['Appearance'].push([propName, control]);
      } else if (propName.includes('disabled') || propName.includes('loading') || propName.includes('onClick') || control.type === 'boolean') {
        groups['Behavior'].push([propName, control]);
      } else if (propName.includes('text') || propName.includes('label') || propName.includes('content') || control.type === 'text' || control.type === 'textarea') {
        groups['Content'].push([propName, control]);
      } else {
        groups['Other'].push([propName, control]);
      }
    });

    // Remove empty groups
    return Object.entries(groups).filter(([, items]) => items.length > 0);
  }, [filteredControls]);

  const handlePropChange = useCallback(
    async (propName: string, newValue: any) => {
      const oldValue = mergedProps[propName];
      const control = controls[propName];
      
      // Validate the prop change
      const validationResult = await validatePropChange(propName, newValue, control);
      
      setValidationResults(prev => ({
        ...prev,
        [propName]: validationResult,
      }));

      // Emit the prop change event
      const changeEvent: PropChangeEvent = {
        scenarioId,
        propName,
        newValue,
        oldValue,
        isValid: validationResult.isValid,
        validationErrors: validationResult.errors,
      };

      onPropChange(changeEvent);
    },
    [scenarioId, mergedProps, controls, onPropChange]
  );

  const handleReset = useCallback(() => {
    setValidationResults({});
    onReset?.();
  }, [onReset]);

  const handleCopy = useCallback(() => {
    onCopy?.(mergedProps);
  }, [mergedProps, onCopy]);

  const toggleSection = useCallback((sectionName: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionName)) {
        next.delete(sectionName);
      } else {
        next.add(sectionName);
      }
      return next;
    });
  }, []);

  const hasModifiedProps = useMemo(() => {
    return Object.keys(currentProps).length > 0;
  }, [currentProps]);

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Prop Controls</CardTitle>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 px-2"
              title="Copy props to clipboard"
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={!hasModifiedProps}
              className="h-7 px-2"
              title="Reset to defaults"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {Object.keys(controls).length > 5 && (
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search controls..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-8 text-xs"
            />
          </div>
        )}

        {hasModifiedProps && (
          <div className="text-xs text-muted-foreground">
            {Object.keys(currentProps).length} prop(s) modified
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        {controlGroups.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">
            {searchTerm ? 'No controls match your search' : 'No controls available'}
          </div>
        ) : (
          controlGroups.map(([groupName, groupControls]) => {
            const isCollapsed = collapsedSections.has(groupName);
            
            return (
              <div key={groupName} className="space-y-2">
                <button
                  onClick={() => toggleSection(groupName)}
                  className="flex items-center justify-between w-full text-left text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>{groupName}</span>
                  {isCollapsed ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronUp className="h-3 w-3" />
                  )}
                </button>
                
                {!isCollapsed && (
                  <div className="space-y-3 pl-2">
                    {groupControls.map(([propName, control]) => {
                      const currentValue = mergedProps[propName];
                      const validation = validationResults[propName];
                      const isModified = propName in currentProps;
                      
                      return (
                        <div key={propName} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label
                              htmlFor={`control-${propName}`}
                              className="text-xs font-medium flex items-center space-x-1"
                            >
                              <span>{control.label}</span>
                              {isModified && (
                                <Badge variant="secondary" className="text-xs px-1">
                                  Modified
                                </Badge>
                              )}
                            </Label>
                            {control.required && (
                              <span className="text-xs text-destructive">*</span>
                            )}
                          </div>
                          
                          {control.description && (
                            <div className="text-xs text-muted-foreground">
                              {control.description}
                            </div>
                          )}
                          
                          <ControlInput
                            propName={propName}
                            control={control}
                            value={currentValue}
                            onChange={(value) => handlePropChange(propName, value)}
                            validation={validation}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {groupName !== controlGroups[controlGroups.length - 1][0] && !isCollapsed && (
                  <Separator className="my-2" />
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};