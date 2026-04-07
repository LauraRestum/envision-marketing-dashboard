import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './LoginScreen.css';

const EXPECTED_HASH = import.meta.env.VITE_DASHBOARD_PASSWORD_HASH
  || 'f71bf986627268aaf7afdf3a96e6029c6b8f639e6f7fcf0aba3bd75746f035b4';

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function LoginScreen() {
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError('');

    try {
      const inputHash = await sha256(password);

      if (inputHash === EXPECTED_HASH) {
        login();
      } else {
        setError('Incorrect password. Try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Unable to verify password. Try again.');
    }

    setLoading(false);
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="4" fill="#003087" />
            <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
              fill="#78BE21" fontFamily="Montserrat" fontWeight="800" fontSize="22">E</text>
          </svg>
          <h1>Marketing Dashboard</h1>
        </div>
        <p className="login-subtitle">Envision Inc. internal operations hub</p>

        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter team password"
            autoFocus
            disabled={loading}
          />
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Checking...' : 'Sign In'}
          </button>
          {error && <p className="login-error">{error}</p>}
        </form>

        <p className="login-note">
          This dashboard is for Envision marketing team use only.
        </p>
      </div>
    </div>
  );
}
