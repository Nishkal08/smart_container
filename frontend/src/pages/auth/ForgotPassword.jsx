import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft, CheckCircle, ExternalLink } from 'lucide-react';
import api from '../../lib/api';
import { ContainerLogo } from '../../components/ui/Logo';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setError('Email is required'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setResetUrl(res.data?.reset_url ?? null);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-primary/5 blur-3xl translate-y-1/2 -translate-x-1/4" />
        <div className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }} />
      </div>

      <div className="w-full max-w-sm relative z-10 animate-fade-in">
        {/* Card */}
        <div className="bg-card/80 backdrop-blur-sm border border-border/60 rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/30 p-8">
          <div className="flex items-center gap-2.5 mb-7">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <ContainerLogo className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">SmartContainer</span>
          </div>

          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold mb-2">Check your inbox</h2>
              <p className="text-sm text-muted-foreground mb-5">
                If <strong className="text-foreground">{email}</strong> is registered, a reset link has been sent.
              </p>

              {resetUrl && (
                <div className="mb-5 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-left">
                  <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1.5">
                    Dev mode — reset link
                  </p>
                  <a
                    href={resetUrl}
                    className="text-xs text-primary font-medium break-all flex items-start gap-1 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0 mt-0.5" />
                    {resetUrl}
                  </a>
                  <p className="text-[10px] text-muted-foreground mt-1.5">In production this would be sent via email.</p>
                </div>
              )}

              <Link to="/login" className="text-sm text-primary font-medium hover:underline">Back to sign in</Link>
            </div>
          ) : (
            <>
              <div className="mb-7">
                <h1 className="text-2xl font-bold tracking-tight">Reset password</h1>
                <p className="text-sm text-muted-foreground mt-1">Enter your email to receive a reset link</p>
              </div>

              {error && (
                <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
                  <p className="text-xs text-red-600 font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Email address</label>
                  <input
                    type="email" required autoFocus
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-shadow"
                  />
                </div>
                <button
                  type="submit" disabled={loading}
                  className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {loading ? 'Sending…' : 'Send reset link'}
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
