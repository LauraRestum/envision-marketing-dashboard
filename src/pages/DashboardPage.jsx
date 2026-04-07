import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useTasks from '../hooks/useTasks';
import useMeetings from '../hooks/useMeetings';
import useSubmissions from '../hooks/useSubmissions';
import useAnalytics from '../hooks/useAnalytics';
import useNotificationWriter from '../hooks/useNotificationWriter';
import { useNotifications } from '../context/NotificationContext';
import './DashboardPage.css';

const TEAM = [
  { key: 'laura', name: 'Laura Restum', initial: 'L', color: '#003087' },
  { key: 'arlo', name: 'Arlo Hoover', initial: 'A', color: '#004bb5' },
  { key: 'madison', name: 'Madison Neuhaus', initial: 'M', color: '#78BE21' },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const {
    tasks, loading: tasksLoading,
    getOverdueTasks, getDueTodayTasks, getActiveTasks, getThisWeekCompleted,
  } = useTasks();
  const { meetings, loading: meetingsLoading, getNextMondaySync } = useMeetings();
  const { submissions, loading: submissionsLoading } = useSubmissions();
  const { platformData } = useAnalytics();
  const { notifications, unreadCount } = useNotifications();

  // Write overdue task notifications to Firestore
  useNotificationWriter(tasks);

  const today = new Date().toISOString().split('T')[0];
  const overdue = useMemo(() => getOverdueTasks(), [tasks]);
  const dueToday = useMemo(() => getDueTodayTasks(), [tasks]);
  const todayStrip = useMemo(() => [...overdue, ...dueToday], [overdue, dueToday]);

  const needsAttention = useMemo(() => {
    const items = [];
    overdue.forEach((t) => items.push({ type: 'overdue', label: `Overdue: ${t.title}`, assignee: t.assignee, link: '/tasks' }));
    const newInbox = submissions.filter((s) => s.status === 'new');
    newInbox.slice(0, 3).forEach((s) => items.push({ type: 'inbox', label: `New ${s.type === 'story_submission' ? 'story' : s.type === 'contact' ? 'inquiry' : s.type === 'social_submission' ? 'social idea' : 'event request'} from ${s.submitterName}`, link: '/inbox' }));
    const unreadNotifs = notifications.filter((n) => !n.read);
    unreadNotifs.slice(0, 3).forEach((n) => items.push({ type: 'notification', label: n.message, link: '/' }));
    return items;
  }, [overdue, submissions, notifications]);

  const nextSync = useMemo(() => getNextMondaySync(), [meetings]);

  const recentMeetings = useMemo(() => meetings.slice(0, 3), [meetings]);

  if (tasksLoading || meetingsLoading || submissionsLoading) {
    return <div className="dash-loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-page">
      <h2 className="dash-greeting">Dashboard</h2>

      {/* Today strip */}
      <div className="today-strip">
        <div className="today-header">
          <h3>Today</h3>
          <span className="today-date">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
        </div>
        {todayStrip.length === 0 ? (
          <p className="today-empty">Nothing due today. You are all caught up.</p>
        ) : (
          <div className="today-items">
            {todayStrip.map((t) => (
              <div
                key={t.id}
                className={`today-item ${overdue.includes(t) ? 'overdue' : ''}`}
                onClick={() => navigate('/tasks')}
              >
                <span className="today-priority-dot" style={{ background: priorityColor(t.priority) }} />
                <span className="today-task-name">{t.title}</span>
                <span className="today-assignee">
                  {TEAM.find((m) => m.key === t.assignee)?.initial || '?'}
                </span>
                <span className="today-source">Internal</span>
                <span className={`today-due ${overdue.includes(t) ? 'overdue-text' : ''}`}>
                  {overdue.includes(t) ? `Overdue (${formatDate(t.due)})` : 'Due today'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bento grid */}
      <div className="bento-grid">
        {/* Needs Attention */}
        <div className="bento-card bento-attention" onClick={() => navigate('/tasks')}>
          <h4 className="bento-label">Needs Attention</h4>
          {needsAttention.length === 0 ? (
            <p className="bento-empty">Everything is on track.</p>
          ) : (
            <ul className="attention-list">
              {needsAttention.map((item, i) => (
                <li key={i} className="attention-item">
                  <span className={`attention-type ${item.type}`}>{item.type === 'overdue' ? 'Overdue' : 'Alert'}</span>
                  <span className="attention-label">{item.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Team Workload */}
        {TEAM.map((member) => {
          const active = getActiveTasks(member.key);
          const completedWeek = getThisWeekCompleted(member.key);
          const nextDue = active
            .filter((t) => t.due)
            .sort((a, b) => a.due.localeCompare(b.due))[0];

          return (
            <div key={member.key} className="bento-card bento-person" onClick={() => navigate('/tasks')}>
              <div className="bento-person-header">
                <div className="bento-avatar" style={{ background: member.color }}>
                  {member.initial}
                </div>
                <div>
                  <span className="bento-person-name">{member.name.split(' ')[0]}</span>
                  <span className="bento-person-count">{active.length} open</span>
                </div>
              </div>
              <span className="bento-person-stat">{completedWeek.length} completed this week</span>
              {nextDue && (
                <span className="bento-person-next">Next: {nextDue.title} ({formatDate(nextDue.due)})</span>
              )}
            </div>
          );
        })}

        {/* Content Calendar placeholder */}
        <div className="bento-card bento-calendar">
          <h4 className="bento-label">This Week on Social</h4>
          <p className="bento-empty">Content Calendar will populate this in Phase 2.</p>
        </div>

        {/* Ensight Countdown placeholder */}
        <div className="bento-card bento-ensight">
          <h4 className="bento-label">Ensight Countdown</h4>
          <p className="bento-empty">Ensight Planner will populate this in Phase 2.</p>
        </div>

        {/* Analytics Pulse */}
        <div className="bento-card bento-analytics" onClick={() => navigate('/analytics')}>
          <h4 className="bento-label">Analytics Pulse</h4>
          <div className="analytics-pulse-grid">
            {[
              { key: 'facebook', label: 'Facebook', color: '#003087' },
              { key: 'instagram', label: 'Instagram', color: '#C13584' },
              { key: 'tiktok', label: 'TikTok', color: '#69C9D0' },
              { key: 'linkedin', label: 'LinkedIn', color: '#004bb5' },
            ].map((p) => {
              const d = platformData[p.key];
              return (
                <div key={p.key} className="pulse-item">
                  <span className="pulse-plat" style={{ color: p.color }}>{p.label}</span>
                  <span className="pulse-count">{d?.followers?.toLocaleString() || '--'}</span>
                </div>
              );
            })}
          </div>
          <span className="pulse-sync">
            {platformData.facebook?.live ? `Synced ${new Date(platformData.facebook.lastSynced).toLocaleString()}` : 'Showing sample data'}
          </span>
        </div>

        {/* Inbox Preview */}
        <div className="bento-card bento-inbox" onClick={() => navigate('/inbox')}>
          <h4 className="bento-label">Inbox Preview</h4>
          {(() => {
            const unread = submissions.filter((s) => s.status === 'new').slice(0, 3);
            if (unread.length === 0) return <p className="bento-empty">No unread submissions.</p>;
            return (
              <ul className="inbox-preview-list">
                {unread.map((s) => (
                  <li key={s.id} className="inbox-preview-item">
                    <span className="inbox-preview-type">{
                      { story_submission: 'Story', social_submission: 'Social', contact: 'Contact', event_request: 'Event' }[s.type] || s.type
                    }</span>
                    <span className="inbox-preview-name">{s.submitterName}</span>
                  </li>
                ))}
              </ul>
            );
          })()}
        </div>

        {/* Next Team Sync */}
        <div className="bento-card bento-sync" onClick={() => navigate('/meetings')}>
          <h4 className="bento-label">Next Team Sync</h4>
          {nextSync ? (
            <div className="sync-detail">
              <span className="sync-title">{nextSync.title}</span>
              <span className="sync-date">{formatDate(nextSync.date)}</span>
              <span className="sync-attendees">
                {(nextSync.attendees || []).map((a) => a.charAt(0).toUpperCase() + a.slice(1)).join(', ')}
              </span>
            </div>
          ) : (
            <p className="bento-empty">No upcoming sync scheduled.</p>
          )}
        </div>

        {/* Recent Meetings */}
        <div className="bento-card bento-recent-meetings" onClick={() => navigate('/meetings')}>
          <h4 className="bento-label">Recent Meetings</h4>
          {recentMeetings.length === 0 ? (
            <p className="bento-empty">No meetings recorded yet.</p>
          ) : (
            <ul className="recent-meetings-list">
              {recentMeetings.map((m) => (
                <li key={m.id} className="recent-meeting-item">
                  <span className="recent-meeting-title">{m.title}</span>
                  <span className="recent-meeting-date">{formatDate(m.date)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function priorityColor(p) {
  const map = { high: '#e55', medium: '#f0a030', low: 'var(--text-muted)' };
  return map[p] || map.medium;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
