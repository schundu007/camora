import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import SiteNav from '../components/shared/SiteNav';
import SiteFooter from '../components/shared/SiteFooter';
import ScoreCard from '../components/capra/features/ScoreCard';
import CamoraLogo from '../components/shared/CamoraLogo';

const API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';

interface ScoreCardData {
  id: string;
  type: string;
  title: string;
  score: number;
  category: string;
  user_name: string;
  user_avatar?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export default function PublicScoreCardPage() {
  const { token } = useParams<{ token: string }>();
  const [card, setCard] = useState<ScoreCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;

    async function fetchCard() {
      try {
        const res = await fetch(`${API_URL}/api/score-cards/public/${token}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setCard(json);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchCard();
  }, [token]);

  // Update document title for social sharing
  useEffect(() => {
    if (card) {
      document.title = `${card.user_name} scored ${card.score}% on ${card.title} | Camora`;
      // Update meta tags for social sharing
      const metaDesc = document.querySelector('meta[name="description"]');
      const descContent = `${card.user_name} scored ${card.score}% on ${card.title} — preparing with Camora`;
      if (metaDesc) {
        metaDesc.setAttribute('content', descContent);
      }

      // OG tags
      setMetaProperty('og:title', `${card.user_name} scored ${card.score}% | Camora`);
      setMetaProperty('og:description', descContent);
      setMetaProperty('og:type', 'website');
      setMetaProperty('twitter:card', 'summary');
      setMetaProperty('twitter:title', `${card.user_name} scored ${card.score}% | Camora`);
      setMetaProperty('twitter:description', descContent);
    }
    return () => {
      document.title = 'Camora';
    };
  }, [card]);

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
        <div className="flex items-center justify-center min-h-screen pt-14">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (notFound || !card) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <SiteNav />
        <div className="flex-1 flex flex-col items-center justify-center px-6 pt-14">
          <CamoraLogo size={48} />
          <h1 className="mt-6 text-2xl font-bold text-gray-900 tracking-tight">Score Card Not Found</h1>
          <p className="mt-2 text-sm text-gray-500 text-center max-w-sm">
            This score card may have been removed or the link is no longer valid.
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

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 pt-24 pb-16">
        <div className="w-full max-w-md">
          <ScoreCard
            type={card.type}
            title={card.title}
            score={card.score}
            category={card.category}
            userName={card.user_name}
            userAvatar={card.user_avatar}
            date={card.created_at}
          />
        </div>

        {/* CTA */}
        <div className="mt-12 text-center max-w-sm">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full mb-4">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
            </svg>
            AI-Powered Interview Prep
          </div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Start your prep journey</h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Practice coding, system design, and behavioral questions with AI-powered feedback. Track your progress and earn score cards.
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
