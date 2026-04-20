import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Icon } from '../../shared/Icons.jsx';
import CamoraLogo from '../../shared/CamoraLogo';
import UserDropdown from '../../shared/UserDropdown';
import { useAppShell } from './AppShellContext.jsx';
import { useIsMobile } from '../../../hooks/capra/useIsMobile.js';
import { useAuth } from '../../../contexts/AuthContext';

const PREPARE_ITEMS = [
  { id: 'overview', label: 'Base Camp', icon: 'home', href: '/capra/prepare' },
  { id: 'coding', label: 'Ice Crystals', icon: 'cpu', href: '/capra/prepare/coding' },
  { id: 'system-design', label: 'Glacier Design', icon: 'systemDesign', href: '/capra/prepare/system-design' },
  { id: 'microservices', label: 'Snowflake Patterns', icon: 'grid', href: '/capra/prepare/microservices' },
  { id: 'databases', label: 'Permafrost Storage', icon: 'database', href: '/capra/prepare/databases' },
  { id: 'low-level', label: 'Frost Blueprints', icon: 'layers', href: '/capra/prepare/low-level-design' },
  { id: 'projects', label: 'Ice Forge', icon: 'code', href: '/capra/prepare/projects' },
  { id: 'roadmaps', label: 'Expedition Maps', icon: 'trendingUp', href: '/capra/prepare/roadmaps' },
  { id: 'eng-blogs', label: 'Arctic Dispatches', icon: 'bookOpen', href: '/capra/prepare/eng-blogs' },
  { id: 'behavioral', label: 'Northern Lights', icon: 'users', href: '/capra/prepare/behavioral' },
  { id: 'resume', label: 'Ice Shield', icon: 'fileText', href: '/capra/prepare/resume' },
];

const PRACTICE_ITEMS = [
  { id: 'practice', label: 'Thaw', icon: 'code', href: '/capra/practice' },
  { id: 'plan', label: 'Ice Path', icon: 'calendar', href: '/capra/plan' },
  { id: 'achievements', label: 'Frost Badges', icon: 'trophy', href: '/capra/achievements' },
];

/**
 * Unified sidebar — expanded (labels + icons) or collapsed (icons only).
 * Mobile drawer always shows expanded.
 */
