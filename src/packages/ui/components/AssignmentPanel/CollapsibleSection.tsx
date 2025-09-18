import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface CollapsibleSectionProps {
  title: string | React.ReactNode;
  icon?: React.ComponentType<any>;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export function CollapsibleSection({
  title,
  icon: Icon,
  isExpanded,
  onToggle,
  children,
  className,
  headerClassName,
}: CollapsibleSectionProps) {
  return (
    <Card className={className}>
      <CardHeader
        className={`pb-2 cursor-pointer ${headerClassName}`}
        onClick={onToggle}
      >
        <div className='flex items-center justify-between'>
          <CardTitle className='text-base flex items-center gap-2'>
            {Icon && <Icon className='w-4 h-4' />}
            {title}
          </CardTitle>
          {isExpanded ? (
            <ChevronDown className='w-4 h-4' />
          ) : (
            <ChevronRight className='w-4 h-4' />
          )}
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className='pt-0'>
          {children}
        </CardContent>
      )}
    </Card>
  );
}