import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { incidentApi, type IncidentResponse } from '../../services/api';
import { 
  AlertTriangle, 
  ArrowLeft, 
  Check, 
  CheckCircle2, 
  Clock, 
  Copy, 
  HelpCircle, 
  Layers, 
  Plus, 
  Send, 
  Sparkles, 
  Zap 
} from 'lucide-react';

type Impact = 'LOW' | 'MEDIUM' | 'HIGH';
type Urgency = 'LOW' | 'MEDIUM' | 'HIGH';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface CategoryOption {
  id: number;
  name: string;
  description: string;
  defaultSlaHours: number;
  icon: string;
}

const DEFAULT_CATEGORIES: CategoryOption[] = [
  { id: 3, name: 'Network & VPN', description: 'Firewall, LAN, Wi-Fi, DNS, or VPN connection drops', defaultSlaHours: 2, icon: '🌐' },
  { id: 2, name: 'Software & OS', description: 'Application crashes, blue-screens, OS errors, licensing', defaultSlaHours: 4, icon: '💻' },
  { id: 1, name: 'Hardware', description: 'Laptop, desktop, monitors, docking stations, peripherals', defaultSlaHours: 8, icon: '🖥️' },
  { id: 4, name: 'Security & Access', description: 'Account lockouts, credential reset, MFA, suspicious activity', defaultSlaHours: 1, icon: '🔒' },
  { id: 5, name: 'Database & Infrastructure', description: 'Production database downtime, cloud server failure', defaultSlaHours: 2, icon: '🗄️' },
];

const getCategoryIcon = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('network') || lower.includes('vpn')) return '🌐';
  if (lower.includes('software') || lower.includes('os')) return '💻';
  if (lower.includes('hardware')) return '🖥️';
  if (lower.includes('security') || lower.includes('access')) return '🔒';
  if (lower.includes('database') || lower.includes('infra')) return '🗄️';
  return '⚡';
};

