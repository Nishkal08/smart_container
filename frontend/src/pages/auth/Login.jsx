import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import { Eye, EyeOff, Loader2, ShieldCheck, ArrowRight, Zap, Globe, Lock } from 'lucide-react';
import { gsap } from 'gsap';
import { ContainerLogo } from '../../components/ui/Logo';

const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// Animated stat card for the left hero panel
function StatCard({ value, label, delay }) {
  const ref = useRef(null);
  useEffect(() => {
    gsap.fromTo(ref.current,
      { opacity: 0, y: 20, scale: 0.9 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, delay, ease: 'back.out(1.8)' }
    );
  }, [delay]);
  return (
    <div ref={ref} className="flex-1 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 p-4">
      <p className="text-xl font-black text-white">{value}</p>
      <p className="text-[11px] text-white/55 mt-0.5 font-medium">{label}</p>
    </div>
  );
}

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const login = useAuthStore(s => s.login);
  const navigate = useNavigate();

  const formPanelRef = useRef(null);
  const headingRef = useRef(null);
  const subRef = useRef(null);
  const formCardRef = useRef(null);
  const field1Ref = useRef(null);
  const field2Ref = useRef(null);
  const btnRef = useRef(null);
  const footerRef = useRef(null);
  const orb1Ref = useRef(null);
  const orb2Ref = useRef(null);
  const orb3Ref = useRef(null);
  const heroTextRef = useRef(null);
  const heroBadgeRef = useRef(null);
  const heroStatsRef = useRef(null);
  const heroFooterRef = useRef(null);

  useEffect(() => {
    // Background orbs float in
    gsap.fromTo([orb1Ref.current, orb2Ref.current, orb3Ref.current],
      { opacity: 0, scale: 0.5 },
      { opacity: 1, scale: 1, duration: 1.4, stagger: 0.15, ease: 'power2.out' }
    );

    // Left hero panel stagger
    const heroElements = [heroBadgeRef.current, heroTextRef.current, heroStatsRef.current, heroFooterRef.current].filter(Boolean);
    gsap.fromTo(heroElements,
      { opacity: 0, x: -28 },
      { opacity: 1, x: 0, duration: 0.65, stagger: 0.13, ease: 'power3.out', delay: 0.25 }
    );

    // Right panel � stagger form elements
    const tl = gsap.timeline({ delay: 0.1 });
    tl.fromTo(headingRef.current,
      { opacity: 0, y: 22 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
    )
    .fromTo(subRef.current,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
      '-=0.25'
    )
    .fromTo(formCardRef.current,
      { opacity: 0, y: 18, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'power3.out' },
      '-=0.2'
    )
    .fromTo([field1Ref.current, field2Ref.current],
      { opacity: 0, x: -14 },
      { opacity: 1, x: 0, stagger: 0.09, duration: 0.38, ease: 'power2.out' },
      '-=0.2'
    )
    .fromTo(btnRef.current,
      { opacity: 0, y: 10, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'back.out(1.7)' },
      '-=0.1'
    )
    .fromTo(footerRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.3 },
      '-=0.05'
    );
  }, []);

  // Subtle orb float animation
  useEffect(() => {
    if (orb1Ref.current) {
      gsap.to(orb1Ref.current, { y: -18, duration: 4, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 0 });
    }
    if (orb2Ref.current) {
      gsap.to(orb2Ref.current, { y: 12, duration: 5, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 1 });
    }
    if (orb3Ref.current) {
      gsap.to(orb3Ref.current, { y: -8, duration: 3.5, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 0.5 });
    }
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
      gsap.fromTo(formPanelRef.current, { x: -10 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (field) =>
    `w-full h-11 rounded-xl border bg-background/70 px-4 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 transition-all duration-200 ${
      errors[field]
        ? 'border-red-500/50 focus:ring-red-500/20 focus:border-red-500/60'
        : focusedField === field
          ? 'border-primary/50 focus:ring-primary/20 shadow-sm shadow-primary/10'
          : 'border-input hover:border-border/80'
    }`;

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      {/* --- LEFT: animated hero panel -------------------------------- */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden">
        {/* Gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(21_91%_44%)] via-primary to-[hsl(21_85%_36%)]" />

        {/* Animated orbs */}
        <div ref={orb1Ref} className="absolute top-[-15%] right-[-15%] w-[580px] h-[580px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 45%, transparent 70%)' }} />
        <div ref={orb2Ref} className="absolute bottom-[-20%] left-[-12%] w-[480px] h-[480px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(255,255,255,0.12) 0%, transparent 65%)' }} />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '52px 52px',
        }} />

        {/* Shimmer top border */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col p-10 text-white">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm border border-white/25 flex items-center justify-center shadow-md">
              <ContainerLogo className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-base tracking-tight">SmartContainer</span>
          </div>

          {/* Hero content */}
          <div className="flex-1 flex flex-col justify-center gap-7 max-w-[420px]">
            <div ref={heroBadgeRef} className="opacity-0">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-xs font-bold tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                AI-Powered Risk Intelligence
              </div>
            </div>

            <div ref={heroTextRef} className="opacity-0 space-y-3">
              <h2 className="text-[2.6rem] font-black leading-[1.1] tracking-tight">
                Every container,<br />every risk �<br />
                <span className="text-white/50">visible.</span>
              </h2>
              <p className="text-white/65 text-sm leading-relaxed">
                Detect anomalies. Score risk in under a second.<br />
                Act before threats reach the port.
              </p>
            </div>

            <div ref={heroStatsRef} className="opacity-0 flex gap-3">
              <StatCard value="98.4%" label="Accuracy" delay={0.6} />
              <StatCard value="< 1s" label="Score time" delay={0.72} />
              <StatCard value="50M+" label="Containers" delay={0.84} />
            </div>
          </div>

          {/* Footer */}
          <div ref={heroFooterRef} className="opacity-0 flex items-center gap-2 text-xs text-white/45 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            Bank-grade security � End-to-end encrypted
          </div>
        </div>
      </div>

      {/* --- RIGHT: form panel ---------------------------------------- */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-12 relative overflow-hidden bg-background">
        {/* Subtle bg orbs */}
        <div ref={orb3Ref} className="absolute top-[-8%] right-[-8%] w-[420px] h-[420px] rounded-full pointer-events-none opacity-0"
          style={{ background: 'radial-gradient(ellipse, hsl(var(--primary) / 0.07) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-8%] left-[-8%] w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, hsl(var(--primary) / 0.05) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 pointer-events-none opacity-[0.022] dark:opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }} />

        <div ref={formPanelRef} className="w-full max-w-[380px] relative z-10">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/30">
              <ContainerLogo className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-extrabold text-sm tracking-tight">SmartContainer</span>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h1 ref={headingRef} className="text-3xl font-black tracking-tight opacity-0">Welcome back</h1>
            <p ref={subRef} className="text-sm text-muted-foreground mt-2 opacity-0">Sign in to your risk intelligence dashboard</p>
          </div>

          {/* Glass card */}
          <div ref={formCardRef} className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl shadow-black/5 dark:shadow-black/30 p-7 opacity-0">
            {serverError && (
              <div className="mb-5 rounded-xl bg-red-500/8 border border-red-500/20 px-4 py-3 flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                <p className="text-xs text-red-600 dark:text-red-400 font-medium leading-relaxed">{serverError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Email field */}
              <div ref={field1Ref} className="space-y-1.5 opacity-0">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground/75 tracking-wide">
                  <Globe className="w-3 h-3 text-primary/70" /> Email address
                </label>
                <input
                  type="email" autoFocus
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange('email')}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  className={inputCls('email')}
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              {/* Password field */}
              <div ref={field2Ref} className="space-y-1.5 opacity-0">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground/75 tracking-wide">
                    <Lock className="w-3 h-3 text-primary/70" /> Password
                  </label>
                  <Link to="/forgot-password" className="text-xs text-primary hover:text-primary/70 transition-colors font-semibold">
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="��������"
                    value={form.password}
                    onChange={handleChange('password')}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className={`${inputCls('password')} pr-11`}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
              </div>

              {/* Submit button */}
              <button
                ref={btnRef}
                type="submit"
                disabled={loading}
                className="opacity-0 mt-2 w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-px active:translate-y-0 active:scale-[0.99]"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Signing in�</>
                ) : (
                  <>Sign in <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" /></>
                )}
              </button>
            </form>
          </div>

          <p ref={footerRef} className="mt-5 text-center text-xs text-muted-foreground opacity-0">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary font-bold hover:text-primary/80 transition-colors">
              Create one free ?
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
