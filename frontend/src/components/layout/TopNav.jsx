import { Bell, Sun, Moon } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';

const PAGE_TITLES = {
  '/':           { title: 'Dashboard',   subtitle: 'Overview of your container risk operations' },
  '/containers': { title: 'Containers',  subtitle: 'Browse and manage container shipments' },
  '/insights':   { title: 'Predictions', subtitle: 'ML risk scores and anomaly analysis' },
  '/jobs':       { title: 'Batch Jobs',  subtitle: 'Monitor async prediction job queue' },
  '/upload':     { title: 'Upload Data', subtitle: 'Import container data via CSV' },
  '/admin':      { title: 'Admin',       subtitle: 'Users, system stats and cache management' },
};

export default function TopNav() {
  const location = useLocation();
  const { theme, toggleTheme } = useThemeStore();
  const user = useAuthStore(s => s.user);

  const page = PAGE_TITLES[location.pathname] ?? { title: 'Overview', subtitle: '' };
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6 bg-background">
      <div>
        <h1 className="text-sm font-semibold">{page.title}</h1>
        <p className="text-xs text-muted-foreground hidden sm:block">{page.subtitle}</p>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Toggle theme">
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button className="relative w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-destructive rounded-full" />
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <div className="flex items-center gap-2 text-xs">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-[11px] font-bold text-primary">{initials}</span>
          </div>
          <span className="font-medium hidden sm:block">{user?.name ?? 'User'}</span>
        </div>
      </div>
    </header>
  );
}
