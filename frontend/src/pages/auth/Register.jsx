import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import { Cpu, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { gsap } from 'gsap';

const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function PasswordStrength({ password }) {
  if (!password) return null;
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500'];
  const labels = ['Too short', 'Weak', 'Fair', 'Strong'];
  const textColors = ['text-red-500', 'text-orange-500', 'text-amber-500', 'text-emerald-600'];
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < score ? colors[score - 1] : 'bg-muted'}`} />
        ))}
      </div>
      <p className={`text-xs ${textColors[score - 1] ?? 'text-muted-foreground'}`}>{labels[score - 1] ?? ''}</p>
    </div>
  );
}

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
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
      const details = err.response?.data?.error?.details;
      if (details?.length) {
        setServerError(details.map(d => d.message).join(' · '));
      } else {
        setServerError(err.response?.data?.error?.message ?? err.response?.data?.message ?? 'Registration failed');
      }
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
      <div className="hidden lg:flex flex-col flex-1 bg-primary p-12 text-primary-foreground justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm">SmartContainer</span>
        </div>
        <div>
          <h2 className="text-3xl font-semibold leading-snug mb-4">
            Join the future of<br />customs intelligence.
          </h2>
          <p className="text-primary-foreground/70 text-sm">AI-powered risk scoring for every shipment.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-primary-foreground/60">
          <ShieldCheck className="w-3.5 h-3.5" />
          Trusted by customs analysts worldwide
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-16">
        <div ref={cardRef} className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
            <p className="text-sm text-muted-foreground mt-1">Start analyzing container risk today</p>
          </div>

          {serverError && (
            <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2.5">
              <p className="text-xs text-red-600 font-medium">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Full name</label>
              <input type="text" autoFocus placeholder="John Smith"
                value={form.name} onChange={handleChange('name')}
                className={inputCls('name')}
              />
              {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Email</label>
              <input type="email" placeholder="you@example.com"
                value={form.email} onChange={handleChange('email')}
                className={inputCls('email')}
              />
              {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} placeholder="Min 8 characters"
                  value={form.password} onChange={handleChange('password')}
                  className={`${inputCls('password')} pr-9`}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {errors.password
                ? <p className="text-xs text-red-500 mt-0.5">{errors.password}</p>
                : <PasswordStrength password={form.password} />
              }
            </div>

            <button type="submit" disabled={loading}
              className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors">
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

