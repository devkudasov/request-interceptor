import { useState, useCallback } from 'react';
import { Button } from '@/ui/common/Button';
import { Input } from '@/ui/common/Input';
import { useAuthStore } from '@/features/auth';

type AuthMode = 'login' | 'register';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthForm() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const { loading, error, login, register, loginWithGoogle, loginWithGithub, clearError } =
    useAuthStore();

  const validateEmail = useCallback(() => {
    if (email && !EMAIL_REGEX.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  }, [email]);

  const validatePassword = useCallback(() => {
    if (password && password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return false;
    }
    setPasswordError('');
    return true;
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailValid = validateEmail();
    const passwordValid = validatePassword();
    if (!emailValid || !passwordValid || !email || !password) return;

    if (mode === 'login') {
      await login(email, password);
    } else {
      await register(email, password);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    clearError();
    setEmailError('');
    setPasswordError('');
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <h2 className="text-xl font-semibold text-content-primary mb-lg text-center">
        {mode === 'login' ? 'Sign In' : 'Create Account'}
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-md">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={validateEmail}
          error={emailError}
          autoComplete="email"
        />

        <Input
          label="Password"
          type="password"
          placeholder="Minimum 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={validatePassword}
          error={passwordError}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />

        {error && (
          <div className="text-sm text-status-error bg-status-error/10 rounded-md px-md py-sm">
            {error}
          </div>
        )}

        <Button type="submit" fullWidth loading={loading} disabled={!email || !password}>
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </Button>
      </form>

      <div className="flex items-center gap-sm my-md">
        <div className="flex-1 border-t border-border" />
        <span className="text-xs text-content-muted">or</span>
        <div className="flex-1 border-t border-border" />
      </div>

      <div className="flex flex-col gap-sm">
        <Button
          variant="secondary"
          fullWidth
          onClick={loginWithGoogle}
          disabled={loading}
        >
          Continue with Google
        </Button>
        <Button
          variant="secondary"
          fullWidth
          onClick={loginWithGithub}
          disabled={loading}
        >
          Continue with GitHub
        </Button>
      </div>

      <p className="text-center text-sm text-content-secondary mt-md">
        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
        <button
          type="button"
          onClick={toggleMode}
          className="text-primary hover:underline font-medium"
        >
          {mode === 'login' ? 'Register' : 'Sign In'}
        </button>
      </p>

      <p className="text-center text-xs text-content-muted mt-sm">
        Free features work without an account
      </p>
    </div>
  );
}
