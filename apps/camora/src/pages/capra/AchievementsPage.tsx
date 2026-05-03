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
      {/* LeetCode navy hero */}
      <section className="relative overflow-hidden" style={{ background: 'var(--cam-hero-bg)' }}>
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.08), transparent 70%)' }} />
        <div className="relative w-full lg:max-w-[85%] mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">
          <h1 className="landing-display font-extrabold text-2xl md:text-3xl tracking-tight text-white">
            <span style={{ color: 'var(--cam-gold-leaf-lt)' }}>Achievements</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.85)' }}>Badges, leaderboard, and your progress milestones.</p>
        </div>
        <svg aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 100 100" className="absolute left-0 bottom-0 w-full pointer-events-none" style={{ height: '5vh', display: 'block' }}>
          <polygon fill="var(--bg-app)" points="0,0 100,100 0,100" />
        </svg>
      </section>
      <div>
        <div className="w-full lg:max-w-[85%] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <GamificationWidget />
          <BadgeGrid />
          <Leaderboard />
        </div>
      </div>
    </div>
  );
}
