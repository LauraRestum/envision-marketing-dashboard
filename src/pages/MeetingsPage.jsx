import { useState, useEffect, useMemo } from 'react';
import useMeetings from '../hooks/useMeetings';
import useTasks from '../hooks/useTasks';
import './MeetingsPage.css';

const TEAM = [
  { key: 'laura', label: 'Laura' },
  { key: 'arlo', label: 'Arlo' },
  { key: 'madison', label: 'Madison' },
];

export default function MeetingsPage() {
  const { meetings, loading, addMeeting, updateMeeting, removeMeeting } = useMeetings();
  const { addTask } = useTasks();
  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterAttendee, setFilterAttendee] = useState('');
  const [filterTag, setFilterTag] = useState('');

  const allTags = useMemo(() => {
    const tagSet = new Set();
    meetings.forEach((m) => (m.tags || []).forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [meetings]);

  const filtered = useMemo(() => {
    return meetings.filter((m) => {
      if (search) {
        const q = search.toLowerCase();
        const searchable = [m.title, m.notes, ...(m.agenda || []), ...(m.tags || [])].join(' ').toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      if (filterAttendee && !(m.attendees || []).includes(filterAttendee)) return false;
      if (filterTag && !(m.tags || []).includes(filterTag)) return false;
      return true;
    });
  }, [meetings, search, filterAttendee, filterTag]);

  const selected = selectedId ? meetings.find((m) => m.id === selectedId) : null;

  function handleSendToTasks(actionItem) {
    addTask({
      title: actionItem.task,
      assignee: actionItem.assignee,
      due: actionItem.due || null,
      priority: 'medium',
      status: 'active',
      notes: '',
    });
  }

  // KPI data
  const kpi = useMemo(() => {
    const total = meetings.length;
    const totalActions = meetings.reduce((sum, m) => sum + (m.actionItems || []).length, 0);
    const openActions = meetings.reduce((sum, m) => sum + (m.actionItems || []).filter((a) => !a.completed).length, 0);
    const uniqueTags = allTags.length;
    return { total, totalActions, openActions, uniqueTags };
  }, [meetings, allTags]);

  if (loading) {
    return (
      <div className="meetings-loading">
        <div className="meetings-loading-spinner" />
        <span>Loading meetings...</span>
      </div>
    );
  }

  return (
    <div className="meetings-page">
      <div className="meetings-header">
        <h2>Meeting Notes</h2>
        <button className="new-meeting-btn" onClick={() => setShowModal(true)} title="Record a new meeting with notes and action items">
          + New Meeting
        </button>
      </div>

      {/* KPI Strip */}
      <div className="meetings-kpi-strip">
        <div className="meetings-kpi" title={`${kpi.total} meetings recorded`}>
          <span className="meetings-kpi-value">{kpi.total}</span>
          <span className="meetings-kpi-label">Meetings</span>
        </div>
        <div className={`meetings-kpi ${kpi.openActions > 0 ? 'kpi-alert' : ''}`} title={`${kpi.openActions} action items still open`}>
          <span className="meetings-kpi-value">{kpi.openActions}</span>
          <span className="meetings-kpi-label">Open Actions</span>
        </div>
        <div className="meetings-kpi kpi-positive" title={`${kpi.totalActions - kpi.openActions} action items completed`}>
          <span className="meetings-kpi-value">{kpi.totalActions - kpi.openActions}</span>
          <span className="meetings-kpi-label">Done Actions</span>
        </div>
        <div className="meetings-kpi" title={`${kpi.uniqueTags} unique tags used across meetings`}>
          <span className="meetings-kpi-value">{kpi.uniqueTags}</span>
          <span className="meetings-kpi-label">Tags</span>
        </div>
      </div>

      <div className="meetings-toolbar">
        <input
          className="meetings-search"
          type="text"
          placeholder="Search notes, agenda, tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          title="Search across meeting titles, notes, agenda items, and tags"
        />
        <select
          className="meetings-filter"
          value={filterAttendee}
          onChange={(e) => setFilterAttendee(e.target.value)}
          title="Filter meetings by attendee"
        >
          <option value="">All attendees</option>
          {TEAM.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <select
          className="meetings-filter"
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          title="Filter meetings by tag"
        >
          <option value="">All tags</option>
          {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="meetings-layout">
        <div className="meetings-list">
          {filtered.length === 0 ? (
            <div className="meetings-empty">
              <p className="meetings-empty-text">{meetings.length === 0 ? 'No meetings recorded yet.' : 'No meetings match your filters.'}</p>
              <p className="meetings-empty-hint">{meetings.length === 0 ? 'Click "+ New Meeting" to record your first meeting notes.' : 'Try adjusting the attendee, tag, or search filters.'}</p>
            </div>
          ) : (
            filtered.map((m) => (
              <button
                key={m.id}
                className={`meeting-row ${selectedId === m.id ? 'active' : ''}`}
                onClick={() => setSelectedId(m.id)}
                title={`${m.title} — ${formatDate(m.date)} — ${(m.attendees || []).length} attendees`}
              >
                <div className="meeting-row-top">
                  <span className="meeting-row-title">{m.title}</span>
                  <span className="meeting-row-date">{formatDate(m.date)}</span>
                </div>
                <div className="meeting-row-bottom">
                  <span className="meeting-row-attendees">
                    {(m.attendees || []).map((a) => a.charAt(0).toUpperCase()).join(', ')}
                  </span>
                  {(m.tags || []).length > 0 && (
                    <span className="meeting-row-tags">
                      {m.tags.map((t) => <span key={t} className="tag-chip">{t}</span>)}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="meetings-detail">
          {selected ? (
            <MeetingDetail
              meeting={selected}
              onUpdate={(updates) => updateMeeting(selected.id, updates)}
              onDelete={() => { removeMeeting(selected.id); setSelectedId(null); }}
              onSendToTasks={handleSendToTasks}
            />
          ) : (
            <div className="detail-empty">
              <p className="detail-empty-text">Select a meeting to view details.</p>
              <p className="detail-empty-hint">Meeting notes, agenda, and action items will appear here.</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <MeetingModal
          onSave={(meeting) => { addMeeting(meeting); setShowModal(false); }}
          onCancel={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function MeetingDetail({ meeting, onUpdate, onDelete, onSendToTasks }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(meeting.title);
  const [date, setDate] = useState(meeting.date);
  const [attendees, setAttendees] = useState(meeting.attendees || []);
  const [agenda, setAgenda] = useState((meeting.agenda || []).join('\n'));
  const [notes, setNotes] = useState(meeting.notes || '');
  const [actionItems, setActionItems] = useState(meeting.actionItems || []);
  const [tags, setTags] = useState((meeting.tags || []).join(', '));
  const [copied, setCopied] = useState(false);

  // Reset state when meeting changes
  useEffect(() => {
    setTitle(meeting.title);
    setDate(meeting.date);
    setAttendees(meeting.attendees || []);
    setAgenda((meeting.agenda || []).join('\n'));
    setNotes(meeting.notes || '');
    setActionItems(meeting.actionItems || []);
    setTags((meeting.tags || []).join(', '));
    setEditing(false);
  }, [meeting.id]);

  function saveEdit() {
    onUpdate({
      title,
      date,
      attendees,
      agenda: agenda.split('\n').filter(Boolean),
      notes,
      actionItems,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    });
    setEditing(false);
  }

  function toggleAttendee(key) {
    setAttendees((prev) =>
      prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]
    );
  }

  function updateActionItem(idx, field, value) {
    setActionItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function addActionItem() {
    setActionItems((prev) => [...prev, { task: '', assignee: 'laura', due: '', completed: false }]);
  }

  function removeActionItem(idx) {
    setActionItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function toggleActionItemComplete(idx) {
    const updated = [...actionItems];
    updated[idx] = { ...updated[idx], completed: !updated[idx].completed };
    setActionItems(updated);
    onUpdate({ actionItems: updated });
  }

  function handleExport() {
    const lines = [
      meeting.title,
      `Date: ${formatDate(meeting.date)}`,
      `Attendees: ${(meeting.attendees || []).join(', ')}`,
      '',
      'Agenda:',
      ...(meeting.agenda || []).map((a) => `  - ${a}`),
      '',
      'Notes:',
      meeting.notes || '(none)',
      '',
      'Action Items:',
      ...(meeting.actionItems || []).map(
        (a) => `  [${a.completed ? 'x' : ' '}] ${a.task} (${a.assignee}${a.due ? ', due ' + a.due : ''})`
      ),
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (editing) {
    return (
      <div className="detail-edit">
        <div className="detail-edit-header">
          <h3>Edit Meeting</h3>
          <div className="detail-edit-actions">
            <button className="modal-save" onClick={saveEdit}>Save</button>
            <button className="modal-cancel" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
        <div className="detail-edit-form">
          <label className="modal-label">
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="modal-label">
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <div className="modal-label">
            Attendees
            <div className="attendee-checks">
              {TEAM.map((t) => (
                <label key={t.key} className="attendee-check">
                  <input
                    type="checkbox"
                    checked={attendees.includes(t.key)}
                    onChange={() => toggleAttendee(t.key)}
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </div>
          <label className="modal-label">
            Agenda (one item per line)
            <textarea value={agenda} onChange={(e) => setAgenda(e.target.value)} rows={4} />
          </label>
          <label className="modal-label">
            Notes
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} />
          </label>
          <label className="modal-label">
            Tags (comma separated)
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ensight, social, leadership" />
          </label>
          <div className="modal-label">
            Action Items
            {actionItems.map((item, idx) => (
              <div key={idx} className="action-item-edit">
                <input
                  value={item.task}
                  onChange={(e) => updateActionItem(idx, 'task', e.target.value)}
                  placeholder="Task description"
                  className="action-task-input"
                />
                <select
                  value={item.assignee}
                  onChange={(e) => updateActionItem(idx, 'assignee', e.target.value)}
                  className="action-assignee-select"
                >
                  {TEAM.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
                <input
                  type="date"
                  value={item.due || ''}
                  onChange={(e) => updateActionItem(idx, 'due', e.target.value)}
                  className="action-due-input"
                />
                <button className="action-remove-btn" onClick={() => removeActionItem(idx)}>x</button>
              </div>
            ))}
            <button className="add-action-btn" onClick={addActionItem}>+ Add action item</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-view">
      <div className="detail-header">
        <div>
          <h3>{meeting.title}</h3>
          <span className="detail-date">{formatDate(meeting.date)}</span>
        </div>
        <div className="detail-actions">
          <button className="detail-action-btn" onClick={() => setEditing(true)} title="Edit meeting details">Edit</button>
          <button className="detail-action-btn" onClick={handleExport} title="Copy meeting notes to clipboard">
            {copied ? 'Copied' : 'Export'}
          </button>
          <button className="detail-action-btn danger" onClick={onDelete} title="Delete this meeting">Delete</button>
        </div>
      </div>

      <div className="detail-meta">
        <div className="detail-attendees">
          {(meeting.attendees || []).map((a) => (
            <span key={a} className="attendee-pill">{a.charAt(0).toUpperCase() + a.slice(1)}</span>
          ))}
        </div>
        {(meeting.tags || []).length > 0 && (
          <div className="detail-tags">
            {meeting.tags.map((t) => <span key={t} className="tag-chip">{t}</span>)}
          </div>
        )}
      </div>

      {(meeting.agenda || []).length > 0 && (
        <div className="detail-section">
          <h4>Agenda</h4>
          <ul className="detail-agenda-list">
            {meeting.agenda.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
      )}

      {meeting.notes && (
        <div className="detail-section">
          <h4>Notes</h4>
          <div className="detail-notes">{meeting.notes}</div>
        </div>
      )}

      {(meeting.actionItems || []).length > 0 && (
        <div className="detail-section">
          <h4>Action Items</h4>
          <div className="action-items-list">
            {meeting.actionItems.map((item, idx) => (
              <div key={idx} className={`action-item ${item.completed ? 'done' : ''}`}>
                <button
                  className="action-check"
                  onClick={() => toggleActionItemComplete(idx)}
                >
                  {item.completed ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6" fill="var(--green)" />
                      <path d="M5.5 8l1.7 1.7L10.5 6.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="8" cy="8" r="6" />
                    </svg>
                  )}
                </button>
                <div className="action-content">
                  <span className="action-task-text">{item.task}</span>
                  <span className="action-meta">
                    {item.assignee.charAt(0).toUpperCase() + item.assignee.slice(1)}
                    {item.due ? ` \u00B7 ${formatDate(item.due)}` : ''}
                  </span>
                </div>
                <button
                  className="send-to-tasks-btn"
                  onClick={() => onSendToTasks(item)}
                  title="Send to Team & Tasks"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.5 7.58v3.17a1.17 1.17 0 01-1.17 1.17H3.17A1.17 1.17 0 012 10.75V4.58A1.17 1.17 0 013.17 3.42h3.16" />
                    <path d="M8.75 2.08h3.17v3.17" /><path d="M5.83 8.17L11.92 2.08" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MeetingModal({ onSave, onCancel }) {
  const today = new Date();
  const isMonday = today.getDay() === 1;
  const dateStr = today.toISOString().split('T')[0];
  const defaultTitle = isMonday
    ? `Weekly Marketing Sync \u2014 ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : '';

  const [title, setTitle] = useState(defaultTitle);
  const [date, setDate] = useState(dateStr);
  const [attendees, setAttendees] = useState(['laura', 'arlo', 'madison']);
  const [agenda, setAgenda] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [actionItems, setActionItems] = useState([]);

  function toggleAttendee(key) {
    setAttendees((prev) =>
      prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]
    );
  }

  function addActionItem() {
    setActionItems((prev) => [...prev, { task: '', assignee: 'laura', due: '', completed: false }]);
  }

  function updateActionItem(idx, field, value) {
    setActionItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function removeActionItem(idx) {
    setActionItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      date,
      attendees,
      agenda: agenda.split('\n').filter(Boolean),
      notes,
      actionItems: actionItems.filter((a) => a.task.trim()),
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    });
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card modal-large" onClick={(e) => e.stopPropagation()}>
        <h3>New Meeting</h3>
        <form onSubmit={handleSubmit} className="modal-form">
          <label className="modal-label">
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Meeting title" autoFocus required />
          </label>
          <div className="modal-row">
            <label className="modal-label">
              Date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <div className="modal-label">
              Attendees
              <div className="attendee-checks">
                {TEAM.map((t) => (
                  <label key={t.key} className="attendee-check">
                    <input
                      type="checkbox"
                      checked={attendees.includes(t.key)}
                      onChange={() => toggleAttendee(t.key)}
                    />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <label className="modal-label">
            Agenda (one item per line)
            <textarea value={agenda} onChange={(e) => setAgenda(e.target.value)} rows={3} placeholder="Discussion topics..." />
          </label>
          <label className="modal-label">
            Notes
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Meeting notes..." />
          </label>
          <div className="modal-label">
            Action Items
            {actionItems.map((item, idx) => (
              <div key={idx} className="action-item-edit">
                <input
                  value={item.task}
                  onChange={(e) => updateActionItem(idx, 'task', e.target.value)}
                  placeholder="Task description"
                  className="action-task-input"
                />
                <select
                  value={item.assignee}
                  onChange={(e) => updateActionItem(idx, 'assignee', e.target.value)}
                  className="action-assignee-select"
                >
                  {TEAM.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
                <input
                  type="date"
                  value={item.due || ''}
                  onChange={(e) => updateActionItem(idx, 'due', e.target.value)}
                  className="action-due-input"
                />
                <button type="button" className="action-remove-btn" onClick={() => removeActionItem(idx)}>x</button>
              </div>
            ))}
            <button type="button" className="add-action-btn" onClick={addActionItem}>+ Add action item</button>
          </div>
          <label className="modal-label">
            Tags (comma separated)
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ensight, social, leadership" />
          </label>
          <div className="modal-actions">
            <button type="submit" className="modal-save">Create Meeting</button>
            <button type="button" className="modal-cancel" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}
