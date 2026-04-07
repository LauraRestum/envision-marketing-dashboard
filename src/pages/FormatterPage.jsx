import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import usePosts from '../hooks/usePosts';
import './FormatterPage.css';

const PLATFORMS = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'linkedin', label: 'LinkedIn' },
];

export default function FormatterPage() {
  const navigate = useNavigate();
  const { addPost } = usePosts();
  const [content, setContent] = useState('');
  const [context, setContext] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function togglePlatform(key) {
    setSelectedPlatforms((prev) => prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]);
  }

  function selectAll() {
    setSelectedPlatforms(PLATFORMS.map((p) => p.key));
  }

  async function handleGenerate() {
    if (!content.trim() || selectedPlatforms.length === 0) return;
    setLoading(true);
    setError('');
    setResults(null);

    try {
      const res = await fetch('/api/format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, context, platforms: selectedPlatforms }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.parseError) {
        setError('Generated content could not be parsed. Raw output shown below.');
        setResults({ _raw: data.raw });
      } else {
        setResults(data.results);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate. Try again.');
    }
    setLoading(false);
  }

  async function regeneratePlatform(platform) {
    setLoading(true);
    try {
      const res = await fetch('/api/format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, context, platforms: [platform] }),
      });
      const data = await res.json();
      if (data.results && data.results[platform]) {
        setResults((prev) => ({ ...prev, [platform]: data.results[platform] }));
      }
    } catch {
      // Silently fail on single regeneration
    }
    setLoading(false);
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
  }

  function sendToCalendar(platform, copy) {
    addPost({
      platforms: [platform],
      scheduledDate: '',
      copy,
      status: 'draft',
    });
    navigate('/calendar');
  }

  return (
    <div className="formatter-page">
      <h2>Social Formatter</h2>
      <p className="formatter-desc">
        Paste raw content, a story brief, or any source material. The AI will generate platform-specific versions.
      </p>

      <div className="formatter-input-section">
        <label className="formatter-field">
          <span className="formatter-field-label">Source Content</span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            placeholder="Paste your story, press release excerpt, Ensight copy, or just a brief..."
          />
        </label>

        <label className="formatter-field">
          <span className="formatter-field-label">Additional Context (optional)</span>
          <input
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Tone guidance, campaign name, key messages, things to include or avoid..."
          />
        </label>

        <div className="formatter-field">
          <span className="formatter-field-label">Platforms</span>
          <div className="formatter-platforms">
            {PLATFORMS.map((p) => (
              <button
                key={p.key}
                className={`plat-toggle ${selectedPlatforms.includes(p.key) ? 'active' : ''}`}
                onClick={() => togglePlatform(p.key)}
                title={`Toggle ${p.label}`}
              >
                {p.label}
              </button>
            ))}
            <button className="plat-toggle-all" onClick={selectAll} title="Select all platforms">Select All</button>
          </div>
        </div>

        <button
          className="formatter-generate-btn"
          onClick={handleGenerate}
          disabled={loading || !content.trim() || selectedPlatforms.length === 0}
          title="Generate platform-specific versions of your content"
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {error && <div className="formatter-error">{error}</div>}

      {results && !results._raw && (
        <div className="formatter-results">
          {Object.entries(results).map(([platform, copy]) => {
            const info = PLATFORMS.find((p) => p.key === platform);
            const wordCount = copy.split(/\s+/).filter(Boolean).length;
            const charCount = copy.length;
            return (
              <div key={platform} className="formatter-result-card">
                <div className="result-card-header">
                  <span className="result-platform-name">{info?.label || platform}</span>
                  <span className="result-counts">{wordCount} words, {charCount} chars</span>
                </div>
                <div className="result-copy">{copy}</div>
                <div className="result-actions">
                  <button className="result-btn" onClick={() => copyToClipboard(copy)} title="Copy this text to clipboard">Copy</button>
                  <button className="result-btn" onClick={() => regeneratePlatform(platform)} disabled={loading} title="Generate a new version for this platform">Regenerate</button>
                  <button className="result-btn primary" onClick={() => sendToCalendar(platform, copy)} title="Create a draft post in the Content Calendar">Send to Calendar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {results?._raw && (
        <div className="formatter-raw">
          <span className="formatter-field-label">Raw Output</span>
          <pre>{results._raw}</pre>
        </div>
      )}
    </div>
  );
}
