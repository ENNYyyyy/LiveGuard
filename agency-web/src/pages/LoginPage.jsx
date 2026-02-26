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
    if (!email.trim()) nextFieldErrors.email = "Email is required";
    if (!password.trim()) nextFieldErrors.password = "Password is required";
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length) return;

    setError('');
    const result = await login({ email: email.trim(), password });
    if (!result.ok) setError(result.message);
  };

  return (
    <div className="login-page">
      <div className="login-glow" aria-hidden />

      <form className="login-card" onSubmit={handleSubmit} noValidate>
        <div className="login-brand">
          <div className="login-brand-icon" aria-hidden>🛡</div>
          <div>
            <div className="login-brand-name">LiveGuard</div>
            <div className="login-brand-sub">Agency Console</div>
          </div>
        </div>

        <h1>Login here!</h1>
        <p className="subtitle">Welcome back. Your safety is our priority.</p>

        {error ? <div className="error-banner">{error}</div> : null}

        <label htmlFor="email">Email / Phone</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@email.com"
          autoComplete="email"
        />
        {fieldErrors.email ? <span className="field-error">{fieldErrors.email}</span> : null}

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password required"
          autoComplete="current-password"
        />
        {fieldErrors.password ? <span className="field-error">{fieldErrors.password}</span> : null}

        <div className="login-forgot">Forgotten Password?</div>

        <button className="login-btn" disabled={loading} type="submit">
          {loading ? 'Signing in…' : 'Login'}
        </button>

        <p className="login-footer">
          This interface is for authorised agency accounts only.
          Requests include <code style={{ fontSize: 11, background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 4 }}>client_type=AGENCY</code>.
        </p>
      </form>
    </div>
  );
};

export default LoginPage;
