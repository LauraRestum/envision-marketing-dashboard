import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const NAV_ITEMS = [
  { path: '/',           label: 'Dashboard',       icon: 'grid' },
  { path: '/inbox',      label: 'Inbox',           icon: 'inbox',    badgeKey: 'inbox' },
  { path: '/clickup',    label: 'ClickUp Projects', icon: 'folder',  badgeKey: 'clickup' },
  { path: '/tasks',      label: 'Team & Tasks',    icon: 'users',    badgeKey: 'tasks' },
  { path: '/meetings',   label: 'Meeting Notes',   icon: 'file-text' },
  { path: '/calendar',   label: 'Content Calendar', icon: 'calendar', badgeKey: 'calendar' },
  { path: '/formatter',  label: 'Social Formatter', icon: 'edit' },
  { path: '/analytics',  label: 'Analytics',       icon: 'bar-chart' },
  { path: '/ensight',    label: 'Ensight Planner',  icon: 'mail',    badgeKey: 'ensight' },
  { path: '/settings',   label: 'Settings',        icon: 'settings' },
];

const ICONS = {
  grid: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="1.5" width="6" height="6" rx="1" /><rect x="10.5" y="1.5" width="6" height="6" rx="1" />
      <rect x="1.5" y="10.5" width="6" height="6" rx="1" /><rect x="10.5" y="10.5" width="6" height="6" rx="1" />
    </svg>
  ),
  inbox: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.75 9H12l-1.5 2.25h-3L6 9H2.25" /><path d="M4.09 3.84L2.25 9v4.5a1.5 1.5 0 001.5 1.5h10.5a1.5 1.5 0 001.5-1.5V9l-1.84-5.16A1.5 1.5 0 0012.5 2.75h-7A1.5 1.5 0 004.09 3.84z" />
    </svg>
  ),
  folder: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 14.25a1.5 1.5 0 01-1.5 1.5H3a1.5 1.5 0 01-1.5-1.5V3.75A1.5 1.5 0 013 2.25h3.75L9 4.5h6a1.5 1.5 0 011.5 1.5v8.25z" />
    </svg>
  ),
  users: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.75 15.75v-1.5a3 3 0 00-3-3H5.25a3 3 0 00-3 3v1.5" /><circle cx="7.5" cy="5.25" r="3" />
      <path d="M16.5 15.75v-1.5a3 3 0 00-2.25-2.9" /><path d="M12 2.33a3 3 0 010 5.84" />
    </svg>
  ),
  'file-text': (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 1.5H4.5a1.5 1.5 0 00-1.5 1.5v12a1.5 1.5 0 001.5 1.5h9a1.5 1.5 0 001.5-1.5V6L10.5 1.5z" />
      <path d="M10.5 1.5V6H15" /><path d="M12 9.75H6" /><path d="M12 12.75H6" /><path d="M7.5 6.75H6" />
    </svg>
  ),
  calendar: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.25" y="3" width="13.5" height="12.75" rx="1.5" /><path d="M12 1.5v3M6 1.5v3M2.25 7.5h13.5" />
    </svg>
  ),
  edit: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.75 2.25a2.12 2.12 0 013 3L6 15l-4.5 1.5L3 12 12.75 2.25z" />
    </svg>
  ),
  'bar-chart': (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="12" y="1.5" width="3" height="15" /><rect x="7.5" y="6" width="3" height="10.5" /><rect x="3" y="10.5" width="3" height="6" />
    </svg>
  ),
  mail: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="3.75" width="15" height="10.5" rx="1.5" /><path d="M1.5 3.75L9 9.75l7.5-6" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="2.25" /><path d="M14.7 11.1a1.2 1.2 0 00.24 1.32l.04.04a1.46 1.46 0 11-2.06 2.06l-.04-.04a1.2 1.2 0 00-1.32-.24 1.2 1.2 0 00-.73 1.1v.12a1.46 1.46 0 01-2.91 0v-.06a1.2 1.2 0 00-.78-1.1 1.2 1.2 0 00-1.32.24l-.04.04a1.46 1.46 0 11-2.06-2.06l.04-.04a1.2 1.2 0 00.24-1.32 1.2 1.2 0 00-1.1-.73h-.12a1.46 1.46 0 010-2.91h.06a1.2 1.2 0 001.1-.78 1.2 1.2 0 00-.24-1.32l-.04-.04A1.46 1.46 0 115.38 3.3l.04.04a1.2 1.2 0 001.32.24h.06a1.2 1.2 0 00.73-1.1v-.12a1.46 1.46 0 012.91 0v.06a1.2 1.2 0 00.73 1.1 1.2 1.2 0 001.32-.24l.04-.04a1.46 1.46 0 112.06 2.06l-.04.04a1.2 1.2 0 00-.24 1.32v.06a1.2 1.2 0 001.1.73h.12a1.46 1.46 0 010 2.91h-.06a1.2 1.2 0 00-1.1.73z" />
    </svg>
  ),
};

export default function Sidebar({ open, onClose, badges = {} }) {
  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
      <nav className={`sidebar ${open ? 'open' : ''}`}>
        <ul className="sidebar-list">
          {NAV_ITEMS.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <span className="sidebar-icon">{ICONS[item.icon]}</span>
                <span className="sidebar-label">{item.label}</span>
                {item.badgeKey && badges[item.badgeKey] > 0 && (
                  <span className="sidebar-badge">{badges[item.badgeKey]}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
