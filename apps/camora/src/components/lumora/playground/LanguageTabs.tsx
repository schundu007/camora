import type { PlaygroundLanguage } from '../../../lib/capra-api';

const TABS: { id: PlaygroundLanguage; label: string }[] = [
  { id: 'python3',   label: 'Python3'   },
  { id: 'bash',      label: 'Bash'      },
  { id: 'docker',    label: 'Docker'    },
  { id: 'terraform', label: 'Terraform' },
];

interface Props {
  active: PlaygroundLanguage;
  onChange: (lang: PlaygroundLanguage) => void;
}

export const LanguageTabs = ({ active, onChange }: Props) => {
  return (
    <div
      className="flex items-end gap-0 px-4 bg-[#0d1117] border-b border-[#1e293b]"
      role="tablist"
      aria-label="Language"
    >
      {TABS.map(tab => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={[
            'px-4 py-2 mt-1 text-[12px] font-semibold rounded-t-md transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0047AB]',
            active === tab.id
              ? 'border border-[var(--cam-gold-leaf)] text-[var(--cam-gold-leaf)]'
              : 'border border-transparent text-[#94a3b8] hover:text-[var(--cam-strip-heading)]',
          ].join(' ')}
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
