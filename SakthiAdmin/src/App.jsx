import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './components/Auth/Login';
import { NotificationProvider } from './context/NotificationContext';

// Lazy load components for better performance
const Leaderboard = React.lazy(() => import('./pages/Leaderboard'));
const EmployeeManagement = React.lazy(() => import('./pages/EmployeeManagement'));
const AdminIdeasDashboard = React.lazy(() => import('./pages/AdminIdeasDashboard'));

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600">Loading...</span>
  </div>
);

// Remove or comment out this line:
// axios.defaults.baseURL = 'http://localhost:5001';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Admin Route component
const AdminRoute = ({ children }) => {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
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
                path="/*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Suspense fallback={<LoadingSpinner />}>
                        <Routes>
                          <Route path="/" element={<AdminIdeasDashboard />} />
                          <Route path="/leaderboard" element={<Leaderboard />} />
                          <Route
                            path="/employees"
                            element={
                              <AdminRoute>
                                <EmployeeManagement />
                              </AdminRoute>
                            }
                          />
                          <Route
                            path="/reviewers"
                            element={
                              <AdminRoute>
                                <EmployeeManagement />
                              </AdminRoute>
                            }
                          />
                          <Route
                            path="/admin-ideas-dashboard"
                            element={
                              <AdminRoute>
                                <AdminIdeasDashboard />
                              </AdminRoute>
                            }
                          />
                        </Routes>
                      </Suspense>
                    </Layout>
                  </ProtectedRoute>
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