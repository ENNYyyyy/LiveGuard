import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextFieldErrors = {};
    if (!email.trim()) nextFieldErrors.email = 'Required';
    if (!password.trim()) nextFieldErrors.password = 'Required';
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length) return;

    setError('');
    const result = await login({ email: email.trim(), password });
    if (!result.ok) setError(result.message);
  };

  return (
    <div className="auth-page">
      <div className="decor-circle" aria-hidden />

      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <div className="logo-row">
          <div className="logo-icon" aria-hidden>🛡</div>
          <div>
            <div className="logo-title">LiveGuard</div>
            <div className="logo-subtitle">Admin Console</div>
          </div>
        </div>

        <h1>Admin Login</h1>
        <p>Sign in to manage the emergency alert system.</p>

        {error ? <div className="error-banner">{error}</div> : null}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@example.com"
          autoComplete="email"
        />
        {fieldErrors.email ? <span className="field-error">{fieldErrors.email}</span> : null}

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
        />
        {fieldErrors.password ? <span className="field-error">{fieldErrors.password}</span> : null}

        <button className="primary-btn" disabled={loading} type="submit">
          {loading ? 'Signing in…' : 'Login'}
        </button>

        <small className="hint-line">
          Requires a Django staff or SystemAdmin account. Regular civilian and agency accounts will be denied.
        </small>
      </form>
    </div>
  );
};

export default LoginPage;
