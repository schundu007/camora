import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { setStoredToken } from '../utils/tokenStore';
import { setStoredUserId } from '../utils/userStore';
import { clearAllPrepCaches, purgeLegacyGlobalPrep } from '../lib/prepStorage';
import { clearAllUserScopedStores } from '../lib/userScopedStorage';
import { isOwner } from '../lib/owner';

const CAPRA_API_URL = import.meta.env.VITE_CAPRA_API_URL || 'https://caprab.cariara.com';
// Auth + billing-subscription must call the SAME backend that mints the cookie
// during OAuth — otherwise a JWT_SECRET drift between services causes silent
// 401 on /me even though login itself succeeded. Route those through CAPRA
// (where Google OAuth callback runs); other lumora-specific routes still use
// LUMORA_API_URL as before.
const AUTH_API_URL = CAPRA_API_URL;
const DEV_MODE = import.meta.env.DEV && !import.meta.env.VITE_REQUIRE_AUTH;

interface AuthUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
  /** Some backends serve the avatar as `picture` (Google's claim name);
   *  normalizeUser() copies it into `image` so UserDropdown only has to
   *  read one field. Kept on the type so the property survives at runtime. */
  picture?: string;
  onboarding_completed?: boolean;
  job_roles?: string[];
  is_admin?: boolean;
}

// Lumora's /me returns `image`; Ascend's /me returns `picture` (Google's
// claim name). Normalize both into `image` so every consumer reads one
// field. Empty strings are dropped — Ascend sometimes returns picture:""
// for users who signed up before the field was populated.
function normalizeUser(u: any): AuthUser | null {
  if (!u || typeof u !== 'object') return null;
  const image = (u.image && String(u.image).trim()) || (u.picture && String(u.picture).trim()) || undefined;
  return {
    id: u.id != null ? String(u.id) : '',
    email: u.email ?? '',
    name: u.name ?? undefined,
    image,
    picture: u.picture ?? undefined,
    onboarding_completed: u.onboarding_completed ?? undefined,
    job_roles: Array.isArray(u.job_roles) ? u.job_roles : undefined,
    is_admin: u.is_admin === true,
  };
}

interface SubscriptionInfo {
  plan: string;
  status?: string;
  trialEndsAt?: string;
}

