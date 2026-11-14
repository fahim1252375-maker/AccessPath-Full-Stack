import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAppStore } from '../../store/useAppStore.ts';
import { Button, Card, FormField, Input } from '../../components/ui/Primitives.tsx';
import type { AccessibilityPreferences, UserDTO } from '../../../../shared/types.ts';

const DEMO_ACCOUNTS = [
  { role: 'Student', email: 'student.demo@accesspath.example.edu' },
  { role: 'Volunteer', email: 'volunteer.demo@accesspath.example.edu' },
  { role: 'Moderator', email: 'moderator.demo@accesspath.example.edu' },
  { role: 'Campus Admin', email: 'admin.demo@accesspath.example.edu' },
  { role: 'Super Admin', email: 'superadmin.demo@accesspath.example.edu' },
];

export const SignInPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth, setAccessibilityProfile } = useAppStore();
  const [email, setEmail] = useState('student.demo@accesspath.example.edu');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<{ user: UserDTO; token: string }>('/auth/login', {
        email,
        password,
      });
      setAuth(res.user, res.token);
      try {
        const me = await api.get<{ accessibilityProfile?: AccessibilityPreferences }>('/auth/me');
        if (me.accessibilityProfile) setAccessibilityProfile(me.accessibilityProfile);
      } catch {
        // optional
      }
      if (res.user.role === 'super_admin') navigate('/app/super-admin');
      else if (res.user.role === 'campus_admin' || res.user.role === 'moderator') navigate('/app/admin');
      else if (res.user.role === 'volunteer') navigate('/app/volunteer');
      else navigate('/app');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 grid md:grid-cols-12 gap-8 items-start">
      <Card className="md:col-span-7 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ap-text)]">Sign In to AccessPath</h1>
          <p className="text-sm text-[var(--ap-muted)] mt-1">
            Access personalized route planning, barrier reporting, and verification workflows.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-[var(--ap-danger-bg)] border border-[var(--ap-danger-border)] text-sm text-[var(--ap-danger)]" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Email Address" htmlFor="signin-email" required>
            <Input
              id="signin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </FormField>

          <FormField label="Password" htmlFor="signin-password" required>
            <Input
              id="signin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </FormField>

          <div className="flex items-center justify-between text-xs">
            <Link to="/auth/forgot-password" className="text-[#18C6AD] hover:underline">
              Forgot password?
            </Link>
            <Link to="/auth/signup" className="text-[#32A7D9] font-semibold hover:underline">
              Create student account
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </Card>

      <Card className="md:col-span-5 space-y-4 bg-[var(--ap-surface-2)]">
        <div>
          <h2 className="text-base font-bold text-[var(--ap-text)]">Demo Environment Accounts</h2>
          <p className="text-xs text-[var(--ap-muted)] mt-1">
            Select a synthetic role email below to prefill, then fill or enter the local dev seed password (<code className="font-mono text-[#18C6AD]">AccessPathDemo!2026</code>).
          </p>
        </div>
        <div className="space-y-2">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => setEmail(acc.email)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                email === acc.email
                  ? 'border-[#18C6AD] bg-[var(--ap-surface)] font-semibold text-[#18C6AD]'
                  : 'border-[var(--ap-border)] bg-[var(--ap-surface)] hover:border-[#32A7D9]/60 text-[var(--ap-text)]'
              }`}
            >
              <div className="font-bold">{acc.role}</div>
              <div className="text-[var(--ap-muted)] truncate">{acc.email}</div>
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setPassword('AccessPathDemo!2026')}
        >
          Fill Local Demo Seed Password
        </Button>
      </Card>
    </div>
  );
};

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAppStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consentAnalytics, setConsentAnalytics] = useState(true);
  const [consentLocation, setConsentLocation] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<{ user: UserDTO; token: string }>('/auth/register', {
        name,
        email,
        password,
        campusId: 'campus_demo_north',
        consentAnalytics,
        consentLocation,
      });
      setAuth(res.user, res.token);
      navigate('/app/accessibility-profile');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-12">
      <Card className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ap-text)]">Create Student Account</h1>
          <p className="text-sm text-[var(--ap-muted)] mt-1">
            No medical diagnosis is ever requested. Configure only functional route preferences.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-[var(--ap-danger-bg)] border border-[var(--ap-danger-border)] text-sm text-[var(--ap-danger)]" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Full Name" htmlFor="signup-name" required>
            <Input id="signup-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          </FormField>
          <FormField label="Email Address" htmlFor="signup-email" required>
            <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </FormField>
          <FormField label="Password" htmlFor="signup-pass" hint="Minimum 8 characters" required>
            <Input id="signup-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </FormField>

          <div className="space-y-2 pt-1 text-xs text-[var(--ap-muted)]">
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={consentAnalytics} onChange={(e) => setConsentAnalytics(e.target.checked)} className="mt-0.5 accent-[#18C6AD]" />
              <span>Allow anonymized campus accessibility improvement analytics</span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={consentLocation} onChange={(e) => setConsentLocation(e.target.checked)} className="mt-0.5 accent-[#18C6AD]" />
              <span>Allow browser geolocation during active map sessions (optional)</span>
            </label>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Register Account'}
          </Button>
        </form>
        <p className="text-xs text-center text-[var(--ap-muted)]">
          Already registered? <Link to="/auth/signin" className="text-[#18C6AD] font-semibold underline">Sign in</Link>
        </p>
      </Card>
    </div>
  );
};

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post<{ message: string }>('/auth/forgot-password', { email });
    setMessage(res.message);
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-12">
      <Card className="space-y-4">
        <h1 className="text-xl font-bold text-[var(--ap-text)]">Forgot Password</h1>
        {message && (
          <div className="p-3 rounded-lg bg-[var(--ap-surface-2)] border border-[#18C6AD]/40 text-xs text-[#18C6AD]">
            {message}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Account Email" htmlFor="fp-email" required>
            <Input id="fp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </FormField>
          <Button type="submit" className="w-full">Request Password Reset</Button>
        </form>
        <Link to="/auth/reset-password" className="block text-xs text-[#18C6AD] underline text-center">
          Have a reset token? Reset password here
        </Link>
      </Card>
    </div>
  );
};

export const ResetPasswordPage: React.FC = () => {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      setStatus('Password updated. All active sessions revoked; you may now sign in.');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-12">
      <Card className="space-y-4">
        <h1 className="text-xl font-bold text-[var(--ap-text)]">Reset Password</h1>
        {status && <p className="text-xs text-[#18C6AD] font-semibold">{status}</p>}
        {error && <p className="text-xs text-[var(--ap-danger)]" role="alert">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Reset Token" htmlFor="rp-token" required>
            <Input id="rp-token" value={token} onChange={(e) => setToken(e.target.value)} required />
          </FormField>
          <FormField label="New Password" htmlFor="rp-pass" required>
            <Input id="rp-pass" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
          </FormField>
          <Button type="submit" className="w-full">Update Password</Button>
        </form>
      </Card>
    </div>
  );
};

export const VerifyEmailPage: React.FC = () => {
  const [token, setToken] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/verify-email', { token });
      setResult('Email verified successfully.');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-12">
      <Card className="space-y-4">
        <h1 className="text-xl font-bold text-[var(--ap-text)]">Verify Email Address</h1>
        {result && <p className="text-xs text-[#18C6AD] font-semibold">{result}</p>}
        {error && <p className="text-xs text-[var(--ap-danger)]" role="alert">{error}</p>}
        <form onSubmit={handleVerify} className="space-y-4">
          <FormField label="Verification Token" htmlFor="ve-token" required>
            <Input id="ve-token" value={token} onChange={(e) => setToken(e.target.value)} required />
          </FormField>
          <Button type="submit" className="w-full">Verify Email</Button>
        </form>
      </Card>
    </div>
  );
};

export const AccessDeniedPage: React.FC = () => (
  <div className="max-w-lg mx-auto px-4 py-16">
    <Card className="text-center space-y-4">
      <ShieldAlert className="w-10 h-10 text-[var(--ap-danger)] mx-auto" />
      <h1 className="text-2xl font-bold text-[var(--ap-text)]">Access Denied (403)</h1>
      <p className="text-sm text-[var(--ap-muted)]">
        Your current account role does not have permission to view this section. Role checks are enforced on both the server API and client routes.
      </p>
      <div className="flex justify-center gap-3">
        <Link to="/app"><Button>Return to Dashboard</Button></Link>
        <Link to="/auth/signin"><Button variant="outline">Switch Account</Button></Link>
      </div>
    </Card>
  </div>
);
