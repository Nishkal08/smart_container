import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

export default function MainLayout() {
  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative">
        <TopNav />
        <main className="flex-1 overflow-y-auto px-8 py-8 bg-background/50">
          <div className="mx-auto max-w-7xl h-full pb-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
