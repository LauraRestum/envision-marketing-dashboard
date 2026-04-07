import { NavLink } from 'react-router-dom';
import './MobileTabBar.css';

const TABS = [
  { path: '/', label: 'Home', icon: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="7" height="7" rx="1" /><rect x="11" y="2" width="7" height="7" rx="1" />
      <rect x="2" y="11" width="7" height="7" rx="1" /><rect x="11" y="11" width="7" height="7" rx="1" />
    </svg>
  )},
  { path: '/inbox', label: 'Inbox', icon: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 10H13.3l-1.7 2.5H8.3L6.7 10H2.5" /><path d="M4.55 4.27L2.5 10v5a1.67 1.67 0 001.67 1.67h11.67A1.67 1.67 0 0017.5 15v-5l-2.05-5.73a1.67 1.67 0 00-1.56-1.1H6.11a1.67 1.67 0 00-1.56 1.1z" />
    </svg>
  )},
  { path: '/calendar', label: 'Calendar', icon: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="3.33" width="15" height="14.17" rx="1.67" /><path d="M13.33 1.67v3.33M6.67 1.67v3.33M2.5 8.33h15" />
    </svg>
  )},
  { path: '/ensight', label: 'Ensight', icon: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.67" y="4.17" width="16.67" height="11.67" rx="1.67" /><path d="M1.67 4.17L10 10.83l8.33-6.67" />
    </svg>
  )},
  { path: '/tasks', label: 'Tasks', icon: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.17 17.5v-1.67a3.33 3.33 0 00-3.33-3.33H5.83a3.33 3.33 0 00-3.33 3.33v1.67" /><circle cx="8.33" cy="5.83" r="3.33" />
      <path d="M18.33 17.5v-1.67a3.33 3.33 0 00-2.5-3.22" /><path d="M13.33 2.6a3.33 3.33 0 010 6.48" />
    </svg>
  )},
];

export default function MobileTabBar() {
  return (
    <nav className="mobile-tab-bar">
      {TABS.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end={tab.path === '/'}
          className={({ isActive }) => `mobile-tab ${isActive ? 'active' : ''}`}
        >
          <span className="mobile-tab-icon">{tab.icon}</span>
          <span className="mobile-tab-label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
