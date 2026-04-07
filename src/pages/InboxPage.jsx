import { useState, useMemo } from 'react';
import useSubmissions from '../hooks/useSubmissions';
import './InboxPage.css';

const TYPE_LABELS = {
  story_submission: 'Story Submission',
  social_submission: 'Social Submission',
  contact: 'Contact / Inquiry',
  event_request: 'Event Request',
};

const TYPE_FIELD_LABELS = {
  story_submission: { subject: 'Story Title', body: 'Story Details' },
  social_submission: { subject: 'Content Idea', body: 'Idea Details' },
  contact: { subject: 'Subject', body: 'Message' },
  event_request: { subject: 'Event Name', body: 'Event Details' },
};

const STATUS_OPTIONS = ['new', 'in_review', 'routed', 'archived'];
const STATUS_LABELS = { new: 'New', in_review: 'In Review', routed: 'Routed', archived: 'Archived' };
const STATUS_COLORS = { new: 'green', in_review: 'blue', routed: 'muted', archived: 'gray' };

const ROUTE_OPTIONS = [
  { value: '', label: 'Not routed' },
  { value: 'ensight', label: 'Ensight Pitch' },
  { value: 'social', label: 'Social Idea' },
  { value: 'clickup', label: 'ClickUp Task' },
  { value: 'press', label: 'Press Inquiry' },
  { value: 'event_campaign', label: 'Event Request' },
];

const TEAM = [
  { key: '', label: 'Unassigned' },
  { key: 'laura', label: 'Laura' },
  { key: 'arlo', label: 'Arlo' },
  { key: 'madison', label: 'Madison' },
];

