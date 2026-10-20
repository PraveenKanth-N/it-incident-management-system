import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: ('ROLE_EMPLOYEE' | 'ROLE_TECHNICIAN' | 'ROLE_ADMIN')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div 
        style={{
          minHeight: '100vh',
          backgroundColor: '#000000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px'
        }}
      >
        <div 
          style={{
            width: '44px',
            height: '44px',
            border: '3px solid rgba(255, 255, 255, 0.1)',
            borderTopColor: '#00f2fe',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} 
        />
        <div 
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '13px',
            fontWeight: 600,
            color: '#94a3b8',
            letterSpacing: '0.1em',
            textTransform: 'uppercase'
          }}
        >
          Verifying Identity &amp; RBAC Token...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirectUrl = location.pathname !== '/' ? `?redirect=${encodeURIComponent(location.pathname)}` : '';
    return <Navigate to={`/login${redirectUrl}`} replace state={{ from: location }} />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};
