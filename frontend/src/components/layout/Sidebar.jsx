import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Container, BarChart3, UploadCloud,
  Layers, ShieldCheck, LogOut, ChevronRight, Cpu, Crosshair,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';
import api from '../../lib/api';
import { toast } from 'sonner';

const NAV = [
  { label: 'Dashboard',   to: '/',           icon: LayoutDashboard, roles: null },
  { label: 'Containers',  to: '/containers', icon: Container,       roles: null },
  { label: 'Predictions', to: '/predictions', icon: Crosshair,      roles: null },
  { label: 'Analytics',   to: '/insights',   icon: BarChart3,       roles: null },
  { label: 'Batch Jobs',  to: '/jobs',       icon: Layers,          roles: null },
  { label: 'Upload Data', to: '/upload',     icon: UploadCloud,     roles: null },
  { label: 'Admin',       to: '/admin',      icon: ShieldCheck,     roles: ['ADMIN'] },
];

const ROLE_COLORS = {
  ADMIN:   'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  ANALYST: 'bg-blue-500/15   text-blue-600   dark:text-blue-400',
  VIEWER:  'bg-slate-500/15  text-slate-600  dark:text-slate-400',
};

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch (_) {}
    logout();
    navigate('/login');
    toast.success('Signed out successfully');
  };

  const visibleNav = NAV.filter(n => !n.roles || n.roles.includes(user?.role));
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <aside className="flex flex-col w-60 shrink-0 h-screen bg-sidebar border-r border-border">
      {/* Logo */}
      <div className="flex items-center gap-2.5 h-14 px-5 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Cpu className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-sm tracking-tight">SmartContainer</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2.5 mb-2">
          Navigation
        </p>
        {visibleNav.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => cn(
              'group flex items-center justify-between rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {({ isActive }) => (
              <>
                <span className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-border p-3 space-y-1">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-primary">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate leading-tight">{user?.name ?? 'User'}</p>
            <p className="text-[10px] text-muted-foreground truncate leading-tight">{user?.email ?? ''}</p>
          </div>
          <span className={cn(
            'inline-flex shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
            ROLE_COLORS[user?.role] ?? ROLE_COLORS.VIEWER,
          )}>
            {user?.role ?? 'VIEWER'}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
