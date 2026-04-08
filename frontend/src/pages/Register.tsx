import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../index.css';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];
    if (pwd.length < 8) {
      errors.push('Adgangskoden skal være mindst 8 tegn');
    }
    if (!/[A-Z]/.test(pwd)) {
      errors.push('Adgangskoden skal indeholde mindst ét stort bogstav');
    }
    if (!/[a-z]/.test(pwd)) {
      errors.push('Adgangskoden skal indeholde mindst ét lille bogstav');
    }
    if (!/[0-9]/.test(pwd)) {
      errors.push('Adgangskoden skal indeholde mindst ét tal');
    }
    return errors;
  };

  const handlePasswordChange = (pwd: string) => {
    setPassword(pwd);
    setPasswordErrors(validatePassword(pwd));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate password
    const errors = validatePassword(password);
    if (errors.length > 0) {
      setPasswordErrors(errors);
      return;
    }

    // Check password match
    if (password !== confirmPassword) {
      setError('Adgangskoderne matcher ikke');
      return;
    }

    // Validate display name
    if (displayName.trim().length < 2) {
      setError('Visningsnavn skal være mindst 2 tegn');
      return;
    }

    setLoading(true);

    try {
      await register({ email, password, displayName: displayName.trim() });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrering mislykkedes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Opret konto</h1>
        <p className="auth-subtitle">Kom i gang med Rygtet Går!</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="displayName" className="form-label">
              Visningsnavn
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="form-input"
              required
              minLength={2}
              maxLength={50}
              autoFocus
              disabled={loading}
              placeholder="Dit navn i spillet"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Adgangskode
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              className="form-input"
              required
              autoComplete="new-password"
              minLength={8}
              disabled={loading}
            />
            {passwordErrors.length > 0 && (
              <ul className="password-requirements" role="alert">
                {passwordErrors.map((err, i) => (
                  <li key={i} className="password-requirement-error">
                    {err}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Bekræft adgangskode
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-input"
              required
              autoComplete="new-password"
              minLength={8}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary auth-submit"
            disabled={loading || passwordErrors.length > 0}
          >
            {loading ? 'Opretter konto...' : 'Opret konto'}
          </button>
        </form>

        <p className="auth-footer">
          Har du allerede en konto?{' '}
          <Link to="/login" className="auth-link">
            Log ind
          </Link>
        </p>

        <p className="auth-footer">
          <Link to="/" className="auth-link">
            Tilbage til forsiden
          </Link>
        </p>
      </div>
    </div>
  );
}
