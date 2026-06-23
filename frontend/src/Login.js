import React, { useState } from 'react';
import axios from 'axios';

const API = 'http://127.0.0.1:8000';

function Login({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload = mode === 'login'
        ? { email, password }
        : { email, username, password };
      const res = await axios.post(`${API}${endpoint}`, payload);
      if (res.data.error) {
        setError(res.data.error);
      } else {
        localStorage.setItem('rag_token', res.data.token);
        localStorage.setItem('rag_user', JSON.stringify({
          email: res.data.email,
          username: res.data.username
        }));
        onLogin(res.data);
      }
    } catch {
      setError('Something went wrong. Try again.');
    }
    setLoading(false);
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0d1117',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        background: '#161b22',
        border: '1px solid #30363d',
        borderRadius: 16,
        padding: 40,
        width: '100%',
        maxWidth: 400,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, background: '#6e56cf',
            borderRadius: 14, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 28, margin: '0 auto 12px'
          }}>🧠</div>
          <h1 style={{ color: '#e6edf3', fontSize: 22, fontWeight: 700, margin: 0 }}>
            RAG Platform
          </h1>
          <p style={{ color: '#8b949e', fontSize: 13, marginTop: 4 }}>
            Document Intelligence
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', background: '#21262d',
          borderRadius: 8, padding: 4, marginBottom: 24
        }}>
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); }}
              style={{
                flex: 1, padding: '8px', border: 'none', borderRadius: 6,
                background: mode === m ? '#6e56cf' : 'transparent',
                color: mode === m ? 'white' : '#8b949e',
                cursor: 'pointer', fontSize: 13, fontWeight: 500,
                fontFamily: 'Inter, sans-serif', transition: 'all 0.2s'
              }}>
              {m === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={inputStyle}
          />
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={inputStyle}
            />
          )}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={inputStyle}
          />
        </div>

        {error && (
          <div style={{
            background: '#f8514922', color: '#f85149',
            borderRadius: 8, padding: '10px 14px',
            fontSize: 13, marginTop: 12
          }}>{error}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', padding: 12, marginTop: 20,
            background: '#6e56cf', color: 'white', border: 'none',
            borderRadius: 10, fontSize: 14, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            fontFamily: 'Inter, sans-serif'
          }}>
          {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>

        <p style={{ color: '#8b949e', fontSize: 12, textAlign: 'center', marginTop: 20 }}>
          {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
          <span
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            style={{ color: '#6e56cf', cursor: 'pointer' }}>
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </span>
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  padding: '11px 14px',
  background: '#21262d',
  border: '1px solid #30363d',
  borderRadius: 8,
  color: '#e6edf3',
  fontSize: 14,
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box'
};

export default Login;