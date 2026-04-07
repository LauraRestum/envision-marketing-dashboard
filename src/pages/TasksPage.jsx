import { useState, useRef } from 'react';
import useTasks from '../hooks/useTasks';
import './TasksPage.css';

const TEAM = [
  { key: 'laura', name: 'Laura Restum', initial: 'L', color: '#003087' },
  { key: 'arlo', name: 'Arlo Hoover', initial: 'A', color: '#004bb5' },
  { key: 'madison', name: 'Madison Neuhaus', initial: 'M', color: '#78BE21' },
];

const PRIORITY_LABELS = { high: 'High', medium: 'Medium', low: 'Low' };
const PRIORITY_COLORS = { high: '#e55', medium: '#f0a030', low: 'var(--text-muted)' };
const FILTERS = ['all', 'high', 'due_this_week'];

export default function TasksPage() {
  const {
    tasks, loading, addTask, updateTask, completeTask, reopenTask, removeTask,
    getActiveTasks, getUpcomingTasks, getCompletedTasks, getThisWeekCompleted,
  } = useTasks();

  const [filter, setFilter] = useState('all');
  const [editingTask, setEditingTask] = useState(null);
  const [addingFor, setAddingFor] = useState(null);
  const dragItem = useRef(null);

  function filterTasks(taskList) {
    if (filter === 'all') return taskList;
    if (filter === 'high') return taskList.filter((t) => t.priority === 'high');
    if (filter === 'due_this_week') {
      const now = new Date();
      const endOfWeek = new Date(now);
      endOfWeek.setDate(now.getDate() + (6 - now.getDay()));
      endOfWeek.setHours(23, 59, 59, 999);
      const startStr = now.toISOString().split('T')[0];
      const endStr = endOfWeek.toISOString().split('T')[0];
      return taskList.filter((t) => t.due && t.due >= startStr && t.due <= endStr);
    }
    return taskList;
  }

  function isOverdue(task) {
    if (!task.due || task.status === 'completed') return false;
    return task.due < new Date().toISOString().split('T')[0];
  }

  function handleDragStart(task) {
    dragItem.current = task;
  }

  function handleDrop(assignee) {
    if (dragItem.current && dragItem.current.assignee !== assignee) {
      updateTask(dragItem.current.id, { assignee });
    }
    dragItem.current = null;
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  // KPI summary
  const allActive = tasks.filter((t) => t.status !== 'done' && t.status !== 'completed');
  const allOverdue = tasks.filter((t) => isOverdue(t));
  const totalCompletedWeek = TEAM.reduce((sum, m) => sum + getThisWeekCompleted(m.key).length, 0);
  const highPriorityCount = allActive.filter((t) => t.priority === 'high').length;

  if (loading) {
    return (
      <div className="tasks-loading">
        <div className="tasks-loading-spinner" />
        <span>Loading tasks...</span>
      </div>
    );
  }

  return (
    <div className="tasks-page">
      <div className="tasks-header">
        <h2>Team & Tasks</h2>
        <div className="tasks-filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
              title={f === 'all' ? 'Show all tasks' : f === 'high' ? 'Show high priority only' : 'Tasks due this week'}
            >
              {f === 'all' ? 'All' : f === 'high' ? 'High Priority' : 'Due This Week'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="tasks-kpi-strip">
        <div className={`tasks-kpi ${allOverdue.length > 0 ? 'kpi-alert' : ''}`} title={`${allOverdue.length} task${allOverdue.length !== 1 ? 's' : ''} past their due date`}>
          <span className="tasks-kpi-value">{allOverdue.length}</span>
          <span className="tasks-kpi-label">Overdue</span>
        </div>
        <div className="tasks-kpi" title={`${allActive.length} tasks in active or upcoming status`}>
          <span className="tasks-kpi-value">{allActive.length}</span>
          <span className="tasks-kpi-label">Open Tasks</span>
        </div>
        <div className="tasks-kpi" title={`${highPriorityCount} active tasks marked as high priority`}>
          <span className="tasks-kpi-value">{highPriorityCount}</span>
          <span className="tasks-kpi-label">High Priority</span>
        </div>
        <div className="tasks-kpi kpi-positive" title={`${totalCompletedWeek} tasks completed across all team members this week`}>
          <span className="tasks-kpi-value">{totalCompletedWeek}</span>
          <span className="tasks-kpi-label">Done This Week</span>
        </div>
      </div>

      <div className="workload-strip">
        {TEAM.map((member) => {
          const active = getActiveTasks(member.key);
          const upcoming = getUpcomingTasks(member.key);
          const completedThisWeek = getThisWeekCompleted(member.key);
          const total = active.length + upcoming.length + completedThisWeek.length;
          const progress = total > 0 ? completedThisWeek.length / total : 0;
          const nextDue = [...active, ...upcoming]
            .filter((t) => t.due)
            .sort((a, b) => a.due.localeCompare(b.due))[0];

          return (
            <div key={member.key} className="workload-card" title={`${member.name}: ${active.length} active, ${upcoming.length} upcoming, ${completedThisWeek.length} completed this week`}>
              <div className="workload-top">
                <div className="workload-avatar" style={{ background: member.color }}>
                  {member.initial}
                </div>
                <div className="workload-info">
                  <span className="workload-name">{member.name.split(' ')[0]}</span>
                  <span className="workload-count">{active.length} active tasks</span>
                </div>
              </div>
              <div className="workload-progress-bar" title={`${Math.round(progress * 100)}% of weekly tasks completed`}>
                <div className="workload-progress-fill" style={{ width: `${progress * 100}%` }} />
              </div>
              <span className="workload-meta">
                {completedThisWeek.length} / {total} this week
              </span>
              {nextDue ? (
                <span className="workload-next-due" title={`Next due: ${nextDue.title}`}>
                  Next due: {formatDate(nextDue.due)}
                </span>
              ) : (
                <span className="workload-next-due muted">No upcoming deadlines</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="tasks-columns">
        {TEAM.map((member) => (
          <TaskColumn
            key={member.key}
            member={member}
            active={filterTasks(getActiveTasks(member.key))}
            upcoming={filterTasks(getUpcomingTasks(member.key))}
            completed={getCompletedTasks(member.key)}
            isOverdue={isOverdue}
            onDragStart={handleDragStart}
            onDrop={() => handleDrop(member.key)}
            onDragOver={handleDragOver}
            onComplete={completeTask}
            onReopen={reopenTask}
            onRemove={removeTask}
            onUpdate={updateTask}
            onAdd={() => setAddingFor(member.key)}
            editingTask={editingTask}
            setEditingTask={setEditingTask}
          />
        ))}
      </div>

      {addingFor && (
        <TaskAddModal
          assignee={addingFor}
          onSave={(task) => { addTask(task); setAddingFor(null); }}
          onCancel={() => setAddingFor(null)}
        />
      )}
    </div>
  );
}

function TaskColumn({
  member, active, upcoming, completed,
  isOverdue, onDragStart, onDrop, onDragOver,
  onComplete, onReopen, onRemove, onUpdate, onAdd,
  editingTask, setEditingTask,
}) {
  const [showCompleted, setShowCompleted] = useState(false);

  return (
    <div
      className="task-column"
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <div className="column-header">
        <div className="column-avatar" style={{ background: member.color }}>
          {member.initial}
        </div>
        <span className="column-name">{member.name.split(' ')[0]}</span>
        <span className="column-count">{active.length + upcoming.length}</span>
        <button className="add-task-btn" onClick={onAdd} title={`Add task for ${member.name.split(' ')[0]}`}>+ Add</button>
      </div>

      {active.length === 0 && upcoming.length === 0 && (
        <div className="column-empty">
          <p className="column-empty-text">No active tasks right now.</p>
          <p className="column-empty-hint">Click "+ Add" to assign a new task.</p>
        </div>
      )}

      {active.length > 0 && (
        <div className="task-section">
          <span className="section-label">Active ({active.length})</span>
          {active.sort(prioritySort).map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isOverdue={isOverdue(task)}
              onDragStart={() => onDragStart(task)}
              onComplete={() => onComplete(task.id)}
              onRemove={() => onRemove(task.id)}
              onUpdate={onUpdate}
              isEditing={editingTask === task.id}
              setEditing={setEditingTask}
            />
          ))}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="task-section">
          <span className="section-label">Upcoming ({upcoming.length})</span>
          {upcoming.sort(prioritySort).map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isOverdue={false}
              onDragStart={() => onDragStart(task)}
              onComplete={() => onComplete(task.id)}
              onRemove={() => onRemove(task.id)}
              onUpdate={onUpdate}
              isEditing={editingTask === task.id}
              setEditing={setEditingTask}
            />
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <div className="task-section">
          <button
            className="section-toggle"
            onClick={() => setShowCompleted(!showCompleted)}
            title={showCompleted ? 'Hide completed tasks' : 'Show completed tasks'}
          >
            Completed ({completed.length}) {showCompleted ? '\u25B2' : '\u25BC'}
          </button>
          {showCompleted && completed.slice(0, 20).map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isOverdue={false}
              onDragStart={() => onDragStart(task)}
              onComplete={() => {}}
              onReopen={() => onReopen(task.id)}
              onRemove={() => onRemove(task.id)}
              onUpdate={onUpdate}
              isEditing={editingTask === task.id}
              setEditing={setEditingTask}
              isCompleted
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task, isOverdue, onDragStart, onComplete, onReopen, onRemove, onUpdate,
  isEditing, setEditing, isCompleted,
}) {
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDue, setEditDue] = useState(task.due || '');
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editNotes, setEditNotes] = useState(task.notes || '');

  function saveEdit() {
    onUpdate(task.id, {
      title: editTitle,
      due: editDue || null,
      priority: editPriority,
      notes: editNotes,
    });
    setEditing(null);
  }

  function cancelEdit() {
    setEditTitle(task.title);
    setEditDue(task.due || '');
    setEditPriority(task.priority);
    setEditNotes(task.notes || '');
    setEditing(null);
  }

  if (isEditing) {
    return (
      <div className="task-card editing">
        <input
          className="task-edit-input"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Task title"
          autoFocus
        />
        <div className="task-edit-row">
          <input
            type="date"
            className="task-edit-date"
            value={editDue}
            onChange={(e) => setEditDue(e.target.value)}
          />
          <select
            className="task-edit-select"
            value={editPriority}
            onChange={(e) => setEditPriority(e.target.value)}
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <textarea
          className="task-edit-notes"
          value={editNotes}
          onChange={(e) => setEditNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
        />
        <div className="task-edit-actions">
          <button className="task-save-btn" onClick={saveEdit}>Save</button>
          <button className="task-cancel-btn" onClick={cancelEdit}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`task-card ${isOverdue ? 'overdue' : ''} ${isCompleted ? 'completed' : ''}`}
      draggable={!isCompleted}
      onDragStart={onDragStart}
      title={`${task.title}${task.due ? ` — Due: ${formatDate(task.due)}` : ''}${task.notes ? ` — ${task.notes}` : ''} — Priority: ${PRIORITY_LABELS[task.priority] || 'Medium'}`}
    >
      <div className="task-card-top">
        {!isCompleted ? (
          <button className="task-check" onClick={onComplete} title="Mark complete">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="6" />
            </svg>
          </button>
        ) : (
          <button className="task-check done" onClick={onReopen} title="Reopen task">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" fill="var(--green)" />
              <path d="M5.5 8l1.7 1.7L10.5 6.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <span className="task-title" onClick={() => setEditing(task.id)}>
          {task.title}
        </span>
        <span className="task-priority-dot" style={{ background: PRIORITY_COLORS[task.priority] }} title={PRIORITY_LABELS[task.priority]} />
      </div>
      {(task.due || task.notes) && (
        <div className="task-card-meta">
          {task.due && (
            <span className={`task-due ${isOverdue ? 'overdue-text' : ''}`} title={isOverdue ? `Overdue since ${formatDate(task.due)}` : `Due ${formatDate(task.due)}`}>
              {formatDate(task.due)}
            </span>
          )}
          {task.notes && <span className="task-notes-preview" title={task.notes}>{task.notes}</span>}
        </div>
      )}
    </div>
  );
}

function TaskAddModal({ assignee, onSave, onCancel }) {
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('active');
  const [notes, setNotes] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ title: title.trim(), assignee, due: due || null, priority, status, notes });
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>Add Task</h3>
        <p className="modal-subtitle">
          Assigned to {assignee.charAt(0).toUpperCase() + assignee.slice(1)}
        </p>
        <form onSubmit={handleSubmit} className="modal-form">
          <label className="modal-label">
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" autoFocus required />
          </label>
          <div className="modal-row">
            <label className="modal-label">
              Due date
              <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </label>
            <label className="modal-label">
              Priority
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
          </div>
          <label className="modal-label">
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">Active</option>
              <option value="upcoming">Upcoming</option>
            </select>
          </label>
          <label className="modal-label">
            Notes
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" rows={3} />
          </label>
          <div className="modal-actions">
            <button type="submit" className="modal-save">Add Task</button>
            <button type="button" className="modal-cancel" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function prioritySort(a, b) {
  const order = { high: 0, medium: 1, low: 2 };
  return (order[a.priority] || 1) - (order[b.priority] || 1);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
