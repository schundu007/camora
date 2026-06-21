import { useState } from 'react';

/**
 * TopicDiagram — renders a pre-baked Graphviz PNG for a topic, served
 * from /public/diagrams/{topicId}/{kind}.png. The PNGs are produced
 * once at build time by `pnpm build:diagrams` (apps/camora/scripts/
 * build-topic-diagrams.mjs → apps/ai-services/layered_diagram.py) so
 * the runtime never generates them — single cache, single source.
 *
 * Renders nothing if the PNG is missing (some topics don't have a
 * layeredDesign / createFlow / advancedImplementation.components, and
 * the bake skips those — we want graceful absence, not a broken image).
 */
interface TopicDiagramProps {
  topicId: string;
  /** layered | flow-createFlow | flow-redirectFlow | architecture-basic | architecture-advanced … */
  kind: string;
  alt?: string;
  className?: string;
}

export default function TopicDiagram({
  topicId,
  kind,
  alt,
  className = '',
}: TopicDiagramProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  const src = `/diagrams/${topicId}/${kind}.png`;
  return (
    <figure
      className={`overflow-hidden ${className}`}
      style={{
        background: '#ffffff',
        border: '1px solid var(--border)',
        display: 'block',
        width: '85%',
        marginLeft: 'auto',
        marginRight: 'auto',
        transform: 'scaleY(1.15)',
        transformOrigin: 'top center',
        marginBottom: '13%',
      }}
    >
      <img
        src={src}
        alt={alt || `${topicId} ${kind} diagram`}
        loading="lazy"
        onError={() => {
          if (typeof console !== 'undefined') {
            console.warn(`[TopicDiagram] missing PNG: ${src}`);
          }
          setFailed(true);
        }}
        style={{ display: 'block', width: '100%', height: 'auto' }}
      />
    </figure>
  );
}
