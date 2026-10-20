import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { incidentApi } from '../../services/api';
import type { Incident } from '../../services/api';

interface IncidentDetailModalProps {
  incident: Incident | null;
  onClose: () => void;
  onUpdated: () => void;
}

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
  incident,
  onClose,
  onUpdated
}) => {
  const [newStatus, setNewStatus] = useState<string>(incident?.status || 'IN_PROGRESS');
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [updating, setUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!incident) return null;

  const handleStatusUpdate = async () => {
    setUpdating(true);
    setError(null);
    try {
      await incidentApi.updateStatus(incident.id, newStatus, resolutionNotes || undefined);
      onUpdated();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to update incident status.');
      }
    } finally {
      setUpdating(false);
    }
  };

  const isCritical = incident.priority === 'CRITICAL';

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 210,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)'
      }}
    >
      <div 
        style={{
          width: '720px',
          maxWidth: '92vw',
          background: '#090d16',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.95)',
          overflow: 'hidden'
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
            background: isCritical 
              ? 'linear-gradient(90deg, rgba(122, 0, 38, 0.4) 0%, rgba(9, 13, 22, 1) 100%)'
              : 'linear-gradient(90deg, rgba(2, 132, 199, 0.25) 0%, rgba(9, 13, 22, 1) 100%)'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: '#00f2fe', fontSize: '13px', fontWeight: 700 }}>
                {incident.ticketNumber}
              </span>
              <span 
                style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: isCritical ? 'rgba(255, 77, 79, 0.2)' : 'rgba(2, 132, 199, 0.2)',
                  color: isCritical ? '#ff4d4f' : '#00f2fe',
                  border: isCritical ? '1px solid rgba(255, 77, 79, 0.4)' : '1px solid rgba(2, 132, 199, 0.4)'
                }}
              >
                {incident.priority} PRIORITY
              </span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 700, color: '#ffffff' }}>
              {incident.title}
            </h2>
          </div>

          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '28px 32px' }}>
          {error && (
            <div 
              style={{
                background: 'rgba(255, 77, 79, 0.15)',
                border: '1px solid rgba(255, 77, 79, 0.3)',
                color: '#ff4d4f',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '18px'
              }}
            >
              {error}
            </div>
          )}

          {/* Metadata Grid */}
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '14px',
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '12px',
              marginBottom: '20px',
              fontFamily: 'var(--font-display)',
              fontSize: '12px'
            }}
          >
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>Category</span>
              <strong style={{ color: '#ffffff' }}>
                {typeof incident.category === 'object' && incident.category !== null ? incident.category.name : (incident.category || 'General')}
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>Current Status</span>
              <strong style={{ color: '#00ff87' }}>{incident.status}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>Target SLA</span>
              <strong style={{ color: isCritical ? '#ff9a8b' : '#ffffff' }}>
                {incident.slaHours || incident.slaPolicy?.resolutionTimeHours || 4} Hours
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>Assignee</span>
              <strong style={{ color: '#ffffff' }}>
                {incident.assigneeName || incident.assignee?.fullName || incident.assignee?.username || 'Unassigned (Dispatch)'}
              </strong>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '24px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-display)', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              Incident Symptoms &amp; Telemetry
            </span>
            <p style={{ marginTop: '6px', color: '#cbd5e1', fontSize: '14px', lineHeight: 1.6, background: '#05070d', padding: '14px 18px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              {incident.description}
            </p>
          </div>

          {/* Status Transition Controls */}
          <div style={{ marginBottom: '20px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-display)', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              Perform ITIL Status Transition
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px', marginTop: '8px' }}>
              <select
                value={newStatus}
                onChange={e => setNewStatus(e.target.value)}
                style={{
                  padding: '10px 14px',
                  background: '#0f172a',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              >
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="ON_HOLD">ON_HOLD</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="CLOSED">CLOSED</option>
              </select>

              <input 
                type="text"
                placeholder="Resolution notes or handoff comments..."
                value={resolutionNotes}
                onChange={e => setResolutionNotes(e.target.value)}
                style={{
                  padding: '10px 14px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <Link
              to={`/incidents/${incident.id}`}
              onClick={onClose}
              style={{
                color: '#00f2fe',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'none',
                marginRight: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              Open Full Detail Page ↗
            </Link>
            <button
              onClick={onClose}
              className="btn-pill btn-pill-outline"
              style={{ padding: '8px 20px', fontSize: '13px' }}
            >
              Close
            </button>
            <button
              onClick={handleStatusUpdate}
              disabled={updating}
              className="btn-pill btn-pill-amber-pink"
              style={{ padding: '8px 22px', fontSize: '13px' }}
            >
              {updating ? 'Updating...' : 'Commit Status Update ➔'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
