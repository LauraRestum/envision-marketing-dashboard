import { useState, useMemo } from 'react';
import useStories from '../hooks/useStories';
import './EnsightPage.css';

const PILLARS = [
  { key: 'research', label: 'Research' },
  { key: 'vision_rehab', label: 'Vision Rehab' },
  { key: 'employment', label: 'Employment' },
  { key: 'education', label: 'Education' },
  { key: 'arts_culture', label: 'Arts & Culture' },
];

const STAGE_LABELS = {
  pitch: 'Pitch', assigned: 'Assigned', draft: 'Draft',
  review: 'Under Review', approved: 'Approved',
  published: 'Published', repurposed: 'Repurposed',
};

const TEAM = [
  { key: '', label: 'Unassigned' },
  { key: 'laura', label: 'Laura' },
  { key: 'arlo', label: 'Arlo' },
  { key: 'madison', label: 'Madison' },
];

function getIssueMonths() {
  const now = new Date();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
  return [current, nextStr];
}

function calcDeadlines(issueMonth) {
  const [year, month] = issueMonth.split('-').map(Number);
  const lastDay = new Date(year, month, 0);

  // Last Friday of the month
  const sendDate = new Date(lastDay);
  while (sendDate.getDay() !== 5) sendDate.setDate(sendDate.getDate() - 1);

  function subtractBusinessDays(from, days) {
    const d = new Date(from);
    let count = 0;
    while (count < days) {
      d.setDate(d.getDate() - 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) count++;
    }
    return d;
  }

  const ceoApproval = subtractBusinessDays(sendDate, 3);
  const finalMarketing = subtractBusinessDays(ceoApproval, 2);
  const draftsDue = subtractBusinessDays(finalMarketing, 3);
  const storyAssignment = subtractBusinessDays(draftsDue, 5);

  return [
    { label: 'Story Assignment', date: storyAssignment },
    { label: 'Drafts Due', date: draftsDue },
    { label: 'Marketing Approval', date: finalMarketing },
    { label: 'CEO Approval', date: ceoApproval },
    { label: 'Send Date', date: sendDate },
  ];
}

function daysUntil(date) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
}

export default function EnsightPage() {
  const { stories, loading, addStory, updateStory, removeStory, getStoriesForMonth, STAGES } = useStories();
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingStory, setEditingStory] = useState(null);
  const [drawerMonth, setDrawerMonth] = useState('');
  const [drawerSlot, setDrawerSlot] = useState(null);

  const [currentMonth, nextMonth] = useMemo(() => getIssueMonths(), []);

  function openNewStory(month, slot) {
    setEditingStory(null);
    setDrawerMonth(month);
    setDrawerSlot(slot);
    setShowDrawer(true);
  }

  function openEditStory(story) {
    setEditingStory(story);
    setDrawerMonth(story.issueMonth);
    setDrawerSlot(story.slot);
    setShowDrawer(true);
  }

  function handleSave(data) {
    if (editingStory) {
      updateStory(editingStory.id, data);
    } else {
      addStory(data);
    }
    setShowDrawer(false);
    setEditingStory(null);
  }

  function handleStageChange(storyId, newStage) {
    updateStory(storyId, { stage: newStage });
  }

  if (loading) {
    return (
      <div className="ensight-loading">
        <div className="ensight-loading-spinner" />
        <span>Loading Ensight Planner...</span>
      </div>
    );
  }

  return (
    <div className="ensight-page">
      <h2>Ensight Planner</h2>

      <div className="ensight-panels">
        <IssuePanel
          issueMonth={currentMonth}
          label="Current Issue"
          stories={getStoriesForMonth(currentMonth)}
          stages={STAGES}
          onAddStory={openNewStory}
          onEditStory={openEditStory}
          onStageChange={handleStageChange}
        />
        <IssuePanel
          issueMonth={nextMonth}
          label="Next Issue"
          stories={getStoriesForMonth(nextMonth)}
          stages={STAGES}
          onAddStory={openNewStory}
          onEditStory={openEditStory}
          onStageChange={handleStageChange}
        />
      </div>

      {showDrawer && (
        <StoryDrawer
          story={editingStory}
          issueMonth={drawerMonth}
          slot={drawerSlot}
          onSave={handleSave}
          onDelete={editingStory ? () => { removeStory(editingStory.id); setShowDrawer(false); } : null}
          onClose={() => { setShowDrawer(false); setEditingStory(null); }}
        />
      )}
    </div>
  );
}

