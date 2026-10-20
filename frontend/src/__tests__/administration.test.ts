import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Polyfill Storage and Window for test environment
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
  authApi,
  incidentApi,
  auditApi,
  type UserSummaryDto,
  type CategoryDto,
  type SlaPolicyDto,
  type AuditEventDto,
  type PagedResponse
} from '../services/api';

describe('Phase 6: Administration & Auditability API Client', () => {
  beforeEach(() => {
    mockSessionStorage.clear();
    mockLocalStorage.clear();
    mockSessionStorage.setItem('resolv_jwt_token', 'valid-admin-jwt-token');
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. User Administration & Safeguards', () => {
    it('should query paginated user directory with search and filter parameters', async () => {
      const mockUserPage: PagedResponse<UserSummaryDto> = {
        content: [
          {
            id: 1,
            username: 'admin.root',
            email: 'admin@resolv.internal',
            fullName: 'Root Administrator',
            department: 'IT Operations',
            role: 'ROLE_ADMIN',
            isActive: true,
            createdAt: '2026-10-18T00:00:00Z'
          },
          {
            id: 2,
            username: 'tech.alice',
            email: 'alice@resolv.internal',
            fullName: 'Alice Specialist',
            department: 'IT Support',
            role: 'ROLE_TECHNICIAN',
            isActive: true,
            createdAt: '2026-10-18T00:00:00Z'
          }
        ],
        totalPages: 1,
        totalElements: 2,
        page: 0,
        size: 10,
        last: true
      };

      let requestedUrl = '';
      vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (input) => {
        requestedUrl = input.toString();
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => mockUserPage
        } as Response;
      });

      const response = await authApi.getUsers({
        query: 'alice',
        role: 'ROLE_TECHNICIAN',
        department: 'IT Support',
        isActive: true,
        page: 0,
        size: 10
      });

      expect(response.content).toHaveLength(2);
      expect(response.totalElements).toBe(2);
      expect(requestedUrl).toContain('query=alice');
      expect(requestedUrl).toContain('role=ROLE_TECHNICIAN');
      expect(requestedUrl).toContain('department=IT+Support');
      expect(requestedUrl).toContain('isActive=true');
    });

    it('should update user active status successfully', async () => {
      const updatedUser: UserSummaryDto = {
        id: 2,
        username: 'tech.alice',
        email: 'alice@resolv.internal',
        fullName: 'Alice Specialist',
        department: 'IT Support',
        role: 'ROLE_TECHNICIAN',
        isActive: false,
        createdAt: '2026-10-18T00:00:00Z'
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => updatedUser
      } as Response);

      const result = await authApi.updateUserStatus(2, false);
      expect(result.id).toBe(2);
      expect(result.isActive).toBe(false);
    });

    it('should update user role successfully', async () => {
      const updatedUser: UserSummaryDto = {
        id: 2,
        username: 'tech.alice',
        email: 'alice@resolv.internal',
        fullName: 'Alice Specialist',
        department: 'IT Support',
        role: 'ROLE_ADMIN',
        isActive: true,
        createdAt: '2026-10-18T00:00:00Z'
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => updatedUser
      } as Response);

      const result = await authApi.updateUserRole(2, 'ROLE_ADMIN');
      expect(result.id).toBe(2);
      expect(result.role).toBe('ROLE_ADMIN');
    });

    it('should throw an error with message when server rejects final admin deactivation', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          message: 'Cannot deactivate the last remaining active administrator.'
        })
      } as Response);

      await expect(authApi.updateUserStatus(1, false)).rejects.toThrow(
        'Cannot deactivate the last remaining active administrator.'
      );
    });

    it('should throw an error with message when server rejects self-deactivation', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          message: 'Administrators cannot deactivate their own account.'
        })
      } as Response);

      await expect(authApi.updateUserStatus(1, false)).rejects.toThrow(
        'Administrators cannot deactivate their own account.'
      );
    });

    it('should throw an error with message when server rejects demoting final active admin', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          message: 'Cannot change the role of the last remaining active administrator.'
        })
      } as Response);

      await expect(authApi.updateUserRole(1, 'ROLE_EMPLOYEE')).rejects.toThrow(
        'Cannot change the role of the last remaining active administrator.'
      );
    });
  });

  describe('2. Incident Category Configuration', () => {
    it('should fetch all categories including inactive ones for administration', async () => {
      const mockCategories: CategoryDto[] = [
        {
          id: 1,
          name: 'Hardware',
          description: 'Hardware failures',
          slaHours: 24,
          isActive: true
        },
        {
          id: 2,
          name: 'Legacy Telecom',
          description: 'Deprecated landlines',
          slaHours: 48,
          isActive: false
        }
      ];

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockCategories
      } as Response);

      const categories = await incidentApi.getAllCategoriesAdmin();
      expect(categories).toHaveLength(2);
      expect(categories[1].isActive).toBe(false);
    });

    it('should create a new incident category with validated payload', async () => {
      const createdCategory: CategoryDto = {
        id: 10,
        name: 'Database Operations',
        description: 'DB deadlocks and replication lags',
        slaHours: 12,
        isActive: true
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => createdCategory
      } as Response);

      const result = await incidentApi.createCategory({
        name: 'Database Operations',
        description: 'DB deadlocks and replication lags',
        slaHours: 12,
        isActive: true
      });

      expect(result.id).toBe(10);
      expect(result.name).toBe('Database Operations');
      expect(result.slaHours).toBe(12);
    });

    it('should update an existing category', async () => {
      const updatedCategory: CategoryDto = {
        id: 1,
        name: 'Hardware Support',
        description: 'Updated hardware support scope',
        slaHours: 36,
        isActive: true
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => updatedCategory
      } as Response);

      const result = await incidentApi.updateCategory(1, {
        name: 'Hardware Support',
        description: 'Updated hardware support scope',
        slaHours: 36,
        isActive: true
      });

      expect(result.name).toBe('Hardware Support');
      expect(result.slaHours).toBe(36);
    });

    it('should toggle category active status', async () => {
      const toggledCategory: CategoryDto = {
        id: 1,
        name: 'Hardware Support',
        description: 'Hardware',
        slaHours: 24,
        isActive: false
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => toggledCategory
      } as Response);

      const result = await incidentApi.toggleCategoryStatus(1, false);
      expect(result.isActive).toBe(false);
    });
  });

  describe('3. SLA Policy Configuration', () => {
    it('should fetch all SLA policies', async () => {
      const mockPolicies: SlaPolicyDto[] = [
        {
          id: 1,
          name: 'Critical SLA',
          priority: 'CRITICAL',
          responseTimeHours: 1,
          resolutionTimeHours: 4,
          description: 'Highest tier 24x7 resolution policy',
          isActive: true
        },
        {
          id: 2,
          name: 'High SLA',
          priority: 'HIGH',
          responseTimeHours: 2,
          resolutionTimeHours: 8,
          description: 'High tier policy',
          isActive: true
        }
      ];

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockPolicies
      } as Response);

      const policies = await incidentApi.getSlaPolicies();
      expect(policies).toHaveLength(2);
      expect(policies[0].priority).toBe('CRITICAL');
      expect(policies[0].resolutionTimeHours).toBe(4);
    });

    it('should update an SLA policy successfully', async () => {
      const updatedPolicy: SlaPolicyDto = {
        id: 1,
        name: 'Critical SLA',
        priority: 'CRITICAL',
        responseTimeHours: 1,
        resolutionTimeHours: 6,
        description: 'Updated resolution timeline',
        isActive: true
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => updatedPolicy
      } as Response);

      const result = await incidentApi.updateSlaPolicy(1, {
        responseTimeHours: 1,
        resolutionTimeHours: 6,
        description: 'Updated resolution timeline',
        isActive: true
      });

      expect(result.resolutionTimeHours).toBe(6);
    });

    it('should throw error when updating SLA policy fails cross-field validation', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          message: 'Resolution time (2h) must be greater than or equal to response time (4h).'
        })
      } as Response);

      await expect(
        incidentApi.updateSlaPolicy(1, {
          responseTimeHours: 4,
          resolutionTimeHours: 2,
          isActive: true
        })
      ).rejects.toThrow('Resolution time (2h) must be greater than or equal to response time (4h).');
    });
  });

  describe('4. Audit Log Explorer', () => {
    it('should query paginated audit events with filters', async () => {
      const mockAuditPage: PagedResponse<AuditEventDto> = {
        content: [
          {
            id: 201,
            entityType: 'USER',
            entityId: 2,
            action: 'USER_ROLE_UPDATED',
            performedByUsername: 'admin.root',
            performedByFullName: 'Root Administrator',
            performedByRole: 'ROLE_ADMIN',
            outcome: 'SUCCESS',
            previousState: '{"role":"ROLE_EMPLOYEE"}',
            newState: '{"role":"ROLE_TECHNICIAN"}',
            ipAddress: '127.0.0.1',
            createdAt: '2026-10-18T14:30:00Z'
          }
        ],
        totalPages: 1,
        totalElements: 1,
        page: 0,
        size: 10,
        last: true
      };

      let requestedUrl = '';
      vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (input) => {
        requestedUrl = input.toString();
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => mockAuditPage
        } as Response;
      });

      const result = await auditApi.getAuditEvents({
        entityType: 'USER',
        action: 'USER_ROLE_UPDATED',
        actor: 'admin.root',
        page: 0,
        size: 10
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].action).toBe('USER_ROLE_UPDATED');
      expect(result.content[0].performedByUsername).toBe('admin.root');
      expect(requestedUrl).toContain('entityType=USER');
      expect(requestedUrl).toContain('action=USER_ROLE_UPDATED');
      expect(requestedUrl).toContain('actor=admin.root');
    });

    it('should fetch distinct entity types and actions for filter dropdowns', async () => {
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ['USER', 'CATEGORY', 'SLA_POLICY', 'INCIDENT']
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ['USER_STATUS_UPDATED', 'USER_ROLE_UPDATED', 'CATEGORY_CREATED']
        } as Response);

      const types = await auditApi.getEntityTypes();
      const actions = await auditApi.getActions();

      expect(types).toContain('USER');
      expect(types).toContain('CATEGORY');
      expect(actions).toContain('USER_ROLE_UPDATED');
    });
  });
});
