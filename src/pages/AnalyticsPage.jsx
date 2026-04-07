import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import usePosts from '../hooks/usePosts';
import useSocialAnalytics from '../hooks/useSocialAnalytics';
import './AnalyticsPage.css';

const PLATFORMS = [
  { key: 'facebook', label: 'Facebook', color: '#003087', url: 'https://www.facebook.com/DiscoverEnvision' },
  { key: 'instagram', label: 'Instagram', color: '#C13584', url: 'https://www.instagram.com/discoverenvision' },
  { key: 'tiktok', label: 'TikTok', color: '#e8e8e8', url: 'https://www.tiktok.com/@discoverenvision' },
  { key: 'linkedin', label: 'LinkedIn', color: '#004bb5', url: 'https://www.linkedin.com/company/envision-inc' },
];

const PILLAR_LABELS = {
  research: 'Research', vision_rehab: 'Vision Rehab', employment: 'Employment',
  education: 'Education', arts_culture: 'Arts & Culture',
};

function formatFollowers(count) {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const { addPost } = usePosts();
  const { analytics, loading: analyticsLoading, refresh: refreshAnalytics, updateFollowers } = useSocialAnalytics();
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState('');

  function startEdit(platformKey, currentFollowers) {
    setEditing(platformKey);
    setEditValue(currentFollowers ? String(currentFollowers) : '');
  }

  function saveEdit(platformKey) {
    if (editValue.trim()) updateFollowers(platformKey, editValue.trim());
    setEditing(null);
    setEditValue('');
  }

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h2>Analytics</h2>
        <button className="analytics-refresh-btn" onClick={refreshAnalytics} disabled={analyticsLoading} title="Refresh all platform data">
          {analyticsLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="analytics-platforms">
        {PLATFORMS.map((p) => {
          const data = analytics[p.key];
          const connected = data?.connected;
          const followers = data?.followers;
          const lastSynced = data?._lastSynced;
          const isManual = p.key !== 'linkedin';
          const isEditing = editing === p.key;

          return (
            <div key={p.key} className={`analytics-platform-card ${connected ? 'connected' : ''}`} title={connected ? `${p.label} — Updated: ${lastSynced ? new Date(lastSynced).toLocaleString() : 'unknown'}` : `${p.label} — ${isManual ? 'Click count to update' : 'Configure in Settings'}`}>
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="analytics-plat-name" style={{ color: p.key === 'tiktok' ? 'var(--text-light)' : p.color }}>{p.label}</a>
              {isEditing ? (
                <form className="analytics-edit-form" onSubmit={(e) => { e.preventDefault(); saveEdit(p.key); }}>
                  <input
                    type="text"
                    className="analytics-edit-input"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="e.g. 2743"
                    autoFocus
                    onBlur={() => saveEdit(p.key)}
                  />
                </form>
              ) : (
                <span
                  className={`analytics-follower-count ${isManual ? 'editable' : ''}`}
                  onClick={isManual ? () => startEdit(p.key, followers) : undefined}
                  title={isManual ? 'Click to update follower count' : undefined}
                >
                  {analyticsLoading ? '...' : connected && followers != null ? formatFollowers(followers) : '--'}
                </span>
              )}
              <span className="analytics-plat-note">
                {connected && lastSynced
                  ? `${data?._manual ? 'Manual' : 'Live'} · ${new Date(lastSynced).toLocaleDateString()}`
                  : isManual
                    ? 'Click count to enter'
                    : 'Add handle in Settings'}
              </span>
            </div>
          );
        })}
      </div>

      <div className="analytics-sections">
        {/* AI Idea Generator */}
        <IdeaGenerator onAddToCalendar={(idea) => {
          addPost({
            platforms: [idea.platform],
            copy: idea.hook,
            status: 'draft',
            notes: `Angle: ${idea.angle}\nFormat: ${idea.format}\nPillar: ${PILLAR_LABELS[idea.pillar] || idea.pillar}`,
          });
          navigate('/calendar');
        }} />

        {/* Competitor Watch - placeholder */}
        <div className="analytics-section">
          <h3>Industry and Competitor Watch</h3>
          <p className="analytics-placeholder">
            Competitor follower counts and observations are entered manually in this section.
            Connect platform APIs in Phase 5 to display live analytics above.
          </p>
        </div>
      </div>
    </div>
  );
}

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
                {idea.pillar && <span className="idea-pillar-tag">{PILLAR_LABELS[idea.pillar] || idea.pillar}</span>}
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
