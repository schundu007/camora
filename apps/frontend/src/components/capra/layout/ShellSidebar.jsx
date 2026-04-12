import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Icon } from '../../shared/Icons.jsx';
import CamoraLogo from '../../shared/CamoraLogo';
import { useAppShell } from './AppShellContext.jsx';
import { useIsMobile } from '../../../hooks/capra/useIsMobile.js';
import { useAuth } from '../../../contexts/AuthContext';

const PREPARE_ITEMS = [
  { id: 'overview', label: 'Dashboard', icon: 'home', href: '/capra/prepare' },
  { id: 'coding', label: 'DSA & Algorithms', icon: 'cpu', href: '/capra/prepare/coding' },
  { id: 'system-design', label: 'System Design', icon: 'systemDesign', href: '/capra/prepare/system-design' },
  { id: 'microservices', label: 'Microservices', icon: 'grid', href: '/capra/prepare/microservices' },
  { id: 'databases', label: 'Database Internals', icon: 'database', href: '/capra/prepare/databases' },
  { id: 'sql', label: 'SQL for Interviews', icon: 'database', href: '/capra/prepare/sql' },
  { id: 'low-level', label: 'Low-Level Design', icon: 'layers', href: '/capra/prepare/low-level-design' },
  { id: 'projects', label: 'Projects', icon: 'code', href: '/capra/prepare/projects' },
  { id: 'roadmaps', label: 'Roadmaps', icon: 'trendingUp', href: '/capra/prepare/roadmaps' },
  { id: 'eng-blogs', label: 'Eng Blogs', icon: 'bookOpen', href: '/capra/prepare/eng-blogs' },
  { id: 'behavioral', label: 'Behavioral', icon: 'users', href: '/capra/prepare/behavioral' },
];

const PRACTICE_ITEMS = [
  { id: 'practice', label: 'Practice', icon: 'code', href: '/capra/practice' },
  { id: 'plan', label: 'My Plan', icon: 'calendar', href: '/capra/plan' },
  { id: 'achievements', label: 'Achievements', icon: 'trophy', href: '/capra/achievements' },
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
    <div className="flex flex-col h-full bg-white w-full">
      {/* Logo */}
      <div className={`border-b border-gray-100 flex items-center ${isCollapsed ? 'justify-center px-2 py-4' : 'justify-between px-5 py-4'}`}>
        {isCollapsed ? (
          <a href="/" className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center hover:scale-105 transition-transform">
            <Icon name="ascend" size={16} className="text-white" />
          </a>
        ) : (
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Icon name="ascend" size={16} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-gray-900" style={{ fontFamily: "'Comfortaa', sans-serif" }}>Camora</span>
              <span className="block text-[9px] font-mono uppercase tracking-[0.2em] text-emerald-600 -mt-0.5">Interview AI</span>
            </div>
          </a>
        )}
        {isMobile && (
          <button onClick={closeSidebar} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
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
                { label: 'Apply', href: '/jobs', icon: 'briefcase' },
                { label: 'Practice', href: '/capra/practice', icon: 'code' },
                { label: 'Attend', href: '/lumora', icon: 'microphone' },
                { label: 'Challenge', href: '/challenge', icon: 'trophy' },
              ].map(link => (
                <Link
                  key={link.label}
                  to={link.href}
                  onClick={closeSidebar}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                    location.pathname.startsWith(link.href)
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="h-px bg-gray-100 mx-4 mb-3" />
          </>
        )}

        {/* Prepare */}
        {!isCollapsed && <div className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase px-3 mb-2">Prepare</div>}
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
                  ? `text-emerald-700 font-semibold bg-emerald-50 ${isCollapsed ? '' : 'border-l-2 border-emerald-500'}`
                  : `text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium ${isCollapsed ? '' : 'border-l-2 border-transparent'}`
              }`}
            >
              <Icon name={item.icon} size={isCollapsed ? 18 : 16} className={isActive ? 'text-emerald-500' : 'text-gray-400'} />
              {!isCollapsed && <span className="flex-1 text-left text-[13px]">{item.label}</span>}
            </button>
          );
        })}

        {/* Divider */}
        <div className={`h-px bg-gray-100 my-3 ${isCollapsed ? 'mx-1' : 'mx-4'}`} />

        {/* Practice */}
        {!isCollapsed && <div className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase px-3 mb-2">Practice</div>}
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
                  ? `text-emerald-700 font-semibold bg-emerald-50 ${isCollapsed ? '' : 'border-l-2 border-emerald-500'}`
                  : `text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium ${isCollapsed ? '' : 'border-l-2 border-transparent'}`
              }`}
            >
              <Icon name={item.icon} size={isCollapsed ? 18 : 16} className={isActive ? 'text-emerald-500' : 'text-gray-400'} />
              {!isCollapsed && <span className="flex-1 text-left text-[13px]">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Reading Progress */}
      {!isCollapsed && (
        <div className="mx-3 mb-2 p-3 rounded-lg bg-gray-50 border border-gray-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase">Progress</span>
            <span className="text-[11px] font-bold text-emerald-600">{(() => {
              try {
                const stored = localStorage.getItem('camora_completed_topics');
                const completed = stored ? Object.keys(JSON.parse(stored)).length : 0;
                return completed;
              } catch { return 0; }
            })()} topics</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
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
      <div className={`border-t border-gray-100 ${isCollapsed ? 'px-1.5 py-2' : 'px-3 py-3'}`}>
        {/* User info */}
        {user && (
          <div className={`flex items-center mb-2 ${isCollapsed ? 'justify-center py-1.5' : 'gap-2.5 px-3 py-2'}`}>
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-7 h-7 rounded-full flex-shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                {(user.name || user.email || '?')[0].toUpperCase()}
              </div>
            )}
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-gray-900 truncate">{user.name || 'User'}</div>
                <div className="text-[10px] text-gray-400 truncate">{user.email}</div>
              </div>
            )}
            {!isCollapsed && (
              <button onClick={signOut} className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0" title="Sign out">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            )}
          </div>
        )}
        <button
          onClick={handleSettingsClick}
          title={isCollapsed ? 'Settings' : undefined}
          className={`w-full flex items-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all font-medium ${
            isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2 text-[13px]'
          }`}
        >
          <Icon name="settings" size={isCollapsed ? 18 : 15} className="text-gray-400" />
          {!isCollapsed && <span>Settings</span>}
        </button>
        <Link
          to="/pricing"
          onClick={() => { if (isMobile) closeSidebar(); }}
          title={isCollapsed ? 'Upgrade' : undefined}
          className={`w-full flex items-center rounded-lg text-emerald-600 hover:bg-emerald-50 transition-all font-medium ${
            isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2 text-[13px]'
          }`}
        >
          <Icon name="zap" size={isCollapsed ? 18 : 15} className="text-emerald-500" />
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
            <span>Camora — Live AI</span>
          </Link>
        )}

        {/* Collapse toggle — desktop only */}
        {!isMobile && (
          <button
            onClick={toggleCollapsed}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`w-full flex items-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all mt-1 ${
              isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2 text-[13px]'
            }`}
          >
            <svg className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            {!isCollapsed && <span className="text-gray-400 font-medium">Collapse</span>}
          </button>
        )}
      </div>
    </div>
  );
}
