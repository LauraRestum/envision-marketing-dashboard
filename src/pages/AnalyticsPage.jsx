import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { jsPDF } from 'jspdf';
import usePosts from '../hooks/usePosts';
import useAnalytics from '../hooks/useAnalytics';
import useCompetitors from '../hooks/useCompetitors';
import './AnalyticsPage.css';

const PLATFORMS = [
  { key: 'facebook', label: 'Facebook', color: '#003087' },
  { key: 'instagram', label: 'Instagram', color: '#C13584' },
  { key: 'tiktok', label: 'TikTok', color: '#69C9D0' },
  { key: 'linkedin', label: 'LinkedIn', color: '#004bb5' },
];

const PILLAR_LABELS = {
  research: 'Research', vision_rehab: 'Vision Rehab', employment: 'Employment',
  education: 'Education', arts_culture: 'Arts & Culture',
};

const METRICS = [
  { key: 'reach', label: 'Reach' },
  { key: 'impressions', label: 'Impressions' },
  { key: 'engagement', label: 'Engagement Rate' },
];

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const { addPost } = usePosts();
  const { platformData, trends, topPosts, loading, errors, refreshAll } = useAnalytics();
  const { competitors, addCompetitor, updateCompetitor, removeCompetitor } = useCompetitors();

  const [metric, setMetric] = useState('reach');
  const [chartPlatforms, setChartPlatforms] = useState(['facebook', 'instagram', 'tiktok', 'linkedin']);
  const [showAddCompetitor, setShowAddCompetitor] = useState(false);

  // Auto-refresh every hour
  const intervalRef = useRef(null);
  useEffect(() => {
    intervalRef.current = setInterval(refreshAll, 60 * 60 * 1000);
    return () => clearInterval(intervalRef.current);
  }, [refreshAll]);

  function toggleChartPlatform(key) {
    setChartPlatforms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  }

  // Build chart data: merge all platform trends for selected metric into unified date series
  const chartData = useMemo(() => {
    const dateMap = {};
    chartPlatforms.forEach((p) => {
      const trendData = trends[p]?.[metric] || [];
      trendData.forEach((point) => {
        if (!dateMap[point.date]) dateMap[point.date] = { date: point.date };
        dateMap[point.date][p] = point.value;
      });
    });
    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [trends, metric, chartPlatforms]);

  function generateReport() {
    const pdf = new jsPDF();
    const now = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text('Envision Marketing Analytics Report', 14, 22);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`Generated ${now}`, 14, 30);

    let y = 44;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Platform Summary', 14, y);
    y += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    PLATFORMS.forEach((p) => {
      const d = platformData[p.key];
      const status = d?.live ? 'Live' : 'Mock data';
      pdf.text(
        `${p.label}: ${d?.followers?.toLocaleString() || '--'} followers (${d?.followersChange >= 0 ? '+' : ''}${d?.followersChange || 0} this week) | Reach: ${d?.reachThisMonth?.toLocaleString() || '--'} | Engagement: ${d?.engagementRate || '--'}% | ${status}`,
        14, y
      );
      y += 6;
    });

    y += 6;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Top Performing Posts', 14, y);
    y += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    topPosts.forEach((post, i) => {
      const preview = post.copy?.slice(0, 80) || '';
      pdf.text(`${i + 1}. [${post.platform}] ${preview}... (${post.engagement}% engagement, ${post.date})`, 14, y);
      y += 6;
    });

    y += 6;
    if (competitors.length > 0) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Competitor Watch', 14, y);
      y += 8;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      competitors.forEach((c) => {
        const counts = Object.entries(c.followers || {}).map(([p, v]) => `${p}: ${v}`).join(', ');
        pdf.text(`${c.name}: ${counts || 'No data'} (checked ${c.lastChecked || 'never'})`, 14, y);
        y += 6;
      });
    }

    pdf.save('envision-analytics-report.pdf');
  }

  if (loading) {
    return <div className="analytics-loading">Loading analytics...</div>;
  }

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h2>Analytics</h2>
        <div className="analytics-header-actions">
          <button className="analytics-btn" onClick={refreshAll}>Refresh All</button>
          <button className="analytics-btn primary" onClick={generateReport}>Export Report</button>
        </div>
      </div>

      {/* Platform summary strip */}
      <div className="analytics-platforms">
        {PLATFORMS.map((p) => {
          const d = platformData[p.key];
          const err = errors[p.key];
          const changePositive = (d?.followersChange || 0) >= 0;
          return (
            <div key={p.key} className="analytics-platform-card">
              {err && <div className="platform-error-banner">{err}</div>}
              <span className="analytics-plat-name" style={{ color: p.color }}>{p.label}</span>
              <span className="analytics-follower-count">{d?.followers?.toLocaleString() || '--'}</span>
              <span className={`analytics-change ${changePositive ? 'up' : 'down'}`}>
                {changePositive ? '\u25B2' : '\u25BC'} {Math.abs(d?.followersChange || 0)} this week
              </span>
              <div className="analytics-plat-stats">
                <div className="plat-stat">
                  <span className="plat-stat-label">Reach</span>
                  <span className="plat-stat-value">{d?.reachThisMonth?.toLocaleString() || '--'}</span>
                </div>
                <div className="plat-stat">
                  <span className="plat-stat-label">Engagement</span>
                  <span className="plat-stat-value">{d?.engagementRate || '--'}%</span>
                </div>
              </div>
              <span className="analytics-sync-time">
                {d?.live ? `Synced ${new Date(d.lastSynced).toLocaleString()}` : 'Showing sample data'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Engagement trends chart */}
      <div className="analytics-section">
        <div className="chart-header">
          <h3>Engagement Trends (30 days)</h3>
          <div className="chart-controls">
            <div className="chart-metric-tabs">
              {METRICS.map((m) => (
                <button key={m.key} className={`chart-tab ${metric === m.key ? 'active' : ''}`} onClick={() => setMetric(m.key)}>{m.label}</button>
              ))}
            </div>
            <div className="chart-platform-toggles">
              {PLATFORMS.map((p) => (
                <button key={p.key} className={`chart-plat-btn ${chartPlatforms.includes(p.key) ? 'active' : ''}`} style={chartPlatforms.includes(p.key) ? { borderColor: p.color, color: p.color } : {}} onClick={() => toggleChartPlatform(p.key)}>{p.label}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={(d) => { const dt = new Date(d + 'T00:00:00'); return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={{ background: 'var(--blue-dark)', border: '1px solid var(--border-dark)', borderRadius: 4, fontSize: 12 }} labelStyle={{ color: 'var(--text-muted)' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {chartPlatforms.map((p) => {
                const info = PLATFORMS.find((pl) => pl.key === p);
                return <Line key={p} type="monotone" dataKey={p} stroke={info?.color} strokeWidth={2} dot={false} name={info?.label} />;
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top performing posts */}
      <div className="analytics-section">
        <h3>Top Performing Posts</h3>
        <div className="top-posts-list">
          {topPosts.map((post, i) => {
            const platInfo = PLATFORMS.find((p) => p.key === post.platform);
            return (
              <div key={i} className="top-post-row">
                <span className="top-post-rank">{i + 1}</span>
                <span className="top-post-platform-chip" style={{ background: platInfo?.color || 'var(--blue)' }}>
                  {platInfo?.label?.slice(0, 2).toUpperCase() || '??'}
                </span>
                <span className="top-post-copy">{post.copy?.slice(0, 90) || ''}{post.copy?.length > 90 ? '...' : ''}</span>
                <span className="top-post-engagement">{post.engagement}%</span>
                <span className="top-post-date">{formatDate(post.date)}</span>
              </div>
            );
          })}
        </div>
      </div>

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

      {/* Competitor tracker */}
      <div className="analytics-section">
        <div className="section-header-row">
          <h3>Industry and Competitor Watch</h3>
          <button className="analytics-btn" onClick={() => setShowAddCompetitor(true)}>+ Add</button>
        </div>
        <p className="analytics-hint">Competitor follower counts are entered manually. Platform APIs do not allow access to competitor data.</p>

        {competitors.length === 0 && !showAddCompetitor ? (
          <p className="analytics-empty">No competitors tracked yet. Add organizations like NIB, NAEPB, or other mission-driven orgs.</p>
        ) : (
          <div className="competitor-grid">
            {competitors.map((c) => (
              <CompetitorCard key={c.id} competitor={c} onUpdate={updateCompetitor} onRemove={removeCompetitor} />
            ))}
          </div>
        )}

        {showAddCompetitor && (
          <AddCompetitorForm
            onSave={(comp) => { addCompetitor(comp); setShowAddCompetitor(false); }}
            onCancel={() => setShowAddCompetitor(false)}
          />
        )}
      </div>
    </div>
  );
}

function CompetitorCard({ competitor, onUpdate, onRemove }) {
  const c = competitor;
  const [editing, setEditing] = useState(false);
  const [followers, setFollowers] = useState(c.followers || {});
  const [lastChecked, setLastChecked] = useState(c.lastChecked || '');
  const [notes, setNotes] = useState(c.notes || '');

  function save() {
    onUpdate(c.id, { followers, lastChecked, notes });
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="competitor-card editing">
        <span className="competitor-name">{c.name}</span>
        <div className="competitor-edit-fields">
          {PLATFORMS.map((p) => (
            <label key={p.key} className="comp-field">
              <span className="comp-field-label">{p.label}</span>
              <input type="number" value={followers[p.key] || ''} onChange={(e) => setFollowers({ ...followers, [p.key]: e.target.value ? parseInt(e.target.value) : '' })} placeholder="0" />
            </label>
          ))}
          <label className="comp-field">
            <span className="comp-field-label">Last checked</span>
            <input type="date" value={lastChecked} onChange={(e) => setLastChecked(e.target.value)} />
          </label>
          <label className="comp-field full">
            <span className="comp-field-label">Notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </label>
        </div>
        <div className="competitor-actions">
          <button className="analytics-btn primary" onClick={save}>Save</button>
          <button className="analytics-btn" onClick={() => setEditing(false)}>Cancel</button>
          <button className="analytics-btn danger" onClick={() => onRemove(c.id)}>Delete</button>
        </div>
      </div>
    );
  }

  return (
    <div className="competitor-card" onClick={() => setEditing(true)}>
      <span className="competitor-name">{c.name}</span>
      <div className="competitor-followers">
        {PLATFORMS.map((p) => (
          <span key={p.key} className="comp-follower">
            <span className="comp-follower-label">{p.label}</span>
            <span className="comp-follower-value">{c.followers?.[p.key]?.toLocaleString() || '--'}</span>
          </span>
        ))}
      </div>
      <span className="competitor-checked">{c.lastChecked ? `Checked ${formatDate(c.lastChecked)}` : 'Never checked'}</span>
      {c.notes && <span className="competitor-notes">{c.notes}</span>}
    </div>
  );
}

function AddCompetitorForm({ onSave, onCancel }) {
  const [name, setName] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim() });
  }

  return (
    <form className="add-competitor-form" onSubmit={handleSubmit}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Organization name (e.g. NIB, NAEPB)" autoFocus required />
      <button type="submit" className="analytics-btn primary">Add</button>
      <button type="button" className="analytics-btn" onClick={onCancel}>Cancel</button>
    </form>
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

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
