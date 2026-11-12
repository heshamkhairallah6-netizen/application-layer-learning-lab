import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 14, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...rest,
  };
}

export const PlayIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 3.4 12 8l-7 4.6V3.4Z" fill="currentColor" stroke="none" />
  </svg>
);

export const PauseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="4.4" y="3.4" width="2.6" height="9.2" rx="0.6" fill="currentColor" stroke="none" />
    <rect x="9" y="3.4" width="2.6" height="9.2" rx="0.6" fill="currentColor" stroke="none" />
  </svg>
);

export const PrevIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M11 3.6 5.4 8l5.6 4.4V3.6Z" fill="currentColor" stroke="none" />
    <path d="M3.8 3.6v8.8" />
  </svg>
);

export const NextIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 3.6 10.6 8 5 12.4V3.6Z" fill="currentColor" stroke="none" />
    <path d="M12.2 3.6v8.8" />
  </svg>
);

export const ReplayIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M2.8 8a5.2 5.2 0 1 0 1.7-3.9" />
    <path d="M2.6 2.4v3h3" />
  </svg>
);

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m3.4 8.4 3 3 6.2-6.6" />
  </svg>
);

export const ArrowIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 8h10M9.4 4.4 13 8l-3.6 3.6" />
  </svg>
);

export const TerminalIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="2" y="3" width="12" height="10" rx="1.4" />
    <path d="m5 6.4 2 1.6-2 1.6M8.6 10h2.6" />
  </svg>
);

export const ShieldIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 2.2 13 4v4.1c0 2.7-2.1 4.6-5 5.7-2.9-1.1-5-3-5-5.7V4l5-1.8Z" />
    <path d="m6 7.8 1.5 1.5L10.4 6" />
  </svg>
);

export const LayersIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m8 2.2 5.4 2.7L8 7.6 2.6 4.9 8 2.2Z" />
    <path d="m2.6 8 5.4 2.7L13.4 8" />
    <path d="m2.6 11.1 5.4 2.7 5.4-2.7" />
  </svg>
);
