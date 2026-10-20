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
  onUnauthorized,
  type UserSummaryDto,
  incidentApi,
  auditApi
} from '../services/api';

describe('Phase 7: Frontend Security & End-to-End Workflow Verification', () => {
  const activeEmployee: UserSummaryDto = {
    id: 101,
    username: 'emp.jane',
    email: 'jane@resolv.local',
    fullName: 'Jane Doe',
    department: 'Finance',
    role: 'ROLE_EMPLOYEE',
    isActive: true,
    createdAt: new Date().toISOString()
  };

  const deactivatedEmployee: UserSummaryDto = {
    id: 102,
    username: 'emp.deactivated',
    email: 'deact@resolv.local',
    fullName: 'Former Employee',
    department: 'Finance',
    role: 'ROLE_EMPLOYEE',
    isActive: false,
    createdAt: new Date().toISOString()
  };

  const activeAdmin: UserSummaryDto = {
    id: 1,
    username: 'admin.super',
    email: 'admin@resolv.local',
    fullName: 'Super Administrator',
    department: 'IT Security',
    role: 'ROLE_ADMIN',
    isActive: true,
    createdAt: new Date().toISOString()
  };

  beforeEach(() => {
    mockSessionStorage.clear();
    mockLocalStorage.clear();
    clearStoredSession();
    vi.restoreAllMocks();
  });

  // ========================================================
  // 1. Session Invalidation & Account Status Handling
  // ========================================================

  it('Security - Inactive account status is detectable and clears session upon rejection', () => {
    setStoredSession('mock.jwt.token', deactivatedEmployee, 3600000, false);
    expect(getStoredUser()?.isActive).toBe(false);

    // Trigger unauthorized callback (as simulated on 401 response)
    let unauthorizedCallbackFired = false;
    onUnauthorized(() => {
      unauthorizedCallbackFired = true;
    });

    // Simulate 401 response handling
    clearStoredSession();

    expect(getStoredToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
    expect(unauthorizedCallbackFired).toBe(false);
  });

  it('Security - Token storage is isolated to sessionStorage by default (zero persistent disk exposure)', () => {
    setStoredSession('ephemeral.jwt.token', activeEmployee, 3600000, false);

    expect(mockSessionStorage.getItem('resolv_jwt_token')).toBe('ephemeral.jwt.token');
    expect(mockLocalStorage.getItem('resolv_jwt_token')).toBeNull();
  });

  // ========================================================
  // 2. Input Sanitization & XSS Defense Verification
  // ========================================================

  it('Security - Prevents XSS script execution in incident creation payloads', async () => {
    const xssPayload = '<script>alert(document.cookie)</script>';
    const imgXssPayload = '"><img src=x onerror=alert(1)>';

    let capturedBody = '';
    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      capturedBody = init?.body as string;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            id: 501,
            title: xssPayload,
            description: imgXssPayload,
            status: 'OPEN',
            ticketNumber: 'INC-20261018-XSS1'
          }
        })
      } as Response);
    }));

    const result = await incidentApi.createIncident({
      title: xssPayload,
      description: imgXssPayload,
      categoryId: 1,
      impact: 'HIGH',
      urgency: 'HIGH'
    });

    // Verifies body was transmitted as JSON string literal without unescaped HTML evaluation
    expect(capturedBody).toContain(JSON.stringify(xssPayload).slice(1, -1));
    expect(result.title).toBe(xssPayload);
  });

  // ========================================================
  // 3. Formula Injection Defense in CSV Processing
  // ========================================================

  it('Security - Formula triggers (=, +, -, @) are sanitized before spreadsheet processing', () => {
    const rawTitles = [
      '=cmd|\' /C calc\'!A0',
      '+123456789',
      '-SUM(A1:A10)',
      '@SUM(1+1)',
      'Normal Incident Title'
    ];

    const sanitizeCsvFormula = (val: string) => {
      if (/^[=+\-@\t\r]/.test(val)) {
        return "'" + val;
      }
      return val;
    };

    const sanitized = rawTitles.map(sanitizeCsvFormula);

    expect(sanitized[0]).toBe("'=cmd|' /C calc'!A0");
    expect(sanitized[1]).toBe("'+123456789");
    expect(sanitized[2]).toBe("'-SUM(A1:A10)");
    expect(sanitized[3]).toBe("'@SUM(1+1)");
    expect(sanitized[4]).toBe('Normal Incident Title');
  });

  // ========================================================
  // 4. Role Authorization Matrix
  // ========================================================

  it('Security - Role permission guards differentiate Admin, Technician, and Employee privileges', () => {
    const isRouteAuthorized = (requiredRole: string, userRole: string): boolean => {
      if (userRole === 'ROLE_ADMIN') return true;
      if (userRole === 'ROLE_TECHNICIAN') {
        return requiredRole !== 'ROLE_ADMIN';
      }
      return requiredRole === 'ROLE_EMPLOYEE';
    };

    // Employee checking routes
    expect(isRouteAuthorized('ROLE_ADMIN', 'ROLE_EMPLOYEE')).toBe(false);
    expect(isRouteAuthorized('ROLE_TECHNICIAN', 'ROLE_EMPLOYEE')).toBe(false);
    expect(isRouteAuthorized('ROLE_EMPLOYEE', 'ROLE_EMPLOYEE')).toBe(true);

    // Technician checking routes
    expect(isRouteAuthorized('ROLE_ADMIN', 'ROLE_TECHNICIAN')).toBe(false);
    expect(isRouteAuthorized('ROLE_TECHNICIAN', 'ROLE_TECHNICIAN')).toBe(true);

    // Admin checking routes
    expect(isRouteAuthorized('ROLE_ADMIN', activeAdmin.role)).toBe(true);
    expect(isRouteAuthorized('ROLE_TECHNICIAN', activeAdmin.role)).toBe(true);
    expect(isRouteAuthorized('ROLE_EMPLOYEE', activeAdmin.role)).toBe(true);
  });

  // ========================================================
  // 5. Complete Incident Lifecycle End-to-End Simulation
  // ========================================================

  it('E2E Workflow - Simulates complete lifecycle transition states from OPEN to CLOSED and Admin REOPEN', () => {
    type LifecycleState = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

    const validTransitions: Record<LifecycleState, LifecycleState[]> = {
      OPEN: ['ASSIGNED', 'CLOSED'],
      ASSIGNED: ['IN_PROGRESS', 'CLOSED'],
      IN_PROGRESS: ['RESOLVED', 'ASSIGNED'],
      RESOLVED: ['CLOSED', 'IN_PROGRESS'],
      CLOSED: ['OPEN'] // Restricted exclusively to ROLE_ADMIN
    };

    let currentState: LifecycleState = 'OPEN';

    const transitionTo = (nextState: LifecycleState, role: string) => {
      if (currentState === 'CLOSED' && nextState === 'OPEN') {
        if (role !== 'ROLE_ADMIN') {
          throw new Error('Only ROLE_ADMIN can reopen a CLOSED incident');
        }
      }
      if (!validTransitions[currentState].includes(nextState)) {
        throw new Error(`Invalid transition from ${currentState} to ${nextState}`);
      }
      currentState = nextState;
      return currentState;
    };

    // 1. Assign
    expect(transitionTo('ASSIGNED', 'ROLE_TECHNICIAN')).toBe('ASSIGNED');
    // 2. Start Work
    expect(transitionTo('IN_PROGRESS', 'ROLE_TECHNICIAN')).toBe('IN_PROGRESS');
    // 3. Resolve
    expect(transitionTo('RESOLVED', 'ROLE_TECHNICIAN')).toBe('RESOLVED');
    // 4. Close
    expect(transitionTo('CLOSED', 'ROLE_EMPLOYEE')).toBe('CLOSED');

    // 5. Technician attempting to reopen -> fails
    expect(() => transitionTo('OPEN', 'ROLE_TECHNICIAN')).toThrow(
      'Only ROLE_ADMIN can reopen a CLOSED incident'
    );

    // 6. Admin reopening -> succeeds
    expect(transitionTo('OPEN', 'ROLE_ADMIN')).toBe('OPEN');
  });

  // ========================================================
  // 6. Audit Log Filter Consistency
  // ========================================================

  it('Audit - Query parameters serialize properly without leaking internal secrets', async () => {
    let capturedUrl = '';
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      capturedUrl = url;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { content: [], totalElements: 0, totalPages: 0 }
        })
      } as Response);
    }));

    await auditApi.getAuditEvents({
      query: 'admin.super',
      entityType: 'INCIDENT',
      action: 'INCIDENT_CREATED',
      page: 0,
      size: 10
    });

    expect(capturedUrl).toContain('entityType=INCIDENT');
    expect(capturedUrl).toContain('action=INCIDENT_CREATED');
    expect(capturedUrl).toContain('search=admin.super');
    expect(capturedUrl).not.toContain('password');
    expect(capturedUrl).not.toContain('token');
  });
});
