import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import usePosts from '../hooks/usePosts';
import useSocialAnalytics from '../hooks/useSocialAnalytics';
import usePostMetrics from '../hooks/usePostMetrics';
import { PILLAR_LABELS } from '../constants/pillars';
import PillarTag from '../components/common/PillarTag';
import './AnalyticsPage.css';

const PLATFORMS = [
  { key: 'facebook', label: 'Facebook', color: '#003087', url: 'https://www.facebook.com/DiscoverEnvision' },
  { key: 'instagram', label: 'Instagram', color: '#C13584', url: 'https://www.instagram.com/discoverenvision' },
  { key: 'tiktok', label: 'TikTok', color: '#e8e8e8', url: 'https://www.tiktok.com/@discoverenvision' },
  { key: 'linkedin', label: 'LinkedIn', color: '#004bb5', url: 'https://www.linkedin.com/company/envision-inc' },
];

// PILLAR_LABELS imported from constants/pillars

function formatFollowers(count) {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

function formatNumber(n) {
  if (n == null) return '0';
  return n.toLocaleString();
}

// ─── Main Page ───────────────────────────────────────────────

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const { addPost } = usePosts();
  const { analytics, loading: analyticsLoading, refresh: refreshAnalytics, updateFollowers } = useSocialAnalytics();
  const { metrics, addMetric, deleteMetric } = usePostMetrics();
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showLogForm, setShowLogForm] = useState(false);
  const [metricFilter, setMetricFilter] = useState('');

  function startEdit(platformKey, currentFollowers) {
    setEditing(platformKey);
    setEditValue(currentFollowers ? String(currentFollowers) : '');
  }

  function saveEdit(platformKey) {
    if (editValue.trim()) updateFollowers(platformKey, editValue.trim());
    setEditing(null);
    setEditValue('');
  }

  // Top posts by total engagement (likes + comments + shares)
  const topPosts = useMemo(() => {
    const filtered = metricFilter
      ? metrics.filter((m) => m.platform === metricFilter)
      : metrics;
    return [...filtered]
      .sort((a, b) => ((b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares)))
      .slice(0, 5);
  }, [metrics, metricFilter]);

  // Platform breakdown
  const platformStats = useMemo(() => {
    const stats = {};
    for (const p of PLATFORMS) {
      const platMetrics = metrics.filter((m) => m.platform === p.key);
      const totalLikes = platMetrics.reduce((s, m) => s + (m.likes || 0), 0);
      const totalComments = platMetrics.reduce((s, m) => s + (m.comments || 0), 0);
      const totalShares = platMetrics.reduce((s, m) => s + (m.shares || 0), 0);
      const totalReach = platMetrics.reduce((s, m) => s + (m.reach || 0), 0);
      stats[p.key] = {
        posts: platMetrics.length,
        totalLikes,
        totalComments,
        totalShares,
        totalReach,
        totalEngagement: totalLikes + totalComments + totalShares,
        avgEngagement: platMetrics.length ? Math.round((totalLikes + totalComments + totalShares) / platMetrics.length) : 0,
      };
    }
    return stats;
  }, [metrics]);

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h2>Analytics</h2>
        <button className="analytics-refresh-btn" onClick={refreshAnalytics} disabled={analyticsLoading} title="Refresh all platform data">
          {analyticsLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* ── Follower count cards ── */}
      <div className="analytics-platforms">
        {PLATFORMS.map((p) => {
          const data = analytics[p.key];
          const connected = data?.connected;
          const followers = data?.followers;
          const lastSynced = data?._lastSynced;
          const isManual = p.key !== 'linkedin';
          const isEditing = editing === p.key;
          const stats = platformStats[p.key];

          return (
            <div key={p.key} className={`analytics-platform-card ${connected ? 'connected' : ''}`}>
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="analytics-plat-name" style={{ color: p.key === 'tiktok' ? 'var(--text-light)' : p.color }}>{p.label}</a>
              {isEditing ? (
                <form className="analytics-edit-form" onSubmit={(e) => { e.preventDefault(); saveEdit(p.key); }}>
                  <input type="text" className="analytics-edit-input" value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="e.g. 2743" autoFocus onBlur={() => saveEdit(p.key)} />
                </form>
              ) : (
                <span className={`analytics-follower-count ${isManual ? 'editable' : ''}`} onClick={isManual ? () => startEdit(p.key, followers) : undefined} title={isManual ? 'Click to update follower count' : undefined}>
                  {analyticsLoading ? '...' : connected && followers != null ? formatFollowers(followers) : '--'}
                </span>
              )}
              {stats.posts > 0 && (
                <span className="analytics-plat-engagement">{formatNumber(stats.totalEngagement)} engagements · {stats.posts} posts</span>
              )}
              <span className="analytics-plat-note">
                {connected && lastSynced
                  ? `${data?._manual ? 'Manual' : 'Live'} · ${new Date(lastSynced).toLocaleDateString()}`
                  : isManual ? 'Click count to enter' : 'Add handle in Settings'}
              </span>
            </div>
          );
        })}
      </div>

      <div className="analytics-sections">
        {/* ── Post Performance Tracker ── */}
        <div className="analytics-section">
          <div className="section-header">
            <h3>Post Performance</h3>
            <div className="section-actions">
              <select className="metric-filter" value={metricFilter} onChange={(e) => setMetricFilter(e.target.value)}>
                <option value="">All platforms</option>
                {PLATFORMS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
              <button className="log-post-btn" onClick={() => setShowLogForm(!showLogForm)}>
                {showLogForm ? 'Cancel' : '+ Log Post'}
              </button>
            </div>
          </div>

          {showLogForm && <LogPostForm onSubmit={(entry) => { addMetric(entry); setShowLogForm(false); }} />}

          {/* Top performing posts */}
          {topPosts.length > 0 ? (
            <div className="top-posts">
              <h4 className="subsection-label">Top Performing Posts</h4>
              <div className="top-posts-list">
                {topPosts.map((post) => (
                  <div key={post.id} className="top-post-row">
                    <div className="top-post-main">
                      <span className={`top-post-platform ${post.platform}`}>{post.platform}</span>
                      <span className="top-post-title">{post.title || 'Untitled'}</span>
                      <span className="top-post-date">{post.date}</span>
                    </div>
                    <div className="top-post-stats">
                      <span className="stat" title="Likes">{formatNumber(post.likes)} likes</span>
                      <span className="stat" title="Comments">{formatNumber(post.comments)} comments</span>
                      <span className="stat" title="Shares">{formatNumber(post.shares)} shares</span>
                      {post.reach > 0 && <span className="stat" title="Reach">{formatNumber(post.reach)} reach</span>}
                      {post.impressions > 0 && <span className="stat" title="Impressions">{formatNumber(post.impressions)} impr.</span>}
                      {post.saves > 0 && <span className="stat" title="Saves">{formatNumber(post.saves)} saves</span>}
                    </div>
                    <button className="top-post-delete" onClick={() => deleteMetric(post.id)} title="Delete this entry">×</button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="analytics-placeholder">No posts logged yet. Click "+ Log Post" to start tracking performance.</p>
          )}

          {/* Platform breakdown */}
          {metrics.length > 0 && (
            <div className="platform-breakdown">
              <h4 className="subsection-label">Platform Breakdown</h4>
              <div className="breakdown-grid">
                {PLATFORMS.map((p) => {
                  const s = platformStats[p.key];
                  if (s.posts === 0) return null;
                  return (
                    <div key={p.key} className="breakdown-card">
                      <span className="breakdown-platform" style={{ color: p.key === 'tiktok' ? 'var(--text-light)' : p.color }}>{p.label}</span>
                      <div className="breakdown-stats">
                        <div className="breakdown-stat"><span className="breakdown-num">{s.posts}</span><span className="breakdown-label">posts</span></div>
                        <div className="breakdown-stat"><span className="breakdown-num">{formatNumber(s.totalLikes)}</span><span className="breakdown-label">likes</span></div>
                        <div className="breakdown-stat"><span className="breakdown-num">{formatNumber(s.totalComments)}</span><span className="breakdown-label">comments</span></div>
                        <div className="breakdown-stat"><span className="breakdown-num">{formatNumber(s.totalShares)}</span><span className="breakdown-label">shares</span></div>
                        <div className="breakdown-stat"><span className="breakdown-num">{formatNumber(s.totalReach)}</span><span className="breakdown-label">reach</span></div>
                        <div className="breakdown-stat"><span className="breakdown-num">{formatNumber(s.avgEngagement)}</span><span className="breakdown-label">avg eng.</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent entries */}
          {metrics.length > 5 && (
            <div className="recent-entries">
              <h4 className="subsection-label">All Logged Posts ({metrics.length})</h4>
              <div className="entries-list">
                {(metricFilter ? metrics.filter((m) => m.platform === metricFilter) : metrics).map((m) => (
                  <div key={m.id} className="entry-row">
                    <span className={`top-post-platform ${m.platform}`}>{m.platform}</span>
                    <span className="entry-title">{m.title || 'Untitled'}</span>
                    <span className="entry-date">{m.date}</span>
                    <span className="entry-eng">{formatNumber((m.likes || 0) + (m.comments || 0) + (m.shares || 0))} eng.</span>
                    <button className="top-post-delete" onClick={() => deleteMetric(m.id)} title="Delete">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── AI Idea Generator ── */}
        <IdeaGenerator onAddToCalendar={(idea) => {
          addPost({
            platforms: [idea.platform],
            copy: idea.hook,
            status: 'draft',
            notes: `Angle: ${idea.angle}\nFormat: ${idea.format}\nPillar: ${PILLAR_LABELS[idea.pillar] || idea.pillar}`,
          });
          navigate('/calendar');
        }} />
      </div>
    </div>
  );
}

// ─── Log Post Form ───────────────────────────────────────────

function LogPostForm({ onSubmit }) {
  const [platform, setPlatform] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [likes, setLikes] = useState('');
  const [comments, setComments] = useState('');
  const [shares, setShares] = useState('');
  const [reach, setReach] = useState('');
  const [impressions, setImpressions] = useState('');
  const [saves, setSaves] = useState('');
  const [link, setLink] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!platform) return;
    onSubmit({ platform, title, date, likes, comments, shares, reach, impressions, saves, link });
  }

  return (
    <form className="log-form" onSubmit={handleSubmit}>
      <div className="log-form-row">
        <label className="log-field">
          <span className="log-label">Platform *</span>
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} required>
            <option value="">Select...</option>
            {PLATFORMS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </label>
        <label className="log-field log-field-wide">
          <span className="log-label">Post title / description</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What was the post about?" />
        </label>
        <label className="log-field">
          <span className="log-label">Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      <div className="log-form-row">
        <label className="log-field"><span className="log-label">Likes</span><input type="number" value={likes} onChange={(e) => setLikes(e.target.value)} placeholder="0" /></label>
        <label className="log-field"><span className="log-label">Comments</span><input type="number" value={comments} onChange={(e) => setComments(e.target.value)} placeholder="0" /></label>
        <label className="log-field"><span className="log-label">Shares</span><input type="number" value={shares} onChange={(e) => setShares(e.target.value)} placeholder="0" /></label>
        <label className="log-field"><span className="log-label">Reach</span><input type="number" value={reach} onChange={(e) => setReach(e.target.value)} placeholder="0" /></label>
        <label className="log-field"><span className="log-label">Impressions</span><input type="number" value={impressions} onChange={(e) => setImpressions(e.target.value)} placeholder="0" /></label>
        <label className="log-field"><span className="log-label">Saves</span><input type="number" value={saves} onChange={(e) => setSaves(e.target.value)} placeholder="0" /></label>
      </div>
      <div className="log-form-row">
        <label className="log-field log-field-wide"><span className="log-label">Post link (optional)</span><input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." /></label>
        <button type="submit" className="log-submit-btn" disabled={!platform}>Save Post</button>
      </div>
    </form>
  );
}

// ─── Idea Generator ──────────────────────────────────────────

function IdeaGenerator({ onAddToCalendar }) {
  const [platforms, setPlatforms] = useState([]);
  const [theme, setTheme] = useState('');
  const [recentWins, setRecentWins] = useState('');
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function togglePlatform(key) {
    setPlatforms((prev) => prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]);
  }

  async function generate() {
    if (platforms.length === 0) return;
    setLoading(true);
    setError('');
    setIdeas([]);

    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platforms, theme, recentWins }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setIdeas(data.ideas || []);
      if (data.parseError) setError('Ideas generated but could not be fully parsed.');
    } catch (err) {
      setError(err.message || 'Failed to generate ideas.');
    }
    setLoading(false);
  }

  return (
    <div className="analytics-section idea-generator">
      <h3>Content Idea Generator</h3>
      <div className="idea-input-area">
        <div className="idea-field">
          <span className="idea-field-label">Platforms</span>
          <div className="idea-platforms">
            {PLATFORMS.map((p) => (
              <button key={p.key} className={`plat-toggle ${platforms.includes(p.key) ? 'active' : ''}`} onClick={() => togglePlatform(p.key)}>{p.label}</button>
            ))}
          </div>
        </div>
        <label className="idea-field">
          <span className="idea-field-label">Theme or Campaign (optional)</span>
          <input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Current focus, campaign name, seasonal tie-in..." />
        </label>
        <label className="idea-field">
          <span className="idea-field-label">Recent wins (optional)</span>
          <input value={recentWins} onChange={(e) => setRecentWins(e.target.value)} placeholder="What content has performed well recently?" />
        </label>
        <button className="idea-generate-btn" onClick={generate} disabled={loading || platforms.length === 0}>
          {loading ? 'Generating...' : 'Generate Ideas'}
        </button>
      </div>

      {error && <div className="idea-error">{error}</div>}

      {ideas.length > 0 && (
        <div className="idea-results">
          {ideas.map((idea, i) => (
            <div key={i} className="idea-card">
              <div className="idea-card-header">
                <span className="idea-platform-tag">{idea.platform}</span>
                {idea.pillar && <PillarTag pillarKey={idea.pillar} />}
                {idea.format && <span className="idea-format-tag">{idea.format}</span>}
              </div>
              <div className="idea-hook">{idea.hook}</div>
              <div className="idea-angle">{idea.angle}</div>
              <button className="idea-add-btn" onClick={() => onAddToCalendar(idea)}>Add to Calendar</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
