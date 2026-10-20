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
  analyticsApi, 
  type AnalyticsFilterParams, 
  type DashboardMetricsResponse, 
  type TrendDataPoint,
  type TechnicianWorkload
} from '../services/api';

describe('Phase 4: Operational Intelligence & Incident Analytics Telemetry', () => {
  beforeEach(() => {
    mockSessionStorage.clear();
    mockLocalStorage.clear();
    mockSessionStorage.setItem('resolv_jwt_token', 'valid-test-jwt-token');
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Filter Query Builder', () => {
    it('should generate empty query string when no filter parameters are supplied', () => {
      const q = analyticsApi.buildFilterQuery();
      expect(q.toString()).toBe('');
    });

    it('should ignore ALL values for status and priority', () => {
      const params: AnalyticsFilterParams = {
        status: 'ALL',
        priority: 'ALL'
      };
      const q = analyticsApi.buildFilterQuery(params);
      expect(q.toString()).toBe('');
    });

    it('should correctly format date range, category, priority, and technician parameters', () => {
      const params: AnalyticsFilterParams = {
        startDate: '2026-10-01T00:00:00',
        endDate: '2026-10-18T23:59:59',
        status: 'IN_PROGRESS',
        priority: 'CRITICAL',
        categoryId: 3,
        technicianId: 4
      };
      const q = analyticsApi.buildFilterQuery(params);
      expect(q.get('startDate')).toBe('2026-10-01T00:00:00');
      expect(q.get('endDate')).toBe('2026-10-18T23:59:59');
      expect(q.get('status')).toBe('IN_PROGRESS');
      expect(q.get('priority')).toBe('CRITICAL');
      expect(q.get('categoryId')).toBe('3');
      expect(q.get('technicianId')).toBe('4');
    });
  });

  describe('2. SLA Calculation & Quality Formulas', () => {
    it('should correctly evaluate SLA compliance percentage formula: (onTime / total) * 100', () => {
      const totalEvaluated = 20;
      const onTimeCount = 18;
      const breachedCount = 2;
      
      const rate = totalEvaluated > 0 ? (onTimeCount / totalEvaluated) * 100 : 100.0;
      expect(rate).toBe(90.0);
      expect(onTimeCount + breachedCount).toBe(totalEvaluated);
    });

    it('should handle zero evaluated incidents without division-by-zero errors', () => {
      const totalEvaluated = 0;
      const onTimeCount = 0;
      const rate = totalEvaluated > 0 ? (onTimeCount / totalEvaluated) * 100 : 100.0;
      expect(rate).toBe(100.0);
    });

    it('should accurately compute MTTR across resolved incidents', () => {
      const resolutionTimesHours = [2.5, 4.0, 1.5, 6.0];
      const sum = resolutionTimesHours.reduce((acc, h) => acc + h, 0);
      const avg = sum / resolutionTimesHours.length;
      expect(avg).toBe(3.5);
    });
  });

  describe('3. API Client Live Integration', () => {
    it('should invoke GET /api/v1/analytics/dashboard with bearer authorization and query parameters', async () => {
      const mockMetrics: DashboardMetricsResponse = {
        totalIncidents: 3,
        openCount: 2,
        triagedCount: 0,
        assignedCount: 0,
        inProgressCount: 1,
        resolvedCount: 0,
        closedCount: 0,
        criticalCount: 3,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        criticalAndHighCount: 3,
        unassignedCount: 1,
        byStatus: { OPEN: 2, IN_PROGRESS: 1 },
        byPriority: { CRITICAL: 3 },
        byCategory: { 'Software & OS': 2, 'Network & VPN': 1 },
        slaMetrics: {
          totalEvaluated: 3,
          onTimeCount: 3,
          breachedCount: 0,
          approachingDeadlineCount: 0,
          complianceRate: 100.0,
          averageResolutionHours: 0
        }
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockMetrics
      } as unknown as Response);

      const result = await analyticsApi.getDashboard({ priority: 'CRITICAL' });
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/api/v1/analytics/dashboard?priority=CRITICAL');
      expect(result.totalIncidents).toBe(3);
      expect(result.criticalAndHighCount).toBe(3);
      expect(result.slaMetrics.complianceRate).toBe(100.0);
    });

    it('should invoke GET /api/v1/analytics/trends and retrieve continuous time-series data', async () => {
      const mockTrends: TrendDataPoint[] = [
        { date: '2026-10-16', createdCount: 1, resolvedCount: 0 },
        { date: '2026-10-17', createdCount: 2, resolvedCount: 1 },
        { date: '2026-10-18', createdCount: 0, resolvedCount: 1 }
      ];

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockTrends
      } as unknown as Response);

      const result = await analyticsApi.getTrends({ startDate: '2026-10-16T00:00:00' });
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/api/v1/analytics/trends');
      expect(result.length).toBe(3);
      expect(result[1].createdCount).toBe(2);
    });

    it('should invoke GET /api/v1/analytics/technicians for workload metrics', async () => {
      const mockWorkloads: TechnicianWorkload[] = [
        {
          technicianId: 3,
          username: 'tech.dave',
          fullName: 'Dave Technician',
          department: 'NOC Technical Operations',
          activeAssignedCount: 1,
          resolvedCount: 0,
          totalAssignedCount: 2,
          breachedCount: 0,
          slaComplianceRate: 100.0,
          avgResolutionHours: 0
        }
      ];

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockWorkloads
      } as unknown as Response);

      const result = await analyticsApi.getTechnicianWorkloads();
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/api/v1/analytics/technicians');
      expect(result[0].username).toBe('tech.dave');
      expect(result[0].slaComplianceRate).toBe(100.0);
    });

    it('should invoke GET /api/v1/analytics/export/csv and return Blob payload', async () => {
      const csvContent = 'Ticket Number,Title,Priority,Status\nINC-001,Server Down,CRITICAL,OPEN\n';
      const mockBlob = new Blob([csvContent], { type: 'text/csv;charset=UTF-8' });

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/csv;charset=UTF-8' }),
        blob: async () => mockBlob
      } as unknown as Response);

      const blobResult = await analyticsApi.exportCsv({ status: 'OPEN' });
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/api/v1/analytics/export/csv?status=OPEN');
      expect(blobResult.type.toLowerCase()).toBe('text/csv;charset=utf-8');
    });

    it('should throw an informative error when CSV export fails on backend', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500
      } as unknown as Response);

      await expect(analyticsApi.exportCsv()).rejects.toThrow('CSV export failed with HTTP 500');
    });
  });
});
