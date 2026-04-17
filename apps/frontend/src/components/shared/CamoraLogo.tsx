export default function CamoraLogo({ size = 36 }: { size?: number }) {
  return (
    <img
      src="/camora-logo.png"
      alt="Camora"
      width={size}
      height={size}
      className="object-contain"
      draggable={false}
    />
  );
}
