import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { hash, compare } from 'bcryptjs';
import { useAuth } from '../context/AuthContext';
import './SettingsPage.css';

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
      const configDoc = await getDoc(doc(db, 'config', 'app'));
      if (!configDoc.exists()) {
        setPwError('Dashboard config not found.');
        setPwSaving(false);
        return;
      }

      const { passwordHash } = configDoc.data();
      const valid = await compare(currentPw, passwordHash);
      if (!valid) {
        setPwError('Current password is incorrect.');
        setPwSaving(false);
        return;
      }

      const newHash = await hash(newPw, 10);
      await updateDoc(doc(db, 'config', 'app'), { passwordHash: newHash });
      setPwMsg('Password updated. All sessions will be signed out.');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setTimeout(() => logout(), 2000);
    } catch (err) {
      setPwError('Failed to update password. Try again.');
    }
    setPwSaving(false);
  }

  async function checkIntegrations() {
    const statuses = {};
    for (const integration of INTEGRATIONS) {
      try {
        const cacheDoc = await getDoc(doc(db, 'analytics_cache', integration.key));
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
          <button type="submit" className="settings-btn" disabled={teamSaving}>
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
