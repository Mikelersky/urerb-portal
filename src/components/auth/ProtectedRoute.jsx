import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getCurrentUser } from '../../utils/auth';
import { ROUTES } from '../../constants/routes';

export default function ProtectedRoute({ allowedRoles, children }) {
  const user = getCurrentUser();
  const location = useLocation();

  if (!user) {
    return <Navigate to={ROUTES.AUTH.LOGIN} state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to the user's role-specific dashboard
    if (user.role === 'secretariat') {
      return <Navigate to={ROUTES.SECRETARIAT.DASHBOARD} replace />;
    }
    if (user.role === 'reviewer') {
      return <Navigate to={ROUTES.REVIEWER.DASHBOARD} replace />;
    }
    return <Navigate to={ROUTES.RESEARCHER.DASHBOARD} replace />;
  }

  return children ? children : null;
}

