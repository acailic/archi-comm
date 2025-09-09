import React, { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Input } from './input';
import { Button } from './button';
import { cn } from './utils';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  presetColors?: string[];
  className?: string;
}

const DEFAULT_PRESET_COLORS = [
  '#000000', // Black
  '#ffffff', // White
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#6b7280', // Gray
];

const ColorPicker = React.forwardRef<HTMLDivElement, ColorPickerProps>(
  ({ value, onChange, presetColors = DEFAULT_PRESET_COLORS, className }, ref) => {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value);

    // Update input value when prop changes
    React.useEffect(() => {
      setInputValue(value);
    }, [value]);

    const handleColorChange = (newColor: string) => {
      onChange(newColor);
      setInputValue(newColor);
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;
      setInputValue(newValue);

      // Validate hex color format
      if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(newValue)) {
        onChange(newValue);
      }
    };

    const handleInputBlur = () => {
      // Reset to current valid value if input is invalid
      if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(inputValue)) {
        setInputValue(value);
      }
    };

    const ColorSwatch = ({
      color,
      onClick,
      className: swatchClassName,
    }: {
      color: string;
      onClick: () => void;
      className?: string;
    }) => (
      <button
        type='button'
        onClick={onClick}
        className={cn(
          'w-8 h-8 rounded-md border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          color === value ? 'border-ring shadow-lg scale-110' : 'border-border',
          swatchClassName
        )}
        style={{ backgroundColor: color }}
        aria-label={`Select color ${color}`}
        title={color}
      />
    );

    return (
      <div ref={ref} className={cn('flex items-center gap-2', className)}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant='outline'
              type='button'
              className='w-12 h-9 p-1 border-2'
              aria-label={`Current color: ${value}`}
            >
              <div
                className='w-full h-full rounded-sm border border-border'
                style={{ backgroundColor: value }}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-auto p-4' align='start'>
            <div className='space-y-4'>
              {/* Preset Colors */}
              <div>
                <h4 className='text-sm font-medium mb-2'>Preset Colors</h4>
                <div className='grid grid-cols-5 gap-2'>
                  {presetColors.map(color => (
                    <ColorSwatch
                      key={color}
                      color={color}
                      onClick={() => {
                        handleColorChange(color);
                        setOpen(false);
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <h4 className='text-sm font-medium mb-2'>Custom Color</h4>
                <HexColorPicker
                  color={value}
                  onChange={handleColorChange}
                  className='!w-48 !h-32'
                />
              </div>

              {/* Hex Input */}
              <div>
                <h4 className='text-sm font-medium mb-2'>Hex Value</h4>
                <div className='flex items-center gap-2'>
                  <Input
                    type='text'
                    value={inputValue}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    placeholder='#000000'
                    className='w-24 font-mono text-sm'
                    maxLength={7}
                  />
                  <div
                    className='w-8 h-8 rounded border border-border flex-shrink-0'
                    style={{ backgroundColor: value }}
                    aria-label='Color preview'
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);

ColorPicker.displayName = 'ColorPicker';

export { ColorPicker, DEFAULT_PRESET_COLORS };
