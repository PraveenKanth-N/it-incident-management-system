import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, authError, clearError, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Retrieve destination redirect if user attempted to visit a protected route
  const searchParams = new URLSearchParams(location.search);
  const redirectTarget = searchParams.get('redirect') || '/workspace';

  const validate = (): boolean => {
    const errors: { username?: string; password?: string } = {};
    if (!username.trim()) {
      errors.username = 'Corporate username or email is required';
    }
    if (!password) {
      errors.password = 'Account password is required';
    } else if (password.length < 4) {
      errors.password = 'Password must be at least 4 characters';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validate()) return;

    setIsSubmitting(true);
    const success = await login(username.trim(), password, rememberMe);
    setIsSubmitting(false);

    if (success) {
      navigate(redirectTarget, { replace: true });
    }
  };

  // Development-only credential autofill helper (only active when import.meta.env.DEV is true)
  const handleQuickFill = (presetUsername: string) => {
    clearError();
    setFieldErrors({});
    setUsername(presetUsername);
    setPassword('Password123!');
  };

  return (
    <div 
      style={{
        minHeight: '100vh',
        backgroundColor: '#000000',
        background: 'radial-gradient(ellipse at 50% 25%, #7a0026 0%, #3d003e 45%, #080010 85%, #000000 100%)',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background Mesh Overlay */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          opacity: 0.35,
          pointerEvents: 'none'
        }}
      />

      {/* Top Left Return Link */}
      <div 
        style={{
          position: 'absolute',
          top: '28px',
          left: '36px',
          zIndex: 20
        }}
      >
        <Link 
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#94a3b8',
            fontFamily: 'var(--font-display)',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'color 0.2s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#38bdf8'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Executive Hub Overview</span>
        </Link>
      </div>

      {/* Main Glassmorphic Login Card */}
      <div 
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: '480px',
          width: '100%',
          boxSizing: 'border-box',
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '24px',
          padding: '36px 28px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(122, 0, 38, 0.3)'
        }}
      >
        {/* Brand Icon & Heading */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div 
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #7A0026 0%, #3D003E 60%, #1582C5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 900,
              fontFamily: 'var(--font-display)',
              fontSize: '24px',
              margin: '0 auto 16px auto',
              boxShadow: '0 6px 20px rgba(122, 0, 38, 0.5)'
            }}
          >
            R
          </div>

          <div 
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: '26px',
              color: '#ffffff',
              letterSpacing: '-0.02em',
              textTransform: 'lowercase',
              lineHeight: 1.1
            }}
          >
            resolv
          </div>
          <div 
            style={{
              fontSize: '9.5px',
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              color: '#38bdf8',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              marginTop: '4px'
            }}
          >
            SERVICE DESK // ACCESS GATEWAY
          </div>

          <p 
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '13.5px',
              color: '#94a3b8',
              marginTop: '12px',
              lineHeight: 1.5
            }}
          >
            Enter your corporate credentials to access your designated IT operations workbench.
          </p>
        </div>

        {/* Global Error Banner */}
        {authError && (
          <div 
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              animation: 'fadeIn 0.25s ease'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: '2px' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#fca5a5' }}>
                Authentication Error
              </div>
              <div style={{ fontSize: '12px', color: '#fecaca', marginTop: '2px', lineHeight: 1.4 }}>
                {authError}
              </div>
            </div>
            <button
              onClick={clearError}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#f87171',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '2px'
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Username Field */}
          <div style={{ marginBottom: '18px' }}>
            <label 
              htmlFor="login-username"
              style={{
                display: 'block',
                fontFamily: 'var(--font-display)',
                fontSize: '11px',
                fontWeight: 700,
                color: '#cbd5e1',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '8px'
              }}
            >
              Username / Corporate ID
            </label>
            <div style={{ position: 'relative' }}>
              <span 
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (fieldErrors.username) setFieldErrors(prev => ({ ...prev, username: undefined }));
                }}
                placeholder="e.g. admin.super, tech.dave, or alice.emp"
                autoComplete="username"
                autoFocus
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(2, 6, 23, 0.8)',
                  border: fieldErrors.username ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '12px 14px 12px 42px',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontFamily: 'var(--font-body)',
                  outline: 'none',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                }}
                onFocus={(e) => {
                  if (!fieldErrors.username) {
                    e.currentTarget.style.borderColor = '#38bdf8';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(56, 189, 248, 0.15)';
                  }
                }}
                onBlur={(e) => {
                  if (!fieldErrors.username) {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              />
            </div>
            {fieldErrors.username && (
              <span style={{ display: 'block', fontSize: '11.5px', color: '#f87171', marginTop: '6px', fontWeight: 500 }}>
                {fieldErrors.username}
              </span>
            )}
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label 
                htmlFor="login-password"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#cbd5e1',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}
              >
                Password
              </label>
            </div>
            <div style={{ position: 'relative' }}>
              <span 
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
                }}
                placeholder="••••••••••••"
                autoComplete="current-password"
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(2, 6, 23, 0.8)',
                  border: fieldErrors.password ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '12px 42px 12px 42px',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontFamily: 'var(--font-body)',
                  outline: 'none',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                }}
                onFocus={(e) => {
                  if (!fieldErrors.password) {
                    e.currentTarget.style.borderColor = '#38bdf8';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(56, 189, 248, 0.15)';
                  }
                }}
                onBlur={(e) => {
                  if (!fieldErrors.password) {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <span style={{ display: 'block', fontSize: '11.5px', color: '#f87171', marginTop: '6px', fontWeight: 500 }}>
                {fieldErrors.password}
              </span>
            )}
          </div>

          {/* Remember Me & Security Policy Note */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              margin: '4px 0 16px 0',
              fontSize: '12px',
              color: '#94a3b8'
            }}
          >
            <label 
              htmlFor="remember-me-checkbox"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <input
                id="remember-me-checkbox"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  width: '15px',
                  height: '15px',
                  borderRadius: '4px',
                  accentColor: '#ff416c',
                  cursor: 'pointer'
                }}
              />
              <span style={{ color: '#cbd5e1' }}>Remember me on this device</span>
            </label>
            <span 
              title="When checked, a bounded authentication token persists locally until expiry. When unchecked, session is strictly ephemeral to this tab."
              style={{
                fontSize: '11px',
                color: '#64748b',
                cursor: 'help',
                borderBottom: '1px dotted #64748b'
              }}
            >
              Security Policy
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="btn-pill btn-pill-amber-pink"
            id="btn-login-submit"
            style={{
              width: '100%',
              padding: '13px 24px',
              fontSize: '14.5px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: isSubmitting || isLoading ? 0.7 : 1,
              cursor: isSubmitting || isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting || isLoading ? (
              <>
                <div 
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTopColor: '#ffffff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} 
                />
                <span>Authenticating Credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In to Workspace</span>
                <span>→</span>
              </>
            )}
          </button>

          {/* Self-Registration Callout */}
          <div 
            style={{ 
              marginTop: '16px', 
              textAlign: 'center',
              fontSize: '12.5px',
              color: '#94a3b8'
            }}
          >
            <span>New employee without an account? </span>
            <Link
              to="/register"
              id="link-register"
              style={{
                color: '#ff9a8b',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#38bdf8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#ff9a8b'; }}
            >
              Register here →
            </Link>
          </div>
        </form>

        {/* Quick Demo Credentials - Safely isolated strictly to development builds */}
        {import.meta.env.DEV && (
          <div 
            style={{
              marginTop: '28px',
              paddingTop: '20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '6px',
                marginBottom: '10px'
              }}
            >
              <span 
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em'
                }}
              >
                Dev Environment Quick-Fill
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Default Seed Pass: <code style={{ color: '#38bdf8' }}>Password123!</code>
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleQuickFill('admin.super')}
                style={{
                  background: 'rgba(255, 65, 108, 0.1)',
                  border: '1px solid rgba(255, 65, 108, 0.3)',
                  borderRadius: '8px',
                  padding: '8px 6px',
                  color: '#ff9a8b',
                  fontSize: '11.5px',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Fill Admin Credentials"
              >
                👑 Admin
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('tech.dave')}
                style={{
                  background: 'rgba(0, 242, 254, 0.1)',
                  border: '1px solid rgba(0, 242, 254, 0.3)',
                  borderRadius: '8px',
                  padding: '8px 6px',
                  color: '#00f2fe',
                  fontSize: '11.5px',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Fill Technician Credentials"
              >
                🛠️ Tech
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('alice.emp')}
                style={{
                  background: 'rgba(96, 239, 160, 0.1)',
                  border: '1px solid rgba(96, 239, 160, 0.3)',
                  borderRadius: '8px',
                  padding: '8px 6px',
                  color: '#60efa0',
                  fontSize: '11.5px',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Fill Employee Credentials"
              >
                👤 Employee
              </button>
            </div>
          </div>
        )}

        {/* Security & Compliance Badges */}
        <div 
          style={{
            marginTop: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            fontSize: '10.5px',
            color: '#64748b',
            fontFamily: 'var(--font-mono)'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#00ff87' }}>●</span> TLS 1.3
          </span>
          <span>•</span>
          <span>AES-256 JWT</span>
          <span>•</span>
          <span>RBAC Guarded</span>
        </div>
      </div>
    </div>
  );
};
