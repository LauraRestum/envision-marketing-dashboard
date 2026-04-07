import { useState, useEffect, useCallback, useMemo } from 'react';
import './ClickUpPage.css';

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

  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [search, setSearch] = useState('');

  const fetchTasks = useCallback(async () => {
    setDebugInfo(null);
    setLoading(true);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);
      let res;
      try {
        // Fetch directly from the marketing list — single fast API call
        res = await fetch('/api/clickup?action=list_tasks', { signal: controller.signal });
        clearTimeout(timeout);
      } catch (fetchErr) {
        clearTimeout(timeout);
        setError(fetchErr.name === 'AbortError'
          ? 'ClickUp request timed out. The API may be slow or unreachable from Vercel.'
          : `Network error reaching ClickUp: ${fetchErr.message}`);
        setLoading(false);
        return;
      }

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        setError(`ClickUp API returned invalid response (HTTP ${res.status}).`);
        setDebugInfo(`HTTP ${res.status}: ${text.slice(0, 300)}`);
        setLoading(false);
        return;
      }

      if (data.error && !data._cached) {
        setError(data.error);
        setDebugInfo(`API error: ${data.error}`);
        setLoading(false);
        return;
      }

      if (data._error) {
        setError(data._error);
        setCached(true);
      } else {
        setError('');
        setCached(!!data._cached);
      }

      setTasks(data.tasks || []);
      setLastSynced(data._lastSynced || null);
    } catch (err) {
      setError(`Unexpected error: ${err.message}`);
      setDebugInfo(err.stack?.slice(0, 400) || err.message);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  // Derive unique assignees from actual task data
  const allAssignees = useMemo(() => {
    const map = new Map();
    tasks.forEach((t) => {
      (t.assignees || []).forEach((a) => {
        const name = a.username || a.email || '';
        if (name && !map.has(name)) map.set(name, name);
      });
    });
    return Array.from(map.values()).sort();
  }, [tasks]);

  const allStatuses = useMemo(() => {
    const set = new Set();
    tasks.forEach((t) => {
      if (t.status?.status) set.add(t.status.status);
    });
    return Array.from(set).sort();
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (search) {
        const q = search.toLowerCase();
        if (!t.name?.toLowerCase().includes(q)) return false;
      }
      if (filterAssignee) {
        const assignees = (t.assignees || []).map((a) => (a.username || a.email || '').toLowerCase());
        if (!assignees.some((a) => a === filterAssignee.toLowerCase())) return false;
      }
      if (filterStatus) {
        if ((t.status?.status || '').toLowerCase() !== filterStatus.toLowerCase()) return false;
      }
      if (filterPriority) {
        if (String(t.priority?.id) !== filterPriority) return false;
      }
      return true;
    });
  }, [tasks, search, filterAssignee, filterStatus, filterPriority]);

  // Group filtered tasks by status for a board-like view
  const groupedByStatus = useMemo(() => {
    const groups = new Map();
    filtered.forEach((t) => {
      const status = t.status?.status || 'No Status';
      if (!groups.has(status)) groups.set(status, []);
      groups.get(status).push(t);
    });
    // Sort: active statuses first, done/closed last
    const order = ['to do', 'open', 'in progress', 'in review', 'blocked', 'done', 'complete', 'closed'];
    return Array.from(groups.entries()).sort((a, b) => {
      const ai = order.indexOf(a[0].toLowerCase());
      const bi = order.indexOf(b[0].toLowerCase());
      return (ai === -1 ? 50 : ai) - (bi === -1 ? 50 : bi);
    });
  }, [filtered]);

  if (loading) {
    return (
      <div className="clickup-loading">
        <div className="clickup-loading-spinner" />
        <span>Loading marketing projects...</span>
      </div>
    );
  }

  return (
    <div className="clickup-page">
      <div className="clickup-header">
        <div>
          <h2>Marketing Projects</h2>
          {lastSynced && (
            <span className="clickup-sync-time">
              {cached && 'Cached data. '}Last synced: {new Date(lastSynced).toLocaleString()}
            </span>
          )}
        </div>
        <button className="clickup-refresh-btn" onClick={fetchTasks} disabled={loading} title="Refresh from ClickUp">
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
        />
        <select className="clickup-filter" value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
          <option value="">All assignees</option>
          {allAssignees.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="clickup-filter" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          {allStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="clickup-filter" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="">All priorities</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {tasks.length === 0 && !error ? (
        <div className="clickup-empty">
          <p className="clickup-empty-text">No marketing tasks found.</p>
          <p className="clickup-empty-hint">Make sure your ClickUp API token is configured in Settings.</p>
        </div>
      ) : (
        <div className="clickup-board-layout">
          <div className="clickup-board">
            {groupedByStatus.map(([status, statusTasks]) => (
              <div key={status} className="clickup-status-column">
                <div className="clickup-column-header">
                  <StatusPill status={status} />
                  <span className="clickup-column-count">{statusTasks.length}</span>
                </div>
                <div className="clickup-column-tasks">
                  {statusTasks.map((task) => (
                    <button
                      key={task.id}
                      className={`clickup-task-card ${selectedTask?.id === task.id ? 'active' : ''} ${isOverdue(task) ? 'overdue' : ''}`}
                      onClick={() => setSelectedTask(task)}
                    >
                      <span className="clickup-task-name">{task.name}</span>
                      <div className="clickup-task-meta">
                        {task.priority && (
                          <span className="clickup-priority-flag" style={{ color: PRIORITY_COLORS[task.priority.id] || 'var(--text-muted)' }}>
                            {PRIORITY_LABELS[task.priority.id] || task.priority.priority}
                          </span>
                        )}
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
                  ))}
                </div>
              </div>
            ))}
          </div>

          {selectedTask && (
            <TaskDrawer task={selectedTask} onClose={() => setSelectedTask(null)} />
          )}
        </div>
      )}
    </div>
  );
}

function isOverdue(task) {
  if (!task.due_date) return false;
  const status = task.status?.status?.toLowerCase() || '';
  if (status === 'done' || status === 'complete' || status === 'closed') return false;
  return new Date(parseInt(task.due_date)) < new Date();
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
        {t.list && (
          <div className="drawer-field">
            <span className="drawer-field-label">List</span>
            <span>{t.list.name}</span>
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
