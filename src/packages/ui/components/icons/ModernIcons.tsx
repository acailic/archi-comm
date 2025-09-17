import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

// Architecture Components Icon
export const ArchIcon: React.FC<IconProps> = ({ size = 20, className = '', strokeWidth = 1.5 }) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' className={className}>
    <defs>
      <linearGradient id='arch-gradient' x1='0%' y1='0%' x2='100%' y2='100%'>
        <stop offset='0%' stopColor='currentColor' />
        <stop offset='100%' stopColor='currentColor' opacity='0.6' />
      </linearGradient>
    </defs>
    <rect
      x='3'
      y='6'
      width='18'
      height='12'
      rx='2'
      stroke='url(#arch-gradient)'
      strokeWidth={strokeWidth}
      fill='none'
    />
    <rect x='6' y='9' width='3' height='2' rx='0.5' fill='currentColor' opacity='0.7' />
    <rect x='10.5' y='9' width='3' height='2' rx='0.5' fill='currentColor' opacity='0.7' />
    <rect x='15' y='9' width='3' height='2' rx='0.5' fill='currentColor' opacity='0.7' />
    <rect x='6' y='13' width='3' height='2' rx='0.5' fill='currentColor' opacity='0.7' />
    <rect x='10.5' y='13' width='3' height='2' rx='0.5' fill='currentColor' opacity='0.7' />
    <rect x='15' y='13' width='3' height='2' rx='0.5' fill='currentColor' opacity='0.7' />
    <path
      d='M9 11h1.5M13.5 11H15M7.5 15v-2M12 15v-2M16.5 15v-2'
      stroke='currentColor'
      strokeWidth='1'
      opacity='0.5'
      strokeLinecap='round'
    />
  </svg>
);

// Communication Icon
export const CommIcon: React.FC<IconProps> = ({ size = 20, className = '', strokeWidth = 1.5 }) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' className={className}>
    <path
      d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
      stroke='currentColor'
      strokeWidth={strokeWidth}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

// Design Canvas Icon
export const CanvasIcon: React.FC<IconProps> = ({
  size = 20,
  className = '',
  strokeWidth = 1.5,
}) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' className={className}>
    <rect
      x='3'
      y='3'
      width='18'
      height='18'
      rx='2'
      stroke='currentColor'
      strokeWidth={strokeWidth}
    />
    <circle cx='8' cy='8' r='2' fill='currentColor' opacity='0.6' />
    <circle cx='16' cy='8' r='2' fill='currentColor' opacity='0.6' />
    <circle cx='8' cy='16' r='2' fill='currentColor' opacity='0.6' />
    <circle cx='16' cy='16' r='2' fill='currentColor' opacity='0.6' />
    <path
      d='M10 8h4M8 10v4M16 10v4M10 16h4'
      stroke='currentColor'
      strokeWidth='1'
      strokeLinecap='round'
    />
  </svg>
);

// Component Palette Icon
export const PaletteIcon: React.FC<IconProps> = ({
  size = 20,
  className = '',
  strokeWidth = 1.5,
}) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' className={className}>
    <path
      d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'
      stroke='currentColor'
      strokeWidth={strokeWidth}
      fill='currentColor'
      fillOpacity='0.1'
    />
  </svg>
);

// Project Icon
export const ProjectIcon: React.FC<IconProps> = ({
  size = 20,
  className = '',
  strokeWidth = 1.5,
}) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' className={className}>
    <path
      d='M9 12l2 2 4-4M21 12c0 4.418-3.582 8-8 8a8.966 8.966 0 01-5.982-2.275L3 19l1.725-4.018C3.657 13.842 3 12.974 3 12c0-4.418 3.582-8 8-8s8 3.582 8 8z'
      stroke='currentColor'
      strokeWidth={strokeWidth}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

// Audio Recording Icon
export const AudioIcon: React.FC<IconProps> = ({
  size = 20,
  className = '',
  strokeWidth = 1.5,
}) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' className={className}>
    <path
      d='M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z'
      stroke='currentColor'
      strokeWidth={strokeWidth}
      fill='currentColor'
      fillOpacity='0.1'
    />
    <path
      d='M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8'
      stroke='currentColor'
      strokeWidth={strokeWidth}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

// Settings/Configuration Icon
export const ConfigIcon: React.FC<IconProps> = ({
  size = 20,
  className = '',
  strokeWidth = 1.5,
}) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' className={className}>
    <circle cx='12' cy='12' r='3' stroke='currentColor' strokeWidth={strokeWidth} />
    <path
      d='M12 1v6m0 6v6m11-7h-6m-6 0H1'
      stroke='currentColor'
      strokeWidth={strokeWidth}
      strokeLinecap='round'
    />
    <circle cx='21' cy='12' r='2' fill='currentColor' opacity='0.3' />
    <circle cx='3' cy='12' r='2' fill='currentColor' opacity='0.3' />
  </svg>
);

// Knowledge Base Icon
export const KnowledgeIcon: React.FC<IconProps> = ({
  size = 20,
  className = '',
  strokeWidth = 1.5,
}) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' className={className}>
    <path
      d='M4 19.5A2.5 2.5 0 016.5 17H20'
      stroke='currentColor'
      strokeWidth={strokeWidth}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z'
      stroke='currentColor'
      strokeWidth={strokeWidth}
      fill='currentColor'
      fillOpacity='0.05'
    />
    <path d='M8 8h8M8 12h6M8 16h4' stroke='currentColor' strokeWidth='1' strokeLinecap='round' />
  </svg>
);

// Plugin/Module Icon
export const PluginIcon: React.FC<IconProps> = ({
  size = 20,
  className = '',
  strokeWidth = 1.5,
}) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' className={className}>
    <rect
      x='3'
      y='3'
      width='7'
      height='7'
      rx='1.5'
      stroke='currentColor'
      strokeWidth={strokeWidth}
      fill='currentColor'
      fillOpacity='0.1'
    />
    <rect
      x='14'
      y='3'
      width='7'
      height='7'
      rx='1.5'
      stroke='currentColor'
      strokeWidth={strokeWidth}
      fill='currentColor'
      fillOpacity='0.1'
    />
    <rect
      x='3'
      y='14'
      width='7'
      height='7'
      rx='1.5'
      stroke='currentColor'
      strokeWidth={strokeWidth}
      fill='currentColor'
      fillOpacity='0.1'
    />
    <rect
      x='14'
      y='14'
      width='7'
      height='7'
      rx='1.5'
      stroke='currentColor'
      strokeWidth={strokeWidth}
      fill='currentColor'
      fillOpacity='0.1'
    />
    <path
      d='M10.5 6.5h3M6.5 10.5v3M17.5 10.5v3M10.5 17.5h3'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
    />
  </svg>
);

// Comment/Annotation Icon
export const CommentIcon: React.FC<IconProps> = ({
  size = 20,
  className = '',
  strokeWidth = 1.5,
}) => (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' className={className}>
    <path
      d='M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z'
      stroke='currentColor'
      strokeWidth={strokeWidth}
      fill='currentColor'
      fillOpacity='0.05'
    />
    <path d='M8 9h8M8 13h6' stroke='currentColor' strokeWidth='1' strokeLinecap='round' />
  </svg>
);

export const ModernIcons = {
  Arch: ArchIcon,
  Comm: CommIcon,
  Canvas: CanvasIcon,
  Palette: PaletteIcon,
  Project: ProjectIcon,
  Audio: AudioIcon,
  Config: ConfigIcon,
  Knowledge: KnowledgeIcon,
  Plugin: PluginIcon,
  Comment: CommentIcon,
};
