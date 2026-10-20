import React, { useState } from 'react';
import { incidentApi } from '../../services/api';

interface CreateIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIncidentCreated: () => void;
}

export const CreateIncidentModal: React.FC<CreateIncidentModalProps> = ({
  isOpen,
  onClose,
  onIncidentCreated
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'HARDWARE' | 'SOFTWARE' | 'NETWORK' | 'DATABASE' | 'SECURITY'>('NETWORK');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [slaHours, setSlaHours] = useState<number>(2);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePriorityChange = (p: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') => {
    setPriority(p);
    switch (p) {
      case 'CRITICAL': setSlaHours(1); break;
      case 'HIGH': setSlaHours(2); break;
      case 'MEDIUM': setSlaHours(4); break;
      case 'LOW': setSlaHours(8); break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Please provide both incident title and detailed description.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await incidentApi.createIncident({
        title,
        description,
        category,
        priority,
        slaHours
      });
      onIncidentCreated();
      onClose();
      // Reset form
      setTitle('');
      setDescription('');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create incident on backend.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)'
      }}
    >
      <div 
        style={{
          width: '640px',
          maxWidth: '90vw',
          background: '#090d16',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.95)',
          overflow: 'hidden',
          animation: 'modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div 
          style={{
            padding: '24px 32px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(122, 0, 38, 0.3) 0%, rgba(9, 13, 22, 1) 100%)'
          }}
        >
          <div>
            <span 
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                color: '#ff9a8b',
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}
            >
              ITIL Service Desk Triage
            </span>
            <h2 
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#ffffff',
                marginTop: '2px'
              }}
            >
              Log New Incident Ticket
            </h2>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '6px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '28px 32px' }}>
          {error && (
            <div 
              style={{
                background: 'rgba(255, 77, 79, 0.15)',
                border: '1px solid rgba(255, 77, 79, 0.3)',
                color: '#ff4d4f',
                padding: '12px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                marginBottom: '20px'
              }}
            >
              {error}
            </div>
          )}

          {/* Title */}
          <div style={{ marginBottom: '20px' }}>
            <label 
              style={{
                display: 'block',
                fontFamily: 'var(--font-display)',
                fontSize: '12px',
                fontWeight: 600,
                color: '#cbd5e1',
                marginBottom: '8px'
              }}
            >
              Incident Title *
            </label>
            <input 
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Primary Edge Gateway 504 Gateway Timeout in Central DC"
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Category & Priority Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            {/* Category */}
            <div>
              <label 
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-display)',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  marginBottom: '8px'
                }}
              >
                Category *
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: '#0f172a',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none'
                }}
              >
                <option value="NETWORK">Network &amp; VPN</option>
                <option value="DATABASE">Database &amp; Storage</option>
                <option value="HARDWARE">Hardware &amp; Physical</option>
                <option value="SOFTWARE">Software &amp; OS</option>
                <option value="SECURITY">Security &amp; IAM</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label 
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-display)',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  marginBottom: '8px'
                }}
              >
                ITIL Priority * (Target SLA: {slaHours}h)
              </label>
              <select
                value={priority}
                onChange={e => handlePriorityChange(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: '#0f172a',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  color: priority === 'CRITICAL' ? '#ff4d4f' : priority === 'HIGH' ? '#fa8c16' : '#ffffff',
                  fontSize: '14px',
                  fontWeight: 600,
                  outline: 'none'
                }}
              >
                <option value="CRITICAL">Critical (P1 - 1 Hour SLA)</option>
                <option value="HIGH">High (P2 - 2 Hour SLA)</option>
                <option value="MEDIUM">Medium (P3 - 4 Hour SLA)</option>
                <option value="LOW">Low (P4 - 8 Hour SLA)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '24px' }}>
            <label 
              style={{
                display: 'block',
                fontFamily: 'var(--font-display)',
                fontSize: '12px',
                fontWeight: 600,
                color: '#cbd5e1',
                marginBottom: '8px'
              }}
            >
              Detailed Symptom &amp; Reproduction Notes *
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide exact error code, affected hostnames, IP addresses, and business impact..."
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '14px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-pill btn-pill-outline"
              disabled={submitting}
              style={{ padding: '10px 22px' }}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn-pill btn-pill-amber-pink"
              disabled={submitting}
              style={{ padding: '10px 26px' }}
            >
              {submitting ? 'Dispatching to SWAT...' : 'Dispatch Ticket ➔'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes modalPop {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
