import React, { useState } from 'react';

interface MegaCategory {
  id: string;
  name: string;
  icon: string;
  badge?: string;
  subcategories: { title: string; desc: string; tag: string }[];
}

const CATEGORIES: MegaCategory[] = [
  {
    id: 'infra',
    name: 'Infrastructure Solutions',
    icon: 'M4 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm0 8a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z',
    subcategories: [
      { title: 'Core Datacenter Ops', desc: 'Compute clusters, SAN arrays, redundant power', tag: 'P1 Swat' },
      { title: 'Edge Computing & Hardware', desc: 'Point-of-failure routing and rack maintenance', tag: 'Hardware' },
      { title: 'Hyper-Converged Infra', desc: 'Nutanix & VMware virtual cluster oversight', tag: 'Virtual' }
    ]
  },
  {
    id: 'cloud',
    name: 'Cloud Solutions',
    icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z',
    subcategories: [
      { title: 'Multi-Cloud Fabric (AWS/Azure)', desc: 'Cross-region VPC peering and egress health', tag: 'Cloud' },
      { title: 'Kubernetes Ingress & Mesh', desc: 'Pod restarts, OOMKills, and cluster autoscaling', tag: 'K8s' },
      { title: 'Cloud Cost & Elasticity', desc: 'Anomaly detection and rapid capacity elasticity', tag: 'FinOps' }
    ]
  },
  {
    id: 'managed',
    name: 'Managed Services & Triage',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    badge: 'Core',
    subcategories: [
      { title: 'Active Incident Command', desc: 'Central queue dispatch and ticket triage matrix', tag: 'ITIL' },
      { title: 'P1 Crisis War Room', desc: 'Automated executive escalation and SWAT routing', tag: 'P1' },
      { title: 'Technician Work Queue', desc: 'Smart ticket distribution and SLA countdown', tag: 'Queue' }
    ]
  },
  {
    id: 'zero',
    name: 'Zero Incident (AI & Automation)',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    badge: 'AI',
    subcategories: [
      { title: 'AIOps Self-Healing Scripts', desc: 'Predictive root-cause isolation and auto-restart', tag: 'AIOps' },
      { title: 'Shift-Left Proactive Rules', desc: 'Resolving tickets before customer alert fires', tag: 'Predictive' },
      { title: 'Noise Suppression & Telemetry', desc: 'Consolidates 5,000 alerts into single incident', tag: 'Telemetry' }
    ]
  },
  {
    id: 'cyber',
    name: 'Cyber Security & Zero Trust',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    subcategories: [
      { title: 'Threat Containment Protocol', desc: 'Immediate host isolation and credential revoke', tag: 'SecOps' },
      { title: 'PAM & Entra ID Governance', desc: 'Elevated role auditing and biometric token locks', tag: 'IAM' }
    ]
  },
  {
    id: 'amc',
    name: 'Annual Maintenance Contract',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
    subcategories: [
      { title: 'Hardware Spare Parts SLA', desc: '4-hour guaranteed on-site replacement', tag: 'SLA 4h' },
      { title: 'Vendor Escalate Contract', desc: 'Direct OEM escalation for Cisco, Dell, HPE', tag: 'OEM' }
    ]
  },
  {
    id: 'workplace',
    name: 'Digital Workplace & Identity',
    icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    subcategories: [
      { title: 'Executive VIP Support', desc: 'Prioritized whiteboard and board room triage', tag: 'VIP' },
      { title: 'Endpoint MDM Fleet Management', desc: 'Zero-touch laptop provisioning & disk encryption', tag: 'MDM' }
    ]
  }
];

interface MegaDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction?: (actionTitle: string) => void;
}

export const MegaDropdown: React.FC<MegaDropdownProps> = ({ isOpen, onClose, onSelectAction }) => {
  const [activeCategoryId, setActiveCategoryId] = useState<string>('managed');

  if (!isOpen) return null;

  const activeCategory = CATEGORIES.find(c => c.id === activeCategoryId) || CATEGORIES[2];

  return (
    <>
      {/* Invisible backdrop to dismiss on outside click */}
      <div 
        className="mega-dropdown-backdrop" 
        onClick={onClose}
        style={{
          position: 'fixed',
          top: '76px',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99,
          background: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(4px)'
        }} 
      />

      {/* Replicated floating pure-white mega dropdown container (Reference frame_075s) */}
      <div
        className="mega-dropdown-container"
        id="mega-menu-modal"
        style={{
          position: 'absolute',
          top: '76px',
          left: '260px',
          zIndex: 100,
          width: '780px',
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          overflow: 'hidden',
          animation: 'fadeInSlideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Left Category Column */}
        <div 
          style={{
            background: '#fafafa',
            borderRight: '1px solid #f0f0f0',
            padding: '16px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          {CATEGORIES.map(category => {
            const isActive = category.id === activeCategoryId;
            return (
              <div
                key={category.id}
                onMouseEnter={() => setActiveCategoryId(category.id)}
                onClick={() => setActiveCategoryId(category.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  background: isActive ? '#f0f7ff' : 'transparent',
                  color: isActive ? '#0284c7' : '#334155',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.875rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    style={{ color: isActive ? '#0284c7' : '#94a3b8' }}
                  >
                    <path d={category.icon} />
                  </svg>
                  <span style={{ fontFamily: 'var(--font-display)' }}>{category.name}</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {category.badge && (
                    <span 
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '9999px',
                        background: isActive ? '#0284c7' : '#e2e8f0',
                        color: isActive ? '#ffffff' : '#64748b'
                      }}
                    >
                      {category.badge}
                    </span>
                  )}
                  <svg 
                    width="14" 
                    height="14" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    style={{ color: isActive ? '#0284c7' : '#cbd5e1' }}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Subcategories Pane (frame_075s) */}
        <div style={{ padding: '24px 28px', background: '#ffffff' }}>
          <div 
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: '#94a3b8',
              textTransform: 'uppercase',
              marginBottom: '18px'
            }}
          >
            {activeCategory.name} Overview &amp; Capabilities
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {activeCategory.subcategories.map((sub, idx) => (
              <div
                key={idx}
                onClick={() => {
                  if (onSelectAction) onSelectAction(sub.title);
                  onClose();
                }}
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: '1px solid #f1f5f9',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#bae6fd';
                  e.currentTarget.style.background = '#f0f9ff';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#f1f5f9';
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div>
                  <div 
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: '0.9375rem',
                      color: '#0f172a',
                      marginBottom: '2px'
                    }}
                  >
                    {sub.title}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                    {sub.desc}
                  </div>
                </div>

                <span 
                  style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    background: '#e0f2fe',
                    color: '#0369a1',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {sub.tag}
                </span>
              </div>
            ))}
          </div>

          <div 
            style={{
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              ITIL v4 Automated SLA Triage Matrix
            </span>
            <button
              onClick={() => {
                if (onSelectAction) onSelectAction(activeCategory.name);
                onClose();
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#0284c7',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              Open Domain Workstation &rarr;
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};
