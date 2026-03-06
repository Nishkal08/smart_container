import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

export default function MainLayout() {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto relative">
          {/* Subtle dot-grid background pattern */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.018] dark:opacity-[0.035]"
            style={{
              backgroundImage: 'radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          {/* Top-right ambient glow */}
          <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-primary/5 rounded-full blur-3xl opacity-60 pointer-events-none -translate-y-1/2 translate-x-1/4" />
          <div className="px-6 py-6 max-w-[1400px] mx-auto relative z-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
