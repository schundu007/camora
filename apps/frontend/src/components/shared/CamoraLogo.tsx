export default function CamoraLogo({ size = 36 }: { size?: number }) {
  const id = `cam-logo-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Camora"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={`${id}-shell`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--cam-primary-lt, #3C7AAB)" />
          <stop offset="100%" stopColor="var(--cam-primary-dk, #1A4F86)" />
        </linearGradient>
        <linearGradient id={`${id}-spark`} x1="22" y1="14" x2="42" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.75" />
        </linearGradient>
      </defs>
      <path
        d="M32 4l24 12v32L32 60 8 48V16z"
        fill={`url(#${id}-shell)`}
      />
      <path
        d="M32 14l4 14 14 4-14 4-4 14-4-14-14-4 14-4z"
        fill={`url(#${id}-spark)`}
      />
    </svg>
  );
}
