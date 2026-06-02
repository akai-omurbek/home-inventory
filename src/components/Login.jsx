// src/components/Login.jsx
import { useState } from 'react';

export default function Login({ onSignIn }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true); setError('');
    try {
      await onSignIn(password.trim());
    } catch (err) {
      setError(err.message === 'UNAUTHORIZED' ? 'Wrong password. Try again.' : 'Could not connect. Check your Script URL in config.js.');
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">🏠</div>
        <h1>Home Inventory</h1>
        <p>Enter the household password to continue.</p>
        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <input
            className="form-input"
            type="password"
            placeholder="Household password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            autoComplete="current-password"
          />
          {error && <p style={{ color:'var(--danger)', fontSize:'0.88rem', margin:0 }}>{error}</p>}
          <button className="btn btn-primary btn-full" type="submit" disabled={loading || !password}>
            {loading ? 'Checking…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}
