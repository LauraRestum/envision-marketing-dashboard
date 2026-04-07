import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import './TopNav.css';

const CURRENT_USER = { name: 'Laura', initial: 'L' };

export default function TopNav({ onToggleSidebar }) {
  const { mode, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();
  const { logout } = useAuth();
  const [bellOpen, setBellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const bellRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="top-nav">
      <div className="top-nav-left">
        <button className="sidebar-toggle" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <rect y="3" width="20" height="2" rx="1" />
            <rect y="9" width="20" height="2" rx="1" />
            <rect y="15" width="20" height="2" rx="1" />
          </svg>
        </button>
        <div className="top-nav-brand">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="4" fill="var(--blue)" />
            <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
              fill="var(--green)" fontFamily="Montserrat" fontWeight="800" fontSize="14">E</text>
          </svg>
          <span className="brand-text">Marketing Dashboard</span>
        </div>
      </div>

      <div className="top-nav-right">
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
        >
          {mode === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
              <circle cx="9" cy="9" r="4" />
              <path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.3 3.3l1.4 1.4M13.3 13.3l1.4 1.4M3.3 14.7l1.4-1.4M13.3 4.7l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
              <path d="M15.1 10.8A7 7 0 017.2 2.9a7 7 0 107.9 7.9z" />
            </svg>
          )}
        </button>

        <div className="bell-wrapper" ref={bellRef}>
          <button className="bell-btn" onClick={() => setBellOpen(!bellOpen)} aria-label="Notifications">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13.5 6.75a4.5 4.5 0 10-9 0c0 5.25-2.25 6.75-2.25 6.75h13.5s-2.25-1.5-2.25-6.75M10.3 15.75a1.5 1.5 0 01-2.6 0" />
            </svg>
            {unreadCount > 0 && <span className="badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>

          {bellOpen && (
            <div className="bell-dropdown">
              <div className="bell-header">
                <span className="bell-title">Notifications</span>
                {unreadCount > 0 && (
                  <button className="mark-read-btn" onClick={markAllRead}>Mark all read</button>
                )}
              </div>
              <div className="bell-list">
                {notifications.length === 0 ? (
                  <p className="bell-empty">No notifications right now.</p>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      className={`bell-item ${n.read ? '' : 'unread'}`}
                      onClick={() => { markRead(n.id); setBellOpen(false); }}
                    >
                      <span className="bell-item-type">{n.module || 'System'}</span>
                      <span className="bell-item-msg">{n.message}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="user-wrapper" ref={userRef}>
          <button className="avatar-btn" onClick={() => setUserOpen(!userOpen)}>
            {CURRENT_USER.initial}
          </button>
          {userOpen && (
            <div className="user-dropdown">
              <span className="user-name">{CURRENT_USER.name}</span>
              <button className="user-logout" onClick={logout}>Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
