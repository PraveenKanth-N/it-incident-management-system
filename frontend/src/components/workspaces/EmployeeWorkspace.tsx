import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { incidentApi, type IncidentResponse } from '../../services/api';
import { CreateIncidentModal } from '../incident/CreateIncidentModal';
import { IncidentDetailModal } from '../incident/IncidentDetailModal';

export const EmployeeWorkspace: React.FC = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<IncidentResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<IncidentResponse | null>(null);

  const fetchMyIncidents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Backend automatically applies object-level isolation: employees only get their own incidents
      const data = await incidentApi.getIncidents({ page: 0, size: 50, sortBy: 'createdAt', direction: 'DESC' });
      setIncidents(data.content || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch your incidents';
      setError(msg);
      setIncidents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyIncidents();
  }, [fetchMyIncidents]);

  // Derived filtered items
  const filteredIncidents = incidents.filter(inc => {
    if (activeFilter === 'OPEN') {
      if (inc.status !== 'OPEN' && inc.status !== 'TRIAGED' && inc.status !== 'ASSIGNED') return false;
    } else if (activeFilter === 'IN_PROGRESS') {
      if (inc.status !== 'IN_PROGRESS') return false;
    } else if (activeFilter === 'RESOLVED') {
      if (inc.status !== 'RESOLVED' && inc.status !== 'CLOSED') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return inc.title.toLowerCase().includes(q) || 
             inc.ticketNumber.toLowerCase().includes(q) ||
             inc.description.toLowerCase().includes(q);
    }

    return true;
  });

  const countTotal = incidents.length;
  const countOpen = incidents.filter(i => i.status === 'OPEN' || i.status === 'TRIAGED' || i.status === 'ASSIGNED').length;
  const countInProgress = incidents.filter(i => i.status === 'IN_PROGRESS').length;
  const countResolved = incidents.filter(i => i.status === 'RESOLVED' || i.status === 'CLOSED').length;

  const getPriorityBadgeStyle = (p: string) => {
    switch (p) {
      case 'CRITICAL': return { bg: 'rgba(255, 77, 79, 0.15)', color: '#ff4d4f', border: 'rgba(255, 77, 79, 0.3)' };
      case 'HIGH': return { bg: 'rgba(250, 140, 22, 0.15)', color: '#fa8c16', border: 'rgba(250, 140, 22, 0.3)' };
      case 'MEDIUM': return { bg: 'rgba(24, 144, 255, 0.15)', color: '#1890ff', border: 'rgba(24, 144, 255, 0.3)' };
      case 'LOW': default: return { bg: 'rgba(82, 196, 26, 0.15)', color: '#52c41a', border: 'rgba(82, 196, 26, 0.3)' };
    }
  };

  const getStatusBadgeStyle = (s: string) => {
    switch (s) {
      case 'OPEN': return { bg: 'rgba(250, 140, 22, 0.12)', color: '#fa8c16', label: 'OPEN' };
      case 'TRIAGED': return { bg: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', label: 'TRIAGED' };
      case 'ASSIGNED': return { bg: 'rgba(168, 85, 247, 0.12)', color: '#a855f7', label: 'ASSIGNED' };
      case 'IN_PROGRESS': return { bg: 'rgba(0, 242, 254, 0.15)', color: '#00f2fe', label: 'IN PROGRESS' };
      case 'RESOLVED': return { bg: 'rgba(0, 255, 135, 0.15)', color: '#00ff87', label: 'RESOLVED' };
      case 'CLOSED': default: return { bg: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8', label: 'CLOSED' };
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
      {/* Header & Primary Actions */}
      <div 
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '20px',
          marginBottom: '36px'
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
              color: '#38bdf8',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              padding: '4px 10px',
              borderRadius: '9999px',
              letterSpacing: '0.12em',
              marginBottom: '10px'
            }}
          >
            <span>●</span> EMPLOYEE SELF-SERVICE PORTAL
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
            My Incident &amp; Request Desk
          </h1>
          <p 
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              color: '#94a3b8',
              margin: 0
            }}
          >
            Welcome back, <strong style={{ color: '#ffffff' }}>{user?.fullName || user?.username}</strong> ({user?.department || 'Corporate Member'}). Track your active tickets or request immediate IT assistance.
          </p>
        </div>

        {/* Action: Log Incident Button */}
        <button
          onClick={() => setIsCreateOpen(true)}
          className="btn-pill btn-pill-amber-pink"
          id="btn-employee-create-incident"
          style={{
            padding: '12px 28px',
            fontSize: '14px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Log New Incident</span>
        </button>
      </div>

      {/* KPI Stats Row */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '36px'
        }}
      >
        <div 
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '20px',
            backdropFilter: 'blur(16px)'
          }}
        >
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Total My Incidents
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
            {countTotal}
          </div>
        </div>

        <div 
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '20px',
            backdropFilter: 'blur(16px)'
          }}
        >
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Awaiting Triage &amp; Assign
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
            {countOpen}
          </div>
        </div>

        <div 
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '20px',
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
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '20px',
            backdropFilter: 'blur(16px)'
          }}
        >
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-display)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Resolved &amp; Closed
          </div>
          <div 
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.5rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #00ff87 0%, #60efa0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: '6px 0 0 0',
              lineHeight: 1
            }}
          >
            {countResolved}
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
          marginBottom: '20px',
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          padding: '14px 20px',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              style={{
                background: activeFilter === filter ? '#0284c7' : 'rgba(255, 255, 255, 0.05)',
                border: activeFilter === filter ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                color: activeFilter === filter ? '#ffffff' : '#94a3b8',
                borderRadius: '9999px',
                padding: '6px 16px',
                fontSize: '12px',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {filter === 'ALL' ? 'All Tickets' : filter === 'OPEN' ? 'Open & Triaged' : filter === 'IN_PROGRESS' ? 'In Progress' : 'Resolved'}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '240px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search my tickets..."
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

      {/* Error Banner */}
      {error && (
        <div 
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '20px',
            color: '#fca5a5',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span>Error loading tickets: {error}</span>
          <button 
            onClick={fetchMyIncidents}
            style={{ background: 'transparent', border: 'none', color: '#38bdf8', textDecoration: 'underline', cursor: 'pointer', fontSize: '12px' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Incidents Table / Cards */}
      {isLoading ? (
        <div 
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '36px 0',
            alignItems: 'center'
          }}
        >
          <div 
            style={{
              width: '36px',
              height: '36px',
              border: '3px solid rgba(255, 255, 255, 0.1)',
              borderTopColor: '#00f2fe',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }} 
          />
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>Loading your incidents from secure registry...</span>
        </div>
      ) : filteredIncidents.length === 0 ? (
        /* Empty State */
        <div 
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            border: '1px dashed rgba(255, 255, 255, 0.15)',
            borderRadius: '18px',
            padding: '64px 24px',
            textAlign: 'center',
            maxWidth: '560px',
            margin: '20px auto'
          }}
        >
          <div 
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 255, 135, 0.1)',
              border: '1px solid rgba(0, 255, 135, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: '#00ff87'
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h3 
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '18px',
              fontWeight: 700,
              color: '#ffffff',
              margin: '0 0 8px 0'
            }}
          >
            {searchQuery ? 'No matching tickets found' : 'Zero Active Incidents'}
          </h3>
          <p 
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '13.5px',
              color: '#94a3b8',
              lineHeight: 1.5,
              margin: '0 0 24px 0'
            }}
          >
            {searchQuery 
              ? `No tickets match "${searchQuery}". Clear your search or change the active filter tab.`
              : 'All your systems and devices are operating normally. Need IT assistance or hardware equipment? Log a ticket below.'}
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="btn-pill btn-pill-amber-pink"
            style={{ padding: '10px 24px', fontSize: '13.5px' }}
          >
            Log an Incident
          </button>
        </div>
      ) : (
        /* Rendered Incidents List */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredIncidents.map(inc => {
            const pStyle = getPriorityBadgeStyle(inc.priority);
            const sStyle = getStatusBadgeStyle(inc.status);

            return (
              <div
                key={inc.id}
                onClick={() => setSelectedIncident(inc)}
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease',
                  backdropFilter: 'blur(16px)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                  e.currentTarget.style.backgroundColor = 'rgba(26, 38, 66, 0.75)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.65)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 300px' }}>
                  {/* Ticket Number Tag */}
                  <div 
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#38bdf8',
                      backgroundColor: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {inc.ticketNumber}
                  </div>

                  <div>
                    <h4 
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '15px',
                        fontWeight: 700,
                        color: '#ffffff',
                        margin: '0 0 4px 0'
                      }}
                    >
                      {inc.title}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#94a3b8' }}>
                      <span>Category: <strong style={{ color: '#cbd5e1' }}>{typeof inc.category === 'object' && inc.category !== null ? inc.category.name : (inc.category || 'Standard')}</strong></span>
                      <span>•</span>
                      <span>Assignee: <strong style={{ color: inc.assignee ? '#38bdf8' : '#f59e0b' }}>{inc.assignee?.fullName || 'Triage Pending'}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Right Badges & Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  {/* Priority Badge */}
                  <span 
                    style={{
                      fontSize: '11px',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      backgroundColor: pStyle.bg,
                      color: pStyle.color,
                      border: `1px solid ${pStyle.border}`,
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      letterSpacing: '0.05em'
                    }}
                  >
                    {inc.priority}
                  </span>

                  {/* Status Badge */}
                  <span 
                    style={{
                      fontSize: '11.5px',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      backgroundColor: sStyle.bg,
                      color: sStyle.color,
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: sStyle.color }} />
                    {sStyle.label}
                  </span>

                  {/* Open Arrow */}
                  <span style={{ color: '#64748b', fontSize: '18px', paddingLeft: '8px' }}>
                    →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Incident Modal */}
      <CreateIncidentModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onIncidentCreated={() => {
          fetchMyIncidents();
        }}
      />

      {/* Incident Detail Modal */}
      <IncidentDetailModal
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onUpdated={() => {
          fetchMyIncidents();
        }}
      />
    </div>
  );
};
