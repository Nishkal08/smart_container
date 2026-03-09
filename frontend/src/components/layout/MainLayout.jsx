import { Outlet, NavLink } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import { LayoutDashboard, Container, Layers, BarChart3, UploadCloud } from 'lucide-react';
import { cn } from '../../lib/utils';

const MOBILE_NAV = [
  { to: '/',            icon: LayoutDashboard, label: 'Home' },
  { to: '/containers',  icon: Container,       label: 'Containers' },
  { to: '/jobs',        icon: Layers,          label: 'Jobs' },
  { to: '/insights',    icon: BarChart3,       label: 'Analytics' },
  { to: '/upload',      icon: UploadCloud,     label: 'Upload' },
];

export default function MainLayout() {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden p-3 gap-3">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto relative pb-16 md:pb-0">
          {/* Subtle warm noise background */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.015] dark:opacity-[0.025]"
            style={{
              backgroundImage: 'radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          {/* Top-right ambient glow — orange tint */}
          <div className="absolute top-0 right-0 w-[500px] h-[350px] bg-primary/8 rounded-full blur-3xl opacity-50 pointer-events-none -translate-y-1/3 translate-x-1/4" />
          <div className="px-4 md:px-6 py-5 max-w-[1400px] mx-auto relative z-10">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation — Momentum style */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border flex items-center justify-around px-2 py-2 safe-area-pb">
        {MOBILE_NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => cn(
              'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[48px]',
              isActive ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center transition-all',
                  isActive ? 'bg-primary shadow-md shadow-primary/40' : 'bg-transparent',
                )}>
                  <Icon className={cn('w-4.5 h-4.5', isActive ? 'text-primary-foreground' : '')} style={{ width: 18, height: 18 }} />
                </div>
                <span className="text-[9px] font-semibold">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
