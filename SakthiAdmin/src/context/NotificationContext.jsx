import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import apiClient from '../api/apiClient';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await apiClient.get('/api/admin/ideas/notifications');
      setNotifications(res.data.notifications || []);
    } catch (err) {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await apiClient.patch(`/api/admin/ideas/notifications/${id}/read`);
      setNotifications((prev) => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (err) {}
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.patch('/api/admin/ideas/notifications/read-all');
      setNotifications((prev) => prev.map(n => ({ ...n, isRead: true, readAt: n.readAt || new Date() })));
    } catch (err) {}
  };

  useEffect(() => {
    fetchNotifications();
    // Optionally, poll every X seconds
    // const interval = setInterval(fetchNotifications, 60000);
    // return () => clearInterval(interval);
  }, [user]);

  return (
    <NotificationContext.Provider value={{ notifications, loading, refreshNotifications: fetchNotifications, markAsRead, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
}; 