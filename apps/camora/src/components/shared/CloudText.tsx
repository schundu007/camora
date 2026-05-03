import { useCloudFormatter } from '@/hooks/useCloudFormatter';

interface CloudTextProps {
  /** The text to translate. AWS service names are swapped for the chosen
   *  cloud's equivalents. Empty/null is rendered as null (matches React
   *  expectations for conditional render sites). */
  children?: string | null;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Drop-in wrapper for plain string fields in topic data — `{x.description}`
 * etc. — that should respect the user's cloud-provider choice. Lighter
 * than FormattedContent (no markdown/code-block parsing); use it where the
 * source field is a single sentence or short phrase, not multi-paragraph
 * prose.
 *
 * Usage:
 *   <CloudText as="p" className="...">{problem.description}</CloudText>
 *   <CloudText>{api.description}</CloudText>
 */
export default function CloudText({ children, as: Tag = 'span', className, style }: CloudTextProps) {
  const fmt = useCloudFormatter();
  if (!children) return null;
  return <Tag className={className} style={style}>{fmt(children)}</Tag>;
}
