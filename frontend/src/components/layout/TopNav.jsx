import { useLocation } from 'react-router-dom';
import { Sun, Moon, Search, CalendarDays } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useState } from 'react';

export default function TopNav() {
  const location = useLocation();
  const { theme, toggleTheme } = useThemeStore();
  const user = useAuthStore(s => s.user);
  const [searchFocused, setSearchFocused] = useState(false);

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const now = new Date();
  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <header className="flex shrink-0 items-center gap-3 rounded-xl bg-background border border-border px-4 py-2.5 shadow-sm">
      {/* Search bar */}
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

      <div className="flex-1 sm:flex-none" />

      {/* Month pill — Momentum style */}
      <button className="hidden md:flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all">
        <CalendarDays className="w-3.5 h-3.5 text-primary" />
        {monthLabel}
      </button>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        title="Toggle theme">
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>



      {/* Avatar */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow shadow-primary/30 cursor-pointer">
          <span className="text-[11px] font-bold text-primary-foreground">{initials}</span>
        </div>
        <span className="hidden lg:block text-xs font-semibold">{user?.name?.split(' ')[0] ?? 'User'}</span>
      </div>
    </header>
  );
}
