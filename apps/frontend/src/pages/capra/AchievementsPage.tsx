import { useEffect } from 'react';
import GamificationWidget from '../../components/capra/features/GamificationWidget';
import BadgeGrid from '../../components/capra/features/BadgeGrid';
import Leaderboard from '../../components/capra/features/Leaderboard';

export default function AchievementsPage() {
  useEffect(() => {
    document.title = 'Achievements | Camora';
    return () => { document.title = 'Camora'; };
  }, []);

  return (
    <div className="min-h-screen">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-subtle)' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="var(--accent)" xmlns="http://www.w3.org/2000/svg">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Achievements</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Track your progress and earn badges</p>
          </div>
        </div>

        {/* Stats bar */}
        <GamificationWidget />

        {/* Two-column: Badges + Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <BadgeGrid />
          </div>
          <div className="lg:col-span-1">
            <Leaderboard />
          </div>
        </div>
      </div>
    </div>
  );
}
