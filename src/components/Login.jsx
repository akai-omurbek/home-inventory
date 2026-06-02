// src/components/Login.jsx
import { useState, useEffect } from 'react';

const MAX_ATTEMPTS = 5;
const BASE_LOCKOUT_S = 30;

export default function Login({ onSignIn }) {
  const [password, setPassword]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [attempts, setAttempts]   = useState(0);
  const [lockoutEnd, setLockoutEnd] = useState(0);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!lockoutEnd) return;
    const tick = () => {
      const rem = Math.ceil((lockoutEnd - Date.now()) / 1000);
      if (rem <= 0) { setCountdown(0); setLockoutEnd(0); }
      else setCountdown(rem);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [lockoutEnd]);

  const isLocked = lockoutEnd > Date.now();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password.trim() || isLocked) return;
    setLoading(true); setError('');
    try {
      await onSignIn(password.trim());
      setAttempts(0);
    } catch (err) {
      const next = attempts + 1;
      setAttempts(next);
      if (next >= MAX_ATTEMPTS) {
        const secs = Math.min(BASE_LOCKOUT_S * Math.pow(2, Math.floor(next / MAX_ATTEMPTS) - 1), 300);
        setLockoutEnd(Date.now() + secs * 1000);
      }
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
            disabled={isLocked}
          />
          {error && <p style={{ color:'var(--danger)', fontSize:'0.88rem', margin:0 }}>{error}</p>}
          {isLocked && (
            <p style={{ color:'var(--warning)', fontSize:'0.88rem', margin:0 }}>
              Too many attempts. Try again in {countdown}s.
            </p>
          )}
          <button className="btn btn-primary btn-full" type="submit" disabled={loading || !password || isLocked}>
            {loading ? 'Checking…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}
