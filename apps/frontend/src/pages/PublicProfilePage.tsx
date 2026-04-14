import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import SiteNav from '../components/shared/SiteNav';
import SiteFooter from '../components/shared/SiteFooter';
import ScoreCard from '../components/capra/features/ScoreCard';
import CamoraLogo from '../components/shared/CamoraLogo';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

interface PublicProfile {
  username: string;
  name: string;
  avatar?: string;
  level: number;
  xp: number;
  problems_solved: number;
  current_streak: number;
  longest_streak: number;
  badges_earned: number;
  badges: Array<{
    key: string;
    title: string;
    icon: string;
    earned_at: string;
  }>;
  score_cards: Array<{
    id: string;
    type: string;
    title: string;
    score: number;
    category: string;
    share_token: string;
    created_at: string;
  }>;
  certificates: Array<{
    id: string;
    title: string;
    type: string;
    issued_at: string;
    share_token: string;
  }>;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;

    async function fetchProfile() {
      try {
        const res = await fetch(`${API_URL}/api/score-cards/profile/public/${username}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setProfile(json);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [username]);

  // Update document title
  useEffect(() => {
    if (profile) {
      document.title = `${profile.name} | Camora Profile`;
      setMetaProperty('og:title', `${profile.name} on Camora`);
      setMetaProperty('og:description', `Level ${profile.level} -- ${profile.problems_solved} problems solved`);
      setMetaProperty('og:type', 'profile');
    }
    return () => {
      document.title = 'Camora';
    };
  }, [profile]);

  function setMetaProperty(property: string, content: string) {
    let el = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`);
    if (!el) {
      el = document.createElement('meta');
      if (property.startsWith('og:')) {
        el.setAttribute('property', property);
      } else {
        el.setAttribute('name', property);
      }
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <SiteNav />
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <SiteNav />
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <CamoraLogo size={48} />
          <h1 className="mt-6 text-2xl font-bold text-gray-900 tracking-tight">Profile Not Found</h1>
          <p className="mt-2 text-sm text-gray-500 text-center max-w-sm">
            This user profile does not exist or has not been made public.
          </p>
          <Link
            to="/"
            className="mt-8 inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Go to Camora
          </Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SiteNav />

      <main className="flex-1 w-full lg:max-w-[70%] mx-auto px-4 sm:px-6 pt-24 pb-16">
        {/* Profile header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-10">
          {/* Avatar */}
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-20 h-20 rounded-full object-cover border-2 border-[#e3e8ee]"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-2xl font-bold text-emerald-700 border-2 border-emerald-200">
              {profile.name[0]?.toUpperCase() || '?'}
            </div>
          )}

          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{profile.name}</h1>
            <p className="text-sm text-gray-400 mt-0.5">@{profile.username}</p>
            <div className="flex items-center gap-3 mt-3 justify-center sm:justify-start">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
                </svg>
                Level {profile.level}
              </span>
              <span className="text-xs text-gray-500 font-medium">
                {profile.xp.toLocaleString()} XP
              </span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <div className="bg-white border-0 rounded-xl px-4 py-3 text-center shadow-[0_4px_24px_rgba(99,102,241,0.12)]">
            <p className="text-2xl font-bold text-gray-900">{profile.problems_solved}</p>
            <p className="text-xs text-gray-500 mt-0.5">Problems Solved</p>
          </div>
          <div className="bg-white border-0 rounded-xl px-4 py-3 text-center shadow-[0_4px_24px_rgba(99,102,241,0.12)]">
            <div className="flex items-center justify-center gap-1">
              <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
              </svg>
              <p className="text-2xl font-bold text-gray-900">{profile.current_streak}</p>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Current Streak</p>
          </div>
          <div className="bg-white border-0 rounded-xl px-4 py-3 text-center shadow-[0_4px_24px_rgba(99,102,241,0.12)]">
            <p className="text-2xl font-bold text-gray-900">{profile.longest_streak}</p>
            <p className="text-xs text-gray-500 mt-0.5">Longest Streak</p>
          </div>
          <div className="bg-white border-0 rounded-xl px-4 py-3 text-center shadow-[0_4px_24px_rgba(99,102,241,0.12)]">
            <p className="text-2xl font-bold text-gray-900">{profile.badges_earned}</p>
            <p className="text-xs text-gray-500 mt-0.5">Badges Earned</p>
          </div>
        </div>

        {/* Badges */}
        {profile.badges.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight mb-4">Badges</h2>
            <div className="flex flex-wrap gap-2">
              {profile.badges.map((badge) => (
                <div
                  key={badge.key}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-emerald-200 rounded-lg"
                >
                  <span className="text-lg">{badge.icon}</span>
                  <span className="text-sm font-medium text-gray-800">{badge.title}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Score Cards */}
        {profile.score_cards.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight mb-4">Recent Score Cards</h2>
            <div className="space-y-3">
              {profile.score_cards.map((sc) => (
                <Link key={sc.id} to={`/share/${sc.share_token}`} className="block">
                  <ScoreCard
                    type={sc.type}
                    title={sc.title}
                    score={sc.score}
                    category={sc.category}
                    userName={profile.name}
                    userAvatar={profile.avatar}
                    date={sc.created_at}
                    compact
                  />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Certificates */}
        {profile.certificates.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight mb-4">Certificates</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profile.certificates.map((cert) => (
                <Link
                  key={cert.id}
                  to={`/share/${cert.share_token}`}
                  className="flex items-start gap-3 bg-white border-0 rounded-xl px-5 py-4 shadow-[0_4px_24px_rgba(99,102,241,0.12)] hover:shadow-[0_20px_60px_rgba(99,102,241,0.28)] transition-shadow"
                >
                  {/* Certificate icon */}
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{cert.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {cert.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} &middot; {formatDate(cert.issued_at)}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <div className="border-t border-[#e3e8ee] pt-10 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full mb-4">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
            </svg>
            AI-Powered Interview Prep
          </div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Join Camora</h2>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
            Apply. Prepare. Practice. Attend. Build your public profile, earn badges, and land your dream job.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Get Started Free
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-[#e3e8ee] hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
            >
              View Plans
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
