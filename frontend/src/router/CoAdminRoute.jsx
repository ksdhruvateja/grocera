import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * CoAdminRoute - Protects routes that require 'admin' OR 'co-admin' role
 * Allows both admins and co-admins to access
 * Redirects customers to homepage
 */
function CoAdminRoute({ children }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has admin or co-admin role
  const isAdminOrCoAdmin = user?.role === 'admin' || user?.role === 'co-admin';

  // Redirect to homepage if not admin or co-admin
  if (!isAdminOrCoAdmin) {
    return <Navigate to="/" replace />;
  }

  // User is authenticated and has proper role - render children
  return children;
}

export default CoAdminRoute;
