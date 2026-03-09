import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Container, BarChart3, UploadCloud,
  Layers, ShieldCheck, LogOut, Crosshair, Trophy,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';
import api from '../../lib/api';
import queryClient from '../../lib/queryClient';
import { toast } from 'sonner';
import { ContainerLogo } from '../ui/Logo';
import { useState, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const NAV_GENERAL = [
  { label: 'Dashboard',      to: '/',            icon: LayoutDashboard, roles: null },
  { label: 'Containers',     to: '/containers',  icon: Container,       roles: null },
  { label: 'Batch Jobs',     to: '/jobs',        icon: Layers,          roles: null },
  { label: 'Predictions',    to: '/predictions', icon: Crosshair,       roles: null },
  { label: 'Analytics',      to: '/insights',    icon: BarChart3,       roles: null },
];

const NAV_MORE = [
  { label: 'Upload Dataset', to: '/upload',      icon: UploadCloud,     roles: null },
  { label: 'Admin',          to: '/admin',       icon: ShieldCheck,     roles: ['ADMIN'] },
];

const ROLE_COLORS = {
  ADMIN:   'bg-primary/15 text-primary',
  ANALYST: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  VIEWER:  'bg-slate-500/15 text-slate-600 dark:text-slate-400',
};

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) => cn(
        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </NavLink>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  // Easter egg: click the logo 5× rapidly to reveal
  const [shipSailing, setShipSailing] = useState(false);
  const logoClicks = useRef(0);
  const logoTimer = useRef(null);
  const handleLogoClick = useCallback(() => {
    logoClicks.current += 1;
    if (logoTimer.current) clearTimeout(logoTimer.current);
    logoTimer.current = setTimeout(() => { logoClicks.current = 0; }, 1500);
    if (logoClicks.current >= 5) {
      logoClicks.current = 0;
      setShipSailing(true);
      setTimeout(() => setShipSailing(false), 4800);
    }
  }, []);

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch (_) {}
    queryClient.clear();
    logout();
    navigate('/login');
    toast.success('Signed out successfully');
  };

  const visibleGeneral = NAV_GENERAL.filter(n => !n.roles || n.roles.includes(user?.role));
  const visibleMore = NAV_MORE.filter(n => !n.roles || n.roles.includes(user?.role));
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <>
    <aside className="hidden md:flex flex-col w-[220px] shrink-0 h-full glass-card rounded-2xl overflow-hidden">
      {/* Logo */}
      <div className="flex items-center gap-3 h-16 px-5 cursor-pointer select-none" onClick={handleLogoClick} title="SmartContainer">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-md shadow-primary/40">
          <ContainerLogo className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold tracking-tight leading-tight">SmartContainer</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Risk Intelligence</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-3 mb-2">
            General
          </p>
          <div className="space-y-0.5">
            {visibleGeneral.map(item => <NavItem key={item.to} {...item} />)}
          </div>
        </div>

        {visibleMore.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-3 mb-2">
              More
            </p>
            <div className="space-y-0.5">
              {visibleMore.map(item => <NavItem key={item.to} {...item} />)}
            </div>
          </div>
        )}
      </nav>

      {/* Upgrade card — Momentum style */}
      <div className="px-3 pb-3">
        <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-foreground truncate">Pro Analytics</p>
            <p className="text-[10px] text-muted-foreground truncate">SHAP + Heatmaps</p>
          </div>
        </div>
      </div>

      {/* User footer */}
      <div className="border-t border-[hsl(var(--sidebar-border))] p-3 space-y-1">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-accent/50 transition-colors">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 shadow shadow-primary/30">
            <span className="text-[11px] font-bold text-primary-foreground">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate leading-tight">{user?.name ?? 'User'}</p>
            <p className="text-[10px] text-muted-foreground truncate leading-tight">{user?.email ?? ''}</p>
          </div>
          <span className={cn(
            'inline-flex shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full',
            ROLE_COLORS[user?.role] ?? ROLE_COLORS.VIEWER,
          )}>
            {user?.role ?? 'VIEWER'}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>

    {/* Easter egg — click logo 5× to sail a ship across the screen */}
    <AnimatePresence>
      {shipSailing && (
        <motion.div
          key="easter-ship"
          initial={{ x: '-18vw', opacity: 0 }}
          animate={{ x: '112vw', opacity: [0, 1, 1, 1, 0.8, 0] }}
          transition={{ duration: 4.5, ease: 'linear' }}
          className="fixed bottom-10 z-[9999] pointer-events-none select-none flex items-center gap-2"
        >
          <span className="text-3xl drop-shadow-xl" style={{ filter: 'drop-shadow(0 0 8px hsl(var(--primary)))' }}>&#x1F6A2;</span>
          <span className="text-[11px] font-bold text-primary bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-xl border border-primary/30 shadow-lg whitespace-nowrap font-mono tracking-wide">
            SC-EASTER-01 &middot; CLEARED &#x2713;
          </span>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
