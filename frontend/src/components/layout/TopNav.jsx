import { useState, useRef, useEffect } from 'react';
import { Bell, Sun, Moon, ShieldAlert, AlertTriangle, ShieldCheck, Check, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';

const PAGE_TITLES = {
  '/':            { title: 'Dashboard',    subtitle: 'Overview of your container risk operations' },
  '/containers':  { title: 'Containers',   subtitle: 'Browse and manage container shipments' },
  '/predictions': { title: 'Predictions',  subtitle: 'ML risk scores and anomaly analysis' },
  '/insights':    { title: 'Analytics',    subtitle: 'Advanced analytics and trade insights' },
  '/jobs':        { title: 'Batch Jobs',   subtitle: 'Monitor async prediction job queue' },
  '/upload':      { title: 'Upload Data',  subtitle: 'Import container data via CSV' },
  '/admin':       { title: 'Admin',        subtitle: 'Users, system stats and cache management' },
};

const NOTIF_ICONS = {
  CRITICAL: { Icon: ShieldAlert, color: 'text-red-600 bg-red-500/10' },
  LOW_RISK: { Icon: AlertTriangle, color: 'text-amber-600 bg-amber-500/10' },
  CLEAR: { Icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-500/10' },
  info: { Icon: Bell, color: 'text-blue-600 bg-blue-500/10' },
};

function NotificationDropdown({ onClose }) {
  const { notifications, unreadCount, markAsRead, markAllRead, clearAll } = useNotificationStore();
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">Notifications</h3>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-[10px] px-1.5 py-0.5 rounded text-primary hover:bg-primary/10 transition-colors">
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={clearAll} className="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground hover:bg-muted transition-colors">
              Clear
            </button>
          )}
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto divide-y divide-border">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          notifications.map(n => {
            const { Icon, color } = NOTIF_ICONS[n.type] || NOTIF_ICONS.info;
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer ${
                  !n.read ? 'bg-primary/5' : ''
                }`}
                onClick={() => markAsRead(n.id)}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium leading-tight">{n.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {new Date(n.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function TopNav() {
  const location = useLocation();
  const { theme, toggleTheme } = useThemeStore();
  const user = useAuthStore(s => s.user);
  const unreadCount = useNotificationStore(s => s.unreadCount);
  const [showNotifs, setShowNotifs] = useState(false);

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
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showNotifs && <NotificationDropdown onClose={() => setShowNotifs(false)} />}
        </div>
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
