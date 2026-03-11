import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import { Eye, EyeOff, Loader2, ShieldCheck, ArrowRight, Globe, Lock, User, CheckCircle2 } from 'lucide-react';
import { gsap } from 'gsap';
import { ContainerLogo } from '../../components/ui/Logo';
import { useGoogleLogin } from '@react-oauth/google';

const GOOGLE_ENABLED = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

const GOOGLE_SVG = (
  <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

function GoogleRegisterBtn({ disabled, onError }) {
  const [loading, setLoading] = useState(false);
  const loginStore = useAuthStore(s => s.login);
  const navigate = useNavigate();

  const handleGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const res = await api.post('/auth/google', { access_token: tokenResponse.access_token });
        loginStore(res.data.user, res.data.accessToken, res.data.refreshToken);
        navigate('/');
      } catch (err) {
        onError(err.response?.data?.error?.message ?? 'Google sign-up failed. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    onError: () => onError('Google sign-up was cancelled or failed.'),
  });

  return (
    <button
      type="button"
      onClick={() => handleGoogle()}
      disabled={loading || disabled}
      className="w-full h-10 rounded-lg border border-border bg-background hover:bg-muted/50 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-sm font-semibold text-foreground transition-all hover:-translate-y-px active:translate-y-0 shadow-sm hover:shadow-md"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : GOOGLE_SVG}
      Continue with Google
    </button>
  );
}

