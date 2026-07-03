// ============================================================================
// TEMP — AMD interview prep hub (added 2026-07-02, remove after the interview).
// A standalone grouping of existing Prepare topics for a focused study run.
// It does NOT own any content: every card deep-links to the real topic page
// (/capra/prepare?page=…&topic=…). Nothing here duplicates or moves topics.
//
// To remove: delete this file + its lazy import and <Route> line in App.tsx
// (search "amd-prep"). No other files reference it.
// ============================================================================
import { useNavigate } from 'react-router-dom';

type Item = { id: string; page: string; title: string; tag: string };

const PAGE_COLORS: Record<string, string> = {
  DevOps: '#0047AB',
  Cloud: '#7C3AED',
  Linux: '#0F766E',
  'AI Systems Perf': '#B45309',
};

const CORE: Item[] = [
  { id: 'ci-self-hosted-runners', page: 'devops', title: 'Self-Hosted CI Runners at Scale', tag: 'DevOps' },
  { id: 'ci-runners-aws', page: 'cloud', title: 'Ephemeral CI Runners on AWS', tag: 'Cloud' },
  { id: 'hardware-in-the-loop-ci', page: 'devops', title: 'Hardware-in-the-Loop CI', tag: 'DevOps' },
  { id: 'release-manifests-lkg', page: 'devops', title: 'Release Manifests & Last-Known-Good', tag: 'DevOps' },
  { id: 'firmware-signing-secure-boot', page: 'linux', title: 'Firmware Signing & Secure Boot', tag: 'Linux' },
  { id: 'kernel-driver-builds', page: 'linux', title: 'Kernel & Driver Build Environments', tag: 'Linux' },
  { id: 'rocm-amd-gpu-stack', page: 'ai-systems-perf', title: 'ROCm & the AMD GPU Stack', tag: 'AI Systems Perf' },
];

const RELATED: Item[] = [
  { id: 'github-actions-deep-dive', page: 'devops', title: 'GitHub Actions', tag: 'DevOps' },
  { id: 'bazel-deep-dive', page: 'devops', title: 'Bazel', tag: 'DevOps' },
  { id: 'terraform-cicd-pipeline', page: 'devops', title: 'Terraform in CI/CD Pipelines', tag: 'DevOps' },
  { id: 'sigstore-supply-chain-security', page: 'devops', title: 'Sigstore & Supply Chain Security', tag: 'DevOps' },
  { id: 'slsa-supply-chain', page: 'devops', title: 'SLSA — Supply Chain Security', tag: 'DevOps' },
  { id: 'dora-metrics', page: 'devops', title: 'DORA Metrics', tag: 'DevOps' },
  { id: 'gpu-architecture-overview', page: 'ai-systems-perf', title: 'GPU Architecture & AI Hardware', tag: 'AI Systems Perf' },
  { id: 'cuda-memory-hierarchy', page: 'ai-systems-perf', title: 'CUDA Memory Hierarchy & Access Patterns', tag: 'AI Systems Perf' },
  { id: 'aws-vpc', page: 'cloud', title: 'VPC — Virtual Private Cloud', tag: 'Cloud' },
];

export default function AmdPrepPage() {
  const navigate = useNavigate();

  const go = (it: Item) => navigate(`/capra/prepare?page=${it.page}&topic=${it.id}`);

  const Card = ({ it, isNew }: { it: Item; isNew?: boolean }) => {
    const color = PAGE_COLORS[it.tag] || '#0047AB';
    return (
      <button
        type="button"
        onClick={() => go(it)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          width: '100%', textAlign: 'left', cursor: 'pointer',
          padding: '13px 15px', borderRadius: 10,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderLeft: `3px solid ${color}`,
          transition: 'transform .12s ease, box-shadow .12s ease, border-color .12s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.08)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
      >
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff', background: color, padding: '2px 7px', borderRadius: 5 }}>{it.tag}</span>
            {isNew && <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff', background: '#B45309', padding: '2px 7px', borderRadius: 5 }}>New</span>}
          </span>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</span>
        </span>
        <span style={{ fontSize: 16, color: 'var(--text-muted)', flexShrink: 0 }} aria-hidden>→</span>
      </button>
    );
  };

  const Section = ({ label, sub, items, isNew }: { label: string; sub: string; items: Item[]; isNew?: boolean }) => (
    <div style={{ marginBottom: 30 }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent-text)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>{sub}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
        {items.map((it) => <Card key={it.id} it={it} isNew={isNew} />)}
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '32px 20px' }}>
      {/* navy-gold hero strip */}
      <div style={{ borderRadius: 12, padding: '20px 22px', marginBottom: 26, background: 'linear-gradient(135deg, #0047AB 0%, #002f73 100%)', borderTop: '3px solid var(--cam-gold-leaf, #C6A15B)', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 22 }}>▲</span>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#fff' }}>AMD Interview Prep</h1>
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff', background: 'rgba(255,255,255,0.18)', padding: '3px 8px', borderRadius: 6 }}>Temporary</span>
        </div>
        <p style={{ fontSize: 13, margin: 0, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
          A focused study set for the AMD CI/CD role — {CORE.length} core topics plus {RELATED.length} supporting foundations. Every card opens the full topic in Prepare; these live in their normal categories too.
        </p>
      </div>

      <Section label="Core — AMD CI/CD Stack" sub="Built directly from the job description: self-hosted & hardware-in-the-loop CI, release manifests, firmware/kernel builds, and the ROCm GPU stack." items={CORE} isNew />
      <Section label="Supporting Foundations" sub="Existing topics the JD leans on — CI tooling, supply-chain signing, delivery metrics, GPU architecture, and AWS networking." items={RELATED} />

      <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <button type="button" onClick={() => navigate('/capra/prepare')} style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-text)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>← Back to all Prepare categories</button>
      </div>
    </div>
  );
}
