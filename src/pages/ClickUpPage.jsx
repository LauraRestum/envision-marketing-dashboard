import { useState, useEffect, useCallback, useMemo } from 'react';
import './ClickUpPage.css';

const ASSIGNEE_MAP = {
  laura: 'Laura',
  arlo: 'Arlo',
  madison: 'Madison',
};

const STATUS_COLORS = {
  'in progress': 'blue',
  'blocked': 'red',
  'in review': 'green',
  'done': 'gray',
  'complete': 'gray',
  'closed': 'gray',
  'open': 'blue',
  'to do': 'default',
};

const PRIORITY_LABELS = { 1: 'Urgent', 2: 'High', 3: 'Normal', 4: 'Low' };
const PRIORITY_COLORS = { 1: '#e55', 2: '#f0a030', 3: 'var(--blue-mid)', 4: 'var(--text-muted)' };

export default function ClickUpPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cached, setCached] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  const [filterList, setFilterList] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [search, setSearch] = useState('');

  const fetchTasks = useCallback(async () => {
    setDebugInfo(null);
    setLoading(true);

    try {
      // Fetch teams with its own timeout
      let teamsRes;
      try {
        const teamsController = new AbortController();
        const teamsTimeout = setTimeout(() => teamsController.abort(), 20000);
        teamsRes = await fetch('/api/clickup?action=teams', { signal: teamsController.signal });
        clearTimeout(teamsTimeout);
      } catch (fetchErr) {
        if (fetchErr.name === 'AbortError') {
          setError('ClickUp request timed out. The API may be slow or unreachable from Vercel.');
        } else {
          setError(`Network error reaching ClickUp: ${fetchErr.message}`);
        }
        setLoading(false);
        return;
      }

      const teamsText = await teamsRes.text();
      let teamsData;
      try {
        teamsData = JSON.parse(teamsText);
      } catch {
        setError(`ClickUp API returned invalid response (HTTP ${teamsRes.status}).`);
        setDebugInfo(`HTTP ${teamsRes.status}: ${teamsText.slice(0, 300)}`);
        setLoading(false);
        return;
      }

      if (teamsData.error && !teamsData._cached) {
        setError(teamsData.error);
        setDebugInfo(`Teams endpoint error: ${teamsData.error}`);
        setLoading(false);
        return;
      }

      const teams = teamsData.teams || [];
      if (teams.length === 0) {
        setError('No ClickUp teams found. Check your API token in Vercel settings.');
        setDebugInfo('Teams response was OK but returned 0 teams. Your API token may not have workspace access.');
        setLoading(false);
        return;
      }

      // Prefer "Envision" team, fall back to first team
      const envisionTeam = teams.find((t) => t.name.toLowerCase().includes('envision'));
      const teamId = envisionTeam ? envisionTeam.id : teams[0].id;

      // Fetch tasks with its own timeout
      let tasksData;
      try {
        const tasksController = new AbortController();
        const tasksTimeout = setTimeout(() => tasksController.abort(), 25000);
        const tasksRes = await fetch(`/api/clickup?action=tasks&team_id=${teamId}`, { signal: tasksController.signal });
        tasksData = await tasksRes.json();
        clearTimeout(tasksTimeout);
      } catch (fetchErr) {
        if (fetchErr.name === 'AbortError') {
          setError('ClickUp tasks request timed out.');
        } else {
          setError(`Failed to fetch tasks: ${fetchErr.message}`);
        }
        setLoading(false);
        return;
      }

      if (tasksData._error) {
        setError(tasksData._error);
        setCached(true);
      } else {
        setError('');
        setCached(!!tasksData._cached);
      }

      setTasks(tasksData.tasks || []);
      setLastSynced(tasksData._lastSynced || null);
    } catch (err) {
      setError(`Unexpected error: ${err.message}`);
      setDebugInfo(err.stack?.slice(0, 400) || err.message);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5 * 60 * 1000); // 5 min auto-refresh
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const allLists = useMemo(() => {
    const map = new Map();
    tasks.forEach((t) => {
      if (t.list?.id && t.list?.name) map.set(t.list.id, t.list.name);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (search) {
        const q = search.toLowerCase();
        if (!t.name?.toLowerCase().includes(q)) return false;
      }
      if (filterList) {
        if (t.list?.id !== filterList) return false;
      }
      if (filterAssignee) {
        const assignees = (t.assignees || []).map((a) => a.username?.toLowerCase() || a.email?.toLowerCase() || '');
        const name = filterAssignee.toLowerCase();
        if (!assignees.some((a) => a.includes(name))) return false;
      }
      if (filterStatus) {
        const status = t.status?.status?.toLowerCase() || '';
        if (status !== filterStatus.toLowerCase()) return false;
      }
      if (filterPriority) {
        const p = t.priority?.id;
        if (String(p) !== filterPriority) return false;
      }
      return true;
    });
  }, [tasks, search, filterList, filterAssignee, filterStatus, filterPriority]);

  const allStatuses = useMemo(() => {
    const set = new Set();
    tasks.forEach((t) => {
      if (t.status?.status) set.add(t.status.status);
    });
    return Array.from(set).sort();
  }, [tasks]);

  function isOverdue(task) {
    if (!task.due_date) return false;
    const status = task.status?.status?.toLowerCase() || '';
    if (status === 'done' || status === 'complete' || status === 'closed') return false;
    return new Date(parseInt(task.due_date)) < new Date();
  }

  if (loading) {
    return (
      <div className="clickup-loading">
        <div className="clickup-loading-spinner" />
        <span>Loading ClickUp tasks...</span>
      </div>
    );
  }

  return (
    <div className="clickup-page">
      <div className="clickup-header">
        <div>
          <h2>ClickUp Projects</h2>
          {lastSynced && (
            <span className="clickup-sync-time">
              {cached && 'Cached data. '}Last synced: {new Date(lastSynced).toLocaleString()}
            </span>
          )}
        </div>
        <button className="clickup-refresh-btn" onClick={fetchTasks} disabled={loading} title="Refresh tasks from ClickUp API">
          Refresh
        </button>
      </div>

      {error && (
        <div className="clickup-error-banner">
          <strong>{error}</strong>
          {debugInfo && <pre className="clickup-debug">{debugInfo}</pre>}
        </div>
      )}

      <div className="clickup-toolbar">
        <input
          className="clickup-search"
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          title="Search ClickUp tasks by name"
        />
        <select className="clickup-filter" value={filterList} onChange={(e) => setFilterList(e.target.value)} title="Filter by list">
          <option value="">All lists</option>
          {allLists.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select className="clickup-filter" value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} title="Filter by assignee">
          <option value="">All assignees</option>
          {Object.entries(ASSIGNEE_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="clickup-filter" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} title="Filter by status">
          <option value="">All statuses</option>
          {allStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="clickup-filter" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} title="Filter by priority">
          <option value="">All priorities</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {tasks.length === 0 && !error ? (
        <div className="clickup-empty">
          <p className="clickup-empty-text">No tasks found.</p>
          <p className="clickup-empty-hint">Make sure your ClickUp API token and team ID are configured in Settings.</p>
        </div>
      ) : (
        <div className="clickup-layout">
          <div className="clickup-task-list">
            {filtered.length === 0 ? (
              <div className="clickup-empty-filter">
                <p className="clickup-empty-filter-text">No tasks match your filters.</p>
                <p className="clickup-empty-filter-hint">Try adjusting the assignee, status, or priority filters.</p>
              </div>
            ) : (
              filtered.map((task) => (
                <button
                  key={task.id}
                  className={`clickup-task-row ${selectedTask?.id === task.id ? 'active' : ''} ${isOverdue(task) ? 'overdue' : ''}`}
                  onClick={() => setSelectedTask(task)}
                  title={`${task.name}${task.due_date ? ` — Due: ${formatClickUpDate(task.due_date)}` : ''}${isOverdue(task) ? ' (Overdue)' : ''}`}
                >
                  <div className="clickup-task-top">
                    <span className="clickup-task-name">{task.name}</span>
                    {task.priority && (
                      <span className="clickup-priority-flag" style={{ color: PRIORITY_COLORS[task.priority.id] || 'var(--text-muted)' }}>
                        {PRIORITY_LABELS[task.priority.id] || task.priority.priority}
                      </span>
                    )}
                  </div>
                  <div className="clickup-task-meta">
                    <StatusPill status={task.status?.status} />
                    {(task.assignees || []).length > 0 && (
                      <span className="clickup-assignees">
                        {task.assignees.map((a) => a.username || a.email || '').join(', ')}
                      </span>
                    )}
                    {task.due_date && (
                      <span className={`clickup-due ${isOverdue(task) ? 'overdue-text' : ''}`}>
                        {formatClickUpDate(task.due_date)}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {selectedTask && (
            <TaskDrawer task={selectedTask} onClose={() => setSelectedTask(null)} />
          )}
        </div>
      )}
    </div>
  );
}

function TaskDrawer({ task, onClose }) {
  const t = task;
  return (
    <div className="clickup-drawer">
      <div className="drawer-header">
        <h3>{t.name}</h3>
        <button className="drawer-close" onClick={onClose}>x</button>
      </div>

      <div className="drawer-meta">
        <div className="drawer-field">
          <span className="drawer-field-label">Status</span>
          <StatusPill status={t.status?.status} />
        </div>
        {t.priority && (
          <div className="drawer-field">
            <span className="drawer-field-label">Priority</span>
            <span style={{ color: PRIORITY_COLORS[t.priority.id] }}>
              {PRIORITY_LABELS[t.priority.id] || t.priority.priority}
            </span>
          </div>
        )}
        {t.due_date && (
          <div className="drawer-field">
            <span className="drawer-field-label">Due date</span>
            <span>{formatClickUpDate(t.due_date)}</span>
          </div>
        )}
        {(t.assignees || []).length > 0 && (
          <div className="drawer-field">
            <span className="drawer-field-label">Assignees</span>
            <div className="drawer-assignee-list">
              {t.assignees.map((a) => (
                <span key={a.id} className="drawer-assignee-chip">
                  {a.username || a.email}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {t.description && (
        <div className="drawer-section">
          <span className="drawer-field-label">Description</span>
          <div className="drawer-description">{t.description}</div>
        </div>
      )}

      {t.tags && t.tags.length > 0 && (
        <div className="drawer-section">
          <span className="drawer-field-label">Tags</span>
          <div className="drawer-tags">
            {t.tags.map((tag) => (
              <span key={tag.name} className="drawer-tag">{tag.name}</span>
            ))}
          </div>
        </div>
      )}

      {t.url && (
        <div className="drawer-section">
          <a href={t.url} target="_blank" rel="noopener noreferrer" className="drawer-open-link">
            Open in ClickUp
          </a>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  if (!status) return null;
  const key = status.toLowerCase();
  const colorClass = STATUS_COLORS[key] || 'default';
  return <span className={`clickup-status-pill ${colorClass}`}>{status}</span>;
}

function formatClickUpDate(timestamp) {
  if (!timestamp) return '';
  const d = new Date(parseInt(timestamp));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
