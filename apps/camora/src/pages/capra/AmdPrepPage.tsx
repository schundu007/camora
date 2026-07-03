// ============================================================================
// TEMP — AMD interview prep hub (added 2026-07-02, remove after the interview).
// A standalone grouping of existing Prepare topics for a focused study run.
// It does NOT own any content: every card deep-links to the real topic page
// (/capra/prepare?page=…&topic=…). Nothing here duplicates or moves topics.
//
// Chrome comes entirely from the canonical Capra UI kit (@/components/capra/ui)
// so it inherits the navy-strip + gold-leaf design language automatically.
//
// To remove: delete this file + its lazy import and <Route> line in App.tsx
// (search "amd-prep"). No other files reference it.
// ============================================================================
import { useNavigate } from 'react-router-dom';
import { HeroBand, HeroAccent, SectionHero, GlassPill } from '@/components/capra/ui';

type Item = { id: string; page: string; title: string; tag: string };

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

  // Navy-gold only: gold-leaf left accent marks the AMD-core set, navy accent
  // the supporting foundations. No per-category rainbow.
  const Card = ({ it, isNew }: { it: Item; isNew?: boolean }) => (
    <button
      type="button"
      onClick={() => go(it)}
      className="group flex items-center justify-between gap-3 w-full text-left rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] shadow-sm px-4 py-3 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:border-[var(--cam-gold-leaf)]"
      style={{ borderLeft: `3px solid ${isNew ? 'var(--cam-gold-leaf)' : 'var(--accent)'}` }}
    >
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 mb-1.5">
          <span className="badge badge-muted">{it.tag}</span>
          {isNew && <span className="badge badge-gold">New</span>}
        </span>
        <span className="block text-[14px] font-bold text-[var(--text-primary)] truncate">{it.title}</span>
      </span>
      <span className="text-[var(--text-muted)] group-hover:text-[var(--cam-gold-leaf)] transition-colors flex-shrink-0" aria-hidden>→</span>
    </button>
  );

  const grid = (items: Item[], isNew?: boolean) => (
    <div className="grid gap-2.5 mt-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
      {items.map((it) => <Card key={it.id} it={it} isNew={isNew} />)}
    </div>
  );

  return (
    <div>
      <HeroBand
        eyebrow="Interview Prep · Temporary"
        title={<>AMD <HeroAccent>CI/CD</HeroAccent> Prep</>}
        subtitle={`A focused study set for the AMD CI/CD role — ${CORE.length} core topics plus ${RELATED.length} supporting foundations. Every card opens the full topic in Prepare; these live in their normal categories too.`}
        actions={<GlassPill>{CORE.length + RELATED.length} topics</GlassPill>}
      />

      <div className="page-wrap py-8">
        <section>
          <SectionHero
            eyebrow="Core"
            title="AMD CI/CD Stack"
            subtitle="Built directly from the job description: self-hosted & hardware-in-the-loop CI, release manifests, firmware/kernel builds, and the ROCm GPU stack."
          />
          {grid(CORE, true)}
        </section>

        <section className="mt-9">
          <SectionHero
            eyebrow="Foundations"
            title="Supporting Topics"
            subtitle="Existing topics the JD leans on — CI tooling, supply-chain signing, delivery metrics, GPU architecture, and AWS networking."
          />
          {grid(RELATED)}
        </section>

        <div className="mt-8 pt-4 border-t border-[var(--border)]">
          <button type="button" onClick={() => navigate('/capra/prepare')} className="btn-ghost btn-sm">
            ← Back to all Prepare categories
          </button>
        </div>
      </div>
    </div>
  );
}
