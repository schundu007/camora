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
      <div>
        <div className="w-full lg:max-w-[85%] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <h1 className="landing-display font-extrabold text-2xl md:text-3xl tracking-tight text-[var(--text-primary)]">
            Achievements
          </h1>

          <GamificationWidget />
          <BadgeGrid />
          <Leaderboard />
        </div>
      </div>
    </div>
  );
}
