import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import './SettingsPage.css';

const EXPECTED_HASH = import.meta.env.VITE_DASHBOARD_PASSWORD_HASH
  || 'f71bf986627268aaf7afdf3a96e6029c6b8f639e6f7fcf0aba3bd75746f035b4';

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

const TEAM_MEMBERS = ['laura', 'arlo', 'madison'];
const DEFAULT_COLORS = { laura: '#003087', arlo: '#004bb5', madison: '#78BE21' };

const INTEGRATIONS = [
  { key: 'clickup', label: 'ClickUp', envVar: 'CLICKUP_API_TOKEN' },
  { key: 'facebook', label: 'Facebook', envVar: 'META_ACCESS_TOKEN' },
  { key: 'instagram', label: 'Instagram', envVar: 'META_ACCESS_TOKEN' },
  { key: 'tiktok', label: 'TikTok', envVar: 'TIKTOK_ACCESS_TOKEN' },
  { key: 'linkedin', label: 'LinkedIn', envVar: 'LINKEDIN_ACCESS_TOKEN' },
  { key: 'anthropic', label: 'Anthropic (AI)', envVar: 'ANTHROPIC_API_KEY' },
  { key: 'resend', label: 'Resend (Email)', envVar: 'RESEND_API_KEY' },
];

export default function SettingsPage() {
  const { logout } = useAuth();

  const [teamNames, setTeamNames] = useState({
    laura: 'Laura Restum',
    arlo: 'Arlo Hoover',
    madison: 'Madison Neuhaus',
  });
  const [teamColors, setTeamColors] = useState(DEFAULT_COLORS);
  const [teamSaving, setTeamSaving] = useState(false);
  const [teamMsg, setTeamMsg] = useState('');

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');

  const [integrationStatus, setIntegrationStatus] = useState({});

  useEffect(() => {
    loadTeamSettings();
    checkIntegrations();
  }, []);

  async function loadTeamSettings() {
    try {
      const teamDoc = await getDoc(doc(db, 'config', 'team'));
      if (teamDoc.exists()) {
        const data = teamDoc.data();
        if (data.names) setTeamNames(data.names);
        if (data.colors) setTeamColors(data.colors);
      }
    } catch (err) {
      console.warn('Failed to load team settings:', err);
    }
  }

  async function saveTeamSettings(e) {
    e.preventDefault();
    setTeamSaving(true);
    setTeamMsg('');
    try {
      await setDoc(doc(db, 'config', 'team'), {
        names: teamNames,
        colors: teamColors,
      }, { merge: true });
      setTeamMsg('Team settings saved.');
    } catch (err) {
      setTeamMsg('Failed to save. Try again.');
    }
    setTeamSaving(false);
  }

  async function changePassword(e) {
    e.preventDefault();
    setPwError('');
    setPwMsg('');

    if (newPw.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('New passwords do not match.');
      return;
    }

    setPwSaving(true);
    try {
      const currentHash = await sha256(currentPw);
      if (currentHash !== EXPECTED_HASH) {
        setPwError('Current password is incorrect.');
        setPwSaving(false);
        return;
      }

      const newHash = await sha256(newPw);
      setPwMsg(
        `Password hash generated. Update your Vercel env variable VITE_DASHBOARD_PASSWORD_HASH to:\n${newHash}\nThen redeploy.`
      );
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setTimeout(() => logout(), 4000);
    } catch (err) {
      setPwError('Failed to generate new password hash. Try again.');
    }
    setPwSaving(false);
  }

  async function checkIntegrations() {
    const statuses = {};

    // Load social IDs for platform-specific cache keys
    let socialIds = {};
    try {
      const idsDoc = await getDoc(doc(db, 'config', 'social_ids'));
      if (idsDoc.exists()) socialIds = idsDoc.data();
    } catch { /* ignore */ }

    for (const integration of INTEGRATIONS) {
      try {
        // Determine the cache key(s) to check
        let cacheCollection = 'analytics_cache';
        let cacheKey = integration.key;

        if (integration.key === 'clickup') {
          cacheCollection = 'clickup_cache';
          cacheKey = 'teams';
        } else if (integration.key === 'facebook' && socialIds.facebook_page_id) {
          cacheKey = `facebook_${socialIds.facebook_page_id}`;
        } else if (integration.key === 'instagram' && socialIds.instagram_page_id) {
          cacheKey = `instagram_${socialIds.instagram_page_id}`;
        } else if (integration.key === 'tiktok') {
          cacheKey = 'tiktok_profile';
        } else if (integration.key === 'linkedin' && socialIds.linkedin_org_id) {
          cacheKey = `linkedin_${socialIds.linkedin_org_id}`;
        }

        const cacheDoc = await getDoc(doc(db, cacheCollection, cacheKey));
        if (cacheDoc.exists() && cacheDoc.data().lastSynced) {
          statuses[integration.key] = {
            connected: true,
            lastSynced: cacheDoc.data().lastSynced,
          };
        } else {
          statuses[integration.key] = { connected: false, lastSynced: null };
        }
      } catch {
        statuses[integration.key] = { connected: false, lastSynced: null };
      }
    }
    setIntegrationStatus(statuses);
  }

  return (
    <div className="settings-page">
      <h2>Settings</h2>

      <section className="settings-section">
        <h3>Team</h3>
        <form onSubmit={saveTeamSettings} className="settings-form">
          {TEAM_MEMBERS.map((member) => (
            <div key={member} className="team-row">
              <div
                className="team-avatar"
                style={{ background: teamColors[member] }}
              >
                {(teamNames[member] || member)[0].toUpperCase()}
              </div>
              <div className="team-fields">
                <label className="settings-label">
                  Display name
                  <input
                    type="text"
                    value={teamNames[member] || ''}
                    onChange={(e) =>
                      setTeamNames({ ...teamNames, [member]: e.target.value })
                    }
                  />
                </label>
                <label className="settings-label">
                  Avatar color
                  <input
                    type="color"
                    value={teamColors[member] || DEFAULT_COLORS[member]}
                    onChange={(e) =>
                      setTeamColors({ ...teamColors, [member]: e.target.value })
                    }
                    className="color-input"
                  />
                </label>
              </div>
            </div>
          ))}
          <button type="submit" className="settings-btn" disabled={teamSaving} title="Save team display names and avatar colors">
            {teamSaving ? 'Saving...' : 'Save team settings'}
          </button>
          {teamMsg && <p className="settings-msg">{teamMsg}</p>}
        </form>
      </section>

      <section className="settings-section">
        <h3>Password</h3>
        <form onSubmit={changePassword} className="settings-form pw-form">
          <label className="settings-label">
            Current password
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              required
            />
          </label>
          <label className="settings-label">
            New password
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              required
              minLength={6}
            />
          </label>
          <label className="settings-label">
            Confirm new password
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="settings-btn" disabled={pwSaving}>
            {pwSaving ? 'Updating...' : 'Change password'}
          </button>
          {pwError && <p className="settings-error">{pwError}</p>}
          {pwMsg && <p className="settings-msg">{pwMsg}</p>}
        </form>
      </section>

      <section className="settings-section">
        <h3>API Connections</h3>
        <p className="settings-hint">
          API keys are stored in Vercel environment variables and cannot be changed from this page.
          This panel shows connection status only. To rotate keys, update them in the Vercel dashboard
          and redeploy.
        </p>
        <div className="integrations-grid">
          {INTEGRATIONS.map((integration) => {
            const status = integrationStatus[integration.key];
            const connected = status?.connected;
            return (
              <div key={integration.key} className="integration-card">
                <div className="integration-header">
                  <span className={`status-dot ${connected ? 'green' : 'red'}`} />
                  <span className="integration-name">{integration.label}</span>
                </div>
                <span className="integration-status">
                  {connected
                    ? `Last synced: ${new Date(status.lastSynced).toLocaleString()}`
                    : 'Not connected'}
                </span>
                <button
                  className="test-btn"
                  onClick={() => checkIntegrations()}
                  title={`Check if ${integration.label} API is connected and syncing`}
                >
                  Test connection
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="settings-section">
        <h3>Data</h3>
        <p className="settings-hint">
          Export a full JSON dump of all dashboard data, or manage archived items.
        </p>
        <div className="data-actions">
          <button className="settings-btn secondary" disabled>
            Export all data (coming soon)
          </button>
          <button className="settings-btn secondary" disabled>
            Manage archives (coming soon)
          </button>
        </div>
      </section>
    </div>
  );
}
