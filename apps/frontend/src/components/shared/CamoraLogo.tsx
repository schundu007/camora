import { useId } from 'react';

export default function CamoraLogo({ size = 36 }: { size?: number }) {
  const id = `cl-${useId().replace(/:/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id={`${id}-g`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#91C733" />
          <stop offset="100%" stopColor="#76B900" />
        </linearGradient>
      </defs>

      {/* Rounded square background — indigo gradient */}
      <rect x="2" y="2" width="44" height="44" rx="12" fill={`url(#${id}-g)`} />

      {/* C letterform — white, bold */}
      <path
        d="M30 15.5 C27.5 13 23.5 12 20 13.5 C15.5 15.5 13.5 20 14 25 C14.5 30 18 33.5 23 34 C26 34.2 28.5 33 30 31"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Two minimal dots — white */}
      <circle cx="35" cy="18" r="2" fill="white" opacity="0.8" />
      <circle cx="35" cy="28" r="2" fill="white" opacity="0.5" />
    </svg>
  );
}