export default function ShellSidebar() {
  const { isMobile } = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { activeSection, setActiveSection, closeSidebar, collapsed, toggleCollapsed } = useAppShell();
  const { user, logout: signOut } = useAuth();

  const isOnPrepare = location.pathname.startsWith('/capra/prepare');
  // Mobile drawer is always expanded
  const isCollapsed = !isMobile && collapsed;

  const handleNav = (href, sectionId) => {
    navigate(href);
    if (sectionId) setActiveSection(sectionId);
    if (isMobile) closeSidebar();
  };

  const handleSettingsClick = () => {
    // Settings panel lives in MainApp — navigate there first if needed
    if (!location.pathname.startsWith('/capra')) {
      navigate('/capra/coding');
      // Delay to let MainApp mount and register the event listener
      setTimeout(() => window.dispatchEvent(new CustomEvent('capra:open-settings')), 100);
    } else {
      window.dispatchEvent(new CustomEvent('capra:open-settings'));
    }
    if (isMobile) closeSidebar();
  };

  const isPracticeActive = (href) => location.pathname === href || location.pathname.startsWith(href + '/');

  return (
    <div className="flex flex-col h-full bg-[var(--bg-surface)] w-full">
      {/* Logo */}
      <div className={`border-b border-[var(--border)] flex items-center ${isCollapsed ? 'justify-center px-2 py-4' : 'justify-between px-5 py-4'}`}>
        {isCollapsed ? (
          <Link to="/" className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center hover:scale-105 transition-transform">
            <Icon name="ascend" size={16} className="text-white" />
          </Link>
        ) : (
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center">
              <Icon name="ascend" size={16} className="text-white" />
            </div>
            <div>
              <span className="block text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--accent)] -mt-0.5">Apply · Prepare · Practice · Attend</span>
            </div>
          </Link>
        )}
        {isMobile && (
          <button onClick={closeSidebar} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <nav className={`flex-1 py-3 overflow-y-auto ${isCollapsed ? 'px-1.5' : 'px-3'}`}>
        {/* Quick Nav — mobile only */}
        {isMobile && (
          <>
            <div className="flex flex-wrap gap-1.5 px-2 mb-3">
              {[
                { label: 'Summit', href: '/jobs', icon: 'briefcase' },
                { label: 'Thaw', href: '/capra/practice', icon: 'code' },
                { label: 'Blizzard', href: '/lumora', icon: 'microphone' },
                { label: 'Avalanche', href: '/challenge', icon: 'trophy' },
              ].map(link => (
                <Link
                  key={link.label}
                  to={link.href}
                  onClick={closeSidebar}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                    location.pathname.startsWith(link.href)
                      ? 'bg-[rgba(45,140,255,0.08)] text-[var(--accent)]'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="h-px bg-[var(--bg-elevated)] mx-4 mb-3" />
          </>
        )}

        {/* Prepare */}
        {!isCollapsed && <div className="text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase px-3 mb-2">Frost Prep</div>}
        {PREPARE_ITEMS.map((item) => {
          const isActive = isOnPrepare && activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.href, item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-lg transition-all mb-0.5 ${
                isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
              } ${
                isActive
                  ? `text-[var(--accent)] font-semibold bg-[rgba(45,140,255,0.08)] ${isCollapsed ? '' : 'border-l-2 border-[var(--accent)]'}`
                  : `text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] font-medium ${isCollapsed ? '' : 'border-l-2 border-transparent'}`
              }`}
            >
              <Icon name={item.icon} size={isCollapsed ? 18 : 16} className={isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} />
              {!isCollapsed && <span className="flex-1 text-left text-[13px]">{item.label}</span>}
            </button>
          );
        })}

        {/* Divider */}
        <div className={`h-px bg-[var(--bg-elevated)] my-3 ${isCollapsed ? 'mx-1' : 'mx-4'}`} />

        {/* Practice */}
        {!isCollapsed && <div className="text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase px-3 mb-2">Thaw</div>}
        {PRACTICE_ITEMS.map((item) => {
          const isActive = isPracticeActive(item.href);
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.href)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-lg transition-all mb-0.5 ${
                isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
              } ${
                isActive
                  ? `text-[var(--accent)] font-semibold bg-[rgba(45,140,255,0.08)] ${isCollapsed ? '' : 'border-l-2 border-[var(--accent)]'}`
                  : `text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] font-medium ${isCollapsed ? '' : 'border-l-2 border-transparent'}`
              }`}
            >
              <Icon name={item.icon} size={isCollapsed ? 18 : 16} className={isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} />
              {!isCollapsed && <span className="flex-1 text-left text-[13px]">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Reading Progress */}
      {!isCollapsed && (
        <div className="mx-3 mb-2 p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-[var(--text-muted)] tracking-widest uppercase">Progress</span>
            <span className="text-[11px] font-bold text-[var(--accent)]">{(() => {
              try {
                const stored = localStorage.getItem('camora_completed_topics');
                const completed = stored ? Object.keys(JSON.parse(stored)).length : 0;
                return completed;
              } catch { return 0; }
            })()} topics</span>
          </div>
          <div className="w-full h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
              style={{ width: `${(() => {
                try {
                  const stored = localStorage.getItem('camora_completed_topics');
                  const completed = stored ? Object.keys(JSON.parse(stored)).length : 0;
                  const total = 415;
                  return Math.min(100, Math.round((completed / total) * 100));
                } catch { return 0; }
              })()}%` }}
            />
          </div>
        </div>
      )}

      {/* Bottom utility */}
      <div className={`border-t border-[var(--border)] ${isCollapsed ? 'px-1.5 py-2' : 'px-3 py-3'}`}>
        {/* User info with dropdown */}
        {user && (
          <UserDropdown variant="light" compact={isCollapsed} position={isCollapsed ? 'right-bottom' : 'above-left'} showName={!isCollapsed} />
        )}
        <button
          onClick={handleSettingsClick}
          title={isCollapsed ? 'Settings' : undefined}
          className={`w-full flex items-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all font-medium ${
            isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2 text-[13px]'
          }`}
        >
          <Icon name="settings" size={isCollapsed ? 18 : 15} className="text-[var(--text-muted)]" />
          {!isCollapsed && <span>Settings</span>}
        </button>
        <Link
          to="/pricing"
          onClick={() => { if (isMobile) closeSidebar(); }}
          title={isCollapsed ? 'Upgrade' : undefined}
          className={`w-full flex items-center rounded-lg text-[var(--accent)] hover:bg-[rgba(45,140,255,0.08)] transition-all font-medium ${
            isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2 text-[13px]'
          }`}
        >
          <Icon name="zap" size={isCollapsed ? 18 : 15} className="text-[var(--accent)]" />
          {!isCollapsed && <span>Upgrade</span>}
        </Link>

        {/* Lumora internal link */}
        {!isCollapsed && (
          <Link
            to="/lumora"
            onClick={() => { if (isMobile) closeSidebar(); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-amber-600 hover:bg-amber-50 transition-all"
          >
            <Icon name="microphone" size={15} className="text-amber-500" />
            <span>Live AI Interview</span>
          </Link>
        )}

        {/* Collapse toggle — desktop only */}
        {!isMobile && (
          <button
            onClick={toggleCollapsed}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`w-full flex items-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-all mt-1 ${
              isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2 text-[13px]'
            }`}
          >
            <svg className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            {!isCollapsed && <span className="text-[var(--text-muted)] font-medium">Collapse</span>}
          </button>
        )}
      </div>
    </div>
  );
}
