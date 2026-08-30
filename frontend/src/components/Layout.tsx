import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Droplets, AlertTriangle, Users, FileText,
  Bell, Settings, LogOut, Menu, X, Map, ClipboardCheck, MessageCircle
} from 'lucide-react';

const navItems = [
  { path: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['VILLAGER', 'ASHA_WORKER', 'PHC_DOCTOR', 'DISTRICT_OFFICER', 'STATE_ADMIN'] },
  { path: '/app/map', label: 'GIS Map', icon: Map, roles: ['ASHA_WORKER', 'PHC_DOCTOR', 'DISTRICT_OFFICER', 'STATE_ADMIN'] },
  { path: '/app/water-quality', label: 'Water Quality', icon: Droplets, roles: ['ASHA_WORKER', 'PHC_DOCTOR', 'DISTRICT_OFFICER', 'STATE_ADMIN'] },
  { path: '/app/symptoms', label: 'Symptom Reports', icon: FileText, roles: ['VILLAGER', 'ASHA_WORKER', 'PHC_DOCTOR', 'DISTRICT_OFFICER', 'STATE_ADMIN'] },
  { path: '/app/crowdsourced', label: 'Community Reports', icon: MessageCircle, roles: ['VILLAGER', 'ASHA_WORKER', 'PHC_DOCTOR', 'DISTRICT_OFFICER', 'STATE_ADMIN'] },
  { path: '/app/alerts', label: 'Alerts', icon: AlertTriangle, roles: ['ASHA_WORKER', 'PHC_DOCTOR', 'DISTRICT_OFFICER', 'STATE_ADMIN'] },
  { path: '/app/cases', label: 'Case Verification', icon: ClipboardCheck, roles: ['PHC_DOCTOR', 'DISTRICT_OFFICER', 'STATE_ADMIN'] },
  { path: '/app/tasks', label: 'Tasks', icon: ClipboardCheck, roles: ['ASHA_WORKER', 'PHC_DOCTOR', 'DISTRICT_OFFICER', 'STATE_ADMIN'] },
  { path: '/app/notifications', label: 'Notifications', icon: Bell, roles: ['VILLAGER', 'ASHA_WORKER', 'PHC_DOCTOR', 'DISTRICT_OFFICER', 'STATE_ADMIN'] },
  { path: '/app/users', label: 'Users', icon: Users, roles: ['DISTRICT_OFFICER', 'STATE_ADMIN'] },
  { path: '/app/reports', label: 'Reports', icon: FileText, roles: ['PHC_DOCTOR', 'DISTRICT_OFFICER', 'STATE_ADMIN'] },
  { path: '/app/settings', label: 'Settings', icon: Settings, roles: ['STATE_ADMIN'] },
];

const roleLabels: Record<string, string> = {
  VILLAGER: 'Villager', ASHA_WORKER: 'ASHA Worker', PHC_DOCTOR: 'PHC Doctor',
  DISTRICT_OFFICER: 'District Officer', STATE_ADMIN: 'State Admin',
};

const roleGradients: Record<string, string> = {
  VILLAGER: 'from-gray-400 to-gray-500',
  ASHA_WORKER: 'from-blue-400 to-indigo-500',
  PHC_DOCTOR: 'from-emerald-400 to-green-500',
  DISTRICT_OFFICER: 'from-purple-400 to-violet-500',
  STATE_ADMIN: 'from-red-400 to-rose-500',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredNav = navItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden transition-opacity" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-72 transform transition-all duration-300 ease-in-out lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-full flex flex-col" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
          {/* Logo */}
          <div className="flex items-center gap-3 p-5 border-b border-white/10">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center anim-float" style={{ background: 'linear-gradient(135deg, #0ea5e9, #2563eb)' }}>
              <Droplets className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-white text-lg tracking-tight">Jal Suraksha</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Early Warning System</p>
            </div>
            <button className="lg:hidden ml-auto text-slate-400 hover:text-white transition-colors" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {filteredNav.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-white/10 text-white shadow-lg shadow-white/5'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25'
                      : 'bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white'
                  }`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <span>{item.label}</span>
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-lg shadow-blue-400/50" />}
                </Link>
              );
            })}
          </nav>

          {/* User card */}
          {user && (
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleGradients[user.role] || 'from-gray-400 to-gray-500'} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                  {user.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{user.name}</p>
                  <p className="text-slate-400 text-xs">{roleLabels[user.role]}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar - glass effect */}
        <header className="glass sticky top-0 z-20 px-4 md:px-6 py-3 flex items-center justify-between border-b border-gray-200/50">
          <button className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          <div className="hidden lg:block" />

          <div className="flex items-center gap-3">
            {user && (
              <>
                <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${roleGradients[user.role] || 'from-gray-400 to-gray-500'} text-white text-xs font-semibold shadow-md`}>
                  <span>{roleLabels[user.role]}</span>
                </div>
                {user.district && (
                  <span className="text-xs text-gray-400 hidden md:inline font-medium">📍 {user.district}</span>
                )}
                <button onClick={logout} className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200" title="Logout">
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </header>

        {/* Page content with animation */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div className="anim-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
