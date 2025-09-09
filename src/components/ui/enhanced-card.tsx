import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import {
  animations,
  cx,
  designSystem,
  ElevationLevel,
  getElevation,
  getSize,
  getStyle,
  SizeVariant,
  StyleVariant,
} from '../../lib/design-system';

export interface EnhancedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: ElevationLevel;
  glass?: boolean;
  size?: SizeVariant;
  variant?: StyleVariant;
  interactive?: boolean;
  borderGlow?: boolean;
  gradientBorder?: boolean;
  title?: React.ReactNode;
  footer?: React.ReactNode;
}

export const EnhancedCard = React.forwardRef<HTMLDivElement, EnhancedCardProps>(
  function EnhancedCard(
    {
      elevation = 1,
      glass: glassEnabled = false,
      size = 'md',
      variant = 'solid',
      interactive = true,
      borderGlow = false,
      gradientBorder = false,
      title,
      footer,
      className,
      children,
      ...rest
    },
    ref
  ) {
    const base = cx(
      'relative rounded-lg',
      getElevation(elevation),
      getStyle(variant),
      glassEnabled ? designSystem.glass.surface : '',
      interactive
        ? `${animations.hoverRaise} ${animations.pulseGlow} ${animations.focusRing} ${animations.tap}`
        : '',
      gradientBorder
        ? 'bg-clip-padding [background-clip:padding-box,border-box] border-transparent'
        : '',
      className
    );

    return (
      <Card ref={ref} className={base} {...rest}>
        {gradientBorder && (
          <div className='pointer-events-none absolute inset-0 rounded-lg p-[1px] [mask-image:linear-gradient(black,transparent)]'>
            <div className='h-full w-full rounded-lg bg-gradient-to-br from-blue-500/30 via-fuchsia-500/20 to-emerald-500/30 blur-[6px] opacity-80' />
          </div>
        )}
        {borderGlow && (
          <div className='pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-white/5' />
        )}
        {title || footer ? (
          <div className='flex flex-col'>
            {title && (
              <CardHeader className='pb-2'>
                {typeof title === 'string' ? (
                  <CardTitle className={cx('font-medium', designSystem.typography.md)}>
                    {title}
                  </CardTitle>
                ) : (
                  title
                )}
              </CardHeader>
            )}
            <CardContent className={cx('relative', getSize(size))}>{children}</CardContent>
            {footer && (
              <div className='px-4 py-2 border-t border-border/30 text-xs text-muted-foreground'>
                {footer}
              </div>
            )}
          </div>
        ) : (
          <CardContent className={cx('relative', getSize(size))}>{children}</CardContent>
        )}
      </Card>
    );
  }
);

export default EnhancedCard;
