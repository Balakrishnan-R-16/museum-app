import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useVisitorAuth } from '../../context/VisitorAuthContext';

/**
 * Protected route wrapper for visitor-only pages.
 * Redirects to login if not authenticated, preserving the intended destination.
 */
const VisitorRoute = ({ children }) => {
  const { isAuthenticated, loading } = useVisitorAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/visitor/login" state={{ from: location.pathname }} replace />;
  }

  return children;
};

export default VisitorRoute;