export default function InboxPage() {
  const { submissions, loading, updateSubmission, archiveSubmission } = useSubmissions();
  const [selectedId, setSelectedId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [replyOpen, setReplyOpen] = useState(false);

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      if (filterStatus && s.status !== filterStatus) return false;
      if (filterType && s.type !== filterType) return false;
      if (!filterStatus && s.status === 'archived') return false;
      return true;
    });
  }, [submissions, filterStatus, filterType]);

  const selected = selectedId ? submissions.find((s) => s.id === selectedId) : null;

  // KPI counts
  const kpi = useMemo(() => {
    const newCount = submissions.filter((s) => s.status === 'new').length;
    const reviewCount = submissions.filter((s) => s.status === 'in_review').length;
    const routedCount = submissions.filter((s) => s.status === 'routed').length;
    const archivedCount = submissions.filter((s) => s.status === 'archived').length;
    return { newCount, reviewCount, routedCount, archivedCount, total: submissions.length };
  }, [submissions]);

  if (loading) {
    return (
      <div className="inbox-loading">
        <div className="inbox-loading-spinner" />
        <span>Loading inbox...</span>
      </div>
    );
  }

  return (
    <div className="inbox-page">
      <div className="inbox-header">
        <h2>Inbox</h2>
        <div className="inbox-filters">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="inbox-filter-select" title="Filter by submission status">
            <option value="">Active (hide archived)</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="inbox-filter-select" title="Filter by submission type">
            <option value="">All types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="inbox-kpi-strip">
        <div className={`inbox-kpi ${kpi.newCount > 0 ? 'kpi-alert' : ''}`} title={`${kpi.newCount} new submission${kpi.newCount !== 1 ? 's' : ''} awaiting review`}>
          <span className="inbox-kpi-value">{kpi.newCount}</span>
          <span className="inbox-kpi-label">New</span>
        </div>
        <div className="inbox-kpi" title={`${kpi.reviewCount} submission${kpi.reviewCount !== 1 ? 's' : ''} currently being reviewed`}>
          <span className="inbox-kpi-value">{kpi.reviewCount}</span>
          <span className="inbox-kpi-label">In Review</span>
        </div>
        <div className="inbox-kpi" title={`${kpi.routedCount} submission${kpi.routedCount !== 1 ? 's' : ''} routed to a destination`}>
          <span className="inbox-kpi-value">{kpi.routedCount}</span>
          <span className="inbox-kpi-label">Routed</span>
        </div>
        <div className="inbox-kpi" title={`${kpi.total} total submissions received`}>
          <span className="inbox-kpi-value">{kpi.total}</span>
          <span className="inbox-kpi-label">Total</span>
        </div>
      </div>

      <div className="inbox-layout">
        <div className="inbox-list">
          {filtered.length === 0 ? (
            <div className="inbox-empty">
              <p className="inbox-empty-text">{submissions.length === 0 ? 'No submissions yet.' : 'No submissions match your filters.'}</p>
              <p className="inbox-empty-hint">{submissions.length === 0 ? 'Submissions from the Marketing Resource Hub will appear here automatically.' : 'Try adjusting the status or type filters above.'}</p>
            </div>
          ) : (
            filtered.map((s) => (
              <button
                key={s.id}
                className={`inbox-row ${selectedId === s.id ? 'active' : ''} ${s.status === 'new' ? 'unread' : ''}`}
                onClick={() => { setSelectedId(s.id); setReplyOpen(false); }}
                title={`${TYPE_LABELS[s.type] || s.type}: ${s.subject || '(no subject)'} — From ${s.submitterName}`}
              >
                <div className="inbox-row-top">
                  <span className={`inbox-status-chip ${STATUS_COLORS[s.status]}`}>{STATUS_LABELS[s.status]}</span>
                  <span className="inbox-row-date">{formatTimestamp(s.submittedAt)}</span>
                </div>
                <span className="inbox-row-type">{TYPE_LABELS[s.type] || s.type}</span>
                <span className="inbox-row-subject">{s.subject || '(no subject)'}</span>
                <span className="inbox-row-from">{s.submitterName} &middot; {s.submitterEmail}</span>
              </button>
            ))
          )}
        </div>

        <div className="inbox-detail">
          {selected ? (
            <SubmissionDetail
              submission={selected}
              onUpdate={(updates) => updateSubmission(selected.id, updates)}
              onArchive={() => { archiveSubmission(selected.id); setSelectedId(null); }}
              replyOpen={replyOpen}
              setReplyOpen={setReplyOpen}
            />
          ) : (
            <div className="inbox-detail-empty">
              <p className="inbox-detail-empty-text">Select a submission to view details.</p>
              <p className="inbox-detail-empty-hint">You can review, route, assign, and reply from the detail panel.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SubmissionDetail({ submission, onUpdate, onArchive, replyOpen, setReplyOpen }) {
  const s = submission;
  const fieldLabels = TYPE_FIELD_LABELS[s.type] || { subject: 'Subject', body: 'Details' };

  const [notes, setNotes] = useState(s.notes || '');
  const [notesSaved, setNotesSaved] = useState(false);

  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [replySuccess, setReplySuccess] = useState(false);

  function saveNotes() {
    onUpdate({ notes });
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }

  async function sendReply() {
    if (!replyText.trim()) return;
    setReplySending(true);
    setReplyError('');
    setReplySuccess(false);

    try {
      const res = await fetch('/api/send-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: s.id,
          to: s.submitterEmail,
          submitterName: s.submitterName,
          subject: `Re: ${s.subject || TYPE_LABELS[s.type] || 'Your submission'}`,
          body: replyText,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send');
      }

      onUpdate({
        replySent: true,
        replyText: replyText,
        repliedAt: new Date().toISOString(),
      });
      setReplySuccess(true);
      setReplyText('');
    } catch (err) {
      setReplyError(err.message || 'Failed to send reply. Try again.');
    }
    setReplySending(false);
  }

  return (
    <div className="detail-panel">
      <div className="detail-panel-header">
        <div>
          <span className="detail-type-label">{TYPE_LABELS[s.type] || s.type}</span>
          <h3 className="detail-subject">{s.subject || '(no subject)'}</h3>
        </div>
        <div className="detail-header-actions">
          {s.status !== 'archived' && (
            <button className="detail-btn danger" onClick={onArchive} title="Archive this submission">Archive</button>
          )}
        </div>
      </div>

      <div className="detail-meta-strip">
        <span className="detail-from" title={`${s.submitterName} — ${s.submitterEmail}`}>
          <strong>{s.submitterName}</strong> &middot; {s.submitterEmail}
        </span>
        <span className="detail-timestamp">{formatTimestamp(s.submittedAt)}</span>
      </div>

      <div className="detail-body-section">
        <span className="detail-field-label">{fieldLabels.body}</span>
        <div className="detail-body-text">{s.body}</div>
      </div>

      {/* Status / Route / Assign controls */}
      <div className="detail-controls">
        <div className="detail-control">
          <label className="detail-control-label">Status</label>
          <select
            value={s.status}
            onChange={(e) => onUpdate({ status: e.target.value })}
            className="detail-select"
            title="Change submission status"
          >
            {STATUS_OPTIONS.map((st) => <option key={st} value={st}>{STATUS_LABELS[st]}</option>)}
          </select>
        </div>
        <div className="detail-control">
          <label className="detail-control-label">Route to</label>
          <select
            value={s.routedTo || ''}
            onChange={(e) => onUpdate({ routedTo: e.target.value || null, status: e.target.value ? 'routed' : s.status })}
            className="detail-select"
            title="Route this submission to a workflow"
          >
            {ROUTE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="detail-control">
          <label className="detail-control-label">Assigned to</label>
          <select
            value={s.assignedTo || ''}
            onChange={(e) => onUpdate({ assignedTo: e.target.value || null })}
            className="detail-select"
            title="Assign a team member to handle this submission"
          >
            {TEAM.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
      </div>

      {/* Internal notes */}
      <div className="detail-notes-section">
        <label className="detail-field-label">Internal Notes</label>
        <textarea
          className="detail-notes-textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes visible only to the team..."
          rows={3}
        />
        <div className="detail-notes-actions">
          <button className="detail-btn primary" onClick={saveNotes} title="Save internal notes">Save Notes</button>
          {notesSaved && <span className="detail-saved-msg">Saved</span>}
        </div>
      </div>

      {/* Reply section */}
      <div className="detail-reply-section">
        {s.replySent && (
          <div className="detail-prev-reply">
            <span className="detail-field-label">Previous Reply</span>
            <div className="detail-prev-reply-text">{s.replyText}</div>
            {s.repliedAt && <span className="detail-reply-timestamp">Sent {formatTimestamp(s.repliedAt)}</span>}
          </div>
        )}

        {!replyOpen ? (
          <button className="detail-btn reply-btn" onClick={() => setReplyOpen(true)} title={`Send a reply email to ${s.submitterEmail}`}>
            Reply to {s.submitterName.split(' ')[0] || 'submitter'}
          </button>
        ) : (
          <div className="detail-reply-form">
            <span className="detail-field-label">
              Reply to {s.submitterName} ({s.submitterEmail})
            </span>
            <textarea
              className="detail-reply-textarea"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write your reply..."
              rows={5}
              autoFocus
            />
            {replyError && <p className="detail-reply-error">{replyError}</p>}
            {replySuccess && <p className="detail-reply-success">Reply sent.</p>}
            <div className="detail-reply-actions">
              <button
                className="detail-btn primary"
                onClick={sendReply}
                disabled={replySending || !replyText.trim()}
                title="Send this reply via email"
              >
                {replySending ? 'Sending...' : 'Send Reply'}
              </button>
              <button className="detail-btn" onClick={() => { setReplyOpen(false); setReplyError(''); }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTimestamp(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}
