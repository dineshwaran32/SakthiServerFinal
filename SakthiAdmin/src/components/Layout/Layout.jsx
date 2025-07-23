import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleMenuClose = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar 
        onMenuToggle={handleMenuToggle}
        isMobileMenuOpen={isMobileMenuOpen}
      />
      <div className="flex-1 flex flex-col lg:flex-row">
        <Sidebar 
          isOpen={isMobileMenuOpen}
          onClose={handleMenuClose}
        />
        <main className="flex-1 w-full min-w-0">
          <div className="p-2 sm:p-4 md:p-6 lg:p-8 max-w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;