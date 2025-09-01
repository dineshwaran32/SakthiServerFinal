import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Trophy, Users, UserCheck, BarChart3, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { isAdmin, canManageEmployees } = useAuth();

  const navigationItems = [
    {
      name: 'Ideas Dashboard',
      href: '/',
      icon: Home,
      description: 'Manage and review ideas'
    },
    {
      name: 'Leaderboard',
      href: '/leaderboard',
      icon: Trophy,
      description: 'Employee rankings'
    },
    {
      name: 'Employee Management',
      href: '/employees',
      icon: Users,
      description: 'Manage employee data',
      adminOnly: true
    }
    // {
    //   name: 'Ideas Dashboard',
    //   href: '/admin-ideas-dashboard',
    //   icon: BarChart3,
    //   description: 'Ideas statistics and overview',
    //   adminOnly: true
    // }
    // {
    //   name: 'Reviewer Management',
    //   href: '/reviewers',
    //   icon: UserCheck,
    //   description: 'Manage reviewer accounts',
    //   adminOnly: true
    // }
  ];

  const filteredItems = navigationItems.filter(item => 
    !item.adminOnly || (item.adminOnly && isAdmin)
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-screen w-64 bg-surface shadow-xl border-r border-background transform transition-transform duration-300 ease-in-out z-50 lg:relative lg:top-0 lg:translate-x-0 lg:z-auto ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${isOpen ? '' : 'pointer-events-none lg:pointer-events-auto'}`}>
        {/* Mobile Close Button */}
        <div className="lg:hidden flex justify-end p-2">
          <button onClick={onClose} className="p-2 rounded hover:bg-background focus:outline-none">
            <span className="sr-only">Close sidebar</span>
            <svg className="h-6 w-6 text-onSurface" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex flex-col h-full">
          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {filteredItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={onClose}
                className={({ isActive }) =>
                  `group flex items-center px-4 py-3 text-base font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-onPrimary shadow-lg'
                      : 'text-onSurface hover:bg-surfaceVariant hover:text-onSurface'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={`mr-3 h-5 w-5 transition-colors ${
                        isActive ? 'text-onPrimary' : 'text-onSurfaceVariant group-hover:text-onSurface'
                      }`}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className={`text-sm ${
                        isActive ? 'text-onPrimary' : 'text-onSurfaceVariant'
                      }`}>
                        {item.description}
                      </div>
                    </div>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Footer */}

        </div>
      </div>
    </>
  );
};

export default Sidebar;