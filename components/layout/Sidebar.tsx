import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Globe, 
  Library, 
  Gem, 
  Settings, 
  LifeBuoy, 
  User,
  ShieldCheck,
  Users,
  CreditCard,
  Package,
  LayoutGrid
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar: React.FC = () => {
  const { isAdmin } = useAuth();

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/sites', icon: Globe, label: 'Sites' },
    { to: '/library', icon: Library, label: 'Library' },
    { to: '/subscription', icon: Gem, label: 'Subscription' },
  ];

  const adminItems = [
    { to: '/admin/dashboard', icon: LayoutGrid, label: 'Admin Dashboard' },
    { to: '/admin/users', icon: Users, label: 'User Manager' },
    { to: '/admin/orders', icon: CreditCard, label: 'Orders' },
    { to: '/admin/plans', icon: Package, label: 'Plan Management' },
    { to: '/admin/settings', icon: Settings, label: 'Platform Settings' },
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
        <p className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Main</p>
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        {/* Admin Sectie: Alleen zichtbaar voor gebruikers met het 'Admin' label */}
        {isAdmin && (
          <div className="pt-6 mt-6 border-t border-border">
            <p className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center">
              <ShieldCheck className="w-3 h-3 mr-1" /> Admin Panel
            </p>
            {adminItems.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>
        )}
      </nav>

      <div className="px-4 py-6 border-t border-border mt-auto">
        <NavItem to="/settings" icon={Settings} label="Settings" />
        <NavItem to="/support" icon={LifeBuoy} label="Support" />
      </div>
    </aside>
  );
};

export default Sidebar;