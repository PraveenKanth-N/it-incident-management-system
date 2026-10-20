import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const RegisterPage: React.FC = () => {
  const { register, authError, clearError, isLoading } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState<string | null>(null);

  // Password validation metrics
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumberOrSymbol = /[0-9!@#$%^&*(),.?":{}|<>]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  // Auto-generate username suggestion from email if empty
  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }));
    if (!username && val.includes('@')) {
      const suggested = val.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '');
      setUsername(suggested);
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!fullName.trim()) {
      errors.fullName = 'Full legal name is required';
    } else if (fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters';
    }

    if (!email.trim()) {
      errors.email = 'Corporate email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please provide a valid corporate email address';
    }

    if (!username.trim()) {
      errors.username = 'Account username is required';
    } else if (username.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9._-]+$/.test(username.trim())) {
      errors.username = 'Username can only contain letters, numbers, dots, and hyphens';
    }

    if (!password) {
      errors.password = 'Account password is required';
    } else if (!hasMinLength) {
      errors.password = 'Password must be at least 8 characters long';
    } else if (!hasUpperCase || !hasLowerCase || !hasNumberOrSymbol) {
      errors.password = 'Password does not meet enterprise complexity criteria';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirmation password is required';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setRegistrationSuccess(null);

    if (!validate()) return;

    setIsSubmitting(true);
    const success = await register(
      {
        fullName: fullName.trim(),
        email: email.trim(),
        username: username.trim(),
        department: department.trim() || 'General Operations',
        password
      },
      rememberMe
    );
    setIsSubmitting(false);

    if (success) {
      setRegistrationSuccess(`Employee profile registered for ${fullName.trim()}. Provisioning your self-service portal...`);
      setTimeout(() => {
        navigate('/workspace/employee', { replace: true });
      }, 1400);
    }
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
        padding: '40px 16px',
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

      {/* Top Left Navigation Link */}
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

      {/* Main Registration Card */}
      <div 
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '560px',
          boxSizing: 'border-box',
          backgroundColor: 'rgba(10, 4, 18, 0.88)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 65, 108, 0.25)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(122, 0, 38, 0.35)',
          padding: '36px 28px',
          position: 'relative',
          zIndex: 10,
          backdropFilter: 'blur(20px)'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '10px',
              padding: '6px 14px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: '14px'
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00ff87' }} />
            <span 
              style={{ 
                fontFamily: 'var(--font-display)', 
                fontSize: '11px', 
                fontWeight: 700, 
                letterSpacing: '0.12em',
                color: '#cbd5e1',
                textTransform: 'uppercase'
              }}
            >
              Enterprise IT Service Portal
            </span>
          </div>

          <h1 
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '28px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              margin: '0 0 8px 0',
              background: 'linear-gradient(135deg, #ffffff 0%, #ff9a8b 60%, #ff6a88 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Employee Registration
          </h1>
          <p 
            style={{ 
              fontSize: '13px', 
              color: '#94a3b8', 
              margin: 0,
              lineHeight: 1.5 
            }}
          >
            Create your authenticated corporate account for instant incident reporting and resolution tracking.
          </p>
        </div>

        {/* Security Role Notice */}
        <div 
          style={{
            backgroundColor: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '12px 14px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}
        >
          <span style={{ fontSize: '15px', color: '#38bdf8', lineHeight: 1 }}>🛡️</span>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', lineHeight: 1.45 }}>
            <strong style={{ color: '#e2e8f0' }}>Strict Role-Based Governance: </strong>
            All self-registrations are provisioned with <code style={{ color: '#60efa0' }}>ROLE_EMPLOYEE</code> access.
            Elevated Technician and Administrator credentials are strictly provisioned by IT Security.
          </div>
        </div>

        {/* Success Alert Banner */}
        {registrationSuccess && (
          <div 
            style={{
              backgroundColor: 'rgba(0, 255, 135, 0.12)',
              border: '1px solid rgba(0, 255, 135, 0.4)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <div 
              style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(0, 255, 135, 0.3)',
                borderTopColor: '#00ff87',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} 
            />
            <span style={{ fontSize: '13px', color: '#60efa0', fontWeight: 600 }}>
              {registrationSuccess}
            </span>
          </div>
        )}

        {/* Error Alert Banner */}
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
              gap: '10px'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', color: '#f87171', fontWeight: 600 }}>Registration Error</div>
              <div style={{ fontSize: '12px', color: '#fca5a5', marginTop: '2px' }}>{authError}</div>
            </div>
            <button 
              type="button" 
              onClick={clearError}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
              title="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Row 1: Full Name & Username */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '14px' }}>
            {/* Full Name */}
            <div>
              <label 
                htmlFor="reg-fullName"
                style={{ 
                  display: 'block', 
                  fontFamily: 'var(--font-display)', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: '#cbd5e1', 
                  marginBottom: '6px' 
                }}
              >
                Full Legal Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                id="reg-fullName"
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (fieldErrors.fullName) setFieldErrors(prev => ({ ...prev, fullName: '' }));
                }}
                placeholder="e.g. Alex Morgan"
                autoComplete="name"
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(2, 6, 23, 0.8)',
                  border: fieldErrors.fullName ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '11px 14px',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  fontFamily: 'var(--font-body)',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  if (!fieldErrors.fullName) {
                    e.currentTarget.style.borderColor = '#38bdf8';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(56, 189, 248, 0.15)';
                  }
                }}
                onBlur={(e) => {
                  if (!fieldErrors.fullName) {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              />
              {fieldErrors.fullName && (
                <span style={{ display: 'block', fontSize: '11px', color: '#f87171', marginTop: '4px', fontWeight: 500 }}>
                  {fieldErrors.fullName}
                </span>
              )}
            </div>

            {/* Username */}
            <div>
              <label 
                htmlFor="reg-username"
                style={{ 
                  display: 'block', 
                  fontFamily: 'var(--font-display)', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: '#cbd5e1', 
                  marginBottom: '6px' 
                }}
              >
                Username <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                id="reg-username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''));
                  if (fieldErrors.username) setFieldErrors(prev => ({ ...prev, username: '' }));
                }}
                placeholder="e.g. alex.morgan"
                autoComplete="username"
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(2, 6, 23, 0.8)',
                  border: fieldErrors.username ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '11px 14px',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                  transition: 'all 0.2s ease'
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
              {fieldErrors.username && (
                <span style={{ display: 'block', fontSize: '11px', color: '#f87171', marginTop: '4px', fontWeight: 500 }}>
                  {fieldErrors.username}
                </span>
              )}
            </div>
          </div>

          {/* Row 2: Email & Department */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '14px' }}>
            {/* Email Address */}
            <div>
              <label 
                htmlFor="reg-email"
                style={{ 
                  display: 'block', 
                  fontFamily: 'var(--font-display)', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: '#cbd5e1', 
                  marginBottom: '6px' 
                }}
              >
                Corporate Email <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="alex.morgan@resolv.internal"
                autoComplete="email"
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(2, 6, 23, 0.8)',
                  border: fieldErrors.email ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '11px 14px',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  fontFamily: 'var(--font-body)',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  if (!fieldErrors.email) {
                    e.currentTarget.style.borderColor = '#38bdf8';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(56, 189, 248, 0.15)';
                  }
                }}
                onBlur={(e) => {
                  if (!fieldErrors.email) {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              />
              {fieldErrors.email && (
                <span style={{ display: 'block', fontSize: '11px', color: '#f87171', marginTop: '4px', fontWeight: 500 }}>
                  {fieldErrors.email}
                </span>
              )}
            </div>

            {/* Department */}
            <div>
              <label 
                htmlFor="reg-dept"
                style={{ 
                  display: 'block', 
                  fontFamily: 'var(--font-display)', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: '#cbd5e1', 
                  marginBottom: '6px' 
                }}
              >
                Department / Business Unit
              </label>
              <select
                id="reg-dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(2, 6, 23, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '11px 14px',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  fontFamily: 'var(--font-body)',
                  outline: 'none'
                }}
              >
                <option value="" style={{ backgroundColor: '#0d0208' }}>Select Department...</option>
                <option value="Global Marketing" style={{ backgroundColor: '#0d0208' }}>Global Marketing</option>
                <option value="Finance & Accounting" style={{ backgroundColor: '#0d0208' }}>Finance &amp; Accounting</option>
                <option value="Human Resources" style={{ backgroundColor: '#0d0208' }}>Human Resources</option>
                <option value="Legal & Compliance" style={{ backgroundColor: '#0d0208' }}>Legal &amp; Compliance</option>
                <option value="Engineering & Product" style={{ backgroundColor: '#0d0208' }}>Engineering &amp; Product</option>
                <option value="Sales Operations" style={{ backgroundColor: '#0d0208' }}>Sales Operations</option>
                <option value="Supply Chain & Logistics" style={{ backgroundColor: '#0d0208' }}>Supply Chain &amp; Logistics</option>
                <option value="Corporate IT / NOC" style={{ backgroundColor: '#0d0208' }}>Corporate IT / NOC</option>
              </select>
            </div>
          </div>

          {/* Row 3: Password & Confirm Password */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '8px' }}>
            {/* Password */}
            <div>
              <label 
                htmlFor="reg-password"
                style={{ 
                  display: 'block', 
                  fontFamily: 'var(--font-display)', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: '#cbd5e1', 
                  marginBottom: '6px' 
                }}
              >
                Password <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' }));
                  }}
                  placeholder="At least 8 chars"
                  autoComplete="new-password"
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(2, 6, 23, 0.8)',
                    border: fieldErrors.password ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '11px 38px 11px 14px',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    fontFamily: 'var(--font-body)',
                    outline: 'none',
                    transition: 'all 0.2s ease'
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
                  style={{
                    position: 'absolute',
                    right: '10px',
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
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <span style={{ display: 'block', fontSize: '11px', color: '#f87171', marginTop: '4px', fontWeight: 500 }}>
                  {fieldErrors.password}
                </span>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label 
                htmlFor="reg-confirmPassword"
                style={{ 
                  display: 'block', 
                  fontFamily: 'var(--font-display)', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: '#cbd5e1', 
                  marginBottom: '6px' 
                }}
              >
                Confirm Password <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: '' }));
                  }}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(2, 6, 23, 0.8)',
                    border: fieldErrors.confirmPassword ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '11px 38px 11px 14px',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    fontFamily: 'var(--font-body)',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    if (!fieldErrors.confirmPassword) {
                      e.currentTarget.style.borderColor = '#38bdf8';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(56, 189, 248, 0.15)';
                    }
                  }}
                  onBlur={(e) => {
                    if (!fieldErrors.confirmPassword) {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
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
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <span style={{ display: 'block', fontSize: '11px', color: '#f87171', marginTop: '4px', fontWeight: 500 }}>
                  {fieldErrors.confirmPassword}
                </span>
              )}
            </div>
          </div>

          {/* Real-time Password Requirements Checklist */}
          <div 
            style={{
              backgroundColor: 'rgba(2, 6, 23, 0.6)',
              borderRadius: '10px',
              padding: '10px 12px',
              marginBottom: '16px',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}
          >
            <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
              Password Requirements
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontSize: '11px' }}>
              <span style={{ color: hasMinLength ? '#00ff87' : '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>{hasMinLength ? '✓' : '○'}</span> At least 8 characters
              </span>
              <span style={{ color: hasUpperCase ? '#00ff87' : '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>{hasUpperCase ? '✓' : '○'}</span> Upper case letter (A-Z)
              </span>
              <span style={{ color: hasLowerCase ? '#00ff87' : '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>{hasLowerCase ? '✓' : '○'}</span> Lower case letter (a-z)
              </span>
              <span style={{ color: hasNumberOrSymbol ? '#00ff87' : '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>{hasNumberOrSymbol ? '✓' : '○'}</span> Number or symbol (0-9, !)
              </span>
              {confirmPassword.length > 0 && (
                <span style={{ gridColumn: 'span 2', color: passwordsMatch ? '#00ff87' : '#f87171', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span>{passwordsMatch ? '✓' : '✕'}</span> {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                </span>
              )}
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '20px',
              fontSize: '12px',
              color: '#94a3b8'
            }}
          >
            <label 
              htmlFor="reg-rememberMe"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <input
                id="reg-rememberMe"
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
              <span style={{ color: '#cbd5e1' }}>Remember my session on this trusted device</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="btn-pill btn-pill-amber-pink"
            id="btn-register-submit"
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
                <span>Registering Account...</span>
              </>
            ) : (
              <>
                <span>Complete Registration</span>
                <span>→</span>
              </>
            )}
          </button>

          {/* Sign In Link */}
          <div 
            style={{ 
              marginTop: '18px', 
              textAlign: 'center',
              fontSize: '12.5px',
              color: '#94a3b8'
            }}
          >
            <span>Already have an account? </span>
            <Link
              to="/login"
              id="link-signin"
              style={{
                color: '#ff9a8b',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#38bdf8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#ff9a8b'; }}
            >
              Sign in to your workspace →
            </Link>
          </div>
        </form>

        {/* Security & Compliance Badges */}
        <div 
          style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            fontSize: '10.5px',
            color: '#64748b',
            fontFamily: 'var(--font-mono)'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#00ff87' }}>●</span> BCrypt Encrypted
          </span>
          <span>•</span>
          <span>Zero Role Escalation</span>
          <span>•</span>
          <span>ISO-27001</span>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
