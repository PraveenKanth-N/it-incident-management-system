import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { incidentApi, type IncidentResponse } from '../../services/api';
import { IncidentDetailModal } from '../incident/IncidentDetailModal';

export const TechnicianWorkspace: React.FC = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<IncidentResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filters state
  const [filterView, setFilterView] = useState<'ALL' | 'UNASSIGNED' | 'MY_TICKETS' | 'IN_PROGRESS' | 'CRITICAL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected incident for detail workbench
  const [selectedIncident, setSelectedIncident] = useState<IncidentResponse | null>(null);

  // Inline resolution notes modal for transitioning to RESOLVED
  const [resolveTarget, setResolveTarget] = useState<IncidentResponse | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await incidentApi.getIncidents({ 
        page: 0, 
        size: 50, 
        sortBy: 'createdAt', 
        direction: 'DESC' 
      });
      setIncidents(data.content || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch incident queue';
      setError(msg);
      setIncidents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Claim Ticket / Assign to Me handler
  const handleClaimTicket = async (incidentId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await incidentApi.assignTechnician(incidentId, user.id, `Claimed by technician @${user.username}`);
      setActionSuccess(`Successfully assigned ticket #${incidentId} to your queue.`);
      fetchQueue();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Assignment failed';
      setError(msg);
    }
    setTimeout(() => setActionSuccess(null), 4000);
  };

  // Status transition handler
  const handleQuickStatusTransition = async (incident: IncidentResponse, newStatus: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // If transitioning to RESOLVED, prompt for resolution notes (backend validation requirement)
    if (newStatus === 'RESOLVED') {
      setResolveTarget(incident);
      setResolutionNotes('');
      return;
    }

    try {
      await incidentApi.updateStatus(incident.id, newStatus, `Transitioned to ${newStatus} by @${user?.username}`);
      setActionSuccess(`Incident ${incident.ticketNumber} transitioned to ${newStatus}.`);
      fetchQueue();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Status transition failed';
      setError(msg);
    }
    setTimeout(() => setActionSuccess(null), 4000);
  };

  // Submit resolution with mandatory work notes
  const handleSubmitResolution = async () => {
    if (!resolveTarget) return;
    if (!resolutionNotes.trim()) {
      alert('Resolution notes are mandatory when marking an incident as RESOLVED.');
      return;
    }

    setIsResolving(true);
    try {
      await incidentApi.updateStatus(
        resolveTarget.id, 
        'RESOLVED', 
        `Resolved by @${user?.username}`, 
        resolutionNotes.trim()
      );
      setActionSuccess(`Incident ${resolveTarget.ticketNumber} marked as RESOLVED.`);
      setResolveTarget(null);
      fetchQueue();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resolve incident';
      setError(msg);
    } finally {
      setIsResolving(false);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  // Filter calculations
  const filteredIncidents = incidents.filter(inc => {
    if (filterView === 'UNASSIGNED') {
      if (inc.assignee !== null && inc.assignee !== undefined) return false;
    } else if (filterView === 'MY_TICKETS') {
      if (inc.assignee?.id !== user?.id && inc.assignee?.username !== user?.username) return false;
    } else if (filterView === 'IN_PROGRESS') {
      if (inc.status !== 'IN_PROGRESS') return false;
    } else if (filterView === 'CRITICAL') {
      if (inc.priority !== 'CRITICAL' && inc.priority !== 'HIGH') return false;
    }

    if (priorityFilter !== 'ALL' && inc.priority !== priorityFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return inc.title.toLowerCase().includes(q) || 
             inc.ticketNumber.toLowerCase().includes(q) ||
             (inc.reporter?.fullName || '').toLowerCase().includes(q) ||
             (inc.assignee?.fullName || '').toLowerCase().includes(q);
    }

    return true;
  });

  const countUnassigned = incidents.filter(i => !i.assignee).length;
  const countMyTickets = incidents.filter(i => i.assignee?.id === user?.id || i.assignee?.username === user?.username).length;
  const countInProgress = incidents.filter(i => i.status === 'IN_PROGRESS').length;
  const countCritical = incidents.filter(i => i.priority === 'CRITICAL' || i.priority === 'HIGH').length;

  const getPriorityBadgeStyle = (p: string) => {
    switch (p) {
      case 'CRITICAL': return { bg: 'rgba(255, 77, 79, 0.15)', color: '#ff4d4f', border: 'rgba(255, 77, 79, 0.4)' };
      case 'HIGH': return { bg: 'rgba(250, 140, 22, 0.15)', color: '#fa8c16', border: 'rgba(250, 140, 22, 0.4)' };
      case 'MEDIUM': return { bg: 'rgba(24, 144, 255, 0.15)', color: '#1890ff', border: 'rgba(24, 144, 255, 0.4)' };
      case 'LOW': default: return { bg: 'rgba(82, 196, 26, 0.15)', color: '#52c41a', border: 'rgba(82, 196, 26, 0.4)' };
    }
  };

  const getStatusBadgeStyle = (s: string) => {
    switch (s) {
      case 'OPEN': return { bg: 'rgba(250, 140, 22, 0.15)', color: '#fa8c16', label: 'OPEN' };
      case 'TRIAGED': return { bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', label: 'TRIAGED' };
      case 'ASSIGNED': return { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', label: 'ASSIGNED' };
      case 'IN_PROGRESS': return { bg: 'rgba(0, 242, 254, 0.18)', color: '#00f2fe', label: 'IN PROGRESS' };
      case 'RESOLVED': return { bg: 'rgba(0, 255, 135, 0.18)', color: '#00ff87', label: 'RESOLVED' };
      case 'CLOSED': default: return { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', label: 'CLOSED' };
    }
  };

  return (
    <div 
      style={{
        backgroundColor: '#000000',
        minHeight: 'calc(100vh - 76px)',
        color: '#ffffff',
        padding: '36px 36px 64px 36px',
        maxWidth: '1440px',
        margin: '0 auto'
      }}
    >
      {/* Error Alert Banner */}
      {error && (
        <div 
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '12px',
            padding: '12px 18px',
            marginBottom: '24px',
            color: '#fca5a5',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <span>Error: {error}</span>
          <button 
            onClick={fetchQueue}
            style={{ background: 'transparent', border: 'none', color: '#38bdf8', textDecoration: 'underline', cursor: 'pointer', fontSize: '12px' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Success Notification */}
      {actionSuccess && (
        <div 
          style={{
            backgroundColor: 'rgba(0, 255, 135, 0.12)',
            border: '1px solid rgba(0, 255, 135, 0.35)',
            borderRadius: '12px',
            padding: '12px 18px',
            marginBottom: '24px',
            color: '#00ff87',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <span>✓</span>
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Header */}
      <div 
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '20px',
          marginBottom: '32px'
        }}
      >
        <div>
          <div 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 700,
              color: '#00f2fe',
              backgroundColor: 'rgba(0, 242, 254, 0.1)',
              padding: '4px 10px',
              borderRadius: '9999px',
              letterSpacing: '0.12em',
              marginBottom: '10px'
            }}
          >
            <span>●</span> NOC LEVEL-2 OPERATIONS WORKBENCH
          </div>
          <h1 
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.8rem, 3.2vw, 2.5rem)',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              margin: '0 0 8px 0'
            }}
          >
            Technician Triage &amp; Resolution Desk
          </h1>
          <p 
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              color: '#94a3b8',
              margin: 0
            }}
          >
            Logged in as <strong style={{ color: '#ffffff' }}>@{user?.username}</strong> ({user?.fullName}). Triage incoming incidents, claim open tickets, and advance ITIL lifecycle transitions.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/analytics"
            style={{
              textDecoration: 'none',
              backgroundColor: 'rgba(0, 242, 254, 0.1)',
              border: '1px solid rgba(0, 242, 254, 0.3)',
              color: '#00f2fe',
              padding: '10px 18px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ fontSize: '15px' }}>📊</span>
            <span>Analytics &amp; KPI Hub</span>
          </Link>

          <button
            onClick={fetchQueue}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '9999px',
              color: '#e2e8f0',
              padding: '10px 20px',
              fontFamily: 'var(--font-display)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '32px'
        }}
      >
        <div 
          onClick={() => setFilterView('UNASSIGNED')}
          style={{
            backgroundColor: filterView === 'UNASSIGNED' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(15, 23, 42, 0.65)',
            border: filterView === 'UNASSIGNED' ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(16px)'
          }}
        >
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Unassigned Queue
          </div>
          <div 
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.5rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #fdbb2d 0%, #e052a0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: '6px 0 0 0',
              lineHeight: 1
            }}
          >
            {countUnassigned}
          </div>
        </div>

        <div 
          onClick={() => setFilterView('MY_TICKETS')}
          style={{
            backgroundColor: filterView === 'MY_TICKETS' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(15, 23, 42, 0.65)',
            border: filterView === 'MY_TICKETS' ? '1px solid #00f2fe' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(16px)'
          }}
        >
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Assigned to Me
          </div>
          <div 
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.5rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: '6px 0 0 0',
              lineHeight: 1
            }}
          >
            {countMyTickets}
          </div>
        </div>

        <div 
          onClick={() => setFilterView('IN_PROGRESS')}
          style={{
            backgroundColor: filterView === 'IN_PROGRESS' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(15, 23, 42, 0.65)',
            border: filterView === 'IN_PROGRESS' ? '1px solid #ff9a8b' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(16px)'
          }}
        >
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            In Active Resolution
          </div>
          <div 
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.5rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #ff9a8b 0%, #ff6a88 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: '6px 0 0 0',
              lineHeight: 1
            }}
          >
            {countInProgress}
          </div>
        </div>

        <div 
          onClick={() => setFilterView('CRITICAL')}
          style={{
            backgroundColor: filterView === 'CRITICAL' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(15, 23, 42, 0.65)',
            border: filterView === 'CRITICAL' ? '1px solid #ff4d4f' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(16px)'
          }}
        >
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Critical / High Priority
          </div>
          <div 
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.5rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: '6px 0 0 0',
              lineHeight: 1
            }}
          >
            {countCritical}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div 
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '24px',
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          padding: '14px 20px',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['ALL', 'UNASSIGNED', 'MY_TICKETS', 'IN_PROGRESS', 'CRITICAL'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterView(tab)}
              style={{
                background: filterView === tab ? '#0284c7' : 'rgba(255, 255, 255, 0.05)',
                border: filterView === tab ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                color: filterView === tab ? '#ffffff' : '#94a3b8',
                borderRadius: '9999px',
                padding: '6px 16px',
                fontSize: '12px',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {tab === 'ALL' ? 'Full Queue' : tab === 'UNASSIGNED' ? 'Unassigned' : tab === 'MY_TICKETS' ? 'My Desk' : tab === 'IN_PROGRESS' ? 'In Progress' : 'Critical'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{
              backgroundColor: 'rgba(2, 6, 23, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '9999px',
              padding: '8px 14px',
              color: '#ffffff',
              fontSize: '12.5px',
              outline: 'none',
              fontFamily: 'var(--font-display)'
            }}
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="HIGH">High Only</option>
            <option value="MEDIUM">Medium Only</option>
            <option value="LOW">Low Only</option>
          </select>

          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticket # or title..."
              style={{
                width: '100%',
                backgroundColor: 'rgba(2, 6, 23, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '9999px',
                padding: '8px 14px 8px 34px',
                color: '#ffffff',
                fontSize: '13px',
                fontFamily: 'var(--font-body)',
                outline: 'none'
              }}
            />
            <svg 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#64748b" 
              strokeWidth="2" 
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>
      </div>

      {/* Triage Queue Table */}
      {isLoading ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: '#94a3b8' }}>
          <div 
            style={{
              width: '36px',
              height: '36px',
              border: '3px solid rgba(255, 255, 255, 0.1)',
              borderTopColor: '#00f2fe',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px auto'
            }} 
          />
          <span>Loading operations queue...</span>
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div 
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            border: '1px dashed rgba(255, 255, 255, 0.15)',
            borderRadius: '18px',
            padding: '56px 24px',
            textAlign: 'center',
            maxWidth: '560px',
            margin: '20px auto'
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎯</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: '#ffffff', margin: '0 0 8px 0' }}>
            Queue Is Clean
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '13.5px', margin: 0 }}>
            Zero incidents matching your current workbench filters.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredIncidents.map(inc => {
            const pStyle = getPriorityBadgeStyle(inc.priority);
            const sStyle = getStatusBadgeStyle(inc.status);
            const isAssignedToMe = inc.assignee?.id === user?.id || inc.assignee?.username === user?.username;

            return (
              <div
                key={inc.id}
                onClick={() => setSelectedIncident(inc)}
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.65)',
                  border: inc.priority === 'CRITICAL' ? '1px solid rgba(255, 77, 79, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(16px)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(26, 38, 66, 0.75)';
                  e.currentTarget.style.borderColor = 'rgba(0, 242, 254, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.65)';
                  e.currentTarget.style.borderColor = inc.priority === 'CRITICAL' ? 'rgba(255, 77, 79, 0.4)' : 'rgba(255, 255, 255, 0.08)';
                }}
              >
                {/* Left Ticket Details */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: '1 1 360px' }}>
                  <span 
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#00f2fe',
                      backgroundColor: 'rgba(0, 242, 254, 0.1)',
                      border: '1px solid rgba(0, 242, 254, 0.25)',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {inc.ticketNumber}
                  </span>

                  <div>
                    <h4 
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '15px',
                        fontWeight: 700,
                        color: '#ffffff',
                        margin: '0 0 6px 0'
                      }}
                    >
                      {inc.title}
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#94a3b8' }}>
                      <span>Reporter: <strong style={{ color: '#cbd5e1' }}>{inc.reporter?.fullName || inc.reporter?.username}</strong></span>
                      <span>•</span>
                      <span>Category: <strong style={{ color: '#cbd5e1' }}>{typeof inc.category === 'object' && inc.category !== null ? inc.category.name : (inc.category || 'General')}</strong></span>
                      <span>•</span>
                      <span>Assignee: <strong style={{ color: inc.assignee ? (isAssignedToMe ? '#00ff87' : '#38bdf8') : '#f59e0b' }}>
                        {inc.assignee ? (isAssignedToMe ? 'Me (Assigned)' : inc.assignee.fullName) : 'UNASSIGNED'}
                      </strong></span>
                    </div>
                  </div>
                </div>

                {/* Right Badges & Quick Action Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {/* Priority Badge */}
                  <span 
                    style={{
                      fontSize: '11px',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      backgroundColor: pStyle.bg,
                      color: pStyle.color,
                      border: `1px solid ${pStyle.border}`,
                      padding: '4px 10px',
                      borderRadius: '9999px'
                    }}
                  >
                    {inc.priority}
                  </span>

                  {/* Status Badge */}
                  <span 
                    style={{
                      fontSize: '11px',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      backgroundColor: sStyle.bg,
                      color: sStyle.color,
                      padding: '4px 12px',
                      borderRadius: '9999px'
                    }}
                  >
                    {sStyle.label}
                  </span>

                  {/* Claim Button if Unassigned */}
                  {!inc.assignee && (
                    <button
                      onClick={(e) => handleClaimTicket(inc.id, e)}
                      style={{
                        backgroundColor: 'rgba(2, 132, 199, 0.2)',
                        border: '1px solid #0284c7',
                        color: '#38bdf8',
                        borderRadius: '9999px',
                        padding: '5px 12px',
                        fontSize: '11.5px',
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title="Assign this ticket to yourself"
                    >
                      + Claim Ticket
                    </button>
                  )}

                  {/* Quick Advance Status Buttons */}
                  {inc.status === 'ASSIGNED' && (
                    <button
                      onClick={(e) => handleQuickStatusTransition(inc, 'IN_PROGRESS', e)}
                      style={{
                        backgroundColor: 'rgba(0, 242, 254, 0.15)',
                        border: '1px solid #00f2fe',
                        color: '#00f2fe',
                        borderRadius: '9999px',
                        padding: '5px 12px',
                        fontSize: '11.5px',
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Start Work →
                    </button>
                  )}

                  {inc.status === 'IN_PROGRESS' && (
                    <button
                      onClick={(e) => handleQuickStatusTransition(inc, 'RESOLVED', e)}
                      style={{
                        backgroundColor: 'rgba(0, 255, 135, 0.15)',
                        border: '1px solid #00ff87',
                        color: '#00ff87',
                        borderRadius: '9999px',
                        padding: '5px 12px',
                        fontSize: '11.5px',
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Mark Resolved ✓
                    </button>
                  )}

                  <span style={{ color: '#64748b', fontSize: '18px', paddingLeft: '4px' }}>
                    →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mandatory Resolution Notes Dialog */}
      {resolveTarget && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(0, 255, 135, 0.3)',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00ff87', marginBottom: '8px', fontWeight: 700, fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
              <span>●</span> ITIL RESOLUTION PROTOCOL
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: '#ffffff', margin: '0 0 8px 0' }}>
              Resolve Incident: {resolveTarget.ticketNumber}
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              Per SLA and system governance rules, technical resolution notes are required before completing resolution.
            </p>

            <textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Detail root cause analysis, corrective action applied, and customer verification outcome..."
              rows={4}
              autoFocus
              style={{
                width: '100%',
                backgroundColor: 'rgba(2, 6, 23, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                padding: '12px',
                color: '#ffffff',
                fontSize: '13.5px',
                fontFamily: 'var(--font-body)',
                outline: 'none',
                marginBottom: '20px',
                resize: 'vertical'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setResolveTarget(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#94a3b8',
                  borderRadius: '9999px',
                  padding: '9px 18px',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitResolution}
                disabled={isResolving}
                className="btn-pill btn-pill-amber-pink"
                style={{ padding: '9px 22px', fontSize: '13px', fontWeight: 700 }}
              >
                {isResolving ? 'Submitting Resolution...' : 'Confirm & Mark Resolved'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incident Detail Modal */}
      <IncidentDetailModal
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onUpdated={() => {
          fetchQueue();
        }}
      />
    </div>
  );
};
