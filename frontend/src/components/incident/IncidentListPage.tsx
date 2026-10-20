import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { incidentApi, type IncidentResponse, type CategoryDto } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  AlertCircle, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Plus, 
  RefreshCw, 
  Search, 
  SlidersHorizontal, 
  X 
} from 'lucide-react';

const STATUS_OPTIONS = ['ALL', 'OPEN', 'TRIAGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITY_OPTIONS = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const DEFAULT_CATEGORIES: { id: number; name: string }[] = [
  { id: 1, name: 'Hardware' },
  { id: 2, name: 'Software & OS' },
  { id: 3, name: 'Network & VPN' },
  { id: 4, name: 'Security & Access' },
  { id: 5, name: 'Database & Infrastructure' },
];

export const IncidentListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  // Role flags
  const isEmployee = user?.role === 'ROLE_EMPLOYEE';
  const isStaff = user?.role === 'ROLE_TECHNICIAN' || user?.role === 'ROLE_ADMIN';

  // State
  const [incidents, setIncidents] = useState<IncidentResponse[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter params from URL or defaults
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL');
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') || 'ALL');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || 'ALL');
  const [quickFilter, setQuickFilter] = useState<'all' | 'unassigned' | 'assigned_to_me' | 'my_reported'>('all');
  
  // Pagination
  const [page, setPage] = useState(Number(searchParams.get('page')) || 0);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Sorting
  const [sortBy, setSortBy] = useState('createdAt');
  const [direction, setDirection] = useState<'ASC' | 'DESC'>('DESC');

  // Load real categories from backend on mount
  useEffect(() => {
    let active = true;
    const loadCategories = async () => {
      try {
        const fetched = await incidentApi.getCategories();
        if (active && fetched && fetched.length > 0) {
          setCategories(fetched.map((c: CategoryDto) => ({ id: c.id, name: c.name })));
        }
      } catch {
        // Fallback to DEFAULT_CATEGORIES
      }
    };
    loadCategories();
    return () => { active = false; };
  }, []);

  // Load Incidents
  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: Parameters<typeof incidentApi.getIncidents>[0] = {
        page,
        size,
        sortBy,
        direction
      };

      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (priorityFilter !== 'ALL') params.priority = priorityFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      
      if (categoryFilter !== 'ALL') {
        const matched = categories.find(c => c.name.toLowerCase() === categoryFilter.toLowerCase());
        params.categoryId = matched ? matched.id : incidentApi.resolveCategoryId(categoryFilter);
      }

      // Quick queue filters for technicians/admins
      if (isStaff) {
        if (quickFilter === 'assigned_to_me' && user?.id) {
          params.assigneeId = user.id;
        } else if (quickFilter === 'my_reported' && user?.id) {
          params.reporterId = user.id;
        }
      }

      const res = await incidentApi.getIncidents(params);
      let content = res.content || [];

      // If unassigned quick filter is active
      if (quickFilter === 'unassigned') {
        content = content.filter(inc => !inc.assignee);
      }

      setIncidents(content);
      setTotalPages(res.totalPages || 1);
      setTotalElements(res.totalElements || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch incident directory from server';
      setError(msg);
      setIncidents([]);
      setTotalPages(1);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [page, size, statusFilter, priorityFilter, categoryFilter, searchQuery, sortBy, direction, quickFilter, isStaff, user, categories]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  // Sync state to URL searchParams
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 0) params.set('page', page.toString());
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (priorityFilter !== 'ALL') params.set('priority', priorityFilter);
    if (categoryFilter !== 'ALL') params.set('category', categoryFilter);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    setSearchParams(params, { replace: true });
  }, [page, statusFilter, priorityFilter, categoryFilter, searchQuery, setSearchParams]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setCategoryFilter('ALL');
    setQuickFilter('all');
    setPage(0);
  };

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || categoryFilter !== 'ALL' || quickFilter !== 'all';

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return { bg: 'rgba(255, 77, 79, 0.15)', text: '#ff4d4f', border: 'rgba(255, 77, 79, 0.4)' };
      case 'HIGH':
        return { bg: 'rgba(250, 140, 22, 0.15)', text: '#fa8c16', border: 'rgba(250, 140, 22, 0.4)' };
      case 'MEDIUM':
        return { bg: 'rgba(24, 144, 255, 0.15)', text: '#00f2fe', border: 'rgba(24, 144, 255, 0.4)' };
      case 'LOW':
        return { bg: 'rgba(82, 196, 26, 0.15)', text: '#52c41a', border: 'rgba(82, 196, 26, 0.4)' };
      default:
        return { bg: 'rgba(255, 255, 255, 0.1)', text: '#ffffff', border: 'rgba(255, 255, 255, 0.2)' };
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'OPEN':
        return { bg: 'rgba(24, 144, 255, 0.15)', text: '#40a9ff', border: 'rgba(24, 144, 255, 0.3)' };
      case 'TRIAGED':
        return { bg: 'rgba(114, 46, 209, 0.15)', text: '#b37feb', border: 'rgba(114, 46, 209, 0.3)' };
      case 'ASSIGNED':
        return { bg: 'rgba(47, 84, 235, 0.15)', text: '#85a5ff', border: 'rgba(47, 84, 235, 0.3)' };
      case 'IN_PROGRESS':
        return { bg: 'rgba(19, 194, 194, 0.15)', text: '#5cdbd3', border: 'rgba(19, 194, 194, 0.3)' };
      case 'RESOLVED':
        return { bg: 'rgba(82, 196, 26, 0.15)', text: '#00ff87', border: 'rgba(82, 196, 26, 0.4)' };
      case 'CLOSED':
        return { bg: 'rgba(255, 255, 255, 0.08)', text: '#8c8c8c', border: 'rgba(255, 255, 255, 0.15)' };
      default:
        return { bg: 'rgba(255, 255, 255, 0.05)', text: '#ffffff', border: 'rgba(255, 255, 255, 0.1)' };
    }
  };

  return (
    <div 
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 10%, #1a031e 0%, #0d0012 40%, #000000 100%)',
        padding: '100px 24px 80px',
        color: '#ffffff',
        fontFamily: 'var(--font-display)',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ maxWidth: '1320px', margin: '0 auto' }}>
        
        {/* Top Header & Action */}
        <div 
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            marginBottom: '32px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00f2fe', fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
              <Filter size={15} /> ITIL Incident Repository
            </div>
            <h1 style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>
              Incident Queue & Directory
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '6px 0 0 0' }}>
              {isEmployee ? (
                <span style={{ color: '#00f2fe' }}>
                  Showing your personal reported incidents • Object-Level Access Active
                </span>
              ) : (
                <span>
                  {totalElements} Total Operational Incidents • Standardized ITIL 4 Service Desk Governance
                </span>
              )}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              id="refresh-incident-directory-btn"
              onClick={() => fetchIncidents()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>

            <Link
              to="/incidents/new"
              id="create-new-incident-header-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 26px',
                borderRadius: '9999px',
                background: 'var(--gradient-btn-amber-pink)',
                color: '#ffffff',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 700,
                boxShadow: '0 8px 24px rgba(224, 82, 160, 0.35)',
                transition: 'transform 0.2s'
              }}
            >
              <Plus size={16} />
              <span>Report Incident</span>
            </Link>
          </div>
        </div>

        {/* Quick Filter Queue Tabs (Staff: Technicians & Admins) */}
        {isStaff && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
            <button
              onClick={() => { setQuickFilter('all'); setPage(0); }}
              style={{
                padding: '8px 18px',
                borderRadius: '9999px',
                background: quickFilter === 'all' ? '#ffffff' : 'rgba(255, 255, 255, 0.06)',
                color: quickFilter === 'all' ? '#000000' : 'var(--text-secondary)',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              All Incidents
            </button>
            <button
              onClick={() => { setQuickFilter('unassigned'); setPage(0); }}
              style={{
                padding: '8px 18px',
                borderRadius: '9999px',
                background: quickFilter === 'unassigned' ? 'var(--gradient-btn-purple-teal)' : 'rgba(255, 255, 255, 0.06)',
                color: '#ffffff',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Unassigned Queue
            </button>
            <button
              onClick={() => { setQuickFilter('assigned_to_me'); setPage(0); }}
              style={{
                padding: '8px 18px',
                borderRadius: '9999px',
                background: quickFilter === 'assigned_to_me' ? 'var(--gradient-btn-purple-teal)' : 'rgba(255, 255, 255, 0.06)',
                color: '#ffffff',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Assigned to Me
            </button>
            <button
              onClick={() => { setQuickFilter('my_reported'); setPage(0); }}
              style={{
                padding: '8px 18px',
                borderRadius: '9999px',
                background: quickFilter === 'my_reported' ? 'var(--gradient-btn-purple-teal)' : 'rgba(255, 255, 255, 0.06)',
                color: '#ffffff',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Reported by Me
            </button>
          </div>
        )}

        {/* Filter Toolbar Card */}
        <div 
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '24px',
            marginBottom: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          {/* Search bar & Category dropdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={18} color="var(--text-dim)" style={{ position: 'absolute', left: '16px', top: '14px' }} />
              <input 
                id="search-incidents-input"
                type="text"
                placeholder="Search by ticket # (INC-...), title, or keyword..."
                value={searchQuery}
                aria-label="Search incidents"
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                style={{
                  width: '100%',
                  padding: '12px 40px 12px 46px',
                  borderRadius: '12px',
                  background: 'rgba(0, 0, 0, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {searchQuery && (
                <X 
                  size={16} 
                  color="var(--text-muted)" 
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '14px', top: '15px', cursor: 'pointer' }} 
                />
              )}
            </div>

            {/* Category Select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <select
                id="category-filter-select"
                value={categoryFilter}
                aria-label="Filter by category"
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'rgba(0, 0, 0, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>

              {/* Sort By Controls */}
              <select
                id="sort-by-select"
                value={sortBy}
                aria-label="Sort by field"
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'rgba(0, 0, 0, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="createdAt">Date Created</option>
                <option value="priority">Priority</option>
                <option value="status">Status</option>
                <option value="ticketNumber">Ticket Number</option>
              </select>

              <button
                id="sort-direction-toggle-btn"
                onClick={() => setDirection(d => d === 'ASC' ? 'DESC' : 'ASC')}
                title="Toggle Sort Direction"
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'rgba(0, 0, 0, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {direction === 'DESC' ? '↓ DESC' : '↑ ASC'}
              </button>
            </div>

          </div>

          {/* Filter Pills: Status & Priority */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
            
            {/* Status Pills */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, marginRight: '4px' }}>
                STATUS:
              </span>
              {STATUS_OPTIONS.map((st) => {
                const active = statusFilter === st;
                return (
                  <button
                    key={st}
                    id={`status-filter-${st.toLowerCase()}`}
                    onClick={() => { setStatusFilter(st); setPage(0); }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      background: active ? '#ffffff' : 'rgba(255, 255, 255, 0.05)',
                      border: active ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: active ? '#000000' : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: active ? 800 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {st}
                  </button>
                );
              })}
            </div>

            {/* Priority Pills */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, marginRight: '4px' }}>
                PRIORITY:
              </span>
              {PRIORITY_OPTIONS.map((pr) => {
                const active = priorityFilter === pr;
                return (
                  <button
                    key={pr}
                    id={`priority-filter-${pr.toLowerCase()}`}
                    onClick={() => { setPriorityFilter(pr); setPage(0); }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      background: active ? 'var(--gradient-btn-purple-teal)' : 'rgba(255, 255, 255, 0.05)',
                      border: active ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: active ? 800 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {pr}
                  </button>
                );
              })}

              {hasActiveFilters && (
                <button
                  id="clear-all-filters-btn"
                  onClick={clearAllFilters}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    background: 'rgba(255, 77, 79, 0.1)',
                    border: '1px solid rgba(255, 77, 79, 0.3)',
                    color: '#ff7875',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginLeft: '8px'
                  }}
                >
                  <X size={12} /> Clear
                </button>
              )}
            </div>

          </div>

        </div>

        {/* Error Alert with Retry CTA */}
        {error && (
          <div 
            id="incident-list-error-banner"
            role="alert"
            style={{
              padding: '16px 20px',
              borderRadius: '12px',
              background: 'rgba(255, 77, 79, 0.15)',
              border: '1px solid rgba(255, 77, 79, 0.3)',
              color: '#ff7875',
              fontSize: '14px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
            <button
              id="retry-fetch-incidents-btn"
              onClick={() => fetchIncidents()}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                background: '#ff4d4f',
                border: 'none',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Directory Content Table */}
        <div 
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.7)'
          }}
        >
          {loading ? (
            /* Loading Skeleton */
            <div style={{ padding: '64px', textAlign: 'center' }}>
              <div 
                style={{
                  width: '36px',
                  height: '36px',
                  border: '3px solid rgba(0, 242, 254, 0.2)',
                  borderTopColor: '#00f2fe',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto 16px'
                }}
              />
              <div style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
                Loading incident directory from backend...
              </div>
            </div>
          ) : incidents.length === 0 ? (
            /* Empty State */
            <div style={{ padding: '64px 24px', textAlign: 'center' }}>
              <SlidersHorizontal size={48} color="var(--text-dim)" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0' }}>
                No Incidents Found
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '440px', margin: '0 auto 20px' }}>
                {hasActiveFilters 
                  ? 'No tickets match the selected filters. Try clearing your query or adjusting criteria.'
                  : 'There are currently no active tickets recorded in this view.'}
              </p>
              {hasActiveFilters ? (
                <button
                  id="reset-filters-empty-btn"
                  onClick={clearAllFilters}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '9999px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Reset All Filters
                </button>
              ) : (
                <Link
                  to="/incidents/new"
                  id="empty-state-report-incident-btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 24px',
                    borderRadius: '9999px',
                    background: 'var(--gradient-btn-amber-pink)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                    textDecoration: 'none'
                  }}
                >
                  <Plus size={14} /> Report Incident
                </Link>
              )}
            </div>
          ) : (
            /* Table Rows */
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: 'rgba(0, 0, 0, 0.5)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)' }}>TICKET #</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)' }}>TITLE & SUMMARY</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)' }}>CATEGORY</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)' }}>PRIORITY</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)' }}>STATUS</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)' }}>ASSIGNEE</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)' }}>CREATED</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((incident) => {
                    const prStyle = getPriorityStyle(incident.priority);
                    const stStyle = getStatusStyle(incident.status);
                    const categoryName = typeof incident.category === 'object' ? incident.category.name : incident.category;

                    return (
                      <tr 
                        key={incident.id}
                        id={`incident-row-${incident.id}`}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Ticket Number */}
                        <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#00f2fe', fontSize: '13px' }}>
                            {incident.ticketNumber}
                          </span>
                        </td>

                        {/* Title & Description */}
                        <td style={{ padding: '16px 20px', maxWidth: '340px' }}>
                          <div style={{ fontWeight: 700, color: '#ffffff', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {incident.title}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {incident.description}
                          </div>
                        </td>

                        {/* Category */}
                        <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {categoryName || 'General IT'}
                          </span>
                        </td>

                        {/* Priority Badge */}
                        <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                          <span 
                            style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: '9999px',
                              background: prStyle.bg,
                              border: `1px solid ${prStyle.border}`,
                              color: prStyle.text,
                              fontSize: '11px',
                              fontWeight: 800,
                              letterSpacing: '0.04em'
                            }}
                          >
                            {incident.priority}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                          <span 
                            style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: '9999px',
                              background: stStyle.bg,
                              border: `1px solid ${stStyle.border}`,
                              color: stStyle.text,
                              fontSize: '11px',
                              fontWeight: 700
                            }}
                          >
                            {incident.status}
                          </span>
                        </td>

                        {/* Assignee */}
                        <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                          {incident.assignee ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div 
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: 'linear-gradient(135deg, #603893, #1582c5)',
                                  color: '#ffffff',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                {incident.assignee.fullName.charAt(0)}
                              </div>
                              <span style={{ fontSize: '13px', color: '#ffffff' }}>
                                {incident.assignee.fullName}
                              </span>
                            </div>
                          ) : (
                            <span 
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-dim)',
                                background: 'rgba(255, 255, 255, 0.05)',
                                padding: '2px 8px',
                                borderRadius: '4px'
                              }}
                            >
                              Unassigned
                            </span>
                          )}
                        </td>

                        {/* Created Date */}
                        <td style={{ padding: '16px 20px', whiteSpace: 'nowrap', fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(incident.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>

                        {/* Action Link */}
                        <td style={{ padding: '16px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <Link
                            to={`/incidents/${incident.id}`}
                            id={`inspect-incident-${incident.id}-btn`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 14px',
                              borderRadius: '9999px',
                              background: 'rgba(0, 242, 254, 0.1)',
                              border: '1px solid rgba(0, 242, 254, 0.3)',
                              color: '#00f2fe',
                              textDecoration: 'none',
                              fontSize: '12px',
                              fontWeight: 700,
                              transition: 'all 0.15s'
                            }}
                          >
                            <span>Inspect</span>
                            <ArrowRight size={13} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {!loading && incidents.length > 0 && (
            <div 
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                padding: '16px 24px',
                background: 'rgba(0, 0, 0, 0.5)',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Showing page <strong style={{ color: '#ffffff' }}>{page + 1}</strong> of <strong style={{ color: '#ffffff' }}>{totalPages}</strong> ({totalElements} incidents)
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Per page:</span>
                <select
                  value={size}
                  onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#ffffff',
                    fontSize: '12px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>

                <button
                  id="pagination-prev-btn"
                  disabled={page === 0}
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: page === 0 ? 'var(--text-dim)' : '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: page === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <ChevronLeft size={16} /> Prev
                </button>

                <button
                  id="pagination-next-btn"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: page >= totalPages - 1 ? 'var(--text-dim)' : '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
