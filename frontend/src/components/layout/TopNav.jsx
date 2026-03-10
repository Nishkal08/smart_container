import { useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, Search, CalendarDays, LogOut, ChevronDown } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useState, useRef, useEffect } from 'react';
import api from '../../lib/api';
import queryClient from '../../lib/queryClient';
import { toast } from 'sonner';
import { ContainerLogo } from '../ui/Logo';

const ROLE_COLORS = {
  ADMIN:   'bg-primary/15 text-primary',
  ANALYST: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  VIEWER:  'bg-slate-500/15 text-slate-600 dark:text-slate-400',
};

const PAGE_TITLES = {
  '/':            'Dashboard',
  '/containers':  'Containers',
  '/jobs':        'Batch Jobs',
  '/predictions': 'Predictions',
  '/insights':    'Analytics',
  '/upload':      'Upload',
  '/admin':       'Admin',
};

export default function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const mobileSearchRef = useRef(null);

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const now = new Date();
  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Derive page title from pathname
  const pageTitle = PAGE_TITLES[location.pathname]
    ?? PAGE_TITLES[Object.keys(PAGE_TITLES).find(k => k !== '/' && location.pathname.startsWith(k)) ?? '']
    ?? 'SmartContainer';

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  // Auto-focus mobile search input when opened
  useEffect(() => {
    if (mobileSearchOpen) mobileSearchRef.current?.focus();
  }, [mobileSearchOpen]);

  const handleLogout = async () => {
    setDropdownOpen(false);
    try { await api.post('/auth/logout'); } catch (_) {}
    queryClient.clear();
    logout();
    navigate('/login');
    toast.success('Signed out successfully');
  };

  return (
    <div className="shrink-0 flex flex-col gap-2">
      <header className="flex items-center gap-3 rounded-xl glass-card px-4 py-2.5">
        {/* Mobile: logo + page title (hidden on sm+) */}
        <div className="flex sm:hidden items-center gap-2 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow shadow-primary/30">
            <ContainerLogo className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold truncate">{pageTitle}</span>
        </div>

        {/* Desktop: search bar (hidden on mobile) */}
        <div className={`hidden sm:flex flex-1 max-w-xs items-center gap-2 rounded-xl border px-3 py-2 transition-all duration-200 ${
          searchFocused ? 'border-primary/50 bg-card shadow-sm shadow-primary/10' : 'border-border bg-muted/40'
        }`}>
          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search containers, shippers..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="flex-1 bg-transparent text-xs font-medium outline-none placeholder:text-muted-foreground/60 text-foreground"
          />
        </div>

        <div className="hidden sm:block flex-1" />

        {/* Month pill — desktop only */}
        <button className="hidden md:flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all">
          <CalendarDays className="w-3.5 h-3.5 text-primary" />
          {monthLabel}
        </button>

        {/* Mobile: search icon toggle */}
        <button
          onClick={() => setMobileSearchOpen(v => !v)}
          className="sm:hidden w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Search">
          <Search className="w-4 h-4" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Toggle theme">
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User menu */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen(v => !v)}
            className="flex items-center gap-2 rounded-xl hover:bg-accent/60 px-1.5 py-1 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow shadow-primary/30 shrink-0">
              <span className="text-[11px] font-bold text-primary-foreground">{initials}</span>
            </div>
            <span className="hidden lg:block text-xs font-semibold">{user?.name?.split(' ')[0] ?? 'User'}</span>
            <ChevronDown className={`hidden sm:block w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-xl shadow-black/10 dark:shadow-black/40 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 shadow shadow-primary/30">
                    <span className="text-[11px] font-bold text-primary-foreground">{initials}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate leading-tight">{user?.name ?? 'User'}</p>
                    <p className="text-[10px] text-muted-foreground truncate leading-tight">{user?.email ?? ''}</p>
                  </div>
                </div>
                {user?.role && (
                  <span className={`mt-2 inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role] ?? ROLE_COLORS.VIEWER}`}>
                    {user.role}
                  </span>
                )}
              </div>
              <div className="p-1.5">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-500/10 transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Mobile expandable search bar */}
      {mobileSearchOpen && (
        <div className="sm:hidden flex items-center gap-2 rounded-xl glass-card border border-primary/40 bg-card px-3 py-2">
          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            ref={mobileSearchRef}
            type="text"
            placeholder="Search containers, shippers..."
            className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/60 text-foreground"
          />
          <button
            onClick={() => setMobileSearchOpen(false)}
            className="text-muted-foreground hover:text-foreground transition-colors text-xs font-medium px-1"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
