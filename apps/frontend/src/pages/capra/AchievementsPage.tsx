import SiteNav from '../../components/shared/SiteNav';
import SiteFooter from '../../components/shared/SiteFooter';
import GamificationWidget from '../../components/capra/features/GamificationWidget';
import BadgeGrid from '../../components/capra/features/BadgeGrid';
import Leaderboard from '../../components/capra/features/Leaderboard';

export default function AchievementsPage() {
  return (
    <div className="min-h-screen bg-[#fafbfc]">
      <SiteNav />
      <div style={{ paddingTop: 56 }}>
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <h1 className="landing-display font-extrabold text-2xl md:text-3xl tracking-tight text-gray-900">
            Achievements
          </h1>

          <GamificationWidget />
          <BadgeGrid />
          <Leaderboard />
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
