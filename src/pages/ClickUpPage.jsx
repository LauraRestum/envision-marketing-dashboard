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
  const [projects, setProjects] = useState([]);
  const [expandedProject, setExpandedProject] = useState(null);
  const [projectTasks, setProjectTasks] = useState({});
  const [loadingTasks, setLoadingTasks] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cached, setCached] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [search, setSearch] = useState('');

  const fetchProjects = useCallback(async () => {
    setDebugInfo(null);
    setLoading(true);

    try {
      // First get teams to find the Envision team
      const teamsController = new AbortController();
      const teamsTimeout = setTimeout(() => teamsController.abort(), 20000);
      let teamsRes;
      try {
        teamsRes = await fetch('/api/clickup?action=teams', { signal: teamsController.signal });
        clearTimeout(teamsTimeout);
      } catch (fetchErr) {
        clearTimeout(teamsTimeout);
        setError(fetchErr.name === 'AbortError'
          ? 'ClickUp request timed out. The API may be slow or unreachable from Vercel.'
          : `Network error reaching ClickUp: ${fetchErr.message}`);
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
        setLoading(false);
        return;
      }

      const teams = teamsData.teams || [];
      if (teams.length === 0) {
        setError('No ClickUp teams found. Check your API token in Vercel settings.');
        setLoading(false);
        return;
      }

      const envisionTeam = teams.find((t) => t.name.toLowerCase().includes('envision'));
      const teamId = envisionTeam ? envisionTeam.id : teams[0].id;

      // Fetch project hierarchy (spaces > folders > lists)
      const projController = new AbortController();
      const projTimeout = setTimeout(() => projController.abort(), 30000);
      let projData;
      try {
        const projRes = await fetch(`/api/clickup?action=projects&team_id=${teamId}`, { signal: projController.signal });
        projData = await projRes.json();
        clearTimeout(projTimeout);
      } catch (fetchErr) {
        clearTimeout(projTimeout);
        setError(fetchErr.name === 'AbortError'
          ? 'ClickUp projects request timed out.'
          : `Failed to fetch projects: ${fetchErr.message}`);
        setLoading(false);
        return;
      }

      if (projData.error && !projData._cached) {
        setError(projData.error);
        setLoading(false);
        return;
      }

      if (projData._error) {
        setError(projData._error);
        setCached(true);
      } else {
        setError('');
        setCached(!!projData._cached);
      }

      setProjects(projData.projects || []);
      setLastSynced(projData._lastSynced || null);
    } catch (err) {
      setError(`Unexpected error: ${err.message}`);
      setDebugInfo(err.stack?.slice(0, 400) || err.message);
    }

    setLoading(false);
  }, []);

  const fetchTasksForList = useCallback(async (listId) => {
    if (projectTasks[listId]) return; // already loaded
    setLoadingTasks((prev) => ({ ...prev, [listId]: true }));

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);
      const res = await fetch(`/api/clickup?action=list_tasks&list_id=${listId}`, { signal: controller.signal });
      const data = await res.json();
      clearTimeout(timeout);
      setProjectTasks((prev) => ({ ...prev, [listId]: data.tasks || [] }));
    } catch (err) {
      setProjectTasks((prev) => ({ ...prev, [listId]: [] }));
    }

    setLoadingTasks((prev) => ({ ...prev, [listId]: false }));
  }, [projectTasks]);

  useEffect(() => {
    fetchProjects();
    const interval = setInterval(fetchProjects, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchProjects]);

  const handleExpandProject = useCallback((projectId) => {
    if (expandedProject === projectId) {
      setExpandedProject(null);
      setSelectedTask(null);
    } else {
      setExpandedProject(projectId);
      setSelectedTask(null);
      fetchTasksForList(projectId);
    }
  }, [expandedProject, fetchTasksForList]);

  // Group projects by space
  const groupedProjects = useMemo(() => {
    const groups = new Map();
    let filtered = projects;
    if (search) {
      const q = search.toLowerCase();
      filtered = projects.filter((p) => p.name.toLowerCase().includes(q) || (p.folder && p.folder.toLowerCase().includes(q)));
    }
    filtered.forEach((p) => {
      const key = p.space || 'Other';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    });
    return Array.from(groups.entries());
  }, [projects, search]);

  if (loading) {
    return (
      <div className="clickup-loading">
        <div className="clickup-loading-spinner" />
        <span>Loading ClickUp projects...</span>
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
        <button className="clickup-refresh-btn" onClick={fetchProjects} disabled={loading} title="Refresh projects from ClickUp API">
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
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          title="Search ClickUp projects by name"
        />
      </div>

      {projects.length === 0 && !error ? (
        <div className="clickup-empty">
          <p className="clickup-empty-text">No projects found.</p>
          <p className="clickup-empty-hint">Make sure your ClickUp API token is configured in Settings and your workspace has lists.</p>
        </div>
      ) : (
        <div className="clickup-projects-layout">
          <div className="clickup-project-list">
            {groupedProjects.map(([spaceName, spaceProjects]) => (
              <div key={spaceName} className="clickup-space-group">
                <div className="clickup-space-header">{spaceName}</div>
                {spaceProjects.map((project) => (
                  <div key={project.id} className="clickup-project-block">
                    <button
                      className={`clickup-project-row ${expandedProject === project.id ? 'expanded' : ''}`}
                      onClick={() => handleExpandProject(project.id)}
                      title={`${project.name}${project.folder ? ` (${project.folder})` : ''}`}
                    >
                      <div className="clickup-project-info">
                        <span className="clickup-expand-icon">{expandedProject === project.id ? '\u25BE' : '\u25B8'}</span>
                        <div>
                          <span className="clickup-project-name">{project.name}</span>
                          {project.folder && <span className="clickup-project-folder">{project.folder}</span>}
                        </div>
                      </div>
                      {project.taskCount != null && (
                        <span className="clickup-project-count">{project.taskCount} task{project.taskCount !== 1 ? 's' : ''}</span>
                      )}
                    </button>

                    {expandedProject === project.id && (
                      <div className="clickup-project-tasks">
                        {loadingTasks[project.id] ? (
                          <div className="clickup-tasks-loading">
                            <div className="clickup-loading-spinner small" />
                            <span>Loading tasks...</span>
                          </div>
                        ) : (projectTasks[project.id] || []).length === 0 ? (
                          <div className="clickup-tasks-empty">No active tasks in this project.</div>
                        ) : (
                          (projectTasks[project.id] || []).map((task) => (
                            <button
                              key={task.id}
                              className={`clickup-task-row ${selectedTask?.id === task.id ? 'active' : ''} ${isOverdue(task) ? 'overdue' : ''}`}
                              onClick={() => setSelectedTask(task)}
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
                    )}
                  </div>
                ))}
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
            <span className="drawer-field-label">Project</span>
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
