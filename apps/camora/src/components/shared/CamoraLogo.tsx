export default function CamoraLogo({ size = 36 }: { size?: number }) {
  return (
    <img
      src="/camora_favicon.png"
      alt="Camora"
      width={size}
      height={size}
      style={{ display: 'block', flexShrink: 0, borderRadius: size * 0.22 }}
    />
  );
}
