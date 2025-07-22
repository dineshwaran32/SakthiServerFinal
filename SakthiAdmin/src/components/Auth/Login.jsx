import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    employeeNumber: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, isAuthenticated } = useAuth();

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted with:', formData);
    setLoading(true);
    setError('');

    try {
      const result = await login(formData.employeeNumber, formData.password);
      console.log('Login result:', result);
      if (!result.success) {
        setError(result.message);
      }
    } catch (err) {
      console.error('Login error in component:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Lock className="h-8 w-8 text-onPrimary" />
          </div>
          <h2 className="mt-6 text-4xl font-bold text-onSurface">
            Sakthi Spark
          </h2>
          <p className="mt-2 text-base text-onSurfaceVariant">
            Sign in to your Admin & Reviewer Portal
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-surface rounded-2xl shadow-xl p-8 space-y-6">
          {error && (
            <div className="bg-error bg-opacity-10 border border-error rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-error mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-base font-medium text-error">Login Failed</p>
                <p className="text-base text-error mt-1">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Employee Number Field */}
            <div>
              <label htmlFor="employeeNumber" className="block text-base font-medium text-onSurface mb-2">
                Employee Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-onSurfaceVariant" />
                </div>
                <input
                  id="employeeNumber"
                  name="employeeNumber"
                  type="text"
                  required
                  value={formData.employeeNumber}
                  onChange={handleChange}
                  className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-background placeholder-onSurfaceVariant text-onSurface rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:z-10 transition-colors"
                  placeholder="Enter your employee number"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-base font-medium text-onSurface mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-onSurfaceVariant" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none relative block w-full pl-10 pr-12 py-3 border border-background placeholder-onSurfaceVariant text-onSurface rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:z-10 transition-colors"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-onSurfaceVariant hover:text-onSurface" />
                  ) : (
                    <Eye className="h-5 w-5 text-onSurfaceVariant hover:text-onSurface" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-onPrimary bg-primary hover:bg-tertiary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin mr-2" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>

          {/* Demo Credentials
          <div className="mt-6 p-4 bg-primary-container border border-primary rounded-lg">
            <h4 className="text-base font-medium text-primary mb-2">Demo Credentials</h4>
            <div className="text-sm text-primary space-y-1">
              <p><strong>Admin:</strong> admin@example.com / admin123</p>
              <p><strong>Reviewer:</strong> reviewer@example.com / reviewer123</p>
            </div>
          </div> */}
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-onSurfaceVariant">
            Sakthi Spark v1.0 • Admin & Reviewer Dashboard
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;