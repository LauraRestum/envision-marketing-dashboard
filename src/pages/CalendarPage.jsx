import { useState, useMemo } from 'react';
import usePosts from '../hooks/usePosts';
import useCampaigns from '../hooks/useCampaigns';
import './CalendarPage.css';

const PLATFORMS = [
  { key: 'facebook', label: 'Facebook', color: '#003087' },
  { key: 'instagram', label: 'Instagram', color: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' },
  { key: 'tiktok', label: 'TikTok', color: '#e8e8e8' },
  { key: 'linkedin', label: 'LinkedIn', color: '#004bb5' },
];

const STATUS_OPTIONS = ['draft', 'needs_approval', 'approved', 'scheduled', 'published'];
const STATUS_LABELS = { draft: 'Draft', needs_approval: 'Needs Approval', approved: 'Approved', scheduled: 'Scheduled', published: 'Published' };

const TEAM = [
  { key: '', label: 'Unassigned' },
  { key: 'laura', label: 'Laura' },
  { key: 'arlo', label: 'Arlo' },
  { key: 'madison', label: 'Madison' },
];

const CAMPAIGN_COLORS = ['#003087', '#004bb5', '#78BE21', '#1a3a5c', '#2d5a1e'];

export default function CalendarPage() {
  const { posts, loading: postsLoading, addPost, updatePost, removePost, getPendingApproval } = usePosts();
  const { campaigns, loading: campsLoading, addCampaign } = useCampaigns();

  const [view, setView] = useState('month'); // month | list | campaign
  const [platformFilter, setPlatformFilter] = useState('');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [showPostDrawer, setShowPostDrawer] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [drawerDate, setDrawerDate] = useState('');
  const [showCampaignModal, setShowCampaignModal] = useState(false);

  const filteredPosts = useMemo(() => {
    if (!platformFilter) return posts;
    return posts.filter((p) => (p.platforms || []).includes(platformFilter));
  }, [posts, platformFilter]);

  function openNewPost(dateStr) {
    setEditingPost(null);
    setDrawerDate(dateStr || '');
    setShowPostDrawer(true);
  }

  function openEditPost(post) {
    setEditingPost(post);
    setDrawerDate('');
    setShowPostDrawer(true);
  }

  function handleSavePost(postData) {
    if (editingPost) {
      updatePost(editingPost.id, postData);
    } else {
      addPost(postData);
    }
    setShowPostDrawer(false);
    setEditingPost(null);
  }

  function prevMonth() {
    setCurrentMonth((prev) => {
      const m = prev.month - 1;
      return m < 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: m };
    });
  }

  function nextMonth() {
    setCurrentMonth((prev) => {
      const m = prev.month + 1;
      return m > 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: m };
    });
  }

  if (postsLoading || campsLoading) {
    return <div className="cal-loading">Loading calendar...</div>;
  }

  const monthName = new Date(currentMonth.year, currentMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="calendar-page">
      <div className="cal-header">
        <h2>Content Calendar</h2>
        <div className="cal-actions">
          <button className="cal-btn primary" onClick={() => openNewPost('')}>+ New Post</button>
          <button className="cal-btn" onClick={() => setShowCampaignModal(true)}>+ Campaign</button>
        </div>
      </div>

      <div className="cal-toolbar">
        <div className="cal-views">
          <button className={`cal-view-btn ${view === 'month' ? 'active' : ''}`} onClick={() => setView('month')}>Month</button>
          <button className={`cal-view-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>List</button>
          <button className={`cal-view-btn ${view === 'campaign' ? 'active' : ''}`} onClick={() => setView('campaign')}>Campaigns</button>
        </div>
        <div className="cal-platform-tabs">
          <button className={`cal-plat-btn ${platformFilter === '' ? 'active' : ''}`} onClick={() => setPlatformFilter('')}>All</button>
          {PLATFORMS.map((p) => (
            <button key={p.key} className={`cal-plat-btn ${platformFilter === p.key ? 'active' : ''}`} onClick={() => setPlatformFilter(p.key)}>{p.label}</button>
          ))}
        </div>
      </div>

      {view === 'month' && (
        <MonthGrid
          year={currentMonth.year}
          month={currentMonth.month}
          posts={filteredPosts}
          monthName={monthName}
          onPrev={prevMonth}
          onNext={nextMonth}
          onDayClick={openNewPost}
          onPostClick={openEditPost}
        />
      )}

      {view === 'list' && (
        <ListView
          posts={filteredPosts}
          campaigns={campaigns}
          onPostClick={openEditPost}
        />
      )}

      {view === 'campaign' && (
        <CampaignView
          campaigns={campaigns}
          posts={filteredPosts}
          onPostClick={openEditPost}
        />
      )}

      {showPostDrawer && (
        <PostDrawer
          post={editingPost}
          defaultDate={drawerDate}
          campaigns={campaigns}
          onSave={handleSavePost}
          onDelete={editingPost ? () => { removePost(editingPost.id); setShowPostDrawer(false); setEditingPost(null); } : null}
          onClose={() => { setShowPostDrawer(false); setEditingPost(null); }}
          onApprove={editingPost ? (by) => { updatePost(editingPost.id, { status: 'approved', approvedBy: by, approvedAt: new Date().toISOString() }); setShowPostDrawer(false); } : null}
        />
      )}

      {showCampaignModal && (
        <CampaignModal
          onSave={(c) => { addCampaign(c); setShowCampaignModal(false); }}
          onCancel={() => setShowCampaignModal(false)}
        />
      )}
    </div>
  );
}

function MonthGrid({ year, month, posts, monthName, onPrev, onNext, onDayClick, onPostClick }) {
  const days = useMemo(() => {
    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    return cells;
  }, [year, month]);

  function getDateStr(day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function getPostsForDay(day) {
    const dateStr = getDateStr(day);
    return posts.filter((p) => p.scheduledDate && p.scheduledDate.startsWith(dateStr));
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="month-grid-wrapper">
      <div className="month-nav">
        <button className="month-nav-btn" onClick={onPrev}>&lt;</button>
        <span className="month-name">{monthName}</span>
        <button className="month-nav-btn" onClick={onNext}>&gt;</button>
      </div>
      <div className="month-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="month-day-header">{d}</div>
        ))}
        {days.map((day, i) => {
          if (day === null) return <div key={`e${i}`} className="month-cell empty" />;
          const dateStr = getDateStr(day);
          const dayPosts = getPostsForDay(day);
          const isToday = dateStr === today;
          return (
            <div
              key={day}
              className={`month-cell ${isToday ? 'today' : ''}`}
              onClick={() => onDayClick(dateStr)}
            >
              <span className="month-cell-day">{day}</span>
              <div className="month-cell-posts">
                {dayPosts.slice(0, 4).map((p) => (
                  <div key={p.id} className="month-post-chips" onClick={(e) => { e.stopPropagation(); onPostClick(p); }}>
                    {(p.platforms || []).map((plat) => (
                      <PlatformChip key={plat} platform={plat} />
                    ))}
                  </div>
                ))}
                {dayPosts.length > 4 && <span className="month-more">+{dayPosts.length - 4}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListView({ posts, campaigns, onPostClick }) {
  const upcoming = posts.filter((p) => p.status !== 'published').sort((a, b) => (a.scheduledDate || '').localeCompare(b.scheduledDate || ''));

  if (upcoming.length === 0) {
    return <div className="cal-empty">No upcoming posts scheduled.</div>;
  }

  return (
    <div className="list-view">
      {upcoming.map((p) => {
        const camp = campaigns.find((c) => c.slug === p.campaign || c.name === p.campaign);
        return (
          <button key={p.id} className="list-row" onClick={() => onPostClick(p)}>
            <div className="list-row-left">
              <div className="list-plat-chips">
                {(p.platforms || []).map((plat) => <PlatformChip key={plat} platform={plat} />)}
              </div>
              <div className="list-row-copy">{p.copy ? p.copy.slice(0, 80) + (p.copy.length > 80 ? '...' : '') : '(no copy)'}</div>
            </div>
            <div className="list-row-right">
              {camp && <span className="list-campaign-tag" style={{ borderColor: camp.color }}>{camp.name}</span>}
              <span className={`list-status ${p.status}`}>{STATUS_LABELS[p.status]}</span>
              <span className="list-date">{p.scheduledDate ? formatDate(p.scheduledDate) : 'No date'}</span>
              {p.assignedTo && <span className="list-assignee">{p.assignedTo.charAt(0).toUpperCase()}</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function CampaignView({ campaigns, posts, onPostClick }) {
  if (campaigns.length === 0) {
    return <div className="cal-empty">No campaigns created yet. Create one to group related posts.</div>;
  }

  return (
    <div className="campaign-view">
      {campaigns.map((c) => {
        const campPosts = posts.filter((p) => p.campaign === c.slug || p.campaign === c.name);
        return (
          <div key={c.id} className="campaign-lane">
            <div className="campaign-lane-header" style={{ borderLeftColor: c.color }}>
              <span className="campaign-lane-name">{c.name}</span>
              <span className="campaign-lane-dates">
                {c.startDate && formatDate(c.startDate)} {c.endDate && ` \u2013 ${formatDate(c.endDate)}`}
              </span>
              <span className="campaign-lane-count">{campPosts.length} posts</span>
            </div>
            <div className="campaign-lane-posts">
              {campPosts.length === 0 ? (
                <span className="campaign-lane-empty">No posts in this campaign yet.</span>
              ) : (
                campPosts.map((p) => (
                  <button key={p.id} className="campaign-post-card" onClick={() => onPostClick(p)}>
                    <div className="campaign-post-chips">
                      {(p.platforms || []).map((plat) => <PlatformChip key={plat} platform={plat} />)}
                    </div>
                    <span className="campaign-post-copy">{p.copy?.slice(0, 50) || '(no copy)'}</span>
                    <span className="campaign-post-date">{p.scheduledDate ? formatDate(p.scheduledDate) : ''}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PostDrawer({ post, defaultDate, campaigns, onSave, onDelete, onClose, onApprove }) {
  const [platforms, setPlatforms] = useState(post?.platforms || []);
  const [scheduledDate, setScheduledDate] = useState(post?.scheduledDate || defaultDate || '');
  const [copy, setCopy] = useState(post?.copy || '');
  const [assetNote, setAssetNote] = useState(post?.assetNote || '');
  const [campaign, setCampaign] = useState(post?.campaign || '');
  const [status, setStatus] = useState(post?.status || 'draft');
  const [assignedTo, setAssignedTo] = useState(post?.assignedTo || '');
  const [notes, setNotes] = useState(post?.notes || '');

  function togglePlatform(key) {
    setPlatforms((prev) => prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      platforms,
      scheduledDate,
      copy,
      assetNote,
      campaign: campaign || null,
      status,
      assignedTo: assignedTo || null,
      notes,
    });
  }

  const charCounts = useMemo(() => {
    return {
      facebook: { max: 2000, label: 'Facebook' },
      instagram: { max: 2200, label: 'Instagram' },
      tiktok: { max: 300, label: 'TikTok' },
      linkedin: { max: 1300, label: 'LinkedIn' },
    };
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="post-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="post-drawer-header">
          <h3>{post ? 'Edit Post' : 'New Post'}</h3>
          <button className="drawer-close" onClick={onClose}>x</button>
        </div>

        <form onSubmit={handleSubmit} className="post-drawer-form">
          <div className="post-field">
            <span className="post-field-label">Platforms</span>
            <div className="post-platform-toggles">
              {PLATFORMS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={`plat-toggle ${platforms.includes(p.key) ? 'active' : ''}`}
                  onClick={() => togglePlatform(p.key)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="post-field-row">
            <label className="post-field">
              <span className="post-field-label">Date</span>
              <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            </label>
            <label className="post-field">
              <span className="post-field-label">Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </label>
          </div>

          <label className="post-field">
            <span className="post-field-label">
              Post Copy
              {platforms.length > 0 && (
                <span className="char-counts">
                  {copy.length} chars
                  {platforms.map((p) => {
                    const info = charCounts[p];
                    return info ? <span key={p} className={copy.length > info.max ? 'over' : ''}> | {info.label}: {copy.length}/{info.max}</span> : null;
                  })}
                </span>
              )}
            </span>
            <textarea value={copy} onChange={(e) => setCopy(e.target.value)} rows={5} placeholder="Write your post..." />
          </label>

          <label className="post-field">
            <span className="post-field-label">Asset Note</span>
            <input value={assetNote} onChange={(e) => setAssetNote(e.target.value)} placeholder="Describe the visual or file name" />
          </label>

          <div className="post-field-row">
            <label className="post-field">
              <span className="post-field-label">Campaign</span>
              <select value={campaign} onChange={(e) => setCampaign(e.target.value)}>
                <option value="">None</option>
                {campaigns.map((c) => <option key={c.id} value={c.slug || c.name}>{c.name}</option>)}
              </select>
            </label>
            <label className="post-field">
              <span className="post-field-label">Assigned to</span>
              <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                {TEAM.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </label>
          </div>

          <label className="post-field">
            <span className="post-field-label">Notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Internal notes..." />
          </label>

          <div className="post-drawer-actions">
            <button type="submit" className="cal-btn primary">{post ? 'Save Changes' : 'Create Post'}</button>
            {post && status === 'needs_approval' && onApprove && (
              <button type="button" className="cal-btn approve" onClick={() => onApprove('laura')}>Approve</button>
            )}
            {onDelete && (
              <button type="button" className="cal-btn danger" onClick={onDelete}>Delete</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function CampaignModal({ onSave, onCancel }) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [platTargets, setPlatTargets] = useState([]);
  const [color, setColor] = useState(CAMPAIGN_COLORS[0]);
  const [description, setDescription] = useState('');

  const slugPreview = useMemo(() => {
    if (!name) return '';
    const topic = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const date = startDate ? `-${startDate.slice(0, 7)}` : '';
    return `${topic}${date}`;
  }, [name, startDate]);

  function togglePlat(key) {
    setPlatTargets((prev) => prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), slug: slugPreview, startDate, endDate, platforms: platTargets, color, description });
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>New Campaign</h3>
        <form onSubmit={handleSubmit} className="modal-form">
          <label className="modal-label">
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign name" required autoFocus />
          </label>
          {slugPreview && (
            <span className="campaign-slug-preview">Slug: {slugPreview}</span>
          )}
          <div className="modal-row">
            <label className="modal-label">
              Start
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label className="modal-label">
              End
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
          </div>
          <div className="modal-label">
            Platforms
            <div className="post-platform-toggles" style={{ marginTop: 4 }}>
              {PLATFORMS.map((p) => (
                <button key={p.key} type="button" className={`plat-toggle ${platTargets.includes(p.key) ? 'active' : ''}`} onClick={() => togglePlat(p.key)}>{p.label}</button>
              ))}
            </div>
          </div>
          <div className="modal-label">
            Color
            <div className="campaign-color-picks">
              {CAMPAIGN_COLORS.map((c) => (
                <button key={c} type="button" className={`color-pick ${color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setColor(c)} />
              ))}
            </div>
          </div>
          <label className="modal-label">
            Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Brief description..." />
          </label>
          <div className="modal-actions">
            <button type="submit" className="modal-save">Create Campaign</button>
            <button type="button" className="modal-cancel" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PlatformChip({ platform }) {
  const p = PLATFORMS.find((pl) => pl.key === platform);
  if (!p) return null;
  const isTikTok = platform === 'tiktok';
  const isInsta = platform === 'instagram';
  return (
    <span
      className={`platform-chip ${platform}`}
      style={isInsta ? { background: p.color } : { background: isTikTok ? p.color : p.color }}
      title={p.label}
    >
      {p.label.slice(0, 2).toUpperCase()}
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
