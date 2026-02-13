
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Toaster from '../ui/Toaster';

const MainLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-secondary">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-secondary p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  );
};

export default MainLayout;