interface TeamInfo {
  id: number;
  plan_type: string;
  seat_limit: number;
  hours_pool_total: number | null;
  is_owner: boolean;
}

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  onboardingCompleted: boolean | null;
  hasResume: boolean | null;
  markResumeUploaded: () => void;
  subscription: SubscriptionInfo | null;
  subscriptionLoading: boolean;
  team: TeamInfo | null;
  teamLoading: boolean;
  hasTeamAccess: boolean;
  /** True while EITHER subscription OR team membership is still hydrating —
   *  PaywallGate reads this to avoid flashing "Upgrade" between the
   *  subscription fetch resolving and the team fetch resolving (a free-tier
   *  user who is on a paid team would otherwise see a paywall flash on
   *  hard refresh of /lumora). */
  accessLoading: boolean;
  refreshSubscription?: () => void;
  refreshTeam?: () => void;
  markOnboardingComplete: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  isAuthenticated: false,
  isLoading: true,
  user: null,
  onboardingCompleted: null,
  hasResume: null,
  markResumeUploaded: () => {},
  subscription: null,
  subscriptionLoading: true,
  team: null,
  teamLoading: true,
  hasTeamAccess: false,
  accessLoading: true,
  markOnboardingComplete: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);

  // Mirror the token to the module-level tokenStore so non-hook helpers
  // (utils/authHeaders.js, used by Profile / Practice / BadgeGrid /
  // ResumeOptimizer / etc.) can read it without React hooks. Required
  // because the SSO cookie is httpOnly so document.cookie can't see it.
  const setToken = useCallback((next: string | null) => {
    setTokenState(next);
    setStoredToken(next);
  }, []);
  const [user, setUserState] = useState<AuthUser | null>(null);
  // Mirror the user id to the module-level userStore so non-hook helpers
  // (prepStorage, live-assistant, company picker) can scope browser-local
  // caches per user. Written synchronously at every call site — same
  // pattern as setToken above — so the id is in place before any consumer
  // reads it on the next render.
  const setUser = useCallback((next: AuthUser | null) => {
    setUserState(next);
    setStoredUserId(next ? (next.id || next.email || null) : null);
  }, []);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [hasResume, setHasResume] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [teamLoading, setTeamLoading] = useState(true);

  useEffect(() => {
    // Strict-mode double-invocation guard: cancelled flips to true on
    // unmount, and every setState below is gated on it. Without this,
    // dev mounts run init() twice in parallel and the slower response
    // overwrites the faster one — token can flip back to undefined
    // mid-session in development.
    let cancelled = false;
    // One-time cleanup: the pre-fix Prep Kit cache lived under an unscoped
    // global key that any account on this browser could inherit. Discard it
    // — the server holds each user's real prep and hydrates it on mount.
    purgeLegacyGlobalPrep();
    async function init() {
      // Dev mode: auto-authenticate as dev user
      if (DEV_MODE) {
        let authed = false;
        try {
          const res = await fetch(`${AUTH_API_URL}/api/v1/auth/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'dev@camora.ai',
              name: 'Dev User',
              provider: 'dev',
              provider_id: 'dev-local-user',
            }),
          });
          if (res.ok) {
            const data = await res.json();
            setToken(data.access_token);
            setUser(normalizeUser(data.user));
            setOnboardingCompleted(true);
            authed = true;
          }
        } catch { /* backend not available */ }

        // Fallback: mock user if backend sync failed
        if (!authed) {
          setToken('dev-mode');
          setUser({ id: 'dev', email: 'dev@camora.ai', name: 'Dev User' });
          setOnboardingCompleted(true);
        }
        setIsLoading(false);
        return;
      }

      // Detect a fresh OAuth-callback hydrate. The backend redirects to
      // /?login=success after a successful Google login (no token in URL —
      // the cariara_sso cookie carries auth). We strip the flag from the
      // URL bar and remember it so post-auth side-effects (referral
      // application) can run once below.
      let wasFreshLogin = false;
      try {
        const sp = new URLSearchParams(window.location.search);
        if (sp.has('login')) {
          wasFreshLogin = sp.get('login') === 'success';
          sp.delete('login');
          const qs = sp.toString();
          window.history.replaceState(
            null, '',
            window.location.pathname + (qs ? '?' + qs : '') + window.location.hash,
          );
        }
      } catch { /* URL APIs unavailable */ }

      // Production: the cariara_sso cookie is now httpOnly, so we can't read it
      // from document.cookie. Instead, call /auth/me with credentials:'include'
      // — the cookie rides along, the backend validates it, and returns a fresh
      // short-lived access_token in the response body which we use as Bearer.
      //
      // Resilience: if /me succeeds but the backend deploy hasn't shipped the
      // access_token field yet, fall back to /refresh which has been returning
      // access_token forever. We also handle the legacy case where the cookie
      // is non-httpOnly (old sessions) by reading it directly as a last resort.
      try {
        const res = await fetch(`${AUTH_API_URL}/api/v1/auth/me`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          let bearerToken: string | undefined = data.access_token;

          if (!bearerToken) {
            // Backend doesn't return access_token in /me response yet —
            // hit /refresh which has been around longer and definitely returns it.
            try {
              const refreshRes = await fetch(`${AUTH_API_URL}/api/v1/auth/refresh`, {
                method: 'POST',
                credentials: 'include',
              });
              if (refreshRes.ok) {
                const refreshData = await refreshRes.json();
                bearerToken = refreshData.access_token;
              }
            } catch { /* fall through */ }
          }

          if (!bearerToken) {
            // Last resort: read a non-httpOnly cookie if one exists (legacy session).
            const m = document.cookie.match(/(?:^|; )cariara_sso=([^;]+)/);
            if (m) bearerToken = decodeURIComponent(m[1]);
          }

          if (bearerToken) {
            setToken(bearerToken);
            // /me may return either flat ({id, email, name, ..., access_token})
            // from lumora-backend or nested ({authenticated, user: {...}}) from
            // ascend-backend. Unwrap data.user when present.
            const { access_token: _at, ...flat } = data;
            void _at;
            setUser(normalizeUser(data.user ?? flat));

            // Unblock the app immediately — token and user are set, the rest
            // is secondary state that loads in the background.
            if (!cancelled) setIsLoading(false);

            // Fetch onboarding status from Capra backend using the fresh token
            let onboardingDone = true; // optimistic — only redirect on confirmed false
            try {
              const onboardingRes = await fetch(`${CAPRA_API_URL}/api/onboarding/status`, {
                headers: { Authorization: `Bearer ${bearerToken}` },
                credentials: 'include',
              });
              if (onboardingRes.ok) {
                const o = await onboardingRes.json();
                onboardingDone = o.onboarding_completed ?? false;
                if (!cancelled) {
                  setOnboardingCompleted(onboardingDone);
                  setHasResume(o.has_resume ?? false);
                }
              }
            } catch { /* capra backend may not be available */ }

            // Fresh-login side-effect: apply any referral code stashed in
            // localStorage during the OAuth round-trip. Only runs when the
            // ?login=success flag was present, so a normal page-load hydrate
            // doesn't keep retrying. The endpoint is idempotent server-side
            // but the localStorage clear-on-success is the canonical signal.
            if (wasFreshLogin) {
              // Clear the session skip flag so the onboarding gate re-prompts
              // if the user still hasn't uploaded a resume.
              sessionStorage.removeItem('camora_onboarding_skip_resume');
              const referralCode = localStorage.getItem('camora_referral_code');
              if (referralCode) {
                fetch(`${CAPRA_API_URL}/api/referral/apply`, {
                  credentials: 'include',
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bearerToken}` },
                  body: JSON.stringify({ code: referralCode }),
                }).then(() => localStorage.removeItem('camora_referral_code')).catch(() => {});
              }
              // New users (onboarding not done) land on / after OAuth — the
              // ProtectedRoute gate only watches /capra/* so they'd bypass it.
              // Force-redirect here so they always see resume+role selection.
              if (!onboardingDone && !window.location.pathname.startsWith('/capra/onboarding')) {
                window.location.replace('/capra/onboarding');
                return;
              }
            }
          }
        }
      } catch { /* not logged in or network error */ }
      if (!cancelled) setIsLoading(false);
    }
    init();
    return () => { cancelled = true; };
  }, []);

  // Fetch subscription status
  const fetchSubscription = useCallback(async (authToken: string) => {
    try {
      const res = await fetch(`${AUTH_API_URL}/api/v1/billing/subscription`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Backends return one of:
        //   lumora:  { plan, status }
        //   ascend:  { subscription: { plan_type, status }, plan, plan_type, status }
        const plan = data.plan
          || data.plan_type
          || data.subscription?.plan_type
          || data.subscription?.plan
          || 'free';
        const status = data.status || data.subscription?.status;
        const trialEndsAt = data.trial_ends_at || data.subscription?.trial_ends_at;
        setSubscription({ plan, status, trialEndsAt });
      } else {
        setSubscription({ plan: 'free' });
      }
    } catch {
      setSubscription({ plan: 'free' });
    }
    setSubscriptionLoading(false);
  }, []);

  // Fetch on token availability. Admins — either DB-flagged (user.is_admin
  // from the JWT) or listed in VITE_OWNER_EMAILS — skip the network call and
  // get an 'admin' plan synthesized in-memory, so no admin is ever paywalled
  // out of their own product (e.g. the desktop download) when a comp/admin DB
  // row is missing or the billing endpoint hiccups. Uses isOwner() so the DB
  // is_admin flag counts, not just the owner-email allowlist.
  useEffect(() => {
    if (!token) { setSubscriptionLoading(false); setSubscription({ plan: 'free' }); return; }
    if (isOwner(user)) {
      setSubscription({ plan: 'admin', status: 'active' });
      setSubscriptionLoading(false);
      return;
    }
    fetchSubscription(token);
  }, [token, user?.email, user?.is_admin, fetchSubscription]);

  // Refresh subscription after Stripe checkout return (URL contains session_id or checkout=success)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if ((params.has('session_id') || params.get('checkout') === 'success') && token) {
      // Delay to allow webhook to process
      const timer = setTimeout(() => fetchSubscription(token), 2000);
      return () => clearTimeout(timer);
    }
  }, [token, fetchSubscription]);

  // Public method to force subscription refresh (e.g., after payment)
  const refreshSubscription = useCallback(() => {
    if (token) fetchSubscription(token);
  }, [token, fetchSubscription]);

  // Fetch team membership. A user can be in 0 or 1 team (UNIQUE on user_id
  // in team_members). Used by PaywallGate so a free user joining a Pro Max
  // team actually gets access to gated features.
  const fetchTeam = useCallback(async (authToken: string, userId: string | number | undefined) => {
    setTeamLoading(true);
    try {
      const res = await fetch(`${AUTH_API_URL}/api/v1/teams/me`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) { setTeam(null); return; }
      const data = await res.json();
      const t = data.team;
      if (!t) { setTeam(null); return; }
      // String-vs-number compare on the previous code (AuthUser.id is
      // string, t.owner_user_id is number) made is_owner always false
      // for the actual owner — every future "owner-only" affordance
      // (manage seats, transfer ownership, billing edit) would have
      // been hidden from the team owner. Coerce both sides.
      setTeam({
        id: t.id,
        plan_type: t.plan_type,
        seat_limit: Number(t.seat_limit),
        hours_pool_total: t.hours_pool_total != null ? Number(t.hours_pool_total) : null,
        is_owner: userId != null && String(t.owner_user_id) === String(userId),
      });
    } catch {
      setTeam(null);
    } finally {
      setTeamLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) { setTeam(null); setTeamLoading(false); return; }
    fetchTeam(token, user?.id);
  }, [token, user?.id, fetchTeam]);

  const refreshTeam = useCallback(() => {
    if (token) fetchTeam(token, user?.id);
  }, [token, user?.id, fetchTeam]);

  // A user has team-grade access if their personal sub is paid OR they
  // belong to a team. PaywallGate reads this flag.
  const teamGrantsAccess = !!team && team.plan_type === 'team';
  const hasTeamAccess = (subscription?.plan && subscription.plan !== 'free') || teamGrantsAccess;
  // Combined hydration flag for paywall gates — true while EITHER fetch
  // is in flight, false only when both have resolved. Avoids the brief
  // "Upgrade" flash when subscription resolves first as `free` but the
  // team fetch is still pending and would have granted access.
  const accessLoading = subscriptionLoading || teamLoading;

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    // Wipe every per-user Prep Kit cache so the next account on this browser
    // can never render or backfill the previous user's prep. setUser(null)
    // above already cleared the stored user id.
    clearAllPrepCaches();
    // Wipe all other per-user caches (coding/design history, whiteboards,
    // interview contexts, voice JD/resume/prep, Sona transcripts, progress).
    clearAllUserScopedStores();
    setOnboardingCompleted(null);
    setSubscription(null);
    // Reset subscriptionLoading too — leaving it `true` after logout strands
    // the next user (or post-redirect render) on a "Loading…" spinner from a
    // fetch that's never coming back.
    setSubscriptionLoading(false);
    setTeam(null);
    setTeamLoading(false);
    // The cariara_sso cookie is httpOnly so JS can't clear it — hit the backend
    // /logout endpoint which returns a Set-Cookie with an expired cookie.
    fetch(`${CAPRA_API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => { /* navigate anyway even if the clear call fails */ })
      .finally(() => { window.location.href = '/'; });
  }, []);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, isLoading, user, onboardingCompleted, hasResume, markResumeUploaded: () => setHasResume(true), subscription, subscriptionLoading, team, teamLoading, hasTeamAccess, accessLoading, refreshSubscription, refreshTeam, markOnboardingComplete: () => setOnboardingCompleted(true), logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
