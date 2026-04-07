import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useTasks from '../hooks/useTasks';
import useMeetings from '../hooks/useMeetings';
import useSubmissions from '../hooks/useSubmissions';
import usePosts from '../hooks/usePosts';
import useStories from '../hooks/useStories';
import useNotificationWriter from '../hooks/useNotificationWriter';
import { useNotifications } from '../context/NotificationContext';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
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
  const { posts, loading: postsLoading } = usePosts();
  const { stories, loading: storiesLoading } = useStories();
  const { notifications, unreadCount } = useNotifications();

  // Analytics cache from Firestore
  const [analyticsDocs, setAnalyticsDocs] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'analytics_cache'), (snap) => {
      setAnalyticsDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setAnalyticsLoading(false);
    }, () => setAnalyticsLoading(false));
    return unsub;
  }, []);

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

  // This Week on Social — posts for current and next week
  const thisWeekPosts = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - ((dayOfWeek + 6) % 7)); // Monday
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfNextWeek = new Date(startOfWeek);
    endOfNextWeek.setDate(startOfWeek.getDate() + 13); // End of next week (Sunday)
    endOfNextWeek.setHours(23, 59, 59, 999);

    const startStr = startOfWeek.toISOString().split('T')[0];
    const endStr = endOfNextWeek.toISOString().split('T')[0];

    return posts.filter((p) => p.scheduledDate && p.scheduledDate >= startStr && p.scheduledDate <= endStr);
  }, [posts]);

  // Ensight Countdown — current month stories and days to end of month (send date)
  const ensightData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const currentMonth = `${year}-${month}`;
    const monthStories = stories.filter((s) => s.issueMonth === currentMonth);

    // Send date = last day of current month
    const lastDay = new Date(year, now.getMonth() + 1, 0);
    const diffTime = lastDay.getTime() - now.getTime();
    const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return { monthStories, daysLeft, monthLabel, currentMonth };
  }, [stories]);

  // Analytics Pulse — cached follower/platform data
  const analyticsPulse = useMemo(() => {
    const platforms = ['facebook', 'instagram', 'tiktok', 'linkedin'];
    return platforms.map((key) => {
      const cached = analyticsDocs.find((d) => d.id === key);
      return {
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1),
        lastSynced: cached?.lastSynced || null,
        followers: cached?.followers ?? null,
        data: cached || null,
      };
    });
  }, [analyticsDocs]);

  // KPI summary data
  const kpiData = useMemo(() => {
    const allActive = tasks.filter((t) => t.status !== 'done');
    const inboxNew = submissions.filter((s) => s.status === 'new');
    const totalCompleted = tasks.filter((t) => t.status === 'done');
    return {
      overdueCount: overdue.length,
      activeCount: allActive.length,
      postsThisWeek: thisWeekPosts.length,
      inboxUnread: inboxNew.length,
      completedThisWeek: TEAM.reduce((sum, m) => sum + getThisWeekCompleted(m.key).length, 0),
    };
  }, [overdue, tasks, thisWeekPosts, submissions]);

  if (tasksLoading || meetingsLoading || submissionsLoading || postsLoading || storiesLoading || analyticsLoading) {
    return (
      <div className="dash-loading">
        <div className="dash-loading-spinner" />
        <span>Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dash-header">
        <h2 className="dash-greeting">Dashboard</h2>
        <span className="dash-date">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="kpi-strip">
        <div
          className={`kpi-card ${kpiData.overdueCount > 0 ? 'kpi-alert' : ''}`}
          onClick={() => navigate('/tasks')}
          title={`${kpiData.overdueCount} task${kpiData.overdueCount !== 1 ? 's' : ''} past due date`}
        >
          <span className="kpi-value">{kpiData.overdueCount}</span>
          <span className="kpi-label">Overdue</span>
        </div>
        <div
          className="kpi-card"
          onClick={() => navigate('/tasks')}
          title={`${kpiData.activeCount} tasks currently in progress or to-do`}
        >
          <span className="kpi-value">{kpiData.activeCount}</span>
          <span className="kpi-label">Active Tasks</span>
        </div>
        <div
          className="kpi-card"
          onClick={() => navigate('/calendar')}
          title={`${kpiData.postsThisWeek} social posts scheduled this & next week`}
        >
          <span className="kpi-value">{kpiData.postsThisWeek}</span>
          <span className="kpi-label">Posts Scheduled</span>
        </div>
        <div
          className="kpi-card"
          onClick={() => navigate('/inbox')}
          title={`${kpiData.inboxUnread} new submission${kpiData.inboxUnread !== 1 ? 's' : ''} awaiting review`}
        >
          <span className="kpi-value">{kpiData.inboxUnread}</span>
          <span className="kpi-label">Inbox Unread</span>
        </div>
        <div
          className="kpi-card kpi-positive"
          onClick={() => navigate('/tasks')}
          title={`${kpiData.completedThisWeek} tasks completed across all team members this week`}
        >
          <span className="kpi-value">{kpiData.completedThisWeek}</span>
          <span className="kpi-label">Done This Week</span>
        </div>
      </div>

      {/* Today strip */}
      <div className="today-strip">
        <div className="today-header">
          <h3>Today</h3>
          <span className="today-count">{todayStrip.length} item{todayStrip.length !== 1 ? 's' : ''}</span>
        </div>
        {todayStrip.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-text">Nothing due today. You're all caught up!</p>
            <p className="empty-state-hint">Upcoming tasks will appear here when they're due.</p>
          </div>
        ) : (
          <div className="today-items">
            {todayStrip.map((t) => (
              <div
                key={t.id}
                className={`today-item ${overdue.includes(t) ? 'overdue' : ''}`}
                onClick={() => navigate('/tasks')}
                title={`${t.title} — ${overdue.includes(t) ? `Overdue since ${formatDate(t.due)}` : 'Due today'} — Priority: ${t.priority || 'medium'} — Assigned to ${TEAM.find((m) => m.key === t.assignee)?.name || 'Unassigned'}`}
              >
                <span className="today-priority-dot" style={{ background: priorityColor(t.priority) }} title={`Priority: ${t.priority || 'medium'}`} />
                <span className="today-task-name">{t.title}</span>
                <span className="today-assignee" title={TEAM.find((m) => m.key === t.assignee)?.name || 'Unassigned'}>
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
          <div className="bento-card-header">
            <h4 className="bento-label">Needs Attention</h4>
            {needsAttention.length > 0 && (
              <span className="bento-badge">{needsAttention.length}</span>
            )}
          </div>
          {needsAttention.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state-text">Everything is on track.</p>
              <p className="empty-state-hint">Overdue tasks and new submissions will surface here.</p>
            </div>
          ) : (
            <ul className="attention-list">
              {needsAttention.map((item, i) => (
                <li key={i} className="attention-item" title={item.label}>
                  <span className={`attention-type ${item.type}`}>{item.type === 'overdue' ? 'Overdue' : item.type === 'inbox' ? 'New' : 'Alert'}</span>
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
            <div
              key={member.key}
              className="bento-card bento-person"
              onClick={() => navigate('/tasks')}
              title={`${member.name}: ${active.length} open tasks, ${completedWeek.length} completed this week`}
            >
              <div className="bento-person-header">
                <div className="bento-avatar" style={{ background: member.color }}>
                  {member.initial}
                </div>
                <div>
                  <span className="bento-person-name">{member.name.split(' ')[0]}</span>
                  <span className="bento-person-count">{active.length} open</span>
                </div>
              </div>
              <div className="bento-person-stats">
                <span className="bento-person-stat">{completedWeek.length} completed this week</span>
              </div>
              {nextDue ? (
                <span className="bento-person-next" title={`Next due: ${nextDue.title} on ${formatDate(nextDue.due)}`}>
                  Next: {nextDue.title} ({formatDate(nextDue.due)})
                </span>
              ) : (
                <span className="bento-person-next muted">No upcoming deadlines</span>
              )}
            </div>
          );
        })}

        {/* This Week on Social */}
        <div className="bento-card bento-calendar" onClick={() => navigate('/calendar')}>
          <div className="bento-card-header">
            <h4 className="bento-label">This Week on Social</h4>
            {thisWeekPosts.length > 0 && (
              <span className="bento-badge">{thisWeekPosts.length}</span>
            )}
          </div>
          {thisWeekPosts.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state-text">No posts scheduled this week.</p>
              <p className="empty-state-hint">Head to the Calendar to plan your social content.</p>
            </div>
          ) : (
            <ul className="social-week-list">
              {thisWeekPosts.slice(0, 5).map((p) => (
                <li key={p.id} className="social-week-item" title={p.copy || 'No copy yet'}>
                  <span className="social-week-date">{formatDate(p.scheduledDate)}</span>
                  <span className="social-week-platforms">
                    {(p.platforms || []).join(', ')}
                  </span>
                  <span className="social-week-copy">{p.copy ? (p.copy.length > 50 ? p.copy.slice(0, 50) + '...' : p.copy) : 'No copy yet'}</span>
                  <span className={`social-week-status status-${p.status}`}>{p.status?.replace('_', ' ')}</span>
                </li>
              ))}
              {thisWeekPosts.length > 5 && (
                <li className="social-week-more">+{thisWeekPosts.length - 5} more</li>
              )}
            </ul>
          )}
        </div>

        {/* Ensight Countdown */}
        <div className="bento-card bento-ensight" onClick={() => navigate('/ensight')}>
          <h4 className="bento-label">Ensight Countdown</h4>
          {ensightData.monthStories.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state-text">No stories planned for {ensightData.monthLabel}.</p>
              <p className="empty-state-hint">Add stories in Ensight to track newsletter progress.</p>
            </div>
          ) : (
            <div className="ensight-countdown-content">
              <div className="ensight-days-left" title={`${ensightData.daysLeft} days until ${ensightData.monthLabel} newsletter send date`}>
                <span className="ensight-days-number">{ensightData.daysLeft}</span>
                <span className="ensight-days-label">days to send</span>
              </div>
              <div className="ensight-month-label">{ensightData.monthLabel}</div>
              <div className="ensight-story-summary">
                {ensightData.monthStories.length} {ensightData.monthStories.length === 1 ? 'story' : 'stories'} planned
              </div>
              <ul className="ensight-stage-list">
                {['draft', 'review', 'approved', 'published'].map((stage) => {
                  const count = ensightData.monthStories.filter((s) => s.stage === stage).length;
                  if (count === 0) return null;
                  return (
                    <li key={stage} className="ensight-stage-item" title={`${count} ${count === 1 ? 'story' : 'stories'} in ${stage}`}>
                      <span className={`ensight-stage-badge stage-${stage}`}>{stage}</span>
                      <span className="ensight-stage-count">{count}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Analytics Pulse */}
        <div className="bento-card bento-analytics" onClick={() => navigate('/analytics')}>
          <h4 className="bento-label">Analytics Pulse</h4>
          {analyticsPulse.every((p) => !p.lastSynced) ? (
            <div className="empty-state">
              <p className="empty-state-text">No analytics data synced yet.</p>
              <p className="empty-state-hint">Connect your platforms in Analytics to see live metrics.</p>
            </div>
          ) : (
            <ul className="analytics-pulse-list">
              {analyticsPulse.map((platform) => (
                <li key={platform.key} className="analytics-pulse-item" title={platform.followers != null ? `${platform.label}: ${Number(platform.followers).toLocaleString()} followers` : `${platform.label}: ${platform.lastSynced ? 'Connected' : 'Not connected'}`}>
                  <span className="analytics-pulse-name">{platform.label}</span>
                  {platform.followers != null ? (
                    <span className="analytics-pulse-followers">{Number(platform.followers).toLocaleString()} followers</span>
                  ) : platform.lastSynced ? (
                    <span className="analytics-pulse-synced">Synced</span>
                  ) : (
                    <span className="analytics-pulse-none">Not connected</span>
                  )}
                  {platform.lastSynced && (
                    <span className="analytics-pulse-time">{formatTimestamp(platform.lastSynced)}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Inbox Preview */}
        <div className="bento-card bento-inbox" onClick={() => navigate('/inbox')}>
          <div className="bento-card-header">
            <h4 className="bento-label">Inbox Preview</h4>
            {(() => {
              const count = submissions.filter((s) => s.status === 'new').length;
              return count > 0 ? <span className="bento-badge">{count}</span> : null;
            })()}
          </div>
          {(() => {
            const unread = submissions.filter((s) => s.status === 'new').slice(0, 3);
            if (unread.length === 0) return (
              <div className="empty-state">
                <p className="empty-state-text">No unread submissions.</p>
                <p className="empty-state-hint">New story ideas, event requests, and inquiries land here.</p>
              </div>
            );
            return (
              <ul className="inbox-preview-list">
                {unread.map((s) => (
                  <li key={s.id} className="inbox-preview-item" title={`${s.submitterName} — ${({ story_submission: 'Story Submission', social_submission: 'Social Idea', contact: 'Contact Inquiry', event_request: 'Event Request' })[s.type] || s.type}`}>
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
            <div className="sync-detail" title={`${nextSync.title} on ${formatDate(nextSync.date)} with ${(nextSync.attendees || []).join(', ')}`}>
              <span className="sync-title">{nextSync.title}</span>
              <span className="sync-date">{formatDate(nextSync.date)}</span>
              <span className="sync-attendees">
                {(nextSync.attendees || []).map((a) => a.charAt(0).toUpperCase() + a.slice(1)).join(', ')}
              </span>
            </div>
          ) : (
            <div className="empty-state">
              <p className="empty-state-text">No upcoming sync scheduled.</p>
              <p className="empty-state-hint">Schedule a Monday sync in Meetings to keep the team aligned.</p>
            </div>
          )}
        </div>

        {/* Recent Meetings */}
        <div className="bento-card bento-recent-meetings" onClick={() => navigate('/meetings')}>
          <h4 className="bento-label">Recent Meetings</h4>
          {recentMeetings.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state-text">No meetings recorded yet.</p>
              <p className="empty-state-hint">Meeting notes and action items will appear here.</p>
            </div>
          ) : (
            <ul className="recent-meetings-list">
              {recentMeetings.map((m) => (
                <li key={m.id} className="recent-meeting-item" title={`${m.title} — ${formatDate(m.date)}`}>
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

function formatTimestamp(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
