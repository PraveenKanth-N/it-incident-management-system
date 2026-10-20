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
  notificationApi, 
  automationApi, 
  type NotificationResponse,
  type EscalationRuleDto,
  type EscalationScanResultDto
} from '../services/api';

describe('Phase 5: Automation & SLA Escalation API Client', () => {
  beforeEach(() => {
    mockSessionStorage.clear();
    mockLocalStorage.clear();
    mockSessionStorage.setItem('resolv_jwt_token', 'valid-test-jwt-token');
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. In-App Notification Client', () => {
    it('should fetch recent notifications successfully', async () => {
      const mockNotifications: NotificationResponse[] = [
        {
          id: 101,
          recipientId: 1,
          incidentId: 12,
          ticketNumber: 'INC-20261018-001',
          type: 'INCIDENT_CREATED',
          channel: 'IN_APP',
          status: 'DELIVERED',
          title: 'Ticket Created',
          message: 'Incident INC-20261018-001 has been registered.',
          isRead: false,
          readAt: null,
          createdAt: '2026-10-18T10:00:00Z'
        }
      ];

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockNotifications
      } as Response);

      const result = await notificationApi.getRecentNotifications();
      expect(result).toHaveLength(1);
      expect(result[0].ticketNumber).toBe('INC-20261018-001');
      expect(result[0].isRead).toBe(false);
    });

    it('should fetch unread notification count', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ unreadCount: 5 })
      } as Response);

      const count = await notificationApi.getUnreadCount();
      expect(count).toBe(5);
    });

    it('should mark a single notification as read', async () => {
      const updatedNotification: NotificationResponse = {
        id: 101,
        recipientId: 1,
        incidentId: 12,
        ticketNumber: 'INC-20261018-001',
        type: 'INCIDENT_CREATED',
        channel: 'IN_APP',
        status: 'DELIVERED',
        title: 'Ticket Created',
        message: 'Incident INC-20261018-001 has been registered.',
        isRead: true,
        readAt: '2026-10-18T10:05:00Z',
        createdAt: '2026-10-18T10:00:00Z'
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => updatedNotification
      } as Response);

      const result = await notificationApi.markAsRead(101);
      expect(result.id).toBe(101);
      expect(result.isRead).toBe(true);
      expect(result.readAt).toBe('2026-10-18T10:05:00Z');
    });

    it('should mark all notifications as read and return marked count', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ markedCount: 4 })
      } as Response);

      const marked = await notificationApi.markAllAsRead();
      expect(marked).toBe(4);
    });
  });

  describe('2. Automation & SLA Escalation Client', () => {
    it('should retrieve configurable escalation rules', async () => {
      const mockRules: EscalationRuleDto[] = [
        {
          id: 1,
          priority: 'CRITICAL',
          warningThresholdPercent: 75,
          breachLevel: 2,
          criticalThresholdPercent: 150,
          autoEscalateUnassigned: true,
          isActive: true
        },
        {
          id: 2,
          priority: 'HIGH',
          warningThresholdPercent: 80,
          breachLevel: 2,
          criticalThresholdPercent: 200,
          autoEscalateUnassigned: false,
          isActive: true
        }
      ];

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockRules
      } as Response);

      const rules = await automationApi.getEscalationRules();
      expect(rules).toHaveLength(2);
      expect(rules[0].priority).toBe('CRITICAL');
      expect(rules[0].warningThresholdPercent).toBe(75);
      expect(rules[0].autoEscalateUnassigned).toBe(true);
    });

    it('should update escalation rules per priority', async () => {
      const updatedRule: EscalationRuleDto = {
        id: 1,
        priority: 'CRITICAL',
        warningThresholdPercent: 70,
        breachLevel: 2,
        criticalThresholdPercent: 140,
        autoEscalateUnassigned: true,
        isActive: true
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => updatedRule
      } as Response);

      const res = await automationApi.updateEscalationRule('CRITICAL', {
        warningThresholdPercent: 70,
        criticalThresholdPercent: 140,
        autoEscalateUnassigned: true,
        isActive: true
      });

      expect(res.warningThresholdPercent).toBe(70);
      expect(res.criticalThresholdPercent).toBe(140);
    });

    it('should trigger on-demand SLA escalation scan', async () => {
      const mockScanResult: EscalationScanResultDto = {
        scanTimestamp: '2026-10-18T13:30:00Z',
        totalIncidentsEvaluated: 15,
        warningsTriggered: 2,
        breachesTriggered: 1,
        criticalEscalationsTriggered: 0,
        notificationsDispatched: 3,
        escalatedTickets: ['INC-20261018-001', 'INC-20261018-002']
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockScanResult
      } as Response);

      const result = await automationApi.triggerEscalationScan();
      expect(result.totalIncidentsEvaluated).toBe(15);
      expect(result.warningsTriggered).toBe(2);
      expect(result.breachesTriggered).toBe(1);
      expect(result.escalatedTickets).toContain('INC-20261018-001');
    });

    it('should trigger retry of failed notifications', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ retriedCount: 3 })
      } as Response);

      const count = await automationApi.retryFailedNotifications();
      expect(count).toBe(3);
    });
  });

  describe('3. Escalation Badge & SLA Display Semantics', () => {
    it('correctly maps escalation levels to badges and colors', () => {
      const getEscalationBadge = (level?: number) => {
        switch (level) {
          case 1:
            return { label: 'ESC-1 WARNING', color: 'bg-amber-100 text-amber-800 border-amber-200' };
          case 2:
            return { label: 'ESC-2 BREACHED', color: 'bg-orange-100 text-orange-800 border-orange-200' };
          case 3:
            return { label: 'ESC-3 CRITICAL', color: 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse' };
          default:
            return null;
        }
      };

      expect(getEscalationBadge(undefined)).toBeNull();
      expect(getEscalationBadge(0)).toBeNull();
      expect(getEscalationBadge(1)?.label).toBe('ESC-1 WARNING');
      expect(getEscalationBadge(2)?.label).toBe('ESC-2 BREACHED');
      expect(getEscalationBadge(3)?.label).toBe('ESC-3 CRITICAL');
      expect(getEscalationBadge(3)?.color).toContain('animate-pulse');
    });
  });
});
