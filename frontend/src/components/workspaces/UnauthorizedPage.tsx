import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const UnauthorizedPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const getRoleDisplayName = (role?: string) => {
    switch (role) {
      case 'ROLE_ADMIN': return 'Administrator / IT Commander';
      case 'ROLE_TECHNICIAN': return 'IT Support Technician';
      case 'ROLE_EMPLOYEE': return 'Standard Employee';
      default: return 'Authenticated User';
    }
  };

  const handleGoToMyWorkspace = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role === 'ROLE_ADMIN') {
      navigate('/workspace/admin');
    } else if (user.role === 'ROLE_TECHNICIAN') {
      navigate('/workspace/technician');
    } else {
      navigate('/workspace/employee');
    }
  };

  return (
    <div 
      style={{
        minHeight: '100vh',
        backgroundColor: '#000000',
        background: 'radial-gradient(circle at 50% 35%, rgba(122, 0, 38, 0.45) 0%, rgba(20, 5, 15, 0.95) 60%, #000000 100%)',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative'
      }}
    >
      {/* Background Grid Mesh */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          opacity: 0.4,
          pointerEvents: 'none'
        }}
      />

      <div 
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: '560px',
          width: '100%',
          backgroundColor: 'rgba(18, 16, 26, 0.85)',
          border: '1px solid rgba(255, 77, 79, 0.35)',
          borderRadius: '24px',
          padding: '48px 36px',
          textAlign: 'center',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 40px rgba(255, 77, 79, 0.15)'
        }}
      >
        {/* Shield Alert Icon */}
        <div 
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 77, 79, 0.12)',
            border: '2px solid rgba(255, 77, 79, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto',
            color: '#ff4d4f',
            boxShadow: '0 0 30px rgba(255, 77, 79, 0.3)'
          }}
        >
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>

        {/* Status Code Tag */}
        <div 
          style={{
            display: 'inline-block',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            fontWeight: 700,
            color: '#ff4d4f',
            backgroundColor: 'rgba(255, 77, 79, 0.1)',
            padding: '4px 12px',
            borderRadius: '9999px',
            letterSpacing: '0.15em',
            marginBottom: '16px',
            border: '1px solid rgba(255, 77, 79, 0.25)'
          }}
        >
          HTTP 403 // INSUFFICIENT PRIVILEGES
        </div>

        <h1 
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '28px',
            color: '#ffffff',
            margin: '0 0 12px 0',
            letterSpacing: '-0.02em'
          }}
        >
          Access Denied
        </h1>

        <p 
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '14.5px',
            lineHeight: 1.6,
            color: '#cbd5e1',
            margin: '0 0 28px 0'
          }}
        >
          Your active identity <strong style={{ color: '#ffffff' }}>@{user?.username || 'user'}</strong> is registered under role{' '}
          <span 
            style={{
              fontFamily: 'var(--font-mono)',
              color: '#38bdf8',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              padding: '2px 8px',
              borderRadius: '4px'
            }}
          >
            {user?.role || 'UNKNOWN'}
          </span>{' '}
          ({getRoleDisplayName(user?.role)}). You do not hold the required security clearance for this protected workspace.
        </p>

        {/* Security Notice Box */}
        <div 
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '14px 18px',
            textAlign: 'left',
            marginBottom: '32px',
            fontSize: '12.5px',
            color: '#94a3b8',
            lineHeight: 1.5
          }}
        >
          <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }}>
            🔒 Role-Based Authorization Enforcement
          </div>
          Access attempts are cryptographically validated against Spring Security RBAC authorities and audited. If you require elevated access, contact your Incident Commander.
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={handleGoToMyWorkspace}
            className="btn-pill btn-pill-amber-pink"
            style={{
              width: '100%',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <span>Proceed to My Designated Workspace</span>
            <span>→</span>
          </button>

          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            style={{
              width: '100%',
              padding: '11px 24px',
              fontSize: '13.5px',
              fontWeight: 600,
              fontFamily: 'var(--font-display)',
              color: '#94a3b8',
              backgroundColor: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '9999px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Sign Out &amp; Authenticate as Different Role
          </button>

          <Link
            to="/"
            style={{
              marginTop: '8px',
              fontSize: '13px',
              color: '#64748b',
              textDecoration: 'none',
              fontFamily: 'var(--font-display)',
              fontWeight: 500
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#cbd5e1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; }}
          >
            ← Back to Executive Command Hub Overview
          </Link>
        </div>
      </div>
    </div>
  );
};
