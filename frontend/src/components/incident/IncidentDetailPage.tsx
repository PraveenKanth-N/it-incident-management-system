import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  incidentApi, 
  authApi, 
  type IncidentResponse, 
  type IncidentHistoryResponse, 
  type IncidentCommentResponse,
  type UserSummaryDto,
  type CategoryDto 
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  AlertCircle, 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  Edit3, 
  History, 
  Lock, 
  MessageSquare, 
  Send, 
  UserCheck, 
  X, 
  Zap 
} from 'lucide-react';

type Impact = 'LOW' | 'MEDIUM' | 'HIGH';
type Urgency = 'LOW' | 'MEDIUM' | 'HIGH';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const IncidentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const incidentId = Number(id);

  // Core Data States
  const [incident, setIncident] = useState<IncidentResponse | null>(null);
  const [history, setHistory] = useState<IncidentHistoryResponse | null>(null);
  const [comments, setComments] = useState<IncidentCommentResponse[]>([]);
  const [technicians, setTechnicians] = useState<UserSummaryDto[]>([]);
  const [availableCategories, setAvailableCategories] = useState<CategoryDto[]>([]);

  // UI States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'discussion' | 'history'>('discussion');

  // Comment Form States
  const [newComment, setNewComment] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Status Transition States
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [transitioningStatus, setTransitioningStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Reassignment Modal States
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState<number | null>(null);
  const [assignNotes, setAssignNotes] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Edit Ticket Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<number>(1);
  const [editImpact, setEditImpact] = useState<Impact>('MEDIUM');
  const [editUrgency, setEditUrgency] = useState<Urgency>('MEDIUM');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Time remaining clock state
  const [timeRemainingText, setTimeRemainingText] = useState<string>('');
  const [isSlaBreached, setIsSlaBreached] = useState<boolean>(false);
  const [slaPercentage, setSlaPercentage] = useState<number>(100);

  // Role permissions
  const isTechnician = user?.role === 'ROLE_TECHNICIAN';
  const isAdmin = user?.role === 'ROLE_ADMIN';
  const isEmployee = user?.role === 'ROLE_EMPLOYEE';
  const canManageWorkflow = isTechnician || isAdmin;

  // Can current user edit ticket fields?
  // Employees can only edit title/description while OPEN or TRIAGED
  // Technicians/Admins can edit fields before CLOSED
  const canEditTicket = incident && (
    (isEmployee && (incident.status === 'OPEN' || incident.status === 'TRIAGED')) ||
    (canManageWorkflow && incident.status !== 'CLOSED')
  );

  // Calculate Priority helper for edit form
  const calculatePriority = (imp: Impact, urg: Urgency): Priority => {
    if (imp === 'HIGH') {
      if (urg === 'HIGH') return 'CRITICAL';
      if (urg === 'MEDIUM') return 'HIGH';
      return 'MEDIUM';
    }
    if (imp === 'MEDIUM') {
      if (urg === 'HIGH') return 'HIGH';
      if (urg === 'MEDIUM') return 'MEDIUM';
      return 'LOW';
    }
    if (urg === 'HIGH') return 'MEDIUM';
    return 'LOW';
  };

  // Load Incident Data
  const loadIncidentData = useCallback(async () => {
    if (isNaN(incidentId)) {
      setError('Invalid incident identifier.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const incData = await incidentApi.getIncidentById(incidentId);
      setIncident(incData);

      // Fetch history & comments concurrently
      try {
        const histData = await incidentApi.getIncidentHistory(incidentId);
        setHistory(histData);
      } catch {
        // History may be empty initially
      }

      try {
        const commData = await incidentApi.getIncidentComments(incidentId);
        setComments(commData || []);
      } catch {
        // Comments empty
      }

      // Fetch categories if not yet loaded
      try {
        const cats = await incidentApi.getCategories();
        setAvailableCategories(cats || []);
      } catch {
        // Ignore in offline mode
      }

      // Fetch technicians if staff
      if (canManageWorkflow) {
        try {
          const usersRes = await authApi.getAllUsers(0, 50);
          const techs = usersRes.content.filter(u => u.role === 'ROLE_TECHNICIAN' || u.role === 'ROLE_ADMIN');
          setTechnicians(techs);
        } catch {
          // Ignore technician fetch failures
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load incident details from backend.');
      }
    } finally {
      setLoading(false);
    }
  }, [incidentId, canManageWorkflow]);

  useEffect(() => {
    loadIncidentData();
  }, [loadIncidentData]);

  // SLA Burn-down calculation effect
  useEffect(() => {
    if (!incident) return;

    const calculateSla = () => {
      if (incident.status === 'RESOLVED' || incident.status === 'CLOSED') {
        setTimeRemainingText('RESOLVED • SLA MET');
        setIsSlaBreached(false);
        setSlaPercentage(100);
        return;
      }

      const createdTime = new Date(incident.createdAt).getTime();
      const resolutionHours = incident.slaPolicy?.resolutionTimeHours || incident.slaHours || 4;
      const totalSlaMs = resolutionHours * 60 * 60 * 1000;
      const targetTime = createdTime + totalSlaMs;
      const now = Date.now();
      const diffMs = targetTime - now;

      if (diffMs <= 0) {
        const overdueHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
        const overdueMins = Math.floor((Math.abs(diffMs) % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemainingText(`BREACHED BY ${overdueHours}h ${overdueMins}m`);
        setIsSlaBreached(true);
        setSlaPercentage(0);
      } else {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemainingText(`${hours}h ${mins}m REMAINING`);
        setIsSlaBreached(false);
        const remainingPercent = Math.max(0, Math.min(100, Math.round((diffMs / totalSlaMs) * 100)));
        setSlaPercentage(remainingPercent);
      }
    };

    calculateSla();
    const interval = setInterval(calculateSla, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [incident]);

  // Handle Comment Submission
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;

    setSubmittingComment(true);
    setCommentError(null);

    try {
      const added = await incidentApi.addComment(incidentId, newComment.trim(), isInternalNote);
      setComments(prev => [...prev, added]);
      setNewComment('');
      setIsInternalNote(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setCommentError(err.message);
      } else {
        setCommentError('Failed to post comment.');
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  // Handle Status Update
  const handleStatusChange = async (targetStatus: string, reason?: string) => {
    if (targetStatus === 'RESOLVED') {
      setIsResolveModalOpen(true);
      return;
    }

    setTransitioningStatus(true);
    setStatusError(null);

    try {
      const updated = await incidentApi.updateStatus(incidentId, targetStatus, reason);
      setIncident(updated);
      loadIncidentData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setStatusError(err.message);
      } else {
        setStatusError('Failed to update status.');
      }
    } finally {
      setTransitioningStatus(false);
    }
  };

  // Submit Resolution
  const handleConfirmResolution = async () => {
    if (!resolutionNotes.trim()) {
      setStatusError('Resolution notes are mandatory when marking an incident resolved.');
      return;
    }

    setTransitioningStatus(true);
    setStatusError(null);

    try {
      const updated = await incidentApi.updateStatus(
        incidentId, 
        'RESOLVED', 
        'Resolution provided by technician', 
        resolutionNotes.trim()
      );
      setIncident(updated);
      setIsResolveModalOpen(false);
      setResolutionNotes('');
      loadIncidentData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setStatusError(err.message);
      } else {
        setStatusError('Failed to resolve incident.');
      }
    } finally {
      setTransitioningStatus(false);
    }
  };

  // Quick Claim Ticket
  const handleClaimTicket = async () => {
    if (!user || assigning) return;
    setAssigning(true);
    try {
      const updated = await incidentApi.assignTechnician(incidentId, user.id, 'Self-assigned via Incident Command');
      setIncident(updated);
      loadIncidentData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to claim ticket');
    } finally {
      setAssigning(false);
    }
  };

  // Reassign Ticket
  const handleReassign = async () => {
    if (!selectedTechId || assigning) return;
    setAssigning(true);
    try {
      const updated = await incidentApi.assignTechnician(incidentId, selectedTechId, assignNotes.trim());
      setIncident(updated);
      setIsAssignModalOpen(false);
      loadIncidentData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to reassign ticket');
    } finally {
      setAssigning(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = () => {
    if (!incident) return;
    setEditTitle(incident.title);
    setEditDescription(incident.description);
    const catId = typeof incident.category === 'object' ? incident.category.id : incidentApi.resolveCategoryId(incident.category);
    setEditCategoryId(catId);
    setEditImpact(incident.impact || 'MEDIUM');
    setEditUrgency(incident.urgency || 'MEDIUM');
    setEditError(null);
    setIsEditModalOpen(true);
  };

  // Save Edit Ticket
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingEdit) return;

    if (editTitle.trim().length < 3) {
      setEditError('Title must be at least 3 characters.');
      return;
    }
    if (editDescription.trim().length < 10) {
      setEditError('Description must be at least 10 characters.');
      return;
    }

    setSavingEdit(true);
    setEditError(null);

    try {
      const payload: Parameters<typeof incidentApi.updateIncident>[1] = {
        title: editTitle.trim(),
        description: editDescription.trim()
      };

      if (canManageWorkflow) {
        payload.categoryId = editCategoryId;
        payload.impact = editImpact;
        payload.urgency = editUrgency;
        payload.priority = calculatePriority(editImpact, editUrgency);
      }

      const updated = await incidentApi.updateIncident(incidentId, payload);
      setIncident(updated);
      setIsEditModalOpen(false);
      loadIncidentData();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
        <div style={{ textAlign: 'center' }}>
          <div 
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(0, 242, 254, 0.2)',
              borderTopColor: '#00f2fe',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px'
            }}
          />
          <div style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>Loading incident telemetry...</div>
        </div>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div style={{ minHeight: '100vh', background: '#000000', padding: '120px 24px', color: '#ffffff', textAlign: 'center' }}>
        <AlertCircle size={48} color="#ff4d4f" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Incident Unavailable</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 24px' }}>
          {error || 'The requested incident ticket does not exist or you lack authorization to inspect it.'}
        </p>
        <Link 
          to="/incidents"
          id="return-to-directory-error-btn"
          style={{
            padding: '10px 24px',
            borderRadius: '9999px',
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 600
          }}
        >
          Return to Incident Directory
        </Link>
      </div>
    );
  }

  const categoryName = typeof incident.category === 'object' ? incident.category.name : incident.category;
  const isCritical = incident.priority === 'CRITICAL';

  return (
    <div 
      style={{
        minHeight: '100vh',
        background: isCritical 
          ? 'radial-gradient(ellipse at 50% 10%, #3b0826 0%, #150212 40%, #000000 100%)'
          : 'radial-gradient(ellipse at 50% 10%, #081d33 0%, #050d18 40%, #000000 100%)',
        padding: '100px 24px 80px',
        color: '#ffffff',
        fontFamily: 'var(--font-display)',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
        
        {/* Navigation Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
            <Link 
              to="/incidents"
              id="back-to-queue-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              <ArrowLeft size={14} /> Incident Queue
            </Link>
            <span style={{ color: 'var(--text-dim)' }}>/</span>
            <span 
              id="ticket-number-header-display"
              style={{ fontFamily: 'var(--font-mono)', color: '#00f2fe', fontWeight: 700 }}
            >
              {incident.ticketNumber}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {canEditTicket && (
              <button
                type="button"
                id="edit-ticket-details-btn"
                onClick={handleOpenEditModal}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Edit3 size={13} />
                <span>Edit Ticket</span>
              </button>
            )}

            <span 
              style={{
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)'
              }}
            >
              ID #{incident.id}
            </span>
          </div>
        </div>

        {/* Status Notification Alerts */}
        {statusError && (
          <div 
            id="status-error-alert"
            role="alert"
            style={{
              padding: '14px 20px',
              borderRadius: '12px',
              background: 'rgba(255, 77, 79, 0.15)',
              border: '1px solid rgba(255, 77, 79, 0.4)',
              color: '#ff7875',
              fontSize: '14px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={18} />
              <span>{statusError}</span>
            </div>
            <button
              onClick={() => setStatusError(null)}
              style={{ background: 'none', border: 'none', color: '#ff7875', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* SLA Burn-Down & Compliance Banner */}
        <div 
          id="sla-compliance-banner"
          style={{
            background: isSlaBreached 
              ? 'linear-gradient(90deg, rgba(122, 0, 38, 0.6) 0%, rgba(26, 4, 14, 0.8) 100%)'
              : 'linear-gradient(90deg, rgba(15, 23, 42, 0.8) 0%, rgba(6, 44, 40, 0.8) 100%)',
            border: `1px solid ${isSlaBreached ? '#ff4d4f' : 'rgba(0, 255, 135, 0.3)'}`,
            borderRadius: '16px',
            padding: '20px 28px',
            marginBottom: '32px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div 
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: isSlaBreached ? 'rgba(255, 77, 79, 0.2)' : 'rgba(0, 255, 135, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isSlaBreached ? '#ff4d4f' : '#00ff87'
              }}
            >
              <Clock size={22} />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                ITIL SLA Resolution Clock
              </div>
              <div 
                id="sla-countdown-timer-text"
                style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: isSlaBreached ? '#ff7875' : '#00ff87' }}
              >
                {timeRemainingText}
              </div>
            </div>
          </div>

          <div style={{ flex: '1', minWidth: '220px', maxWidth: '360px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              <span>Target: {incident.slaPolicy?.resolutionTimeHours || incident.slaHours || 4}h</span>
              <span>{slaPercentage}% Margin</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(0, 0, 0, 0.5)', borderRadius: '9999px', overflow: 'hidden' }}>
              <div 
                style={{
                  width: `${slaPercentage}%`,
                  height: '100%',
                  background: isSlaBreached ? '#ff4d4f' : slaPercentage < 30 ? '#fa8c16' : '#00ff87',
                  borderRadius: '9999px',
                  transition: 'width 0.5s ease'
                }}
              />
            </div>
          </div>
        </div>

        {/* Main Grid: Left Details & Right Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '32px', alignItems: 'start' }}>
          
          {/* Left Column: Ticket Specification & Tabs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Header Card */}
            <div 
              style={{
                background: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '32px'
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                {/* Priority */}
                <span 
                  id="incident-priority-badge"
                  style={{
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                    background: isCritical ? 'rgba(255, 77, 79, 0.2)' : 'rgba(0, 242, 254, 0.15)',
                    color: isCritical ? '#ff4d4f' : '#00f2fe',
                    border: isCritical ? '1px solid rgba(255, 77, 79, 0.4)' : '1px solid rgba(0, 242, 254, 0.3)'
                  }}
                >
                  {incident.priority} PRIORITY
                </span>

                {/* Status */}
                <span 
                  id="incident-status-badge"
                  style={{
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                    background: incident.status === 'RESOLVED' ? 'rgba(0, 255, 135, 0.2)' : incident.status === 'CLOSED' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(24, 144, 255, 0.15)',
                    color: incident.status === 'RESOLVED' ? '#00ff87' : incident.status === 'CLOSED' ? '#8c8c8c' : '#40a9ff',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}
                >
                  STATUS: {incident.status}
                </span>

                {/* Category */}
                <span 
                  style={{
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  {categoryName}
                </span>

                {incident.impact && incident.urgency && (
                  <span 
                    style={{
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--text-dim)',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    I: {incident.impact} × U: {incident.urgency}
                  </span>
                )}
              </div>

              <h1 
                id="incident-title-heading"
                style={{ fontSize: '26px', fontWeight: 900, lineHeight: 1.3, margin: '0 0 16px 0' }}
              >
                {incident.title}
              </h1>

              <div 
                id="incident-description-text"
                style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', marginBottom: '24px' }}
              >
                {incident.description}
              </div>

              {/* Resolution Notes Banner if resolved or closed */}
              {incident.resolutionNotes && (
                <div 
                  id="incident-resolution-notes-banner"
                  style={{
                    padding: '16px 20px',
                    borderRadius: '12px',
                    background: 'rgba(0, 255, 135, 0.1)',
                    border: '1px solid rgba(0, 255, 135, 0.3)',
                    marginTop: '16px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00ff87', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                    <CheckCircle size={15} /> Verified Resolution Notes
                  </div>
                  <div style={{ fontSize: '13px', color: '#ffffff', lineHeight: 1.5 }}>
                    {incident.resolutionNotes}
                  </div>
                  {incident.resolvedAt && (
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px' }}>
                      Resolved: {new Date(incident.resolvedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              )}

              {/* Metadata strip */}
              <div 
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingTop: '20px',
                  marginTop: '20px',
                  fontSize: '12px',
                  color: 'var(--text-muted)'
                }}
              >
                <div>
                  <div style={{ color: 'var(--text-dim)', marginBottom: '2px' }}>REPORTED BY</div>
                  <div style={{ color: '#ffffff', fontWeight: 600 }}>
                    {incident.reporter?.fullName || incident.reporterName || 'Authorized User'}
                  </div>
                  {incident.reporter?.department && (
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      Dept: {incident.reporter.department}
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ color: 'var(--text-dim)', marginBottom: '2px' }}>CREATED AT</div>
                  <div style={{ color: '#ffffff', fontWeight: 600 }}>
                    {new Date(incident.createdAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-dim)', marginBottom: '2px' }}>LAST ACTIVITY</div>
                  <div style={{ color: '#ffffff', fontWeight: 600 }}>
                    {new Date(incident.updatedAt).toLocaleString()}
                  </div>
                </div>
              </div>

            </div>

            {/* Interactive Tab Switcher */}
            <div 
              style={{
                display: 'flex',
                gap: '8px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                paddingBottom: '8px'
              }}
            >
              <button
                id="discussion-tab-btn"
                onClick={() => setActiveTab('discussion')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '9999px',
                  background: activeTab === 'discussion' ? '#ffffff' : 'transparent',
                  color: activeTab === 'discussion' ? '#000000' : 'var(--text-secondary)',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <MessageSquare size={15} />
                <span>Discussion & Work Notes ({comments.length})</span>
              </button>

              <button
                id="history-tab-btn"
                onClick={() => setActiveTab('history')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '9999px',
                  background: activeTab === 'history' ? '#ffffff' : 'transparent',
                  color: activeTab === 'history' ? '#000000' : 'var(--text-secondary)',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <History size={15} />
                <span>Audit Trail & History</span>
              </button>
            </div>

            {/* Tab 1: Discussion & Work Notes */}
            {activeTab === 'discussion' && (
              <div 
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '20px',
                  padding: '28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px'
                }}
              >
                {/* Employee confidentiality notice */}
                {isEmployee && (
                  <div 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      borderRadius: '10px',
                      background: 'rgba(0, 242, 254, 0.08)',
                      border: '1px solid rgba(0, 242, 254, 0.2)',
                      fontSize: '12px',
                      color: '#4facfe'
                    }}
                  >
                    <Lock size={14} />
                    <span>Per ITIL confidentiality guidelines, internal technician work notes are securely isolated on the server.</span>
                  </div>
                )}

                {/* Comment Thread */}
                {comments.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-dim)', fontSize: '14px' }}>
                    No comments or technical notes recorded yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {comments.map((comm) => {
                      const isInternal = comm.isInternal ?? (comm as unknown as { internal?: boolean }).internal ?? false;
                      return (
                        <div 
                          key={comm.id}
                          id={`comment-card-${comm.id}`}
                          style={{
                            padding: '16px 20px',
                            borderRadius: '14px',
                            background: isInternal ? 'rgba(250, 140, 22, 0.08)' : 'rgba(0, 0, 0, 0.4)',
                            border: isInternal ? '1px solid rgba(250, 140, 22, 0.35)' : '1px solid rgba(255, 255, 255, 0.06)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 700, fontSize: '13px', color: isInternal ? '#ffa940' : '#ffffff' }}>
                                {comm.author?.fullName || comm.author?.username || 'Service Desk'}
                              </span>
                              {comm.author?.role && (
                                <span style={{ fontSize: '10px', background: 'rgba(255, 255, 255, 0.08)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-dim)' }}>
                                  {comm.author.role.replace('ROLE_', '')}
                                </span>
                              )}
                              {isInternal && (
                                <span 
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    background: 'rgba(250, 140, 22, 0.2)',
                                    color: '#fa8c16',
                                    padding: '2px 8px',
                                    borderRadius: '9999px'
                                  }}
                                >
                                  <Lock size={10} /> INTERNAL WORK NOTE
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                              {new Date(comm.createdAt).toLocaleString()}
                            </span>
                          </div>

                          <div style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                            {comm.commentText}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Comment Input Box */}
                <form onSubmit={handleAddComment} style={{ marginTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '20px' }}>
                  {commentError && (
                    <div style={{ color: '#ff7875', fontSize: '12px', marginBottom: '8px' }}>
                      {commentError}
                    </div>
                  )}

                  <textarea
                    id="new-comment-textarea"
                    rows={3}
                    placeholder={canManageWorkflow ? "Add public message or confidential internal work note..." : "Add message to IT support desk..."}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    required
                    aria-label="Discussion message text"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: 'rgba(0, 0, 0, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />

                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '12px' }}>
                    {canManageWorkflow ? (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#ffa940', cursor: 'pointer' }}>
                        <input 
                          id="is-internal-note-checkbox"
                          type="checkbox"
                          checked={isInternalNote}
                          onChange={(e) => setIsInternalNote(e.target.checked)}
                          style={{ accentColor: '#fa8c16', cursor: 'pointer' }}
                        />
                        <span>Confidential Internal Technician Work Note</span>
                      </label>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Visible to support team</span>
                    )}

                    <button
                      type="submit"
                      id="submit-comment-btn"
                      disabled={submittingComment || !newComment.trim()}
                      style={{
                        padding: '10px 22px',
                        borderRadius: '9999px',
                        background: isInternalNote ? 'linear-gradient(90deg, #fa8c16, #d46b08)' : 'var(--gradient-btn-purple-teal)',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: submittingComment || !newComment.trim() ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Send size={14} />
                      <span>{submittingComment ? 'Posting...' : isInternalNote ? 'Post Internal Note' : 'Send Message'}</span>
                    </button>
                  </div>
                </form>

              </div>
            )}

            {/* Tab 2: Audit Trail & Incident History */}
            {activeTab === 'history' && (
              <div 
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '20px',
                  padding: '28px'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Status Transitions */}
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#00f2fe', textTransform: 'uppercase', marginBottom: '14px' }}>
                      Status Transition Timeline
                    </h3>
                    {history?.statusHistory && history.statusHistory.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {history.statusHistory.map((sh) => (
                          <div 
                            key={sh.id}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '12px',
                              padding: '12px 16px',
                              borderRadius: '10px',
                              background: 'rgba(0, 0, 0, 0.3)',
                              border: '1px solid rgba(255, 255, 255, 0.05)'
                            }}
                          >
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00f2fe', marginTop: '6px' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700 }}>
                                <span>{sh.oldStatus || 'NONE'}</span>
                                <span style={{ color: 'var(--text-dim)' }}>→</span>
                                <span style={{ color: '#00ff87' }}>{sh.newStatus}</span>
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {sh.changeReason || 'Direct lifecycle transition'} • By {sh.changedBy?.fullName || sh.changedBy?.username || 'System'}
                              </div>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                              {new Date(sh.createdAt).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>No prior status transitions recorded.</div>
                    )}
                  </div>

                  {/* Assignment History */}
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '20px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#ff9a8b', textTransform: 'uppercase', marginBottom: '14px' }}>
                      Technician Handover & Assignment History
                    </h3>
                    {history?.assignmentHistory && history.assignmentHistory.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {history.assignmentHistory.map((ah) => (
                          <div 
                            key={ah.id}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '12px',
                              padding: '12px 16px',
                              borderRadius: '10px',
                              background: 'rgba(0, 0, 0, 0.3)',
                              border: '1px solid rgba(255, 255, 255, 0.05)'
                            }}
                          >
                            <UserCheck size={16} color="#ff9a8b" style={{ marginTop: '2px' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '13px', fontWeight: 700 }}>
                                Assigned to {ah.assignedTo?.fullName || ah.assignedTo?.username}
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {ah.assignmentNotes || 'No notes provided'} • Handed over by {ah.assignedBy?.fullName || ah.assignedBy?.username}
                              </div>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                              {new Date(ah.assignedAt).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>No assignment handovers recorded.</div>
                    )}
                  </div>

                </div>
              </div>
            )}

          </div>

          {/* Right Column: Workflow Controls & Assignment Management */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Status Workflow Controls */}
            <div 
              style={{
                background: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '28px'
              }}
            >
              <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={16} color="#00f2fe" /> Operational Workflow
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                {/* Employee: Cancel own OPEN ticket */}
                {incident.status === 'OPEN' && isEmployee && (
                  <button
                    id="cancel-own-incident-btn"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to cancel this incident ticket?')) {
                        handleStatusChange('CLOSED', 'Canceled by reporting employee');
                      }
                    }}
                    disabled={transitioningStatus}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      borderRadius: '9999px',
                      background: 'rgba(255, 77, 79, 0.15)',
                      border: '1px solid rgba(255, 77, 79, 0.4)',
                      color: '#ff7875',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel Incident Ticket (Withdraw)
                  </button>
                )}

                {/* When OPEN for Staff */}
                {incident.status === 'OPEN' && canManageWorkflow && (
                  <>
                    <button
                      id="workflow-mark-triaged-btn"
                      onClick={() => handleStatusChange('TRIAGED')}
                      disabled={transitioningStatus}
                      style={{
                        width: '100%',
                        padding: '12px 20px',
                        borderRadius: '9999px',
                        background: 'rgba(114, 46, 209, 0.25)',
                        border: '1px solid #722ed1',
                        color: '#d3adf7',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Accept & Mark Triaged
                    </button>

                    <button
                      id="workflow-set-assigned-btn"
                      onClick={() => handleStatusChange('ASSIGNED')}
                      disabled={transitioningStatus}
                      style={{
                        width: '100%',
                        padding: '12px 20px',
                        borderRadius: '9999px',
                        background: 'rgba(47, 84, 235, 0.25)',
                        border: '1px solid #2f54eb',
                        color: '#adc6ff',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Set to Assigned Queue
                    </button>
                  </>
                )}

                {/* When TRIAGED for Staff */}
                {incident.status === 'TRIAGED' && canManageWorkflow && (
                  <>
                    <button
                      id="workflow-commence-work-btn"
                      onClick={() => handleStatusChange('IN_PROGRESS')}
                      disabled={transitioningStatus}
                      style={{
                        width: '100%',
                        padding: '12px 20px',
                        borderRadius: '9999px',
                        background: 'var(--gradient-btn-purple-teal)',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Commence Technical Work (IN_PROGRESS)
                    </button>

                    <button
                      onClick={() => handleStatusChange('ASSIGNED')}
                      disabled={transitioningStatus}
                      style={{
                        width: '100%',
                        padding: '12px 20px',
                        borderRadius: '9999px',
                        background: 'rgba(47, 84, 235, 0.25)',
                        border: '1px solid #2f54eb',
                        color: '#adc6ff',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Assign to Technician Queue
                    </button>
                  </>
                )}

                {/* When ASSIGNED for Staff */}
                {incident.status === 'ASSIGNED' && canManageWorkflow && (
                  <button
                    id="workflow-commence-work-from-assigned-btn"
                    onClick={() => handleStatusChange('IN_PROGRESS')}
                    disabled={transitioningStatus}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      borderRadius: '9999px',
                      background: 'var(--gradient-btn-purple-teal)',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Commence Technical Work (IN_PROGRESS)
                  </button>
                )}

                {/* When IN_PROGRESS for Staff */}
                {incident.status === 'IN_PROGRESS' && canManageWorkflow && (
                  <button
                    id="workflow-mark-resolved-btn"
                    onClick={() => handleStatusChange('RESOLVED')}
                    disabled={transitioningStatus}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      borderRadius: '9999px',
                      background: 'linear-gradient(90deg, #00b96b 0%, #00ff87 100%)',
                      border: 'none',
                      color: '#002b11',
                      fontSize: '14px',
                      fontWeight: 900,
                      cursor: 'pointer',
                      boxShadow: '0 8px 24px rgba(0, 255, 135, 0.3)'
                    }}
                  >
                    Mark Resolved (Requires Notes) ✓
                  </button>
                )}

                {/* When RESOLVED (Employee or Staff) */}
                {incident.status === 'RESOLVED' && (
                  <>
                    <button
                      id="workflow-confirm-close-btn"
                      onClick={() => handleStatusChange('CLOSED', 'Resolution confirmed')}
                      disabled={transitioningStatus}
                      style={{
                        width: '100%',
                        padding: '12px 20px',
                        borderRadius: '9999px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Confirm Resolution & Close Ticket
                    </button>

                    <button
                      id="workflow-reopen-persists-btn"
                      onClick={() => handleStatusChange('IN_PROGRESS', 'Reopened: Issue persists')}
                      disabled={transitioningStatus}
                      style={{
                        width: '100%',
                        padding: '12px 20px',
                        borderRadius: '9999px',
                        background: 'rgba(255, 77, 79, 0.15)',
                        border: '1px solid rgba(255, 77, 79, 0.4)',
                        color: '#ff7875',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Reopen Incident (Issue Persists)
                    </button>
                  </>
                )}

                {/* When CLOSED */}
                {incident.status === 'CLOSED' && (
                  isAdmin ? (
                    <button
                      id="workflow-admin-reopen-btn"
                      onClick={() => handleStatusChange('OPEN', 'Reopened by Administrator')}
                      disabled={transitioningStatus}
                      style={{
                        width: '100%',
                        padding: '12px 20px',
                        borderRadius: '9999px',
                        background: 'rgba(255, 77, 79, 0.2)',
                        border: '1px solid #ff4d4f',
                        color: '#ff7875',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Administrator Reopen Ticket
                    </button>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center', padding: '8px' }}>
                      Ticket is permanently CLOSED. Only system administrators can reopen closed incidents.
                    </div>
                  )
                )}

                {/* Helpful status notice for Employee while ticket in progress */}
                {isEmployee && (incident.status === 'ASSIGNED' || incident.status === 'IN_PROGRESS' || incident.status === 'TRIAGED') && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, textAlign: 'center', padding: '8px' }}>
                    IT Support is currently handling this incident. Post updates in the discussion thread.
                  </div>
                )}

              </div>
            </div>

            {/* Assignment & Ownership Card */}
            <div 
              style={{
                background: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '28px'
              }}
            >
              <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={16} color="#ff9a8b" /> Technician Assignment
              </h2>

              {incident.assignee ? (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div 
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #603893, #1582c5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: 800
                      }}
                    >
                      {incident.assignee.fullName.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '15px' }}>{incident.assignee.fullName}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{incident.assignee.email}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.04)', marginBottom: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Currently unassigned in NOC queue</div>
                </div>
              )}

              {/* Assignment Actions (Staff only) */}
              {canManageWorkflow && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {!incident.assignee && (
                    <button
                      id="claim-incident-btn"
                      onClick={handleClaimTicket}
                      disabled={assigning}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        borderRadius: '9999px',
                        background: 'var(--gradient-btn-purple-teal)',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: assigning ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {assigning ? 'Claiming...' : '+ Claim Ticket (Assign to Me)'}
                    </button>
                  )}

                  <button
                    id="open-reassign-modal-btn"
                    onClick={() => setIsAssignModalOpen(true)}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      borderRadius: '9999px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {incident.assignee ? 'Reassign Specialist' : 'Assign to Specialist'}
                  </button>
                </div>
              )}

            </div>

          </div>

        </div>

      </div>

      {/* ================================================================= */}
      {/* MODAL 1: RESOLUTION NOTES (Mandatory when resolving)              */}
      {/* ================================================================= */}
      {isResolveModalOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 300,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            style={{
              width: '540px',
              maxWidth: '90vw',
              background: '#090d16',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '32px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.95)'
            }}
          >
            <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px 0', color: '#00ff87' }}>
              Confirm Incident Resolution
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              ITIL governance requires technical resolution notes documenting the root cause remediation before transitioning to RESOLVED.
            </p>

            <textarea 
              id="resolution-notes-textarea"
              rows={4}
              placeholder="e.g. Cleared stuck DHCP lease pool and restarted primary DNS forwarder daemon. Verified gateway ping response."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'rgba(0, 0, 0, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '20px'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setIsResolveModalOpen(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                id="submit-resolution-notes-btn"
                disabled={transitioningStatus || !resolutionNotes.trim()}
                onClick={handleConfirmResolution}
                style={{
                  padding: '10px 24px',
                  borderRadius: '9999px',
                  background: 'linear-gradient(90deg, #00b96b 0%, #00ff87 100%)',
                  border: 'none',
                  color: '#002b11',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: transitioningStatus || !resolutionNotes.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {transitioningStatus ? 'Recording Resolution...' : 'Mark Resolved ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 2: TECHNICIAN REASSIGNMENT                                  */}
      {/* ================================================================= */}
      {isAssignModalOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 300,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            style={{
              width: '520px',
              maxWidth: '90vw',
              background: '#090d16',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '32px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.95)'
            }}
          >
            <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 16px 0' }}>
              Reassign Incident Ticket
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Select Active Support Specialist
              </label>
              <select
                id="select-technician-dropdown"
                value={selectedTechId || ''}
                onChange={(e) => setSelectedTechId(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'rgba(0, 0, 0, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none'
                }}
              >
                <option value="">Choose technician...</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} ({t.department || t.role.replace('ROLE_', '')})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Handover Notes (Optional)
              </label>
              <input 
                id="reassign-notes-input"
                type="text"
                placeholder="e.g. Escalating to Tier 2 Network lead"
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'rgba(0, 0, 0, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-reassign-btn"
                disabled={assigning || !selectedTechId}
                onClick={handleReassign}
                style={{
                  padding: '10px 24px',
                  borderRadius: '9999px',
                  background: 'var(--gradient-btn-purple-teal)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: assigning || !selectedTechId ? 'not-allowed' : 'pointer'
                }}
              >
                {assigning ? 'Reassigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 3: EDIT TICKET DETAILS                                      */}
      {/* ================================================================= */}
      {isEditModalOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 300,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            style={{
              width: '600px',
              maxWidth: '92vw',
              background: '#090d16',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '32px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.95)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>
                Edit Incident Ticket
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {editError && (
              <div 
                role="alert"
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'rgba(255, 77, 79, 0.15)',
                  border: '1px solid rgba(255, 77, 79, 0.4)',
                  color: '#ff7875',
                  fontSize: '13px',
                  marginBottom: '16px'
                }}
              >
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit}>
              {/* Title */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Incident Title *
                </label>
                <input 
                  id="edit-incident-title-input"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  maxLength={200}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: 'rgba(0, 0, 0, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Detailed Description *
                </label>
                <textarea 
                  id="edit-incident-desc-input"
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: 'rgba(0, 0, 0, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Staff-only fields: Category, Impact, Urgency */}
              {canManageWorkflow && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Category
                    </label>
                    <select
                      id="edit-category-select"
                      value={editCategoryId}
                      onChange={(e) => setEditCategoryId(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        background: 'rgba(0, 0, 0, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#ffffff',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    >
                      {availableCategories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Impact
                      </label>
                      <select
                        id="edit-impact-select"
                        value={editImpact}
                        onChange={(e) => setEditImpact(e.target.value as Impact)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          background: 'rgba(0, 0, 0, 0.6)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: '#ffffff',
                          fontSize: '14px',
                          outline: 'none'
                        }}
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Urgency
                      </label>
                      <select
                        id="edit-urgency-select"
                        value={editUrgency}
                        onChange={(e) => setEditUrgency(e.target.value as Urgency)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          background: 'rgba(0, 0, 0, 0.6)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: '#ffffff',
                          fontSize: '14px',
                          outline: 'none'
                        }}
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '20px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Recalculated Priority: <strong style={{ color: '#00f2fe' }}>{calculatePriority(editImpact, editUrgency)}</strong>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '9999px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="save-incident-edit-btn"
                  disabled={savingEdit}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '9999px',
                    background: 'var(--gradient-btn-purple-teal)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: savingEdit ? 'not-allowed' : 'pointer'
                  }}
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
