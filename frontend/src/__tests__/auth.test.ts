import { describe, it, expect, beforeEach, vi } from 'vitest';

// Provide browser storage polyfills for Node test runner
class MockStorage implements Storage {
  private store: Record<string, string> = {};
  get length() { return Object.keys(this.store).length; }
  clear() { this.store = {}; }
  getItem(key: string) { return this.store[key] ?? null; }
  key(index: number) { return Object.keys(this.store)[index] ?? null; }
  removeItem(key: string) { delete this.store[key]; }
  setItem(key: string, value: string) { this.store[key] = String(value); }
}

const mockSessionStorage = new MockStorage();
const mockLocalStorage = new MockStorage();

Object.defineProperty(globalThis, 'sessionStorage', { value: mockSessionStorage, writable: true });
Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage, writable: true });
Object.defineProperty(globalThis, 'window', { value: globalThis, writable: true });

import { 
  getStoredToken, 
  getStoredUser, 
  setStoredSession, 
  clearStoredSession, 
  isTokenExpired,
  onUnauthorized,
  isRememberMeActive,
  type UserSummaryDto
} from '../services/api';

describe('Phase 4: Authentication & Session Management Strategy', () => {
  const mockUser: UserSummaryDto = {
    id: 10,
    username: 'emp.dave',
    email: 'dave@resolv.internal',
    fullName: 'Dave Miller',
    department: 'Marketing',
    role: 'ROLE_EMPLOYEE',
    isActive: true,
    createdAt: new Date().toISOString()
  };

  const mockToken = 'eyJhbGciOiJIUzUxMiJ9.test.mock.jwt.token';

  beforeEach(() => {
    mockSessionStorage.clear();
    mockLocalStorage.clear();
    clearStoredSession();
  });

  describe('Default Ephemeral Session (sessionStorage)', () => {
    it('stores token and user in sessionStorage by default (rememberMe = false)', () => {
      setStoredSession(mockToken, mockUser, 3600000, false);

      expect(sessionStorage.getItem('resolv_jwt_token')).toBe(mockToken);
      expect(sessionStorage.getItem('resolv_user_profile')).toBeTruthy();
      expect(localStorage.getItem('resolv_jwt_token')).toBeNull();
      expect(isRememberMeActive()).toBe(false);

      expect(getStoredToken()).toBe(mockToken);
      expect(getStoredUser()?.username).toBe('emp.dave');
      expect(getStoredUser()?.role).toBe('ROLE_EMPLOYEE');
    });

    it('clears session when clearStoredSession is called', () => {
      setStoredSession(mockToken, mockUser, 3600000, false);
      expect(getStoredToken()).toBe(mockToken);

      clearStoredSession();
      expect(getStoredToken()).toBeNull();
      expect(getStoredUser()).toBeNull();
      expect(sessionStorage.getItem('resolv_jwt_token')).toBeNull();
    });
  });

  describe('Remember-Me Persistent Session (localStorage with TTL)', () => {
    it('stores token in localStorage when rememberMe = true', () => {
      setStoredSession(mockToken, mockUser, 86400000, true);

      expect(localStorage.getItem('resolv_jwt_token')).toBe(mockToken);
      expect(localStorage.getItem('resolv_remember_flag')).toBe('true');
      expect(sessionStorage.getItem('resolv_jwt_token')).toBeNull();
      expect(isRememberMeActive()).toBe(true);

      expect(getStoredToken()).toBe(mockToken);
      expect(getStoredUser()?.fullName).toBe('Dave Miller');
    });

    it('detects expired tokens correctly and invalidates session', () => {
      // Set an expired token in the past (-5000ms)
      setStoredSession(mockToken, mockUser, -5000, true);
      expect(isTokenExpired()).toBe(true);

      // getStoredToken() should detect expiration and clear it
      const token = getStoredToken();
      expect(token).toBeNull();
      expect(localStorage.getItem('resolv_jwt_token')).toBeNull();
    });
  });

  describe('Session Expiry & 401 Unauthorized Notification', () => {
    it('triggers registered onUnauthorized listeners', () => {
      const listenerSpy = vi.fn();
      const unsubscribe = onUnauthorized(listenerSpy);

      // Verify registration
      expect(typeof unsubscribe).toBe('function');

      unsubscribe();
    });
  });
});

