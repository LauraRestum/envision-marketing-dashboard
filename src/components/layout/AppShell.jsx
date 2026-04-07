import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import TopNav from './TopNav';
import Sidebar from './Sidebar';
import MobileTabBar from './MobileTabBar';
import useNotificationBadges from '../../hooks/useNotificationBadges';
import './AppShell.css';

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const badges = useNotificationBadges();

  return (
    <div className="app-shell">
      <TopNav onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} badges={badges} />
      <main className="main-content">
        <Outlet />
      </main>
      <MobileTabBar />
    </div>
  );
}
