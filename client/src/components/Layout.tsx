import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  Home as HomeIcon, 
  CheckSquare, 
  DollarSign, 
  BarChart2, 
  Handshake, 
  User as UserIcon,
  LogOut,
  Sun,
  Moon
} from 'lucide-react';

import { useAuth } from '../context/AuthContext.js';
import { useTheme } from '../context/ThemeContext.js';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Home', icon: <HomeIcon className="h-5 w-5" /> },
    { to: '/todo', label: 'Todo', icon: <CheckSquare className="h-5 w-5" /> },
    { to: '/finance', label: 'Finance', icon: <DollarSign className="h-5 w-5" /> },
    { to: '/loans', label: 'Loans', icon: <Handshake className="h-5 w-5" /> },
    { to: '/reports', label: 'Reports', icon: <BarChart2 className="h-5 w-5" /> },
    { to: '/profile', label: 'Profile', icon: <UserIcon className="h-5 w-5" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground transition-colors duration-200">
      {/* 1. Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 flex-col bg-card border-r border-border p-5 sticky top-0 h-screen select-none soft-shadow z-10">
        {/* App Title */}
        <div className="flex items-center gap-2 px-2 py-3 mb-6">
          <div className="h-9 w-9 rounded-xl bg-accent flex items-center justify-center text-accent-foreground font-black text-xl shadow-lg">
            P
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none tracking-tight">Paila Todo</h1>
            <span className="text-xs text-muted-foreground font-medium">Plan first, then do.</span>
          </div>
        </div>

        {/* User Mini Profile */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 mb-6 border border-border/50">
          <div className="h-10 w-10 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center font-bold text-accent text-base uppercase">
            {user?.profile.name.charAt(0) || 'U'}
          </div>
          <div className="flex-grow min-w-0">
            <h2 className="font-semibold text-sm truncate">{user?.profile.name}</h2>
            <p className="text-xs text-muted-foreground truncate">{user?.profile.occupation || 'Member'}</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-grow flex flex-col gap-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/10' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer actions */}
        <div className="flex flex-col gap-2 mt-auto border-t border-border pt-4">
          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all cursor-pointer"
          >
            {theme === 'light' ? (
              <>
                <Moon className="h-5 w-5 text-indigo-500" />
                <span>Dark Mode</span>
              </>
            ) : (
              <>
                <Sun className="h-5 w-5 text-yellow-500" />
                <span>Light Mode</span>
              </>
            )}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Page Container */}
      <main className="flex-grow pb-24 md:pb-6 overflow-y-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 max-w-7xl mx-auto w-full">
        {/* Header (Mobile Title / Desktop Header bar) */}
        <header className="flex justify-between items-center mb-6 md:mb-8 md:hidden">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center text-accent-foreground font-black text-lg">
              P
            </div>
            <h1 className="font-bold text-lg">Paila Todo</h1>
          </div>
          
          <button 
            onClick={toggleTheme} 
            className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center border border-border"
          >
            {theme === 'light' ? <Moon className="h-4 w-4 text-indigo-500" /> : <Sun className="h-4 w-4 text-yellow-500" />}
          </button>
        </header>

        {/* Dynamic Nested Routes */}
        <Outlet />
      </main>

      {/* 3. Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-card/80 backdrop-blur-lg border-t border-border flex justify-around items-center py-2 px-1 soft-shadow safe-bottom">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => 
              `flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                isActive 
                  ? 'text-accent' 
                  : 'text-muted-foreground hover:text-foreground'
              }`
            }
          >
            {item.icon}
            <span className="text-[10px] tracking-wide mt-0.5">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