function IssuePanel({ issueMonth, label, stories, stages, onAddStory, onEditStory, onStageChange }) {
  const deadlines = useMemo(() => calcDeadlines(issueMonth), [issueMonth]);
  const [year, month] = issueMonth.split('-');
  const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const slots = [1, 2, 3].map((slot) => {
    const story = stories.find((s) => s.slot === slot);
    return { slot, story };
  });

  return (
    <div className="issue-panel">
      <div className="issue-panel-header">
        <div>
          <span className="issue-label">{label}</span>
          <h3>{monthName} Ensight</h3>
        </div>
      </div>

      <div className="deadline-timeline">
        {deadlines.map((d) => {
          const days = daysUntil(d.date);
          const isPast = days < 0;
          const isUrgent = days >= 0 && days <= 5;
          return (
            <div key={d.label} className={`deadline-item ${isPast ? 'past' : ''} ${isUrgent ? 'urgent' : ''}`} title={`${d.label}: ${d.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} — ${isPast ? 'Passed' : days === 0 ? 'Today' : `${days} days away`}`}>
              <span className="deadline-label">{d.label}</span>
              <span className="deadline-date">{d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              <span className="deadline-countdown">
                {isPast ? 'Passed' : days === 0 ? 'Today' : `${days}d`}
              </span>
            </div>
          );
        })}
      </div>

      <div className="story-slots">
        {slots.map(({ slot, story }) => (
          <div key={slot} className="story-slot">
            <span className="slot-label">Story {slot}</span>
            {story ? (
              <StoryCard story={story} stages={stages} onEdit={() => onEditStory(story)} onStageChange={onStageChange} />
            ) : (
              <div>
                <button className="add-story-btn" onClick={() => onAddStory(issueMonth, slot)} title={`Add a story for slot ${slot}`}>
                  + Add Story
                </button>
                <p className="slot-empty-hint">Click to pitch or assign a story for this slot.</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StoryCard({ story, stages, onEdit, onStageChange }) {
  const pillar = PILLARS.find((p) => p.key === story.pillar);
  const platformsDone = Object.values(story.platformRollout || {}).filter(Boolean).length;

  return (
    <div className="story-card" onClick={onEdit} title={`${story.title || '(untitled)'} — ${STAGE_LABELS[story.stage] || story.stage}${story.assignedTo ? ` — ${story.assignedTo}` : ''}`}>
      <div className="story-card-top">
        <span className="story-card-title">{story.title || '(untitled)'}</span>
        {pillar && <span className="story-pillar-tag">{pillar.label}</span>}
      </div>
      <div className="story-card-meta">
        {story.assignedTo && <span className="story-assignee">{story.assignedTo.charAt(0).toUpperCase() + story.assignedTo.slice(1)}</span>}
        {story.source && <span className="story-source">{story.source}</span>}
      </div>
      <div className="story-card-stage">
        <select
          value={story.stage}
          onChange={(e) => { e.stopPropagation(); onStageChange(story.id, e.target.value); }}
          onClick={(e) => e.stopPropagation()}
          className="stage-select"
        >
          {stages.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
        </select>
      </div>
      <div className="story-rollout">
        {['facebook', 'instagram', 'tiktok', 'linkedin'].map((p) => (
          <span key={p} className={`rollout-dot ${story.platformRollout?.[p] ? 'done' : ''}`} title={p}>
            {p.charAt(0).toUpperCase()}
          </span>
        ))}
        <span className="rollout-count">{platformsDone}/4</span>
      </div>
    </div>
  );
}

function StoryDrawer({ story, issueMonth, slot, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(story?.title || '');
  const [pillar, setPillar] = useState(story?.pillar || '');
  const [assignedTo, setAssignedTo] = useState(story?.assignedTo || '');
  const [source, setSource] = useState(story?.source || '');
  const [angle, setAngle] = useState(story?.angle || '');
  const [brief, setBrief] = useState(story?.brief || { who: '', what: '', when: '', where: '', why: '' });
  const [stage, setStage] = useState(story?.stage || 'pitch');
  const [rollout, setRollout] = useState(story?.platformRollout || { facebook: false, instagram: false, tiktok: false, linkedin: false });
  const [notes, setNotes] = useState(story?.notes || '');

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      issueMonth,
      slot,
      title, pillar,
      assignedTo: assignedTo || null,
      source, angle, brief, stage,
      platformRollout: rollout,
      notes,
    });
  }

  function updateBrief(key, value) {
    setBrief((prev) => ({ ...prev, [key]: value }));
  }

  function toggleRollout(platform) {
    setRollout((prev) => ({ ...prev, [platform]: !prev[platform] }));
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="post-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="post-drawer-header">
          <h3>{story ? 'Edit Story' : 'New Story'}</h3>
          <button className="drawer-close" onClick={onClose}>x</button>
        </div>

        <form onSubmit={handleSubmit} className="post-drawer-form">
          <label className="post-field">
            <span className="post-field-label">Title / Working Headline</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Story title" autoFocus />
          </label>

          <div className="post-field-row">
            <label className="post-field">
              <span className="post-field-label">Pillar</span>
              <select value={pillar} onChange={(e) => setPillar(e.target.value)}>
                <option value="">Select pillar</option>
                {PILLARS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </label>
            <label className="post-field">
              <span className="post-field-label">Assigned to</span>
              <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                {TEAM.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </label>
          </div>

          <div className="post-field-row">
            <label className="post-field">
              <span className="post-field-label">Source / Interviewee</span>
              <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Who is the story about?" />
            </label>
            <label className="post-field">
              <span className="post-field-label">Stage</span>
              <select value={stage} onChange={(e) => setStage(e.target.value)}>
                {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
          </div>

          <label className="post-field">
            <span className="post-field-label">Story Angle</span>
            <textarea value={angle} onChange={(e) => setAngle(e.target.value)} rows={2} placeholder="Why this story, why now?" />
          </label>

          <div className="brief-section">
            <span className="post-field-label">Story Brief</span>
            {['who', 'what', 'when', 'where', 'why'].map((key) => (
              <label key={key} className="brief-field">
                <span className="brief-key">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                <input value={brief[key] || ''} onChange={(e) => updateBrief(key, e.target.value)} />
              </label>
            ))}
          </div>

          <div className="post-field">
            <span className="post-field-label">Platform Rollout</span>
            <div className="rollout-toggles">
              {['facebook', 'instagram', 'tiktok', 'linkedin'].map((p) => (
                <label key={p} className="rollout-toggle">
                  <input type="checkbox" checked={rollout[p]} onChange={() => toggleRollout(p)} />
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </label>
              ))}
            </div>
          </div>

          <label className="post-field">
            <span className="post-field-label">Notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Internal notes..." />
          </label>

          <div className="post-drawer-actions">
            <button type="submit" className="cal-btn primary">{story ? 'Save Changes' : 'Add Story'}</button>
            {onDelete && <button type="button" className="cal-btn danger" onClick={onDelete}>Delete</button>}
          </div>
        </form>
      </div>
    </div>
  );
}
