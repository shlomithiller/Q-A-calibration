import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = ({ size = 16, ...props }: IconProps) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
});

export const ArrowLeft = (props: IconProps) => (
  <svg {...base(props)}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

export const ChevronRight = (props: IconProps) => (
  <svg {...base(props)}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export const ChevronLeft = (props: IconProps) => (
  <svg {...base(props)}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

export const ChevronDown = (props: IconProps) => (
  <svg {...base(props)}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const Search = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="11" cy="11" r="7" />
    <line x1="20" y1="20" x2="16.65" y2="16.65" />
  </svg>
);

export const Refresh = (props: IconProps) => (
  <svg {...base(props)}>
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

export const FilterIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

export const Plus = (props: IconProps) => (
  <svg {...base(props)}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const Upload = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

export const Sparkles = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z" />
    <path d="M19 14l.95 2.3L22.25 17.25l-2.3.95L19 20.5l-.95-2.3-2.3-.95L18.05 16.3 19 14z" />
  </svg>
);

export const ThumbsUp = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M7 11v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3z" />
    <path d="M7 11l3.5-7a2.4 2.4 0 0 1 4.5 1v4h5a2 2 0 0 1 2 2.3l-1.3 7a2 2 0 0 1-2 1.7H7" />
  </svg>
);

export const ThumbsDown = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M17 13V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-3z" />
    <path d="M17 13l-3.5 7a2.4 2.4 0 0 1-4.5-1v-4H4a2 2 0 0 1-2-2.3l1.3-7A2 2 0 0 1 5.3 4H17" />
  </svg>
);

export const Check = (props: IconProps) => (
  <svg {...base(props)}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const Warning = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const Shield = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

export const Database = (props: IconProps) => (
  <svg {...base(props)}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v6c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    <path d="M3 11v6c0 1.66 4 3 9 3s9-1.34 9-3v-6" />
  </svg>
);

export const Code = (props: IconProps) => (
  <svg {...base(props)}>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

export const Home = (props: IconProps) => (
  <svg {...base(props)} stroke="none" fill="currentColor" viewBox="0 0 52 52">
    <path d="M24.6 7.6l-16 14.4c-.4.3-.6.8-.6 1.3V44c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V32h8v12c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V23.3c0-.5-.2-1-.6-1.3l-16-14.4c-.8-.7-2-.7-2.8 0z" />
  </svg>
);

export const Grid = (props: IconProps) => (
  <svg {...base(props)} stroke="none" fill="currentColor" viewBox="0 0 16 16">
    <rect x="1" y="1" width="3" height="3" rx="0.5" />
    <rect x="6.5" y="1" width="3" height="3" rx="0.5" />
    <rect x="12" y="1" width="3" height="3" rx="0.5" />
    <rect x="1" y="6.5" width="3" height="3" rx="0.5" />
    <rect x="6.5" y="6.5" width="3" height="3" rx="0.5" />
    <rect x="12" y="6.5" width="3" height="3" rx="0.5" />
    <rect x="1" y="12" width="3" height="3" rx="0.5" />
    <rect x="6.5" y="12" width="3" height="3" rx="0.5" />
    <rect x="12" y="12" width="3" height="3" rx="0.5" />
  </svg>
);

export const Bell = (props: IconProps) => (
  <svg {...base(props)} stroke="none" fill="currentColor" viewBox="0 0 52 52">
    <path d="M46 38H6c-1.7 0-2.4-2-1.1-3.1 2.6-2.4 5.1-6.2 5.1-14.9 0-7.1 5-13 11.6-14.7.1-.1.2-.2.2-.3v-1c0-1.7 1.3-3 3-3h2.4c1.7 0 3 1.3 3 3v1c0 .1.1.3.2.3 6.6 1.7 11.6 7.6 11.6 14.7 0 8.6 2.5 12.5 5.1 14.9C48.4 36 47.7 38 46 38zM26 50c3.4 0 6.2-2.5 6.8-5.7.1-.5-.3-.9-.8-.9H20c-.5 0-.9.4-.8.9.6 3.2 3.4 5.7 6.8 5.7z" />
  </svg>
);

export const AgentAstro = ({ size = 16, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 52 52" fill="none" className={className} {...props}>
    <path d="M31.49,27.62h.02c-.82.07-1.55.21-2.18.41,0,0-.92.29-2.33.49-.33.05-.75.05-.98.05h-.17c-.23,0-.66-.02-.98-.07-1.41-.23-2.32-.55-2.32-.55-.63-.2-1.36-.35-2.18-.44-4.49-.46-6.43,1.25-6.54,1.57-.11.32.38,4.48.74,5.14.35.65.89,1.03,1.38,1.24.5.21,4.61.62,5.98.43,1.37-.19,1.58-.65,1.95-1.35.26-.5.93-2.76,1.3-4.09.09-.26.1-.78.73-.82.63.05.64.58.72.84.36,1.33.99,3.61,1.24,4.11.35.71.56,1.17,1.93,1.39,1.36.21,5.48-.12,5.98-.32.5-.2,1.04-.57,1.4-1.22.36-.65.92-4.8.82-5.12-.1-.33-2.01-2.07-6.51-1.69Z" fill="#032D60"/>
    <path d="M45.52,14.55h.01c-1.25-1.59-2.73-3-4.37-4.21,1.7-.3,2.99-1.78,2.99-3.56,0-2-1.62-3.63-3.63-3.63s-3.63,1.62-3.63,3.63c0,.4.08.78.2,1.14-2.58-1.22-5.4-2.02-8.35-2.33-4.94-.52-9.71.36-13.82,2.3.11-.35.19-.72.19-1.11,0-2-1.62-3.63-3.63-3.63s-3.63,1.62-3.63,3.63c0,1.78,1.28,3.25,2.96,3.56-4.66,3.44-7.91,8.45-8.65,14.26-.69,5.37.84,10.75,4.32,15.15,3.94,4.98,10.06,8.25,16.78,8.96.94.1,1.87.15,2.79.15,11.99,0,22.37-8.14,23.79-19.16.69-5.37-.84-10.75-4.32-15.15ZM26.02,42.66h-.01c-9.02-.01-16.36-6.03-16.36-13.43,0-2.23.68-4.37,1.91-6.27.11.68.31,1.27.53,1.71.3.6.9.95,1.53.95.25,0,.51-.05.75-.17.85-.41,1.2-1.43.81-2.28-.21-.45-.75-1.94.56-3.08,1.27,1.15,3.09,2.5,5.14,3.16,3.82,1.21,6.71.5,6.83.47.58-.15,1.03-.58,1.21-1.15.18-.57.05-1.19-.34-1.63-1.93-2.22-2.85-3.84-3.25-4.82,7.82,1.06,9.32,7.29,9.38,7.57.17.8.88,1.35,1.67,1.35.12,0,.23-.01.35-.04.93-.19,1.52-1.1,1.33-2.03-.24-1.16-.87-2.73-1.99-4.3,3.83,2.46,6.31,6.28,6.31,10.57,0,7.4-7.34,13.42-16.36,13.42Z" fill="#032D60"/>
  </svg>
);

export const HelpCircle = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const MoreVertical = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="19" r="1" />
  </svg>
);

export const Close = (props: IconProps) => (
  <svg {...base(props)}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const VerifiedCheck = ({ size = 16, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M14.6774 2.80156C14.4005 2.12464 14.062 1.50925 13.662 0.924639C13.4774 0.678486 13.139 0.647716 12.9543 0.863101C12.3697 1.41695 11.539 1.72464 10.6774 1.72464C9.75434 1.72464 8.92357 1.35541 8.30819 0.740024C8.12357 0.555409 7.81588 0.555409 7.63126 0.740024C7.01588 1.35541 6.18511 1.72464 5.26203 1.72464C4.4005 1.72464 3.6005 1.41695 2.98511 0.863101C2.76973 0.678486 2.43126 0.709255 2.27742 0.924639C1.87742 1.47849 1.53896 2.12464 1.26203 2.80156C1.26203 2.80156 0.523573 4.30925 0.64665 6.80156V7.04772C0.64665 7.17079 0.677419 7.29387 0.677419 7.41695V7.44772C1.10819 11.5708 4.15434 14.8631 8.0005 15.3862C11.8774 14.8323 14.8928 11.54 15.3236 7.41695V7.32464C15.3236 7.2631 15.3236 7.17079 15.3543 7.07848C15.5697 4.43233 14.6774 2.80156 14.6774 2.80156ZM12.5851 5.97093L7.47737 11.1709C7.35429 11.294 7.20044 11.294 7.07737 11.1709L4.09275 8.15554C3.96967 8.03247 3.96967 7.87862 4.09275 7.75554L4.49275 7.35554C4.61583 7.23247 4.76967 7.23247 4.89275 7.35554L7.1389 9.63247C7.20044 9.69401 7.32352 9.69401 7.41583 9.63247L11.8158 5.2017C11.9389 5.07862 12.0928 5.07862 12.2158 5.2017L12.6158 5.6017C12.7081 5.69401 12.7081 5.87862 12.5851 5.97093Z" fill="#5C5C5C"/>
  </svg>
);

export const Info = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

export const Send = (props: IconProps) => (
  <svg {...base(props)}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

export const Play = (props: IconProps) => (
  <svg {...base(props)} fill="currentColor" stroke="none">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

export const Undo = (props: IconProps) => (
  <svg {...base(props)}>
    <polyline points="9 14 4 9 9 4" />
    <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
  </svg>
);

export const Redo = (props: IconProps) => (
  <svg {...base(props)}>
    <polyline points="15 14 20 9 15 4" />
    <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
  </svg>
);

export const SparkleSingle = (props: IconProps) => (
  <svg {...base(props)} strokeWidth={0} stroke="none">
    <defs>
      <linearGradient id="sparkle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4d6cf7" />
        <stop offset="100%" stopColor="#cb65ff" />
      </linearGradient>
    </defs>
    <path d="M12 2l2.1 5.1L19.2 9 14.1 11 12 16.1 9.9 11 4.8 9 9.9 7.1z" fill="url(#sparkle-grad)" />
    <path d="M19 14l.9 2.2L22.1 17.1 20 18 19 20.2 18 18 15.9 17.1 18 16.2z" fill="url(#sparkle-grad)" opacity="0.7" />
  </svg>
);
