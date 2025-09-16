import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Input } from './input';
import { Button } from './button';

interface EmojiItem {
  e: string;
  k: string[]; // keywords
}

const EMOJIS: EmojiItem[] = [
  { e: '⭐', k: ['star', 'favorite', 'gold'] },
  { e: '🚀', k: ['rocket', 'ship', 'launch'] },
  { e: '🧩', k: ['puzzle', 'piece'] },
  { e: '🎯', k: ['target', 'goal'] },
  { e: '🔥', k: ['fire', 'hot'] },
  { e: '💡', k: ['idea', 'light'] },
  { e: '🌈', k: ['rainbow', 'color'] },
  { e: '⚡', k: ['zap', 'bolt', 'fast'] },
  { e: '🛡️', k: ['shield', 'security'] },
  { e: '📦', k: ['box', 'package'] },
  { e: '🔧', k: ['wrench', 'tool'] },
  { e: '🧪', k: ['test', 'lab'] },
  { e: '🎉', k: ['party', 'confetti'] },
  { e: '📈', k: ['chart', 'growth'] },
  { e: '🧠', k: ['brain', 'ai'] },
];

export interface EmojiPickerProps {
  value?: string;
  onChange: (emoji: string) => void;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ value = '⭐', onChange }) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EMOJIS;
    return EMOJIS.filter(x => x.k.some(k => k.includes(q)));
  }, [query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant='outline' size='sm' className='gap-2 h-7'>
          <span className='text-base'>{value}</span>
          <span className='text-xs text-muted-foreground'>Change</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-64 p-3' align='start'>
        <div className='space-y-2'>
          <Input
            placeholder='Search emojis...'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className='h-7 text-xs'
          />
          <div className='grid grid-cols-8 gap-1.5 max-h-40 overflow-auto'>
            {filtered.map(item => (
              <button
                key={item.e}
                type='button'
                className={`h-7 w-7 rounded border ${item.e === value ? 'border-primary bg-accent/40' : 'border-border/40 hover:bg-accent/20'}`}
                onClick={() => { onChange(item.e); setOpen(false); }}
                title={item.k.join(', ')}
              >
                <span className='text-base'>{item.e}</span>
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPicker;

