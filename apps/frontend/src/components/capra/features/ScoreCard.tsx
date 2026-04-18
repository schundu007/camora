import CamoraLogo from '../../shared/CamoraLogo';

interface ScoreCardProps {
  type: string;
  title: string;
  score: number;
  category: string;
  userName: string;
  userAvatar?: string;
  date: string;
  compact?: boolean;
}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-500';
  if (score >= 40) return 'text-amber-500';
  return 'text-red-500';
}

function scoreBgColor(score: number): string {
  if (score >= 70) return 'bg-[var(--accent)]/10';
  if (score >= 40) return 'bg-amber-500/10';
  return 'bg-red-500/10';
}

function scoreRingColor(score: number): string {
  if (score >= 70) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function typeLabel(type: string): string {
  switch (type) {
    case 'dsa': return 'Data Structures & Algorithms';
    case 'system_design': return 'System Design';
    case 'behavioral': return 'Behavioral';
    case 'coding': return 'Coding';
    default: return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ScoreCard({
  type,
  title,
  score,
  category,
  userName,
  userAvatar,
  date,
  compact = false,
}: ScoreCardProps) {
  const ringSize = compact ? 48 : 80;
  const ringStroke = compact ? 4 : 6;
  const ringRadius = (ringSize - ringStroke) / 2;
  const circumference = 2 * Math.PI * ringRadius;
  const dashOffset = circumference - (score / 100) * circumference;

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-[var(--bg-surface)] border-0 rounded-xl px-4 py-3 shadow-[0_4px_24px_rgba(45,140,255,0.12)] hover:shadow-[0_20px_60px_rgba(45,140,255,0.28)] transition-shadow">
        {/* Mini score ring */}
        <div className="relative shrink-0">
          <svg width={ringSize} height={ringSize} className="-rotate-90">
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={ringRadius}
              fill="none"
              stroke="var(--border)"
              strokeWidth={ringStroke}
            />
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={ringRadius}
              fill="none"
              stroke={scoreRingColor(score)}
              strokeWidth={ringStroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${scoreColor(score)}`}>
            {score}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{title}</p>
          <p className="text-xs text-[var(--text-muted)]">{typeLabel(type)} &middot; {formatDate(date)}</p>
        </div>

        {/* Category pill */}
        <span className="shrink-0 text-[11px] font-medium text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded-full">
          {category}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-surface)] rounded-2xl border-0 shadow-[0_4px_24px_rgba(45,140,255,0.12)] overflow-hidden w-full max-w-md">
      {/* Header with branding */}
      <div className="px-6 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CamoraLogo size={32} />
        </div>
        <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
          Score Card
        </span>
      </div>

      {/* Divider */}
      <div className="mx-6 border-t border-[var(--border)]" />

      {/* Score */}
      <div className="px-6 py-6 flex flex-col items-center">
        <div className="relative">
          <svg width={ringSize} height={ringSize} className="-rotate-90">
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={ringRadius}
              fill="none"
              stroke="var(--border)"
              strokeWidth={ringStroke}
            />
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={ringRadius}
              fill="none"
              stroke={scoreRingColor(score)}
              strokeWidth={ringStroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
            />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center text-3xl font-extrabold ${scoreColor(score)}`}>
            {score}
          </span>
        </div>

        <p className="mt-1 text-xs text-[var(--text-muted)] font-medium">out of 100</p>
      </div>

      {/* Title + Category */}
      <div className="px-6 text-center">
        <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight leading-snug">{title}</h3>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${scoreBgColor(score)} ${scoreColor(score)}`}>
            {typeLabel(type)}
          </span>
          <span className="text-xs font-medium text-[var(--accent)] bg-[var(--accent)]/10 px-2.5 py-0.5 rounded-full">
            {category}
          </span>
        </div>
      </div>

      {/* User + Date */}
      <div className="px-6 pt-5 pb-5">
        <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
          <div className="flex items-center gap-2.5">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName}
                className="w-8 h-8 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[var(--accent)]/15 flex items-center justify-center text-xs font-bold text-[var(--accent)]">
                {userName[0]?.toUpperCase() || '?'}
              </div>
            )}
            <span className="text-sm font-medium text-[var(--text-secondary)]">{userName}</span>
          </div>
          <span className="text-xs text-[var(--text-muted)]">{formatDate(date)}</span>
        </div>
      </div>
    </div>
  );
}
