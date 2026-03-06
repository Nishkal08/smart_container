import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Box, UploadCloud, BarChart3, Settings, LogOut, Ship } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';

const navigation = [
  { name: 'Dashboard', to: '/', icon: LayoutDashboard },
  { name: 'Containers', to: '/containers', icon: Box },
  { name: 'Telemetry', to: '/insights', icon: BarChart3 },
  { name: 'Upload Data', to: '/upload', icon: UploadCloud },
  { name: 'Admin', to: '/admin', icon: Settings },
];

export default function Sidebar() {
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      logout();
    }
  };

  return (
    <aside className="w-64 bg-card flex flex-col h-full border-r border-border transition-colors">
      <div className="h-20 flex items-center px-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
            <Ship className="w-5 h-5 text-primary" />
          </div>
          <span className="font-bold text-foreground tracking-tight text-lg">CognifyPort</span>
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">
          Menu
        </div>
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`
            }
          >
            <item.icon className={`w-5 h-5 ${({ isActive }) => isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border mt-auto">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors group"
        >
          <LogOut className="w-5 h-5 group-hover:text-destructive transition-colors" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
