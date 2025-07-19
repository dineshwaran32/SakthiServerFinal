import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './components/Auth/Login';
import Leaderboard from './pages/Leaderboard';
import EmployeeManagement from './pages/EmployeeManagement';
import AdminIdeasDashboard from './pages/AdminIdeasDashboard';
import { NotificationProvider } from './context/NotificationContext';

// Remove or comment out this line:
// axios.defaults.baseURL = 'http://localhost:5001';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Admin Route component
const AdminRoute = ({ children }) => {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  return isAdmin ? children : <Navigate to="/" replace />;
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <AdminIdeasDashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leaderboard"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Leaderboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employees"
                element={
                  <AdminRoute>
                    <Layout>
                      <EmployeeManagement />
                    </Layout>
                  </AdminRoute>
                }
              />
              <Route
                path="/reviewers"
                element={
                  <AdminRoute>
                    <Layout>
                      <EmployeeManagement />
                    </Layout>
                  </AdminRoute>
                }
              />
              <Route
                path="/admin-ideas-dashboard"
                element={
                  <AdminRoute>
                    <Layout>
                      <AdminIdeasDashboard />
                    </Layout>
                  </AdminRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;