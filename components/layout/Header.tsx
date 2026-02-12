
import React from 'react';
import { Search, Bell, User, Menu } from 'lucide-react';
import Button from '../ui/Button';

const Header: React.FC = () => {
  return (
    <header className="flex items-center justify-between h-20 px-4 sm:px-6 lg:px-8 bg-card border-b border-border">
       <button className="md:hidden text-muted-foreground">
        <Menu className="w-6 h-6" />
      </button>
      <div className="relative hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search sites..."
          className="w-full max-w-xs pl-10 pr-4 py-2 bg-secondary border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon">
          <Bell className="w-5 h-5 text-muted-foreground" />
        </Button>
        <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-5 h-5 text-muted-foreground" />
            </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-foreground">Admin User</p>
            <p className="text-xs text-muted-foreground">admin@theplatform.com</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
