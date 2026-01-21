import React, { useState, useEffect, useTransition } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Mail, 
  Lightbulb, 
  Briefcase, 
  BarChart3, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  Zap,
  ZapOff,
  Database
} from 'lucide-react';
import { authService, getSupabaseConfig } from '../services/authService';
import { databaseService } from '../services/databaseService';

interface SidebarProps {
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'demo' | 'connected' | 'error'>('demo');
  const [isPending, startTransition] = useTransition();
  const navigate = useNavigate();
  const location = useLocation();
  const isSuperUser = authService.isSuperAdmin();
  const user = authService.getCurrentUser();

  useEffect(() => {
    const checkConnection = async () => {
      const { url, key } = getSupabaseConfig();
      if (!url || !key) {
        setConnectionStatus('demo');
        return;
      }
      const res = await databaseService.testConnection();
      setConnectionStatus(res.success ? 'connected' : 'error');
    };
    checkConnection();
  }, [location.pathname]);

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Newsletters', icon: Mail, path: '/newsletters' },
    { name: 'Idées', icon: Lightbulb, path: '/ideas' },
    { name: 'Marques', icon: Briefcase, path: '/brands' },
    { name: 'Statistiques', icon: BarChart3, path: '/statistics' },
  ];

  const handleNavClick = (path: string) => {
    startTransition(() => {
      navigate(path);
    });
  };

  return (
    <div 
      className={`h-screen bg-white border-r border-gray-200 transition-all duration-300 flex flex-col sticky top-0 z-[60] ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="p-6 flex items-center justify-between">
        {!isCollapsed && (
          <h1 className="text-xl font-bold tracking-tight">Newsletter<span className="text-primary">AI</span></h1>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <div className="px-4 mb-4">
        {!isCollapsed ? (
          <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">{user?.name || 'Utilisateur'}</p>
              <p className="text-[10px] text-gray-400 truncate font-medium">{user?.email}</p>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 bg-primary mx-auto rounded-xl flex items-center justify-center font-bold text-xs shadow-sm">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <button
              key={item.name}
              onClick={() => handleNavClick(item.path)}
              className={`w-full flex items-center p-3 rounded-xl transition-all group relative ${
                isActive 
                  ? 'bg-primary text-gray-900 font-medium shadow-lg shadow-primary/10' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <item.icon size={22} className="shrink-0" />
              {!isCollapsed && <span className="ml-3 font-semibold text-sm">{item.name}</span>}
            </button>
          );
        })}

        {isSuperUser && (
          <button
            onClick={() => handleNavClick('/admin')}
            className={`w-full flex items-center p-3 rounded-xl transition-all group relative mt-8 border border-dashed ${
              location.pathname === '/admin' 
                ? 'bg-gray-900 text-white shadow-lg shadow-gray-200' 
                : 'text-gray-400 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <ShieldCheck size={22} className="shrink-0" />
            {!isCollapsed && <span className="ml-3 font-semibold text-sm">Console Admin</span>}
          </button>
        )}
      </nav>

      <div className="px-4 py-4">
        <div className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
          connectionStatus === 'connected' ? 'bg-green-50 border-green-100 text-green-600' :
          connectionStatus === 'error' ? 'bg-red-50 border-red-100 text-red-600' :
          'bg-yellow-50 border-yellow-100 text-yellow-700'
        }`}>
          {connectionStatus === 'connected' ? <Zap size={16} fill="currentColor" /> : 
           connectionStatus === 'error' ? <ZapOff size={16} /> : 
           <Database size={16} />}
          {!isCollapsed && (
            <span className="text-[10px] font-bold uppercase tracking-widest leading-none">
              {connectionStatus === 'connected' ? 'Cloud Live' : 
               connectionStatus === 'error' ? 'Cloud Error' : 
               'Local Demo'}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-100">
        <button 
          onClick={onLogout}
          className="w-full flex items-center p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"
        >
          <LogOut size={22} className="shrink-0" />
          {!isCollapsed && <span className="ml-3 font-semibold text-sm">Déconnexion</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;