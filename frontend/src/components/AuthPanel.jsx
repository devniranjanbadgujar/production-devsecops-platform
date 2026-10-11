import { useState } from 'react';
import { authenticateUser } from '../services/authService';

export default function AuthPanel({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const result = await authenticateUser(mode, {
        ...(mode === 'register' ? { name } : {}),
        email,
        password,
      });

      sessionStorage.setItem('authToken', result.token);
      onAuthenticated(result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ maxWidth: 420, margin: '40px auto' }}>
      <h2>{mode === 'login' ? 'Sign in' : 'Create your account'}</h2>

      <form onSubmit={handleSubmit}>
        {mode === 'register' && (
          <input
            placeholder="Full name"
            aria-label="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
          />
        )}
        <input
          type="email"
          placeholder="Email"
          aria-label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password (minimum 8 characters)"
          aria-label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          maxLength={72}
          required
        />
        <button type="submit" disabled={busy}>
          {busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Register'}
        </button>
      </form>

      {error && <p style={{ color: '#dc2626' }}>{error}</p>}

      <button
        type="button"
        onClick={() => {
          setMode(mode === 'login' ? 'register' : 'login');
          setError('');
        }}
      >
        {mode === 'login'
          ? 'Create an account'
          : 'Already have an account? Sign in'}
      </button>
    </section>
  );
}