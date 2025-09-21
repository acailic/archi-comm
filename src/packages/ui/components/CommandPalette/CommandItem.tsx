import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Badge } from '../ui/badge';

interface CommandData {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  action: () => void;
  section: 'navigation' | 'actions' | 'help';
  shortcut?: string;
  available?: boolean;
}

interface CommandItemProps {
  command: CommandData;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onFocus: () => void;
  optionId?: string;
}

export const CommandItem = React.memo(
  ({ command, index, isSelected, onClick, onMouseEnter, onFocus, optionId }: CommandItemProps) => {
    const Icon = command.icon;
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: index * 0.02 }}
        className={`
        p-3 rounded-lg cursor-pointer transition-all duration-200 group
        ${isSelected ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-muted/50'}
      `}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onFocus={onFocus}
        tabIndex={0}
        role='option'
        aria-selected={isSelected}
        id={optionId}
      >
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-3'>
            <div
              className={`
            p-2 rounded-md transition-all duration-200
            ${
              isSelected
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground'
            }
          `}
            >
              <Icon className='w-4 h-4' />
            </div>
            <div>
              <div
                className={`font-medium transition-colors ${isSelected ? 'text-primary' : 'text-foreground'}`}
              >
                {command.title}
              </div>
              <div className='text-sm text-muted-foreground'>{command.description}</div>
            </div>
          </div>
          <div className='flex items-center space-x-2'>
            {command.shortcut && (
              <Badge variant='outline' className='text-xs font-mono'>
                {command.shortcut}
              </Badge>
            )}
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <ArrowRight className='w-4 h-4 text-primary' />
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }
);
