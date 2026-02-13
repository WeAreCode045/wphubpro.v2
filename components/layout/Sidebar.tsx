
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Globe, Library, Gem, Settings, LifeBuoy, LogOut, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/sites', icon: Globe, label: 'Sites' },
    { to: '/library', icon: Library, label: 'Library' },
    { to: '/subscription', icon: Gem, label: 'Subscription' },
  ];

  const NavItem = ({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }`
      }
    >
      <Icon className="w-5 h-5 mr-3" />
      <span className="truncate">{label}</span>
    </NavLink>
  );

  return (
    <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border">
      <div className="flex items-center justify-center h-20 border-b border-border">
        <div className="flex items-center space-x-2">
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-primary">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
          </svg>
          <span className="text-xl font-bold text-foreground">The Platform</span>
        </div>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>
      <div className="px-4 py-6 border-t border-border mt-auto space-y-4">
        <div className="flex items-center space-x-3 px-4">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-5 h-5 text-muted-foreground" />
            </div>
          <div>
            <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <div className="space-y-1">
          <NavItem to="/settings" icon={Settings} label="Settings" />
          <NavItem to="/support" icon={LifeBuoy} label="Support" />
        </div>
         <Button variant="ghost" className="w-full justify-start px-4 text-muted-foreground hover:bg-accent" onClick={logout}>
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
