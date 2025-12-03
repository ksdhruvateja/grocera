import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute - Protects routes that require authentication
 * with optional role-based access control
 * 
 * Props:
 * - children: React components to render if authorized
 * - adminOnly: Boolean - requires admin role (deprecated, use AdminRoute instead)
 * - coAdminOnly: Boolean - requires co-admin role specifically
 * - allowRoles: Array - list of allowed roles ['admin', 'co-admin', 'customer']
 */
function ProtectedRoute({ 
  children, 
  adminOnly = false, 
  coAdminOnly = false,
  allowRoles = null 
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mb-4"></div>
          <p className="text-gray-400">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role-based access control
  const userRole = user?.role;

  // Check adminOnly flag (legacy support)
  if (adminOnly && userRole !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // Check coAdminOnly flag
  if (coAdminOnly && userRole !== 'co-admin') {
    return <Navigate to="/" replace />;
  }

  // Check allowRoles array if provided
  if (allowRoles && Array.isArray(allowRoles)) {
    if (!allowRoles.includes(userRole)) {
      return <Navigate to="/" replace />;
    }
  }

  // User is authenticated and authorized - render children
  return children;
}

export default ProtectedRoute;