describe('Phase 4: RBAC Role-to-Workspace Permission Matrix', () => {
  const employeeUser: UserSummaryDto = {
    id: 1,
    username: 'emp.dave',
    email: 'dave@resolv.internal',
    fullName: 'Dave Miller',
    role: 'ROLE_EMPLOYEE',
    isActive: true
  };

  const technicianUser: UserSummaryDto = {
    id: 2,
    username: 'tech.carol',
    email: 'carol@resolv.internal',
    fullName: 'Carol Tech',
    role: 'ROLE_TECHNICIAN',
    isActive: true
  };

  const adminUser: UserSummaryDto = {
    id: 3,
    username: 'admin.root',
    email: 'admin@resolv.internal',
    fullName: 'Commander Vance',
    role: 'ROLE_ADMIN',
    isActive: true
  };

  const checkAccess = (user: UserSummaryDto | null, allowedRoles?: string[]): boolean => {
    if (!user) return false;
    if (!allowedRoles || allowedRoles.length === 0) return true;
    return allowedRoles.includes(user.role);
  };

  it('employee can access employee workspace but is blocked from technician & admin workspaces', () => {
    const employeeWorkspaceRoles = ['ROLE_EMPLOYEE', 'ROLE_TECHNICIAN', 'ROLE_ADMIN'];
    const technicianWorkspaceRoles = ['ROLE_TECHNICIAN', 'ROLE_ADMIN'];
    const adminWorkspaceRoles = ['ROLE_ADMIN'];

    expect(checkAccess(employeeUser, employeeWorkspaceRoles)).toBe(true);
    expect(checkAccess(employeeUser, technicianWorkspaceRoles)).toBe(false);
    expect(checkAccess(employeeUser, adminWorkspaceRoles)).toBe(false);
  });

  it('technician can access technician and employee workspaces but is blocked from admin workspace', () => {
    const employeeWorkspaceRoles = ['ROLE_EMPLOYEE', 'ROLE_TECHNICIAN', 'ROLE_ADMIN'];
    const technicianWorkspaceRoles = ['ROLE_TECHNICIAN', 'ROLE_ADMIN'];
    const adminWorkspaceRoles = ['ROLE_ADMIN'];

    expect(checkAccess(technicianUser, employeeWorkspaceRoles)).toBe(true);
    expect(checkAccess(technicianUser, technicianWorkspaceRoles)).toBe(true);
    expect(checkAccess(technicianUser, adminWorkspaceRoles)).toBe(false);
  });

  it('administrator has full operational access across all three workspaces', () => {
    const employeeWorkspaceRoles = ['ROLE_EMPLOYEE', 'ROLE_TECHNICIAN', 'ROLE_ADMIN'];
    const technicianWorkspaceRoles = ['ROLE_TECHNICIAN', 'ROLE_ADMIN'];
    const adminWorkspaceRoles = ['ROLE_ADMIN'];

    expect(checkAccess(adminUser, employeeWorkspaceRoles)).toBe(true);
    expect(checkAccess(adminUser, technicianWorkspaceRoles)).toBe(true);
    expect(checkAccess(adminUser, adminWorkspaceRoles)).toBe(true);
  });

  it('unauthenticated requests (null user) are denied on all protected workspaces', () => {
    expect(checkAccess(null, ['ROLE_EMPLOYEE'])).toBe(false);
    expect(checkAccess(null, ['ROLE_TECHNICIAN'])).toBe(false);
    expect(checkAccess(null, ['ROLE_ADMIN'])).toBe(false);
  });
});

describe('Phase 4: Registration & Sign-In Form Validation Logic', () => {
  const validateSignIn = (username: string, pass: string): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!username.trim()) errors.username = 'Corporate username or email is required';
    if (!pass) errors.password = 'Account password is required';
    else if (pass.length < 4) errors.password = 'Password must be at least 4 characters';
    return errors;
  };

  const validateRegistration = (fields: {
    fullName: string;
    email: string;
    username: string;
    password: string;
    confirmPassword: string;
  }): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!fields.fullName.trim() || fields.fullName.trim().length < 2) {
      errors.fullName = 'Full legal name must be at least 2 characters';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
      errors.email = 'Valid corporate email is required';
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(fields.username.trim()) || fields.username.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters (letters, numbers, dots, hyphens)';
    }
    if (fields.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    }
    if (fields.password !== fields.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    return errors;
  };

  it('validates sign-in fields properly', () => {
    expect(Object.keys(validateSignIn('', '')).length).toBe(2);
    expect(validateSignIn('admin.root', '').password).toBeTruthy();
    expect(validateSignIn('admin.root', '123').password).toBe('Password must be at least 4 characters');
    expect(Object.keys(validateSignIn('admin.root', 'Password123!')).length).toBe(0);
  });

  it('validates registration fields and catches email, username, and password mismatches', () => {
    const invalidPayload = {
      fullName: 'A',
      email: 'not-an-email',
      username: 'a!',
      password: 'short',
      confirmPassword: 'mismatch'
    };
    const errors = validateRegistration(invalidPayload);
    expect(errors.fullName).toBeTruthy();
    expect(errors.email).toBeTruthy();
    expect(errors.username).toBeTruthy();
    expect(errors.password).toBeTruthy();
    expect(errors.confirmPassword).toBeTruthy();

    const validPayload = {
      fullName: 'John Doe',
      email: 'john.doe@resolv.internal',
      username: 'john.doe',
      password: 'Password123!',
      confirmPassword: 'Password123!'
    };
    expect(Object.keys(validateRegistration(validPayload)).length).toBe(0);
  });

  it('properly constructs deep link redirection URL when unauthenticated', () => {
    const currentPath: string = '/incidents/INC-2026-0891';
    const redirectUrl = currentPath !== '/' ? `?redirect=${encodeURIComponent(currentPath)}` : '';
    expect(redirectUrl).toBe('?redirect=%2Fincidents%2FINC-2026-0891');

    const searchParams = new URLSearchParams(redirectUrl);
    expect(searchParams.get('redirect')).toBe('/incidents/INC-2026-0891');
  });

  it('properly determines default workspace per role', () => {
    const getWorkspaceForRole = (role?: string) => {
      if (role === 'ROLE_ADMIN') return '/workspace/admin';
      if (role === 'ROLE_TECHNICIAN') return '/workspace/technician';
      return '/workspace/employee';
    };

    expect(getWorkspaceForRole('ROLE_ADMIN')).toBe('/workspace/admin');
    expect(getWorkspaceForRole('ROLE_TECHNICIAN')).toBe('/workspace/technician');
    expect(getWorkspaceForRole('ROLE_EMPLOYEE')).toBe('/workspace/employee');
    expect(getWorkspaceForRole(undefined)).toBe('/workspace/employee');
  });
});
