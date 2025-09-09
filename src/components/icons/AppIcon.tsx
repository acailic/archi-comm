import React from 'react';

interface AppIconProps {
  size?: number;
  className?: string;
}

export const AppIcon: React.FC<AppIconProps> = ({ size = 24, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 64 64'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    className={className}
  >
    {/* Gradient Definition */}
    <defs>
      <linearGradient id='archicomm-gradient' x1='0%' y1='0%' x2='100%' y2='100%'>
        <stop offset='0%' stopColor='#6366f1' />
        <stop offset='50%' stopColor='#8b5cf6' />
        <stop offset='100%' stopColor='#a855f7' />
      </linearGradient>
      <linearGradient id='archicomm-accent' x1='0%' y1='0%' x2='100%' y2='100%'>
        <stop offset='0%' stopColor='#f59e0b' />
        <stop offset='100%' stopColor='#f97316' />
      </linearGradient>
    </defs>

    {/* Background Circle */}
    <circle cx='32' cy='32' r='28' fill='url(#archicomm-gradient)' opacity='0.1' />

    {/* Architecture Framework */}
    <rect
      x='12'
      y='20'
      width='40'
      height='24'
      rx='3'
      fill='none'
      stroke='url(#archicomm-gradient)'
      strokeWidth='2.5'
    />

    {/* Component Blocks */}
    <rect x='16' y='24' width='8' height='6' rx='1.5' fill='url(#archicomm-gradient)' />
    <rect x='28' y='24' width='8' height='6' rx='1.5' fill='url(#archicomm-gradient)' />
    <rect x='40' y='24' width='8' height='6' rx='1.5' fill='url(#archicomm-gradient)' />

    <rect x='16' y='34' width='8' height='6' rx='1.5' fill='url(#archicomm-gradient)' />
    <rect x='28' y='34' width='8' height='6' rx='1.5' fill='url(#archicomm-gradient)' />
    <rect x='40' y='34' width='8' height='6' rx='1.5' fill='url(#archicomm-gradient)' />

    {/* Connection Lines */}
    <line
      x1='24'
      y1='27'
      x2='28'
      y2='27'
      stroke='url(#archicomm-accent)'
      strokeWidth='2'
      strokeLinecap='round'
    />
    <line
      x1='36'
      y1='27'
      x2='40'
      y2='27'
      stroke='url(#archicomm-accent)'
      strokeWidth='2'
      strokeLinecap='round'
    />
    <line
      x1='20'
      y1='30'
      x2='20'
      y2='34'
      stroke='url(#archicomm-accent)'
      strokeWidth='2'
      strokeLinecap='round'
    />
    <line
      x1='32'
      y1='30'
      x2='32'
      y2='34'
      stroke='url(#archicomm-accent)'
      strokeWidth='2'
      strokeLinecap='round'
    />
    <line
      x1='44'
      y1='30'
      x2='44'
      y2='34'
      stroke='url(#archicomm-accent)'
      strokeWidth='2'
      strokeLinecap='round'
    />

    {/* Communication Waves */}
    <path
      d='M8 16 Q12 12 16 16 Q20 12 24 16'
      fill='none'
      stroke='url(#archicomm-accent)'
      strokeWidth='2'
      strokeLinecap='round'
      opacity='0.6'
    />
    <path
      d='M40 48 Q44 52 48 48 Q52 52 56 48'
      fill='none'
      stroke='url(#archicomm-accent)'
      strokeWidth='2'
      strokeLinecap='round'
      opacity='0.6'
    />
  </svg>
);

export default AppIcon;
