import { Bell, Search, User, Moon, Sun } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';

export default function TopNav() {
  const location = useLocation();
  const { theme, toggleTheme } = useThemeStore();

  const pathName = location.pathname;
  const pageTitle = pathName === '/' ? 'Dashboard' 
                  : pathName === '/containers' ? 'Containers'
                  : pathName === '/insights' ? 'Telemetry & Insights'
                  : pathName === '/upload' ? 'Upload Data'
                  : pathName === '/admin' ? 'Admin Center'
                  : 'Overview';

  return (
    <header className="h-20 border-b border-border bg-card/60 backdrop-blur-xl flex items-center justify-between px-8 sticky top-0 z-10 transition-colors">
      <div className="flex items-center">
        <h1 className="text-xl font-semibold text-foreground tracking-tight">{pageTitle}</h1>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="relative group cursor-pointer lg:w-64 w-8 flex items-center">
          <Search className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors absolute left-3" />
          <input 
            type="text" 
            placeholder="Search anything..." 
            className="w-full bg-secondary/50 border border-transparent focus:border-border hover:bg-secondary transition-all rounded-full py-2.5 pl-10 pr-4 text-sm outline-none text-foreground hidden lg:block focus:ring-2 focus:ring-primary/20"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          <button className="relative w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-destructive border-2 border-card rounded-full"></span>
          </button>
          
          <div className="w-px h-6 bg-border mx-1"></div>
          
          <div className="flex items-center gap-3 cursor-pointer pl-1 group">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium hover:bg-primary/20 transition-colors">
              <User className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
