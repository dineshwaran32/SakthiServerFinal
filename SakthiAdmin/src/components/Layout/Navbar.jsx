import React, { useState } from 'react';
import { Bell, User, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import logo from '../../logo.png';

const Navbar = ({ onMenuToggle, isMobileMenuOpen }) => {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const { notifications, loading: notifLoading, refreshNotifications, markAsRead, markAllAsRead } = useNotifications();

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  return (
    <nav className="bg-background shadow-lg border-b border-background sticky top-0 z-50 text-onPrimary">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and Menu */}
          <div className="flex items-center space-x-4">
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-md text-onPrimary hover:text-primary hover:bg-background transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
            
            <div className="flex items-center space-x-3">
              <img src={logo} alt="Sakthi Spark Logo" className="w-16 h-16 rounded-2xl object-contain" />
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-onPrimary">Sakthi Spark</h1>
                <p className="text-xs text-primary">Admin & Reviewer Dashboard</p>
              </div>
            </div>
          </div>

          {/* Right side - Notifications and User */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative">
              <button
                className="relative p-2 rounded-lg text-onPrimary hover:text-primary hover:bg-background transition-colors"
                aria-label="Notifications"
                onClick={() => setShowNotif(!showNotif)}
              >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </button>
              {showNotif && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 max-h-[32rem] overflow-y-auto">
                  <div className="px-6 py-3 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-xl">
                    <span className="font-semibold text-lg text-gray-900">Notifications</span>
                    <div className="flex items-center gap-3">
                      <button className="text-sm text-blue-600 hover:underline" onClick={refreshNotifications}>Refresh</button>
                      <button className="text-sm text-blue-600 hover:underline" onClick={markAllAsRead}>Mark all as read</button>
                    </div>
                  </div>
                  {notifLoading ? (
                    <div className="px-6 py-6 text-center text-blue-600 text-base">Loading...</div>
                  ) : notifications.length === 0 ? (
                    <div className="px-6 py-6 text-center text-gray-400 text-base">No notifications</div>
                  ) : (
                    notifications.slice(0, 10).map((notif, idx) => (
                      <div
                        key={notif._id || idx}
                        className={`group px-6 py-4 border-b border-gray-100 transition-all duration-150 ${!notif.isRead ? 'bg-yellow-50' : 'bg-white'} ${!notif.isRead ? 'shadow-md' : ''} rounded-lg mb-1 cursor-pointer hover:bg-tertiary hover:shadow-lg`}
                        onClick={() => !notif.isRead && markAsRead(notif._id)}
                      >
                        <div className="font-bold text-lg text-gray-900 mb-1">{notif.title}</div>
                        <div className="text-base text-gray-700 mb-2">{notif.message}</div>
                        <div className="text-s text-right text-primary mt-1 group-hover:text-surface">{new Date(notif.createdAt).toLocaleString()}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 p-2 rounded-lg text-onPrimary hover:text-primary hover:bg-background transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-primary to-tertiary rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-onPrimary" />
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-onPrimary">{user?.name}</p>
                  <p className="text-xs text-primary capitalize">{user?.role}</p>
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-background rounded-lg shadow-lg border border-background py-1 z-50">
                  <div className="px-4 py-2 border-b border-background">
                    <p className="text-sm font-medium text-onPrimary">{user?.name}</p>
                    <p className="text-xs text-primary">{user?.email}</p>
                    <span className="inline-block mt-1 px-2 py-1 text-xs bg-primary text-onPrimary rounded-full capitalize">
                      {user?.role}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-onPrimary hover:bg-background transition-colors"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;