export const CreateIncidentPage: React.FC = () => {
  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number>(3); // Default Network
  const [impact, setImpact] = useState<Impact>('HIGH');
  const [urgency, setUrgency] = useState<Urgency>('HIGH');

  // Categories loaded from backend
  const [categories, setCategories] = useState<CategoryOption[]>(DEFAULT_CATEGORIES);

  // Submission & Confirmation State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdIncident, setCreatedIncident] = useState<IncidentResponse | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch real categories from backend on mount
  useEffect(() => {
    let active = true;
    const fetchCategories = async () => {
      try {
        const data = await incidentApi.getCategories();
        if (active && data && data.length > 0) {
          const mapped: CategoryOption[] = data.map(cat => ({
            id: cat.id,
            name: cat.name,
            description: cat.description || '',
            defaultSlaHours: cat.slaHours || 4,
            icon: getCategoryIcon(cat.name)
          }));
          setCategories(mapped);
          if (!mapped.some(c => c.id === categoryId)) {
            setCategoryId(mapped[0].id);
          }
        }
      } catch {
        // Fallback gracefully to default seeded categories if offline
      }
    };
    fetchCategories();
    return () => {
      active = false;
    };
  }, []);

  // Standard ITIL 3x3 Impact-Urgency Matrix calculation
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
    // LOW impact
    if (urg === 'HIGH') return 'MEDIUM';
    return 'LOW';
  };

  const calculatedPriority = calculatePriority(impact, urgency);

  const getSlaTargets = (p: Priority) => {
    switch (p) {
      case 'CRITICAL':
        return { response: '1 Hour', resolution: '4 Hours', color: '#ff4d4f', gradient: 'var(--gradient-rose-p1)' };
      case 'HIGH':
        return { response: '2 Hours', resolution: '8 Hours', color: '#fa8c16', gradient: 'linear-gradient(135deg, #fa8c16, #ffa940)' };
      case 'MEDIUM':
        return { response: '4 Hours', resolution: '24 Hours', color: '#1890ff', gradient: 'var(--gradient-cyan-p2)' };
      case 'LOW':
        return { response: '8 Hours', resolution: '48 Hours', color: '#52c41a', gradient: 'var(--gradient-emerald-p3)' };
    }
  };

  const slaInfo = getSlaTargets(calculatedPriority);

  const handleCopyTicket = (ticketNum: string) => {
    navigator.clipboard.writeText(ticketNum);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetForm = () => {
    setTitle('');
    setDescription('');
    setImpact('HIGH');
    setUrgency('HIGH');
    setError(null);
    setCreatedIncident(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return; // Prevent duplicate submission

    if (title.trim().length < 3) {
      setError('Incident title must be at least 3 characters long.');
      return;
    }
    if (description.trim().length < 10) {
      setError('Please provide a detailed description (at least 10 characters).');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const created = await incidentApi.createIncident({
        title: title.trim(),
        description: description.trim(),
        categoryId,
        impact,
        urgency,
        priority: calculatedPriority
      });

      // Show success confirmation card with generated ticket number
      setCreatedIncident(created);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred while logging the incident.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 15%, #3b0826 0%, #150212 40%, #000000 100%)',
        padding: '100px 24px 80px',
        color: '#ffffff',
        fontFamily: 'var(--font-display)',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        
        {/* Breadcrumb & Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <Link 
            to="/incidents"
            id="back-to-incidents-link"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            <ArrowLeft size={16} /> Back to Incidents
          </Link>
          <span style={{ color: 'var(--text-dim)', fontSize: '13px' }}>/</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            {createdIncident ? 'Confirmation' : 'New Incident Ticket'}
          </span>
        </div>

        {/* ================================================================= */}
        {/* SUCCESS CONFIRMATION VIEW (When incident is created)              */}
        {/* ================================================================= */}
        {createdIncident ? (
          <div 
            id="creation-success-confirmation"
            style={{
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 255, 135, 0.35)',
              borderRadius: '24px',
              padding: '48px 36px',
              boxShadow: '0 20px 60px rgba(0, 255, 135, 0.12)',
              maxWidth: '780px',
              margin: '0 auto',
              textAlign: 'center'
            }}
          >
            {/* Glowing Success Icon */}
            <div 
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                background: 'rgba(0, 255, 135, 0.15)',
                border: '2px solid rgba(0, 255, 135, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                color: '#00ff87'
              }}
            >
              <CheckCircle2 size={42} />
            </div>

            <div style={{ fontSize: '12px', fontWeight: 800, color: '#00ff87', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Incident Ticket Created Successfully
            </div>
            
            <h1 style={{ fontSize: '32px', fontWeight: 900, margin: '0 0 12px 0', letterSpacing: '-0.02em' }}>
              Ticket Dispatched to NOC Queue
            </h1>

            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.6, maxWidth: '580px', margin: '0 auto 28px' }}>
              Your operational incident has been registered in the ITIL management engine. Automated SLA countdowns are now active.
            </p>

            {/* Ticket Number Hero Badge */}
            <div 
              style={{
                background: 'rgba(0, 0, 0, 0.6)',
                border: '1px solid rgba(0, 242, 254, 0.3)',
                borderRadius: '16px',
                padding: '20px 28px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '32px',
                maxWidth: '100%',
                boxSizing: 'border-box'
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'left' }}>
                  Assigned Ticket Number
                </div>
                <div 
                  id="created-ticket-number"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '24px',
                    fontWeight: 900,
                    color: '#00f2fe',
                    letterSpacing: '0.04em'
                  }}
                >
                  {createdIncident.ticketNumber}
                </div>
              </div>

              <button
                type="button"
                id="copy-ticket-number-btn"
                onClick={() => handleCopyTicket(createdIncident.ticketNumber)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '9999px',
                  background: copied ? 'rgba(0, 255, 135, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                  border: copied ? '1px solid #00ff87' : '1px solid rgba(255, 255, 255, 0.15)',
                  color: copied ? '#00ff87' : '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                title="Copy ticket number"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Ticket Summary Details Card */}
            <div 
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '24px',
                textAlign: 'left',
                marginBottom: '32px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                fontSize: '13px'
              }}
            >
              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                  Title
                </div>
                <div style={{ color: '#ffffff', fontWeight: 700 }}>
                  {createdIncident.title}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                  Category
                </div>
                <div style={{ color: '#ffffff', fontWeight: 600 }}>
                  {typeof createdIncident.category === 'object' ? createdIncident.category.name : createdIncident.category}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                  Priority & SLA
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span 
                    style={{
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 800,
                      background: slaInfo.color,
                      color: '#ffffff'
                    }}
                  >
                    {createdIncident.priority}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    {createdIncident.slaPolicy?.resolutionTimeHours || createdIncident.slaHours || 4}h target
                  </span>
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                  Current Status
                </div>
                <div>
                  <span 
                    style={{
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: 'rgba(24, 144, 255, 0.15)',
                      color: '#40a9ff',
                      border: '1px solid rgba(24, 144, 255, 0.3)'
                    }}
                  >
                    {createdIncident.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '14px' }}>
              <Link
                to={`/incidents/${createdIncident.id}`}
                id="view-incident-detail-btn"
                style={{
                  padding: '14px 28px',
                  borderRadius: '9999px',
                  background: 'var(--gradient-btn-purple-teal)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 25px rgba(21, 130, 197, 0.35)'
                }}
              >
                <span>View Incident Details</span>
                <Send size={15} />
              </Link>

              <button
                type="button"
                id="report-another-incident-btn"
                onClick={handleResetForm}
                style={{
                  padding: '14px 24px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Plus size={16} />
                <span>Report Another Incident</span>
              </button>

              <Link
                to="/incidents"
                id="return-to-directory-btn"
                style={{
                  padding: '14px 24px',
                  borderRadius: '9999px',
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                Back to Incident Directory
              </Link>
            </div>

          </div>
        ) : (
          /* ================================================================= */
          /* INCIDENT REPORTING FORM VIEW                                      */
          /* ================================================================= */
          <>
            {/* Section Headline */}
            <div style={{ marginBottom: '36px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff9a8b', fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                <Zap size={15} /> ITIL Incident Service Desk
              </div>
              <h1 style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '-0.02em', margin: '0 0 10px 0' }}>
                Report New Incident
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '15px', maxWidth: '650px', lineHeight: 1.6, margin: 0 }}>
                Submit an operational ticket into the triage pipeline. Priority and SLA targets are dynamically computed using our standardized ITIL impact-urgency matrix.
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div 
                id="create-incident-error-banner"
                role="alert"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  background: 'rgba(255, 77, 79, 0.15)',
                  border: '1px solid rgba(255, 77, 79, 0.4)',
                  borderRadius: '12px',
                  marginBottom: '28px',
                  color: '#ff7875',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ff7875',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 700,
                    textDecoration: 'underline'
                  }}
                >
                  Dismiss
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} id="create-incident-form">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
                
                {/* Left Column: Ticket Details */}
                <div 
                  style={{
                    background: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '20px',
                    padding: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px'
                  }}
                >
                  <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={18} color="#00f2fe" /> Incident Information
                  </h2>

                  {/* Title Field */}
                  <div>
                    <label 
                      htmlFor="incident-title-input"
                      style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}
                    >
                      Incident Title *
                    </label>
                    <input 
                      id="incident-title-input"
                      type="text"
                      placeholder="e.g. Primary VPN Gateway Down - Authentication Failing"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        if (error) setError(null);
                      }}
                      maxLength={200}
                      required
                      aria-required="true"
                      disabled={submitting}
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: '12px',
                        background: 'rgba(0, 0, 0, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#ffffff',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                      {title.length}/200 characters
                    </div>
                  </div>

                  {/* Category Selector */}
                  <div>
                    <label 
                      style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}
                    >
                      Incident Category *
                    </label>
                    <div 
                      role="radiogroup" 
                      aria-label="Incident Category Selection"
                      style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}
                    >
                      {categories.map((cat) => {
                        const isSelected = categoryId === cat.id;
                        return (
                          <div
                            key={cat.id}
                            role="radio"
                            aria-checked={isSelected}
                            tabIndex={0}
                            id={`category-option-${cat.id}`}
                            onClick={() => {
                              if (!submitting) setCategoryId(cat.id);
                            }}
                            onKeyDown={(e) => {
                              if ((e.key === ' ' || e.key === 'Enter') && !submitting) {
                                e.preventDefault();
                                setCategoryId(cat.id);
                              }
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '12px 16px',
                              borderRadius: '12px',
                              background: isSelected ? 'rgba(0, 242, 254, 0.1)' : 'rgba(0, 0, 0, 0.4)',
                              border: isSelected ? '1px solid #00f2fe' : '1px solid rgba(255, 255, 255, 0.08)',
                              cursor: submitting ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s',
                              outline: 'none'
                            }}
                          >
                            <span style={{ fontSize: '20px' }}>{cat.icon}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '14px', fontWeight: 700, color: isSelected ? '#ffffff' : 'var(--text-secondary)' }}>
                                  {cat.name}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                                  SLA: {cat.defaultSlaHours}h
                                </span>
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {cat.description}
                              </div>
                            </div>
                            {isSelected && <CheckCircle2 size={18} color="#00f2fe" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Detailed Description */}
                  <div>
                    <label 
                      htmlFor="incident-description-input"
                      style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}
                    >
                      Detailed Description *
                    </label>
                    <textarea 
                      id="incident-description-input"
                      rows={5}
                      placeholder="Describe what occurred, steps to reproduce, affected workstations, and any error codes or IP addresses observed..."
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        if (error) setError(null);
                      }}
                      required
                      aria-required="true"
                      disabled={submitting}
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: '12px',
                        background: 'rgba(0, 0, 0, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#ffffff',
                        fontSize: '14px',
                        lineHeight: 1.5,
                        outline: 'none',
                        resize: 'vertical',
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                      {description.length} characters (min 10)
                    </div>
                  </div>

                </div>

                {/* Right Column: ITIL Priority Matrix & SLA Preview */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Matrix Control Card */}
                  <div 
                    style={{
                      background: 'rgba(15, 23, 42, 0.65)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '20px',
                      padding: '32px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                      <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={18} color="#ff9a8b" /> ITIL Severity Assessment
                      </h2>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', background: 'rgba(255, 255, 255, 0.05)', padding: '4px 10px', borderRadius: '9999px' }}>
                        ITIL 4 Standard
                      </span>
                    </div>

                    {/* Impact Selector */}
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          Business Impact
                        </label>
                        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Scope of affected operations</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        {(['LOW', 'MEDIUM', 'HIGH'] as Impact[]).map((level) => {
                          const active = impact === level;
                          return (
                            <button
                              key={level}
                              type="button"
                              id={`impact-btn-${level.toLowerCase()}`}
                              disabled={submitting}
                              onClick={() => setImpact(level)}
                              style={{
                                padding: '10px 8px',
                                borderRadius: '10px',
                                background: active ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.4)',
                                border: active ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.08)',
                                color: active ? '#ffffff' : 'var(--text-muted)',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: submitting ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              {level}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Urgency Selector */}
                    <div style={{ marginBottom: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          Operational Urgency
                        </label>
                        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Time sensitivity for resolution</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        {(['LOW', 'MEDIUM', 'HIGH'] as Urgency[]).map((level) => {
                          const active = urgency === level;
                          return (
                            <button
                              key={level}
                              type="button"
                              id={`urgency-btn-${level.toLowerCase()}`}
                              disabled={submitting}
                              onClick={() => setUrgency(level)}
                              style={{
                                padding: '10px 8px',
                                borderRadius: '10px',
                                background: active ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.4)',
                                border: active ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.08)',
                                color: active ? '#ffffff' : 'var(--text-muted)',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: submitting ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              {level}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Visual 3x3 Matrix Grid */}
                    <div style={{ marginBottom: '24px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
                        Interactive Priority Matrix (Impact × Urgency)
                      </div>
                      <div 
                        style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'auto repeat(3, 1fr)', 
                          gap: '4px',
                          background: 'rgba(0, 0, 0, 0.4)',
                          padding: '12px',
                          borderRadius: '12px',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)',
                          textAlign: 'center'
                        }}
                      >
                        <div />
                        <div style={{ color: 'var(--text-dim)', fontWeight: 700, paddingBottom: '4px' }}>U: LOW</div>
                        <div style={{ color: 'var(--text-dim)', fontWeight: 700, paddingBottom: '4px' }}>U: MED</div>
                        <div style={{ color: 'var(--text-dim)', fontWeight: 700, paddingBottom: '4px' }}>U: HIGH</div>

                        {/* Row 1: High Impact */}
                        <div style={{ color: 'var(--text-dim)', fontWeight: 700, display: 'flex', alignItems: 'center' }}>I: HIGH</div>
                        <div 
                          onClick={() => { if (!submitting) { setImpact('HIGH'); setUrgency('LOW'); } }}
                          style={{ 
                            padding: '8px', 
                            borderRadius: '6px', 
                            cursor: 'pointer',
                            background: (impact === 'HIGH' && urgency === 'LOW') ? '#1890ff' : 'rgba(24, 144, 255, 0.15)',
                            color: (impact === 'HIGH' && urgency === 'LOW') ? '#ffffff' : '#40a9ff',
                            fontWeight: 700
                          }}
                        >
                          MEDIUM
                        </div>
                        <div 
                          onClick={() => { if (!submitting) { setImpact('HIGH'); setUrgency('MEDIUM'); } }}
                          style={{ 
                            padding: '8px', 
                            borderRadius: '6px', 
                            cursor: 'pointer',
                            background: (impact === 'HIGH' && urgency === 'MEDIUM') ? '#fa8c16' : 'rgba(250, 140, 22, 0.15)',
                            color: (impact === 'HIGH' && urgency === 'MEDIUM') ? '#ffffff' : '#ffa940',
                            fontWeight: 700
                          }}
                        >
                          HIGH
                        </div>
                        <div 
                          onClick={() => { if (!submitting) { setImpact('HIGH'); setUrgency('HIGH'); } }}
                          style={{ 
                            padding: '8px', 
                            borderRadius: '6px', 
                            cursor: 'pointer',
                            background: (impact === 'HIGH' && urgency === 'HIGH') ? '#ff4d4f' : 'rgba(255, 77, 79, 0.2)',
                            color: (impact === 'HIGH' && urgency === 'HIGH') ? '#ffffff' : '#ff7875',
                            fontWeight: 800
                          }}
                        >
                          CRITICAL
                        </div>

                        {/* Row 2: Medium Impact */}
                        <div style={{ color: 'var(--text-dim)', fontWeight: 700, display: 'flex', alignItems: 'center' }}>I: MED</div>
                        <div 
                          onClick={() => { if (!submitting) { setImpact('MEDIUM'); setUrgency('LOW'); } }}
                          style={{ 
                            padding: '8px', 
                            borderRadius: '6px', 
                            cursor: 'pointer',
                            background: (impact === 'MEDIUM' && urgency === 'LOW') ? '#52c41a' : 'rgba(82, 196, 26, 0.15)',
                            color: (impact === 'MEDIUM' && urgency === 'LOW') ? '#ffffff' : '#73d13d',
                            fontWeight: 700
                          }}
                        >
                          LOW
                        </div>
                        <div 
                          onClick={() => { if (!submitting) { setImpact('MEDIUM'); setUrgency('MEDIUM'); } }}
                          style={{ 
                            padding: '8px', 
                            borderRadius: '6px', 
                            cursor: 'pointer',
                            background: (impact === 'MEDIUM' && urgency === 'MEDIUM') ? '#1890ff' : 'rgba(24, 144, 255, 0.15)',
                            color: (impact === 'MEDIUM' && urgency === 'MEDIUM') ? '#ffffff' : '#40a9ff',
                            fontWeight: 700
                          }}
                        >
                          MEDIUM
                        </div>
                        <div 
                          onClick={() => { if (!submitting) { setImpact('MEDIUM'); setUrgency('HIGH'); } }}
                          style={{ 
                            padding: '8px', 
                            borderRadius: '6px', 
                            cursor: 'pointer',
                            background: (impact === 'MEDIUM' && urgency === 'HIGH') ? '#fa8c16' : 'rgba(250, 140, 22, 0.15)',
                            color: (impact === 'MEDIUM' && urgency === 'HIGH') ? '#ffffff' : '#ffa940',
                            fontWeight: 700
                          }}
                        >
                          HIGH
                        </div>

                        {/* Row 3: Low Impact */}
                        <div style={{ color: 'var(--text-dim)', fontWeight: 700, display: 'flex', alignItems: 'center' }}>I: LOW</div>
                        <div 
                          onClick={() => { if (!submitting) { setImpact('LOW'); setUrgency('LOW'); } }}
                          style={{ 
                            padding: '8px', 
                            borderRadius: '6px', 
                            cursor: 'pointer',
                            background: (impact === 'LOW' && urgency === 'LOW') ? '#52c41a' : 'rgba(82, 196, 26, 0.15)',
                            color: (impact === 'LOW' && urgency === 'LOW') ? '#ffffff' : '#73d13d',
                            fontWeight: 700
                          }}
                        >
                          LOW
                        </div>
                        <div 
                          onClick={() => { if (!submitting) { setImpact('LOW'); setUrgency('MEDIUM'); } }}
                          style={{ 
                            padding: '8px', 
                            borderRadius: '6px', 
                            cursor: 'pointer',
                            background: (impact === 'LOW' && urgency === 'MEDIUM') ? '#52c41a' : 'rgba(82, 196, 26, 0.15)',
                            color: (impact === 'LOW' && urgency === 'MEDIUM') ? '#ffffff' : '#73d13d',
                            fontWeight: 700
                          }}
                        >
                          LOW
                        </div>
                        <div 
                          onClick={() => { if (!submitting) { setImpact('LOW'); setUrgency('HIGH'); } }}
                          style={{ 
                            padding: '8px', 
                            borderRadius: '6px', 
                            cursor: 'pointer',
                            background: (impact === 'LOW' && urgency === 'HIGH') ? '#1890ff' : 'rgba(24, 144, 255, 0.15)',
                            color: (impact === 'LOW' && urgency === 'HIGH') ? '#ffffff' : '#40a9ff',
                            fontWeight: 700
                          }}
                        >
                          MEDIUM
                        </div>
                      </div>
                    </div>

                    {/* Priority Output Result Card */}
                    <div 
                      style={{
                        background: 'rgba(0, 0, 0, 0.5)',
                        borderRadius: '16px',
                        padding: '20px',
                        border: `1px solid ${slaInfo.color}`
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                          CALCULATED PRIORITY
                        </span>
                        <span 
                          id="calculated-priority-badge"
                          style={{
                            padding: '4px 12px',
                            borderRadius: '9999px',
                            background: slaInfo.color,
                            color: '#ffffff',
                            fontSize: '12px',
                            fontWeight: 800,
                            letterSpacing: '0.05em'
                          }}
                        >
                          {calculatedPriority}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '14px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-dim)', marginBottom: '2px' }}>
                            <Clock size={12} /> RESPONSE SLA
                          </div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                            {slaInfo.response}
                          </div>
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-dim)', marginBottom: '2px' }}>
                            <Clock size={12} /> RESOLUTION TARGET
                          </div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: slaInfo.color }}>
                            {slaInfo.resolution}
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Submit CTA Pill */}
                  <button
                    type="submit"
                    id="submit-incident-btn"
                    disabled={submitting}
                    aria-busy={submitting}
                    style={{
                      width: '100%',
                      padding: '18px 28px',
                      borderRadius: '9999px',
                      background: 'var(--gradient-btn-amber-pink)',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '15px',
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      boxShadow: '0 8px 30px rgba(224, 82, 160, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      opacity: submitting ? 0.7 : 1
                    }}
                  >
                    {submitting ? (
                      <>
                        <div 
                          style={{
                            width: '18px',
                            height: '18px',
                            border: '2px solid rgba(255, 255, 255, 0.3)',
                            borderTopColor: '#ffffff',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite'
                          }}
                        />
                        <span>TRANSMITTING TO INCIDENT ENGINE...</span>
                      </>
                    ) : (
                      <>
                        <span>SUBMIT INCIDENT TICKET</span>
                        <Send size={16} />
                      </>
                    )}
                  </button>

                  {/* Security & Audit Notice */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                    <HelpCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>
                      All ticket submissions emit immutable audit log entries, notify the on-call triage engineering queue, and initiate automated SLA countdowns.
                    </span>
                  </div>

                </div>

              </div>
            </form>
          </>
        )}

      </div>
    </div>
  );
};
