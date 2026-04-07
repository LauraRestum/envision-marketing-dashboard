import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { compare } from 'bcryptjs';
import './LoginScreen.css';

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
      const configDoc = await getDoc(doc(db, 'config', 'app'));
      if (!configDoc.exists()) {
        setError('Dashboard not configured yet. Contact your administrator.');
        setLoading(false);
        return;
      }

      const { passwordHash } = configDoc.data();
      const match = await compare(password, passwordHash);

      if (match) {
        login();
      } else {
        setError('Incorrect password. Try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Unable to connect. Check your network and try again.');
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