const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = [
    { pass: password.length >= 8, label: '8+ chars' },
    { pass: /[A-Z]/.test(password), label: 'Uppercase' },
    { pass: /[0-9]/.test(password), label: 'Number' },
    { pass: /[^A-Za-z0-9]/.test(password), label: 'Symbol' },
  ];
  const score = checks.filter(c => c.pass).length;
  const barColors = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500'];
  const labels = ['Too weak', 'Weak', 'Fair', 'Strong'];
  const labelColors = ['text-red-500', 'text-orange-500', 'text-amber-500', 'text-emerald-500'];
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? barColors[score - 1] : 'bg-border'}`} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <p className={`text-[11px] font-semibold ${labelColors[score - 1] ?? 'text-muted-foreground'}`}>
          {score > 0 ? labels[score - 1] : ''}
        </p>
        <div className="flex gap-2">
          {checks.map(c => (
            <div key={c.label} className={`flex items-center gap-0.5 text-[10px] font-medium transition-colors ${c.pass ? 'text-emerald-500' : 'text-muted-foreground/40'}`}>
              <CheckCircle2 className="w-2.5 h-2.5" />
              {c.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon: Icon, title, desc, delay }) {
  const ref = useRef(null);
  useEffect(() => {
    gsap.fromTo(ref.current,
      { opacity: 0, x: -20 },
      { opacity: 1, x: 0, duration: 0.5, delay, ease: 'power3.out' }
    );
  }, [delay]);
  return (
    <div ref={ref} className="flex items-start gap-3 opacity-0">
      <div className="w-8 h-8 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-white" />
      </div>
      <div>
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="text-xs text-white/55 mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const login = useAuthStore(s => s.login);
  const navigate = useNavigate();

  // Hero panel refs
  const orb1Ref = useRef(null);
  const orb2Ref = useRef(null);
  const orb3Ref = useRef(null);
  const heroBadgeRef = useRef(null);
  const heroTextRef = useRef(null);
  const heroFeaturesRef = useRef(null);
  const heroFooterRef = useRef(null);

  // Form panel refs
  const formPanelRef = useRef(null);
  const headingRef = useRef(null);
  const subRef = useRef(null);
  const formCardRef = useRef(null);
  const field1Ref = useRef(null);
  const field2Ref = useRef(null);
  const field3Ref = useRef(null);
  const btnRef = useRef(null);
  const footerRef = useRef(null);

  useEffect(() => {
    // Orbs float in
    const orb1 = orb1Ref.current, orb2 = orb2Ref.current, orb3 = orb3Ref.current;
    gsap.fromTo([orb1, orb2, orb3],
      { opacity: 0, scale: 0.5 },
      { opacity: 1, scale: 1, stagger: 0.15, duration: 1.4, ease: 'power2.out' }
    );
    // Hero stagger
    gsap.fromTo(
      [heroBadgeRef.current, heroTextRef.current, heroFeaturesRef.current, heroFooterRef.current],
      { opacity: 0, x: -28 },
      { opacity: 1, x: 0, stagger: 0.13, duration: 0.7, delay: 0.25, ease: 'power3.out' }
    );
    // Continuous float animations
    gsap.to(orb1, { y: -18, duration: 5, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    gsap.to(orb2, { y: 14, duration: 6.5, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 1.2 });
    gsap.to(orb3, { y: -10, duration: 4, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 0.6 });
    // Form panel timeline
    const tl = gsap.timeline({ delay: 0.1 });
    tl.fromTo(headingRef.current, { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' })
      .fromTo(subRef.current, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }, '-=0.3')
      .fromTo(formCardRef.current, { opacity: 0, y: 18, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out' }, '-=0.25')
      .fromTo([field1Ref.current, field2Ref.current, field3Ref.current], { opacity: 0, y: 10 }, { opacity: 1, y: 0, stagger: 0.1, duration: 0.4, ease: 'power2.out' }, '-=0.2')
      .fromTo(btnRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }, '-=0.1')
      .fromTo(footerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 }, '-=0.1');
  }, []);

  const handleChange = (field) => (e) => {
    setForm(p => ({ ...p, [field]: e.target.value }));
    if (errors[field]) setErrors(p => ({ ...p, [field]: '' }));
    if (serverError) setServerError('');
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.email) e.email = 'Email is required';
    else if (!isValidEmail(form.email)) e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setServerError('');
    try {
      const res = await api.post('/auth/register', form);
      login(res.data.user, res.data.accessToken, res.data.refreshToken);
      navigate('/');
    } catch (err) {
      let msg;
      if (!err.response) {
        msg = 'Cannot connect to server. Please check your network or try again later.';
      } else {
        const details = err.response?.data?.error?.details;
        if (details?.length) {
          msg = details.map(d => d.message).join(' · ');
        } else {
          msg = err.response?.data?.error?.message ?? err.response?.data?.message ?? 'Registration failed';
        }
      }
      setServerError(msg);
      gsap.fromTo(formPanelRef.current, { x: -10 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
    } finally {
      setLoading(false);
    }
  };

  const focusCls = (field) => focusedField === field
    ? 'border-primary/50 ring-2 ring-primary/20'
    : errors[field] ? 'border-red-500 ring-2 ring-red-500/20' : 'border-input';

  const inputCls = (field) =>
    `w-full h-10 rounded-lg border bg-background/70 px-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none transition-all ${focusCls(field)}`;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left hero panel */}
      <div className="hidden lg:flex flex-col flex-1 relative justify-between p-12 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, hsl(21 91% 44%), hsl(21 91% 51%), hsl(21 85% 36%))' }}>
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: 'linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }} />
        {/* Orbs */}
        <div ref={orb1Ref} className="absolute top-[12%] right-[10%] w-64 h-64 rounded-full opacity-0"
          style={{ background: 'radial-gradient(circle, hsl(0 0% 100% / 0.18), transparent 70%)' }} />
        <div ref={orb2Ref} className="absolute bottom-[18%] left-[-5%] w-80 h-80 rounded-full opacity-0"
          style={{ background: 'radial-gradient(circle, hsl(0 0% 100% / 0.10), transparent 70%)' }} />
        <div ref={orb3Ref} className="absolute top-[55%] right-[30%] w-32 h-32 rounded-full opacity-0"
          style={{ background: 'radial-gradient(circle, hsl(0 0% 100% / 0.12), transparent 70%)' }} />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/25 flex items-center justify-center">
            <ContainerLogo className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-base tracking-tight text-white">SmartContainer</span>
        </div>

        {/* Main content */}
        <div className="relative space-y-8">
          <div ref={heroBadgeRef} className="opacity-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
            Free to get started
          </div>
          <div ref={heroTextRef} className="opacity-0">
            <h2 className="text-4xl font-extrabold leading-tight text-white">
              Join the future of<br />customs intelligence.
            </h2>
            <p className="text-white/65 text-sm leading-relaxed mt-4 max-w-xs">
              Score every shipment with AI. Detect anomalies before they breach the border.
            </p>
          </div>
          <div ref={heroFeaturesRef} className="opacity-0 space-y-4">
            <FeatureItem icon={Globe} title="Global coverage" desc="140+ countries, live container feeds" delay={0.5} />
            <FeatureItem icon={ShieldCheck} title="Risk intelligence" desc="XGBoost model trained on customs data" delay={0.65} />
            <FeatureItem icon={CheckCircle2} title="Instant results" desc="Batch scoring in under a second" delay={0.8} />
          </div>
        </div>

        <div ref={heroFooterRef} className="opacity-0 relative flex items-center gap-2 text-xs text-white/55">
          <Lock className="w-3.5 h-3.5" />
          Your data stays private and encrypted at rest
        </div>
      </div>

      {/* Right form panel */}
      <div ref={formPanelRef} className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-16 relative overflow-hidden bg-background">
        {/* Background deco */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl -translate-y-1/2 -translate-x-1/4" />
          <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-primary/5 blur-3xl translate-y-1/2 translate-x-1/4" />
          <div className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]" style={{
            backgroundImage: 'radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }} />
        </div>

        <div className="w-full max-w-sm relative z-10">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <ContainerLogo className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">SmartContainer</span>
          </div>

          <div ref={headingRef} className="mb-1 opacity-0">
            <h1 className="text-3xl font-extrabold tracking-tight">Create account</h1>
          </div>
          <p ref={subRef} className="text-sm text-muted-foreground mb-7 opacity-0">
            Start analyzing container risk today — free forever.
          </p>

          <div ref={formCardRef} className="opacity-0 bg-card/70 backdrop-blur-xl border border-border/60 rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/30 p-7">
            {serverError && (
              <div className="mb-5 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">{serverError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div ref={field1Ref} className="space-y-1.5 opacity-0">
                <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                  <User className="w-3 h-3" /> Full name
                </label>
                <input type="text" autoFocus placeholder="John Smith"
                  value={form.name} onChange={handleChange('name')}
                  onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)}
                  className={inputCls('name')}
                />
                {errors.name && <p className="text-[11px] text-red-500 mt-0.5">{errors.name}</p>}
              </div>

              <div ref={field2Ref} className="space-y-1.5 opacity-0">
                <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                  <Globe className="w-3 h-3" /> Email address
                </label>
                <input type="email" placeholder="you@example.com"
                  value={form.email} onChange={handleChange('email')}
                  onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)}
                  className={inputCls('email')}
                />
                {errors.email && <p className="text-[11px] text-red-500 mt-0.5">{errors.email}</p>}
              </div>

              <div ref={field3Ref} className="space-y-1.5 opacity-0">
                <label className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                  <Lock className="w-3 h-3" /> Password
                </label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} placeholder="Min 8 characters"
                    value={form.password} onChange={handleChange('password')}
                    onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)}
                    className={`${inputCls('password')} pr-9`}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {errors.password
                  ? <p className="text-[11px] text-red-500 mt-0.5">{errors.password}</p>
                  : <PasswordStrength password={form.password} />
                }
              </div>

              <button ref={btnRef} type="submit" disabled={loading}
                className="opacity-0 w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all mt-1">
                {loading
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating account…</>
                  : <><ArrowRight className="w-3.5 h-3.5" /> Create account</>
                }
              </button>

              {/* Divider + Google button */}
              {GOOGLE_ENABLED && (
                <>
                  <div className="relative flex items-center gap-3 pt-0.5">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[11px] text-muted-foreground font-medium">or</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <GoogleRegisterBtn disabled={loading} onError={setServerError} />
                </>
              )}
            </form>
          </div>

          <p ref={footerRef} className="opacity-0 mt-5 text-center text-xs text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline underline-offset-2">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
