import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  analyticsApi, 
  authApi,
  type DashboardMetricsResponse, 
  type TrendDataPoint, 
  type TechnicianWorkload,
  type AnalyticsFilterParams,
  type UserSummaryDto
} from '../../services/api';

type DatePreset = '7D' | '30D' | '90D' | 'ALL' | 'CUSTOM';

const CATEGORIES = [
  { id: 1, name: 'Hardware' },
  { id: 2, name: 'Software & OS' },
  { id: 3, name: 'Network & VPN' },
  { id: 4, name: 'Security & Access' },
  { id: 5, name: 'Database & Infrastructure' },
];

export const AnalyticsDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const isAdminOrTech = user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_TECHNICIAN';

  // Filter States
  const [datePreset, setDatePreset] = useState<DatePreset>('30D');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [technicianFilter, setTechnicianFilter] = useState<string>('ALL');

  // Technician list for filter dropdown (if Admin/Tech)
  const [technicians, setTechnicians] = useState<UserSummaryDto[]>([]);

  // Telemetry States
  const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null);
  const [trends, setTrends] = useState<TrendDataPoint[]>([]);
  const [workloads, setWorkloads] = useState<TechnicianWorkload[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showDataTable, setShowDataTable] = useState<boolean>(false);

  // Compute effective start and end dates based on preset
  const computedDateRange = useMemo<{ startDate?: string; endDate?: string }>(() => {
    if (datePreset === 'ALL') {
      return {};
    }
    if (datePreset === 'CUSTOM') {
      return {
        startDate: customStartDate ? `${customStartDate}T00:00:00Z` : undefined,
        endDate: customEndDate ? `${customEndDate}T23:59:59Z` : undefined
      };
    }

    const end = new Date();
    const start = new Date();
    const days = datePreset === '7D' ? 7 : datePreset === '90D' ? 90 : 30;
    start.setDate(start.getDate() - days);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    return {
      startDate: `${fmt(start)}T00:00:00Z`,
      endDate: `${fmt(end)}T23:59:59Z`
    };
  }, [datePreset, customStartDate, customEndDate]);

  // Construct query parameters
  const currentFilterParams = useMemo<AnalyticsFilterParams>(() => {
    const params: AnalyticsFilterParams = {
      startDate: computedDateRange.startDate,
      endDate: computedDateRange.endDate,
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
      priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
      categoryId: categoryFilter !== 'ALL' ? parseInt(categoryFilter, 10) : undefined,
      technicianId: technicianFilter !== 'ALL' ? parseInt(technicianFilter, 10) : undefined
    };
    return params;
  }, [computedDateRange, statusFilter, priorityFilter, categoryFilter, technicianFilter]);

  // Load Technicians for dropdown
  useEffect(() => {
    if (isAdminOrTech) {
      authApi.getAllUsers(0, 100).then(res => {
        const techs = (res.content || []).filter(u => u.role === 'ROLE_TECHNICIAN');
        setTechnicians(techs);
      }).catch(() => {
        // Non-blocking
      });
    }
  }, [isAdminOrTech]);

  // Fetch all analytics data
  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [dashData, trendData] = await Promise.all([
        analyticsApi.getDashboard(currentFilterParams),
        analyticsApi.getTrends(currentFilterParams)
      ]);
      setMetrics(dashData);
      setTrends(trendData);

      // Load technician workloads only if permitted
      if (isAdminOrTech) {
        try {
          const techData = await analyticsApi.getTechnicianWorkloads(currentFilterParams);
          setWorkloads(techData);
        } catch {
          // Restricted or error
          setWorkloads([]);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve analytics telemetry';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [currentFilterParams, isAdminOrTech]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // CSV Export Handler
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const pad = (n: number) => n.toString().padStart(2, '0');
      const now = new Date();
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
      await analyticsApi.downloadCsv(currentFilterParams, `resolv_incidents_${timestamp}.csv`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'CSV Export failed';
      alert(`Export Error: ${msg}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setDatePreset('30D');
    setCustomStartDate('');
    setCustomEndDate('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setCategoryFilter('ALL');
    setTechnicianFilter('ALL');
  };

  // Calculate highest volume in trends for chart scaling
  const maxTrendVolume = useMemo(() => {
    if (!trends || trends.length === 0) return 5;
    const maxVal = Math.max(...trends.map(t => Math.max(t.createdCount, t.resolvedCount)));
    return maxVal > 0 ? maxVal + 1 : 5;
  }, [trends]);

  return (
    <div style={{ backgroundColor: '#000000', minHeight: 'calc(100vh - 76px)', color: '#ffffff', padding: '32px 24px 64px 24px' }}>
      <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
        
        {/* Header Breadcrumb & Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
            <span>RESOLV</span>
            <span>/</span>
            <span>OPERATIONAL INTELLIGENCE</span>
            <span>/</span>
            <span style={{ color: '#00f2fe' }}>KPI DASHBOARD &amp; ANALYTICS</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#ffffff' }}>
                Operational KPI &amp; Incident Analytics
              </h1>
              <p style={{ color: '#94a3b8', fontSize: '14px', margin: '6px 0 0 0' }}>
                System-wide incident telemetry, SLA breach tracking, resolution-time trends, and technician capacity metrics.
              </p>
            </div>

            {/* Actions: Refresh & Export CSV */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={fetchAnalytics}
                disabled={isLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  fontFamily: 'var(--font-display)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isLoading ? 'rotate(180deg)' : 'none', transition: 'transform 0.5s ease' }}>
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                <span>{isLoading ? 'Syncing...' : 'Refresh Telemetry'}</span>
              </button>

              <button
                onClick={handleExportCsv}
                disabled={isExporting || isLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #7A0026 0%, #3D003E 60%, #1582C5 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  fontFamily: 'var(--font-display)',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isExporting || isLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(122, 0, 38, 0.4)',
                  transition: 'all 0.2s ease'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>{isExporting ? 'Generating Report...' : 'Export CSV Report'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div 
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '20px 24px',
            backdropFilter: 'blur(16px)',
            marginBottom: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            
            {/* Date Preset Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', fontFamily: 'var(--font-mono)', marginRight: '4px' }}>
                TIMELINE:
              </span>
              {(['7D', '30D', '90D', 'ALL', 'CUSTOM'] as DatePreset[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setDatePreset(p)}
                  style={{
                    backgroundColor: datePreset === p ? '#00f2fe' : 'rgba(255, 255, 255, 0.05)',
                    color: datePreset === p ? '#000000' : '#e2e8f0',
                    border: '1px solid',
                    borderColor: datePreset === p ? '#00f2fe' : 'rgba(255, 255, 255, 0.1)',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {p === '7D' ? '7 Days' : p === '30D' ? '30 Days' : p === '90D' ? '90 Days' : p === 'ALL' ? 'All Time' : 'Custom'}
                </button>
              ))}
            </div>

            {/* Reset Button */}
            <button
              onClick={handleResetFilters}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                textDecoration: 'underline'
              }}
            >
              Reset Filters
            </button>
          </div>

          {/* Custom Date Pickers (Shown if CUSTOM selected) */}
          {datePreset === 'CUSTOM' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <label style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  style={{
                    backgroundColor: '#020617',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
              </label>
              <label style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  style={{
                    backgroundColor: '#020617',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
              </label>
            </div>
          )}

          {/* Dimensional Filters: Status, Priority, Category, Technician */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
            
            {/* Status Dropdown */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                STATUS
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#020617',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontFamily: 'inherit'
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="TRIAGED">Triaged</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            {/* Priority Dropdown */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                PRIORITY
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#020617',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontFamily: 'inherit'
                }}
              >
                <option value="ALL">All Priorities</option>
                <option value="CRITICAL">Critical (P1)</option>
                <option value="HIGH">High (P2)</option>
                <option value="MEDIUM">Medium (P3)</option>
                <option value="LOW">Low (P4)</option>
              </select>
            </div>

            {/* Category Dropdown */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                CATEGORY
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#020617',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontFamily: 'inherit'
                }}
              >
                <option value="ALL">All Categories</option>
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id.toString()}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Technician Dropdown (Admin/Tech only) */}
            {isAdminOrTech && (
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                  TECHNICIAN
                </label>
                <select
                  value={technicianFilter}
                  onChange={(e) => setTechnicianFilter(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#020617',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontFamily: 'inherit'
                  }}
                >
                  <option value="ALL">All Technicians</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.id.toString()}>{t.fullName} ({t.username})</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Error State Banner */}
        {error && (
          <div style={{ backgroundColor: 'rgba(255, 77, 79, 0.15)', border: '1px solid #ff4d4f', borderRadius: '12px', padding: '16px 20px', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: '#ff4d4f', fontSize: '18px' }}>⚠️</span>
            <div style={{ fontSize: '14px', color: '#ff7875' }}>
              <strong>Telemetry Error:</strong> {error}
            </div>
          </div>
        )}

        {/* SECTION 1: Operational KPI Metric Cards */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00f2fe', fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)', marginBottom: '14px' }}>
            <span>●</span> SYSTEM CORE KPIS
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
            
            {/* Total Incidents */}
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '20px', backdropFilter: 'blur(16px)' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Total Incidents</div>
              <div style={{ fontSize: '32px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#ffffff', marginTop: '6px' }}>
                {isLoading ? '...' : (metrics?.totalIncidents ?? 0)}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Evaluated in active filter scope</div>
            </div>

            {/* Active Open / Triaged */}
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '20px', backdropFilter: 'blur(16px)' }}>
              <div style={{ fontSize: '12px', color: '#fa8c16', fontWeight: 600 }}>Open &amp; Triaged Queue</div>
              <div style={{ fontSize: '32px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#fa8c16', marginTop: '6px' }}>
                {isLoading ? '...' : ((metrics?.openCount ?? 0) + (metrics?.triagedCount ?? 0))}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                {metrics?.openCount ?? 0} Open • {metrics?.triagedCount ?? 0} Triaged
              </div>
            </div>

            {/* In Progress & Assigned */}
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '20px', backdropFilter: 'blur(16px)' }}>
              <div style={{ fontSize: '12px', color: '#00f2fe', fontWeight: 600 }}>In Progress &amp; Assigned</div>
              <div style={{ fontSize: '32px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#00f2fe', marginTop: '6px' }}>
                {isLoading ? '...' : ((metrics?.inProgressCount ?? 0) + (metrics?.assignedCount ?? 0))}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                {metrics?.inProgressCount ?? 0} In Progress • {metrics?.assignedCount ?? 0} Assigned
              </div>
            </div>

            {/* Resolved & Closed */}
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '20px', backdropFilter: 'blur(16px)' }}>
              <div style={{ fontSize: '12px', color: '#00ff87', fontWeight: 600 }}>Resolved &amp; Closed</div>
              <div style={{ fontSize: '32px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#00ff87', marginTop: '6px' }}>
                {isLoading ? '...' : ((metrics?.resolvedCount ?? 0) + (metrics?.closedCount ?? 0))}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                {metrics?.resolvedCount ?? 0} Resolved • {metrics?.closedCount ?? 0} Closed
              </div>
            </div>

            {/* Critical & High (P1/P2) */}
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255, 77, 79, 0.2)', borderRadius: '16px', padding: '20px', backdropFilter: 'blur(16px)' }}>
              <div style={{ fontSize: '12px', color: '#ff4d4f', fontWeight: 600 }}>Critical &amp; High (P1/P2)</div>
              <div style={{ fontSize: '32px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#ff4d4f', marginTop: '6px' }}>
                {isLoading ? '...' : (metrics?.criticalAndHighCount ?? 0)}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                {metrics?.criticalCount ?? 0} Critical • {metrics?.highCount ?? 0} High
              </div>
            </div>

            {/* Unassigned Backlog */}
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '20px', backdropFilter: 'blur(16px)' }}>
              <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>Unassigned Backlog</div>
              <div style={{ fontSize: '32px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#f59e0b', marginTop: '6px' }}>
                {isLoading ? '...' : (metrics?.unassignedCount ?? 0)}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Awaiting technician assignment</div>
            </div>

            {/* SLA Breaches */}
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255, 77, 79, 0.3)', borderRadius: '16px', padding: '20px', backdropFilter: 'blur(16px)' }}>
              <div style={{ fontSize: '12px', color: '#ff4d4f', fontWeight: 600 }}>SLA Breaches</div>
              <div style={{ fontSize: '32px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#ff4d4f', marginTop: '6px' }}>
                {isLoading ? '...' : (metrics?.slaMetrics?.breachedCount ?? 0)}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Exceeded policy resolution SLA</div>
            </div>

            {/* Approaching SLA Deadline */}
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(250, 140, 22, 0.3)', borderRadius: '16px', padding: '20px', backdropFilter: 'blur(16px)' }}>
              <div style={{ fontSize: '12px', color: '#fa8c16', fontWeight: 600 }}>Approaching SLA Deadline</div>
              <div style={{ fontSize: '32px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#fa8c16', marginTop: '6px' }}>
                {isLoading ? '...' : (metrics?.slaMetrics?.approachingDeadlineCount ?? 0)}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>&le; 2h or &le; 25% SLA remaining</div>
            </div>

          </div>
        </div>

        {/* SECTION 2: SLA Performance & Compliance Matrix */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00ff87', fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)', marginBottom: '14px' }}>
            <span>●</span> SLA PERFORMANCE &amp; RESOLUTION QUALITY
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            
            {/* SLA Compliance Gauge Card */}
            <div 
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '20px',
                padding: '24px',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                      SLA Compliance Rate
                    </h3>
                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' }}>
                      Persisted policy compliance across all evaluated incidents
                    </p>
                  </div>
                  <span 
                    style={{
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      backgroundColor: (metrics?.slaMetrics?.complianceRate ?? 100) >= 95 ? 'rgba(0, 255, 135, 0.15)' : 'rgba(255, 77, 79, 0.15)',
                      color: (metrics?.slaMetrics?.complianceRate ?? 100) >= 95 ? '#00ff87' : '#ff4d4f',
                      border: `1px solid ${(metrics?.slaMetrics?.complianceRate ?? 100) >= 95 ? 'rgba(0, 255, 135, 0.3)' : 'rgba(255, 77, 79, 0.3)'}`
                    }}
                  >
                    TARGET: &ge; 95.0%
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '20px' }}>
                  <div style={{ fontSize: '48px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: (metrics?.slaMetrics?.complianceRate ?? 100) >= 95 ? '#00ff87' : '#fa8c16' }}>
                    {isLoading ? '...' : `${(metrics?.slaMetrics?.complianceRate ?? 100).toFixed(1)}%`}
                  </div>
                  <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                    {metrics?.slaMetrics?.onTimeCount ?? 0} on-time of {metrics?.slaMetrics?.totalEvaluated ?? 0} evaluated
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', overflow: 'hidden', marginTop: '16px' }}>
                  <div 
                    style={{
                      height: '100%',
                      width: `${Math.min(100, metrics?.slaMetrics?.complianceRate ?? 100)}%`,
                      backgroundColor: (metrics?.slaMetrics?.complianceRate ?? 100) >= 95 ? '#00ff87' : '#fa8c16',
                      transition: 'width 0.5s ease'
                    }}
                  />
                </div>
              </div>

              {/* Formula & Rule Definition */}
              <div style={{ marginTop: '20px', padding: '12px 14px', backgroundColor: 'rgba(2, 6, 23, 0.6)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>
                <strong style={{ color: '#ffffff' }}>Calculation Definition:</strong>
                <div style={{ fontFamily: 'var(--font-mono)', color: '#00f2fe', marginTop: '2px' }}>
                  Compliance = (On-Time Incidents / Total Evaluated) &times; 100
                </div>
                <div style={{ marginTop: '4px', color: '#64748b' }}>
                  • Resolved: evaluated at persisted resolvedAt vs target deadline.<br />
                  • Active / Reopened: evaluated at current time vs target deadline.
                </div>
              </div>
            </div>

            {/* MTTR & Resolution Time Card */}
            <div 
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '20px',
                padding: '24px',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                      Mean Time to Resolution (MTTR)
                    </h3>
                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' }}>
                      Average elapsed hours from incident creation to verified resolution
                    </p>
                  </div>
                  <span style={{ fontSize: '18px' }}>⏱️</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '20px' }}>
                  <div style={{ fontSize: '48px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#00f2fe' }}>
                    {isLoading ? '...' : `${(metrics?.slaMetrics?.averageResolutionHours ?? 0).toFixed(1)}h`}
                  </div>
                  <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                    based on {metrics?.resolvedCount ?? 0} resolved incidents
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
                  <div style={{ backgroundColor: 'rgba(2, 6, 23, 0.6)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>On-Time Incidents</div>
                    <div style={{ fontSize: '18px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#00ff87', marginTop: '2px' }}>
                      {metrics?.slaMetrics?.onTimeCount ?? 0}
                    </div>
                  </div>
                  <div style={{ backgroundColor: 'rgba(2, 6, 23, 0.6)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Breached Incidents</div>
                    <div style={{ fontSize: '18px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ff4d4f', marginTop: '2px' }}>
                      {metrics?.slaMetrics?.breachedCount ?? 0}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '20px', padding: '12px 14px', backgroundColor: 'rgba(2, 6, 23, 0.6)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>
                <strong style={{ color: '#ffffff' }}>SLA Policies Active:</strong>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px' }}>
                  <span>P1 Critical: 4h</span>
                  <span>P2 High: 8h</span>
                  <span>P3 Medium: 24h</span>
                  <span>P4 Low: 48h</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* SECTION 3: Incident Velocity Trends & Historical Trajectory */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              <span>●</span> INCIDENTS CREATED &amp; RESOLVED OVER TIME
            </div>
            
            {/* Toggle Data Table */}
            <button
              onClick={() => setShowDataTable(!showDataTable)}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#94a3b8',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer'
              }}
            >
              {showDataTable ? 'Show Visual Chart' : 'Show Data Table'}
            </button>
          </div>

          <div 
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '24px',
              backdropFilter: 'blur(16px)'
            }}
          >
            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#e2e8f0' }}>
                <span style={{ width: '12px', height: '12px', backgroundColor: '#00f2fe', borderRadius: '3px', display: 'inline-block' }} />
                <span>Created Incidents</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#e2e8f0' }}>
                <span style={{ width: '12px', height: '12px', backgroundColor: '#00ff87', borderRadius: '3px', display: 'inline-block' }} />
                <span>Resolved Incidents</span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
                {trends.length} continuous daily points
              </div>
            </div>

            {/* Visual SVG Timeline Chart */}
            {!showDataTable && (
              <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '8px' }}>
                <div style={{ minWidth: `${Math.max(600, trends.length * 36)}px`, height: '220px', display: 'flex', alignItems: 'flex-end', gap: '8px', padding: '16px 0 32px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', position: 'relative' }}>
                  {trends.map((pt, idx) => {
                    const createdH = Math.max(4, (pt.createdCount / maxTrendVolume) * 160);
                    const resolvedH = Math.max(4, (pt.resolvedCount / maxTrendVolume) * 160);
                    const dateLabel = pt.date.slice(5); // MM-DD
                    return (
                      <div 
                        key={pt.date || idx}
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          height: '100%',
                          position: 'relative'
                        }}
                        title={`${pt.date}: ${pt.createdCount} Created, ${pt.resolvedCount} Resolved`}
                      >
                        {/* Bar Cluster */}
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', width: '100%', justifyContent: 'center' }}>
                          <div 
                            style={{
                              width: '45%',
                              maxWidth: '14px',
                              height: `${createdH}px`,
                              backgroundColor: pt.createdCount > 0 ? '#00f2fe' : 'rgba(255, 255, 255, 0.05)',
                              borderRadius: '3px 3px 0 0',
                              transition: 'height 0.3s ease'
                            }}
                          />
                          <div 
                            style={{
                              width: '45%',
                              maxWidth: '14px',
                              height: `${resolvedH}px`,
                              backgroundColor: pt.resolvedCount > 0 ? '#00ff87' : 'rgba(255, 255, 255, 0.05)',
                              borderRadius: '3px 3px 0 0',
                              transition: 'height 0.3s ease'
                            }}
                          />
                        </div>

                        {/* Date Label (Every N points depending on length) */}
                        <div 
                          style={{
                            position: 'absolute',
                            bottom: '-24px',
                            fontSize: '10px',
                            fontFamily: 'var(--font-mono)',
                            color: '#64748b',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {trends.length <= 14 || idx % Math.ceil(trends.length / 10) === 0 ? dateLabel : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tabular Trends View for Accessibility */}
            {showDataTable && (
              <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                      <th style={{ padding: '8px 12px' }}>Date</th>
                      <th style={{ padding: '8px 12px' }}>Created Incidents</th>
                      <th style={{ padding: '8px 12px' }}>Resolved Incidents</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trends.map(t => (
                      <tr key={t.date} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>{t.date}</td>
                        <td style={{ padding: '8px 12px', color: '#00f2fe', fontWeight: 700 }}>{t.createdCount}</td>
                        <td style={{ padding: '8px 12px', color: '#00ff87', fontWeight: 700 }}>{t.resolvedCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </div>

        {/* SECTION 4: Distribution Breakdowns (Priority, Status, Category) */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fa8c16', fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)', marginBottom: '14px' }}>
            <span>●</span> MULTI-DIMENSIONAL INCIDENT DISTRIBUTIONS
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            
            {/* Priority Distribution */}
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '20px', padding: '24px', backdropFilter: 'blur(16px)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: '0 0 16px 0' }}>
                Distribution by Priority
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { key: 'CRITICAL', label: 'P1 // Critical', color: '#ff4d4f', count: metrics?.byPriority?.CRITICAL ?? metrics?.criticalCount ?? 0 },
                  { key: 'HIGH', label: 'P2 // High', color: '#fa8c16', count: metrics?.byPriority?.HIGH ?? metrics?.highCount ?? 0 },
                  { key: 'MEDIUM', label: 'P3 // Medium', color: '#00f2fe', count: metrics?.byPriority?.MEDIUM ?? metrics?.mediumCount ?? 0 },
                  { key: 'LOW', label: 'P4 // Low', color: '#00ff87', count: metrics?.byPriority?.LOW ?? metrics?.lowCount ?? 0 },
                ].map(item => {
                  const total = metrics?.totalIncidents || 1;
                  const pct = ((item.count / total) * 100).toFixed(0);
                  return (
                    <div key={item.key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ color: item.color, fontWeight: 700 }}>{item.label}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: '#ffffff' }}>{item.count} ({pct}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: item.color, transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status Distribution */}
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '20px', padding: '24px', backdropFilter: 'blur(16px)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: '0 0 16px 0' }}>
                Distribution by Lifecycle Status
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { key: 'OPEN', label: 'Open', color: '#ff4d4f', count: metrics?.byStatus?.OPEN ?? metrics?.openCount ?? 0 },
                  { key: 'TRIAGED', label: 'Triaged', color: '#fa8c16', count: metrics?.byStatus?.TRIAGED ?? metrics?.triagedCount ?? 0 },
                  { key: 'ASSIGNED', label: 'Assigned', color: '#38bdf8', count: metrics?.byStatus?.ASSIGNED ?? metrics?.assignedCount ?? 0 },
                  { key: 'IN_PROGRESS', label: 'In Progress', color: '#00f2fe', count: metrics?.byStatus?.IN_PROGRESS ?? metrics?.inProgressCount ?? 0 },
                  { key: 'RESOLVED', label: 'Resolved', color: '#00ff87', count: metrics?.byStatus?.RESOLVED ?? metrics?.resolvedCount ?? 0 },
                  { key: 'CLOSED', label: 'Closed', color: '#64748b', count: metrics?.byStatus?.CLOSED ?? metrics?.closedCount ?? 0 },
                ].map(item => {
                  const total = metrics?.totalIncidents || 1;
                  const pct = ((item.count / total) * 100).toFixed(0);
                  return (
                    <div key={item.key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ color: item.color, fontWeight: 700 }}>{item.label}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: '#ffffff' }}>{item.count} ({pct}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: item.color, transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category Distribution */}
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '20px', padding: '24px', backdropFilter: 'blur(16px)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: '0 0 16px 0' }}>
                Distribution by Incident Category
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {CATEGORIES.map(c => {
                  const count = metrics?.byCategory?.[c.name] ?? 0;
                  const total = metrics?.totalIncidents || 1;
                  const pct = ((count / total) * 100).toFixed(0);
                  return (
                    <div key={c.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{c.name}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: '#ffffff' }}>{count} ({pct}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: '#38bdf8', transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* SECTION 5: Technician Workload & Assignment Distribution (Admin / Technician only) */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00f2fe', fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              <span>●</span> TECHNICIAN WORKLOAD &amp; CAPACITY MATRIX
            </div>
            {isAdminOrTech && (
              <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                {workloads.length} Technicians Tracked
              </span>
            )}
          </div>

          <div 
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '24px',
              backdropFilter: 'blur(16px)',
              overflowX: 'auto'
            }}
          >
            {isAdminOrTech ? (
              workloads.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8', fontSize: '14px' }}>
                  No active technician workload records found for the selected filter parameters.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '720px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                      <th style={{ padding: '12px 16px' }}>Technician</th>
                      <th style={{ padding: '12px 16px' }}>Department</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Active Queue</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Resolved</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Total Assigned</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>SLA Breached</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Compliance %</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Avg MTTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workloads.map(w => (
                      <tr 
                        key={w.technicianId}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          fontSize: '13px'
                        }}
                      >
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#ffffff' }}>{w.fullName}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'var(--font-mono)' }}>@{w.username}</div>
                        </td>
                        <td style={{ padding: '14px 16px', color: '#94a3b8' }}>
                          {w.department || 'NOC Technical Operations'}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '6px', backgroundColor: w.activeAssignedCount > 5 ? 'rgba(255, 77, 79, 0.2)' : 'rgba(0, 242, 254, 0.15)', color: w.activeAssignedCount > 5 ? '#ff4d4f' : '#00f2fe', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                            {w.activeAssignedCount}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: '#00ff87', fontWeight: 700 }}>
                          {w.resolvedCount}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                          {w.totalAssignedCount}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span style={{ color: w.breachedCount > 0 ? '#ff4d4f' : '#94a3b8', fontFamily: 'var(--font-mono)', fontWeight: w.breachedCount > 0 ? 800 : 400 }}>
                            {w.breachedCount}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span style={{ color: w.slaComplianceRate >= 95 ? '#00ff87' : '#fa8c16', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                            {w.slaComplianceRate.toFixed(1)}%
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>
                          {w.avgResolutionHours.toFixed(1)}h
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              /* Notice for Employee role */
              <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8', fontSize: '13px', lineHeight: 1.6 }}>
                <span style={{ color: '#00f2fe', fontSize: '24px', display: 'block', marginBottom: '8px' }}>🔒</span>
                <strong>Technician Workload Telemetry is restricted to Operations and Governance roles.</strong>
                <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>
                  End-user self-service accounts display personal incident metrics and SLA tracking only (RBAC Enforced).
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AnalyticsDashboardPage;
