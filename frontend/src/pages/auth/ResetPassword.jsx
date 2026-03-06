import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import api from '../../lib/api';
import { ContainerLogo } from '../../components/ui/Logo';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const isValidPassword = (v) =>
    v.length >= 8 && /[A-Z]/.test(v) && /[0-9]/.test(v);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidPassword(password)) {
      setError('Password must be ≥8 chars, include an uppercase letter and a number.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm bg-card/80 backdrop-blur-sm border border-border/60 rounded-2xl shadow-xl p-8 text-center animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-lg font-bold mb-2">Invalid reset link</h2>
          <p className="text-sm text-muted-foreground mb-5">This link is missing a reset token.</p>
          <Link to="/forgot-password" className="text-sm text-primary font-medium hover:underline">Request a new link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-primary/5 blur-3xl translate-y-1/2 -translate-x-1/4" />
        <div className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }} />
      </div>

      <div className="w-full max-w-sm relative z-10 animate-fade-in">
        <div className="bg-card/80 backdrop-blur-sm border border-border/60 rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/30 p-8">
          <div className="flex items-center gap-2.5 mb-7">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <ContainerLogo className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">SmartContainer</span>
          </div>

          {done ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold mb-2">Password updated!</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Your password has been reset successfully. You can now sign in.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Go to Sign In
              </button>
            </div>
          ) : (
            <>
              <div className="mb-7">
                <h1 className="text-2xl font-bold tracking-tight">Set new password</h1>
                <p className="text-sm text-muted-foreground mt-1">Choose a strong password for your account</p>
              </div>

              {error && (
                <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
                  <p className="text-xs text-red-600 font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">New password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      required autoFocus
                      placeholder="••••••••"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 pr-9 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-shadow"
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Must be ≥8 chars with uppercase and a number</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Confirm password</label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setError(''); }}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-shadow"
                  />
                </div>

                <button
                  type="submit" disabled={loading}
                  className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {loading ? 'Resetting…' : 'Reset password'}
                </button>
              </form>

              <Link to="/login" className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-3 h-3" /> Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
