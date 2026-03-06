import { useLocation } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';

const PAGE_TITLES = {
  '/':            { title: 'Operations Center', subtitle: 'Live risk overview across all monitored containers' },
  '/containers':  { title: 'Containers',        subtitle: 'Browse, filter, and inspect container shipments' },
  '/predictions': { title: 'Predictions',       subtitle: 'ML risk scores and anomaly analysis' },
  '/insights':    { title: 'Analytics',         subtitle: 'Long-term risk trends and trade intelligence' },
  '/jobs':        { title: 'Batch Jobs',        subtitle: 'Monitor and manage prediction job queue' },
  '/upload':      { title: 'Upload Dataset',    subtitle: 'Import container manifests via CSV' },
  '/admin':       { title: 'Admin',             subtitle: 'Users, system stats and cache management' },
};

export default function TopNav() {
  const location = useLocation();
  const { theme, toggleTheme } = useThemeStore();
  const user = useAuthStore(s => s.user);

  // Match dynamic routes
  const pathBase = '/' + (location.pathname.split('/')[1] || '');
  const page = PAGE_TITLES[location.pathname] ?? PAGE_TITLES[pathBase] ?? { title: 'Overview', subtitle: '' };
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
