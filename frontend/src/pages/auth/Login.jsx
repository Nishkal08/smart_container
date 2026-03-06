import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { gsap } from 'gsap';
import { ContainerLogo } from '../../components/ui/Logo';

const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const login = useAuthStore(s => s.login);
  const navigate = useNavigate();
  const cardRef = useRef(null);

  useEffect(() => {
    gsap.fromTo(cardRef.current,
      { opacity: 0, y: 24, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'power3.out' }
    );
  }, []);

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email is required';
    else if (!isValidEmail(form.email)) e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    return e;
  };

  const handleChange = (field) => (e) => {
    setForm(p => ({ ...p, [field]: e.target.value }));
    if (errors[field]) setErrors(p => ({ ...p, [field]: '' }));
    if (serverError) setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setServerError('');
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.user, res.data.accessToken, res.data.refreshToken);
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.error?.message ?? err.response?.data?.message ?? 'Invalid email or password';
      setServerError(msg);
      gsap.fromTo(cardRef.current, { x: -8 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.4)' });
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (field) =>
    `w-full h-9 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-shadow ${errors[field] ? 'border-red-500 focus:ring-red-500/30' : 'border-input'}`;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col flex-1 relative bg-primary p-12 text-primary-foreground justify-between overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_hsl(0_0%_100%/0.12),_transparent_60%)]" />
        <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full bg-white/5 translate-x-1/3 translate-y-1/4 blur-2xl" />
        <div className="absolute top-1/2 left-0 w-48 h-48 rounded-full bg-white/5 -translate-x-1/2 -translate-y-1/2 blur-2xl" />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: 'linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <ContainerLogo className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-base tracking-tight">SmartContainer</span>
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
            AI-Powered Risk Intelligence
          </div>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Every container,<br />every risk — visible.
          </h2>
          <p className="text-primary-foreground/70 text-sm leading-relaxed">
            Detect anomalies. Score risk in milliseconds.<br />Act before threats reach the port.
          </p>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-primary-foreground/60">
          <ShieldCheck className="w-3.5 h-3.5" />
          Trusted by customs analysts worldwide
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-16 relative overflow-hidden bg-background">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-primary/5 blur-3xl translate-y-1/2 -translate-x-1/4" />
          <div className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]" style={{
            backgroundImage: 'radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }} />
        </div>

        <div ref={cardRef} className="w-full max-w-sm relative z-10">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <ContainerLogo className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">SmartContainer</span>
          </div>

          {/* Card */}
          <div className="bg-card/80 backdrop-blur-sm border border-border/60 rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/30 p-8">
            <div className="mb-7">
              <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
              <p className="text-sm text-muted-foreground mt-1">Sign in to your account to continue</p>
            </div>

            {serverError && (
              <div className="mb-5 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
                <p className="text-xs text-red-600 font-medium">{serverError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Email</label>
              <input
                type="email" autoFocus
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange('email')}
                className={inputCls('email')}
              />
              {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange('password')}
                  className={`${inputCls('password')} pr-9`}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-0.5">{errors.password}</p>}
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary font-medium hover:underline">Create one</Link>
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}
