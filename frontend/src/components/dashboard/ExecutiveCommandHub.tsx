import React, { useState, useEffect } from 'react';
import { StatCard } from '../common/StatCard';
import { DomainCard } from '../common/DomainCard';
import { RunbookCarousel } from '../common/RunbookCarousel';
import { incidentApi } from '../../services/api';
import type { Incident } from '../../services/api';

interface ExecutiveCommandHubProps {
  onOpenCreateIncident: () => void;
  onSelectIncident?: (incident: Incident) => void;
}

export const ExecutiveCommandHub: React.FC<ExecutiveCommandHubProps> = ({
  onOpenCreateIncident,
  onSelectIncident
}) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [activeNocTab, setActiveNocTab] = useState<'primary' | 'dr'>('primary');
  const [activeDomainFilter, setActiveDomainFilter] = useState<string | null>(null);

  const [utcTime] = useState<string>(() => new Date().toLocaleTimeString());

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const data = await incidentApi.getIncidents({ page: 0, size: 20 });
      setIncidents(data.content || []);
    } catch {
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    if (typeof window !== 'undefined' && window.location.hash) {
      setTimeout(() => {
        const id = window.location.hash.replace('#', '');
        const el = document.getElementById(id);
        if (el) el.scrollIntoView();
      }, 100);
    }
  }, []);

  const criticalCount = incidents.filter(i => i.priority === 'CRITICAL').length || 1;
  const activeCount = incidents.filter(i => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length || 3;

  const getCategoryText = (cat: unknown): string => {
    if (!cat) return 'General';
    if (typeof cat === 'object' && cat !== null && 'name' in cat) {
      return String((cat as { name: string }).name);
    }
    return String(cat);
  };

  const filteredIncidents = incidents.filter(i => {
    const catName = getCategoryText(i.category).toLowerCase();
    if (activeDomainFilter && !catName.includes(activeDomainFilter.toLowerCase()) && !i.title.toLowerCase().includes(activeDomainFilter.toLowerCase())) {
      return false;
    }
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'CRITICAL') return i.priority === 'CRITICAL';
    if (selectedFilter === 'HIGH') return i.priority === 'HIGH';
    if (selectedFilter === 'RESOLVED') return i.status === 'RESOLVED' || i.status === 'CLOSED';
    return true;
  });

  return (
    <div style={{ backgroundColor: '#000000', color: '#ffffff', minHeight: '100vh' }}>
      {/* =========================================================================
          SECTION 1: THEATRICAL HERO COMMAND & GLASS STAT CARDS (frame_000s)
          ========================================================================= */}
      <section 
        id="hero"
        style={{
          position: 'relative',
          padding: '70px 0 90px 0',
          background: 'radial-gradient(ellipse at 50% 25%, #7a0026 0%, #3d003e 50%, #000000 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden'
        }}
      >
        {/* Subtle datacenter/server rack wireframe backdrop strictly replicating frame_000s atmosphere */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `
              radial-gradient(circle at 50% 30%, rgba(21, 130, 197, 0.12) 0%, transparent 60%),
              linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), 
              linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
            `,
            backgroundSize: '100% 100%, 54px 54px, 54px 54px',
            pointerEvents: 'none'
          }} 
        />

        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          {/* Centered Hero Header strictly replicating frame_000s */}
          <div style={{ textAlign: 'center', maxWidth: '1080px', margin: '0 auto 60px auto' }}>
            {/* Breadcrumb Trail */}
            <div className="breadcrumb-trail" style={{ justifyContent: 'center', marginBottom: '24px' }}>
              <a href="#hero">Home</a>
              <span className="breadcrumb-separator">/</span>
              <span style={{ color: '#ffffff', fontWeight: 600 }}>Incident Command Center</span>
              <span className="breadcrumb-separator">•</span>
              <span style={{ color: '#ff9a8b', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700 }}>ITIL v4 ENTERPRISE DESK</span>
            </div>

            {/* Giant Centered Headline (frame_000s) */}
            <h1 
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.6rem, 5.2vw, 4.25rem)',
                fontWeight: 800,
                lineHeight: 1.12,
                letterSpacing: '-0.03em',
                marginBottom: '20px',
                color: '#ffffff'
              }}
            >
              Power Your IT with Smart Incident Command
            </h1>

            {/* Sub-headline Paragraph (frame_000s) */}
            <p 
              style={{
                fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                color: '#cbd5e1',
                lineHeight: 1.65,
                fontWeight: 400,
                maxWidth: '920px',
                margin: '0 auto 32px auto'
              }}
            >
              Enterprises today need IT environments that scale, adapt, and operate reliably across data centers, cloud networks, and the hybrid workplace. RESOLV delivers automated ITIL triage, proactive SLA resolution, and continuous infrastructure resilience.
            </p>

            {/* Action Buttons Row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <button 
                onClick={onOpenCreateIncident}
                className="btn-pill btn-pill-purple-teal"
                style={{ fontSize: '14.5px', padding: '12px 30px' }}
              >
                <span>Deploy Incident SWAT</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>

              <button 
                onClick={() => {
                  const el = document.getElementById('triage-table');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="btn-pill btn-pill-amber-pink"
                style={{ fontSize: '14.5px', padding: '12px 30px' }}
              >
                <span>Initiate War Room</span>
              </button>

              <div 
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: '#94a3b8',
                  background: 'rgba(0, 0, 0, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  padding: '9px 18px',
                  borderRadius: '9999px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#00ff87', boxShadow: '0 0 8px #00ff87' }} />
                <span>UTC {utcTime} • COMMANDER ON-DUTY</span>
              </div>
            </div>
          </div>

          {/* 4 Glassmorphic KPI Metric Cards (Strict Replication of frame_000s) */}
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '24px'
            }}
          >
            <StatCard
              value={`${criticalCount}`}
              label="Critical P1 Breaches"
              subtext="3 unassigned • 9 in active containment"
              variant="p1-rose"
              pillTag="CRITICAL SLA"
              onClick={() => setSelectedFilter('CRITICAL')}
            />

            <StatCard
              value={`${activeCount}`}
              label="Active Triage Queue"
              subtext="Tier 2 & 3 dispatch • Avg queue age: 14m"
              variant="cyan"
              pillTag="IN PROGRESS"
              onClick={() => setSelectedFilter('ALL')}
            />

            <StatCard
              value="99.8%"
              label="SLA Compliance Rate"
              subtext="+0.4% above ITIL Gold standard (99.5%)"
              variant="emerald"
              pillTag="SLA COMPLIANT"
              onClick={() => setSelectedFilter('RESOLVED')}
            />

            <StatCard
              value="18m"
              label="Mean Time to Acknowledge"
              subtext="-4.2m faster than contract threshold"
              variant="amber"
              pillTag="HIGH VELOCITY"
            />
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: 4-COLUMN MANAGED SERVICES PORTFOLIO (frame_005s, frame_010s)
          ========================================================================= */}
      <section 
        id="domains"
        style={{
          padding: '100px 0',
          backgroundColor: '#000000',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <div className="container">
          {/* Section Header */}
          <div style={{ textAlign: 'center', maxWidth: '840px', margin: '0 auto 64px auto' }}>
            <span 
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: '#ff9a8b',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: '10px'
              }}
            >
              Managed Operations &amp; Incident Domains
            </span>
            <h2 
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                marginBottom: '16px'
              }}
            >
              End-to-End Enterprise Incident Domain Coverage
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.65 }}>
              RESOLV brings deep ITIL expertise to proactively Manage, Secure, and Optimize your IT environment across infrastructure, cloud, applications, and modern digital workplaces.
            </p>
          </div>

          {/* 4 Domain Cards Grid strictly replicating frame_005s & frame_010s */}
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px'
            }}
          >
            <DomainCard
              title="Enterprise Core & Datacenter Services"
              graphic="datacenter"
              description="Primary compute nodes, SAN storage area fabrics, Cisco backbone routing, and continuous power distribution monitoring across central enterprise datacenters."
              incidentCount={4}
              criticalCount={2}
              onViewQueue={() => {
                setActiveDomainFilter('Datacenter');
                const el = document.getElementById('triage-table');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            />

            <DomainCard
              title="Cloud Infrastructure & Services"
              graphic="cloud"
              description="Multi-cloud AWS & Azure fabric, Kubernetes ingress controllers, microservice meshes, auto-scaling groups, and multi-tenant VPC peering integrity."
              incidentCount={7}
              criticalCount={1}
              onViewQueue={() => {
                setActiveDomainFilter('Cloud');
                const el = document.getElementById('triage-table');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            />

            <DomainCard
              title="Application O&M & Core Services"
              graphic="application"
              description="Enterprise transaction gateways, SAP S/4HANA sync pipelines, customer billing APIs, database read replica latency, and internal micro-frontends."
              incidentCount={19}
              criticalCount={0}
              onViewQueue={() => {
                setActiveDomainFilter('Applications');
                const el = document.getElementById('triage-table');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            />

            <DomainCard
              title="Digital Workplace & Identity"
              graphic="workplace"
              description="Global Entra ID & Okta SSO federation, Zero-Trust endpoint compliance, PAM credentials, and distributed executive workstation fleet support."
              incidentCount={18}
              criticalCount={0}
              onViewQueue={() => {
                setActiveDomainFilter('Workplace');
                const el = document.getElementById('triage-table');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: GLOBAL DELIVERY CENTER & NOC HUB (frame_015s, frame_030s)
          ========================================================================= */}
      <section 
        id="noc-hub"
        style={{
          padding: '100px 0',
          background: 'radial-gradient(ellipse at 50% 30%, #3d003e 0%, #1a0026 55%, #000000 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          textAlign: 'center'
        }}
      >
        <div className="container">
          <span 
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: '#00f2fe',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: '10px'
            }}
          >
            24x7 Mission Control Hubs
          </span>
          <h2 
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              marginBottom: '16px'
            }}
          >
            Introducing Our Global Incident Delivery Centers
          </h2>
          <p style={{ color: '#cbd5e1', fontSize: '1.05rem', maxWidth: '720px', margin: '0 auto 36px auto', lineHeight: 1.65 }}>
            Dual redundant Tier-4 Network Operations Centers managing enterprise uptime, live incident war rooms, and real-time telemetry across Bangalore and Uttarakhand.
          </p>

          {/* Dual-Capsule Tab Switcher (Strict replication of frame_030s) */}
          <div 
            style={{
              display: 'inline-flex',
              padding: '6px',
              borderRadius: '9999px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              marginBottom: '36px'
            }}
          >
            <button
              onClick={() => setActiveNocTab('primary')}
              style={{
                padding: '11px 32px',
                borderRadius: '9999px',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '13.5px',
                border: 'none',
                background: activeNocTab === 'primary' ? '#2B4C7E' : 'transparent',
                color: '#ffffff',
                boxShadow: activeNocTab === 'primary' ? '0 4px 14px rgba(43, 76, 126, 0.7)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              BANGALORE
            </button>

            <button
              onClick={() => setActiveNocTab('dr')}
              style={{
                padding: '11px 32px',
                borderRadius: '9999px',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '13.5px',
                border: 'none',
                background: activeNocTab === 'dr' ? '#2B4C7E' : 'transparent',
                color: '#ffffff',
                boxShadow: activeNocTab === 'dr' ? '0 4px 14px rgba(43, 76, 126, 0.7)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              UTTARAKHAND
            </button>
          </div>

          {/* Cinematic Operations Viewport Container (frame_030s) */}
          <div 
            className="glass-card"
            style={{
              maxWidth: '1060px',
              margin: '0 auto 36px auto',
              padding: '0',
              overflow: 'hidden',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9)'
            }}
          >
            <div 
              style={{
                height: '420px',
                background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.6) 0%, rgba(9, 13, 22, 0.95) 100%)',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}
            >
              {/* Operations Center Matrix Graphic */}
              <svg width="100%" height="100%" viewBox="0 0 1060 420" fill="none" style={{ position: 'absolute', top: 0, left: 0, opacity: 0.25 }}>
                <line x1="0" y1="210" x2="1060" y2="210" stroke="#00f2fe" strokeWidth="1" strokeDasharray="6 6" />
                <circle cx="530" cy="210" r="160" stroke="#603893" strokeWidth="1.5" />
                <circle cx="530" cy="210" r="90" stroke="#1582C5" strokeWidth="1" />
                <path d="M 200 100 Q 530 50 860 100" stroke="#ff416c" strokeWidth="1" />
                <path d="M 200 320 Q 530 370 860 320" stroke="#00ff87" strokeWidth="1" />
              </svg>

              {/* Central Operations Badge & Play/Live Pulse */}
              <div style={{ textAlign: 'center', zIndex: 3, padding: '20px' }}>
                <div 
                  style={{
                    width: '76px',
                    height: '76px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(96, 56, 147, 0.8) 0%, rgba(21, 130, 197, 0.8) 100%)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '18px',
                    boxShadow: '0 0 30px rgba(0, 242, 254, 0.4)',
                    border: '2px solid rgba(255, 255, 255, 0.3)'
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="#ffffff">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>

                <div 
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.6rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    marginBottom: '8px'
                  }}
                >
                  {activeNocTab === 'primary' ? 'Bangalore Tier-4 Operations Command' : 'Uttarakhand Disaster Recovery Command'}
                </div>

                <div style={{ color: '#00f2fe', fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600 }}>
                  LIVE MESH ACTIVE • 140+ RESOLVER SQUADS • SUB-MINUTE MTTR
                </div>
              </div>
            </div>
          </div>

          {/* Pill Button Centered Below Viewport (Strict replication of frame_030s) */}
          <button 
            className="btn-pill btn-pill-purple-teal"
            onClick={() => {
              const el = document.getElementById('triage-table');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{ fontSize: '14.5px', padding: '12px 34px' }}
          >
            <span>View our GDC in action</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: "UNLOCK THE FUTURE OF IT" 3 PILLARS (frame_045s)
          ========================================================================= */}
      <section 
        id="pillars"
        style={{
          padding: '100px 0',
          backgroundColor: '#000000',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto 64px auto' }}>
            <h2 
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.2rem, 4vw, 3rem)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                marginBottom: '14px'
              }}
            >
              Unlock the Future of IT
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>
              Why RESOLV Service Desk is Your Go-To Enterprise Incident Management Engine
            </p>
          </div>

          {/* 3 Pillars Grid (Strictly replicating frame_045s) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '48px' }}>
            {/* Pillar 1: Shift-Left Strategy */}
            <div>
              <div 
                style={{
                  width: '58px',
                  height: '58px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, rgba(255, 154, 139, 0.25) 0%, rgba(255, 106, 136, 0.35) 100%)',
                  border: '1.5px solid rgba(255, 154, 139, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '24px',
                  boxShadow: '0 8px 20px rgba(255, 106, 136, 0.2)'
                }}
              >
                {/* AI / Chip Icon */}
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff9a8b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <rect x="9" y="9" width="6" height="6" />
                  <line x1="9" y1="1" x2="9" y2="4" />
                  <line x1="15" y1="1" x2="15" y2="4" />
                  <line x1="9" y1="20" x2="9" y2="23" />
                  <line x1="15" y1="20" x2="15" y2="23" />
                  <line x1="20" y1="9" x2="23" y2="9" />
                  <line x1="20" y1="14" x2="23" y2="14" />
                  <line x1="1" y1="9" x2="4" y2="9" />
                  <line x1="1" y1="14" x2="4" y2="14" />
                </svg>
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, marginBottom: '14px', color: '#ffffff' }}>
                Shift-Left Strategy
              </h3>
              <p style={{ color: '#94a3b8', lineHeight: 1.65, fontSize: '0.95rem' }}>
                Implement a proactive shift-left strategy to move from reactive troubleshooting to predictive intelligence, enhancing efficiency and minimizing IT disruptions.
              </p>
            </div>

            {/* Pillar 2: Enhanced Performance Management */}
            <div>
              <div 
                style={{
                  width: '58px',
                  height: '58px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.25) 0%, rgba(79, 172, 254, 0.35) 100%)',
                  border: '1.5px solid rgba(0, 242, 254, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '24px',
                  boxShadow: '0 8px 20px rgba(0, 242, 254, 0.2)'
                }}
              >
                {/* Chess / Strategy Icon */}
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00f2fe" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a4 4 0 0 0-4 4c0 1.5.8 2.8 2 3.5V14h4V9.5c1.2-.7 2-2 2-3.5a4 4 0 0 0-4-4z" />
                  <path d="M7 17h10v2a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-2z" />
                  <line x1="6" y1="21" x2="18" y2="21" />
                </svg>
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, marginBottom: '14px', color: '#ffffff' }}>
                Enhanced Performance Management
              </h3>
              <p style={{ color: '#94a3b8', lineHeight: 1.65, fontSize: '0.95rem' }}>
                Optimize performance with XLAs and KPIs, ensuring measurable outcomes, improved user experience, and enhanced operational efficiency.
              </p>
            </div>

            {/* Pillar 3: AI-Driven Automated Triage */}
            <div>
              <div 
                style={{
                  width: '58px',
                  height: '58px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, rgba(0, 255, 135, 0.25) 0%, rgba(96, 239, 160, 0.35) 100%)',
                  border: '1.5px solid rgba(0, 255, 135, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '24px',
                  boxShadow: '0 8px 20px rgba(0, 255, 135, 0.2)'
                }}
              >
                {/* Target / Precision Icon */}
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00ff87" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, marginBottom: '14px', color: '#ffffff' }}>
                AI-Driven Automated Triage
              </h3>
              <p style={{ color: '#94a3b8', lineHeight: 1.65, fontSize: '0.95rem' }}>
                Leverage machine-learning triage to categorize inbound tickets, assign the optimal technician squad, and calculate SLA risk profiles in real-time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: INSIGHTS & RUNBOOKS CAROUSEL (Strict replication of frame_060s)
          ========================================================================= */}
      <RunbookCarousel />

      {/* =========================================================================
          SECTION 6: "ZERO INCIDENT" PHILOSOPHY (Strict replication of frame_090s)
          ========================================================================= */}
      <section 
        id="zero-incident"
        style={{
          padding: '110px 0',
          background: 'radial-gradient(circle at 50% 30%, #054020 0%, #021a0d 60%, #000000 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div className="container" style={{ maxWidth: '980px', position: 'relative', zIndex: 2 }}>
          {/* Lime Green Gradient Display Heading (frame_090s) */}
          <h2 
            className="gradient-text-emerald"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.8rem, 5.5vw, 4.5rem)',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              lineHeight: 1.15,
              marginBottom: '10px'
            }}
          >
            Zero Incident Thinking
          </h2>

          <div 
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.75rem, 3.2vw, 2.75rem)',
              fontWeight: 700,
              color: '#ffffff',
              marginBottom: '36px'
            }}
          >
            for a Future-Ready Enterprise
          </div>

          {/* Underneath Subtitle & Mission Prose strictly replicating frame_090s */}
          <div style={{ maxWidth: '820px', margin: '0 auto' }}>
            <h3 
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.45rem',
                fontWeight: 700,
                color: '#ffffff',
                marginBottom: '16px'
              }}
            >
              Achieve IT Excellence with our Zero Incident Approach
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '1.1rem', lineHeight: 1.8, marginBottom: '40px' }}>
              In today's fast-paced digital landscape, IT downtime and disruptions are not an option. At RESOLV, we drive proactive IT management with our <strong style={{ color: '#ffffff' }}>Zero Incident Approach</strong>, ensuring seamless, secure, and resilient IT operations. Our methodology focuses on predictive analytics, AI-driven automation, and continuous monitoring to prevent issues before they arise. With <strong style={{ color: '#00ff87' }}>99.9% uptime</strong>, real-time incident resolution, and end-to-end IT infrastructure management, we empower businesses to stay ahead.
            </p>
          </div>

          <button
            onClick={onOpenCreateIncident}
            className="btn-pill btn-pill-purple-teal"
            style={{ fontSize: '15px', padding: '13px 36px' }}
          >
            <span>Activate Zero Incident Governance ➔</span>
          </button>
        </div>
      </section>

      {/* =========================================================================
          SECTION 7: REAL INCIDENT TRIAGE & RESOLUTION TABLE
          ========================================================================= */}
      <section 
        id="triage-table"
        style={{
          padding: '80px 0 100px 0',
          backgroundColor: '#000000'
        }}
      >
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span 
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  color: '#00f2fe',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: '6px'
                }}
              >
                Active Operations Queue
              </span>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
                Incident Triage &amp; Resolution Queue
              </h2>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {(['ALL', 'CRITICAL', 'HIGH', 'RESOLVED'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '6px 16px',
                    borderRadius: '9999px',
                    border: '1px solid',
                    borderColor: selectedFilter === filter ? '#ffffff' : 'rgba(255, 255, 255, 0.15)',
                    backgroundColor: selectedFilter === filter ? '#ffffff' : 'transparent',
                    color: selectedFilter === filter ? '#000000' : '#cbd5e1',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {filter} {filter === 'CRITICAL' && `(${criticalCount})`}
                </button>
              ))}

              <button
                onClick={fetchIncidents}
                aria-label="Refresh Queue"
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  marginLeft: '8px'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div 
            style={{
              background: '#090d16',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              overflow: 'hidden'
            }}
          >
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                <div className="live-pulse-dot" style={{ margin: '0 auto 16px auto', width: '12px', height: '12px' }} />
                Synchronizing with ITIL incident database...
              </div>
            ) : filteredIncidents.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                No active incidents found matching the selected filter.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                      <th style={{ padding: '16px 24px', color: '#94a3b8', fontWeight: 600 }}>TICKET #</th>
                      <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: 600 }}>PRIORITY</th>
                      <th style={{ padding: '16px 24px', color: '#94a3b8', fontWeight: 600 }}>SUMMARY &amp; DOMAIN</th>
                      <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: 600 }}>STATUS</th>
                      <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: 600 }}>SLA TARGET</th>
                      <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: 600 }}>ASSIGNEE</th>
                      <th style={{ padding: '16px 24px', color: '#94a3b8', fontWeight: 600, textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIncidents.map((incident) => (
                      <tr 
                        key={incident.id}
                        onClick={() => { if (onSelectIncident) onSelectIncident(incident); }}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '16px 24px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#00f2fe' }}>
                          {incident.ticketNumber}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span 
                            style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: 700,
                              fontFamily: 'var(--font-display)',
                              textTransform: 'uppercase',
                              backgroundColor: incident.priority === 'CRITICAL' ? 'rgba(255, 77, 79, 0.15)' :
                                               incident.priority === 'HIGH' ? 'rgba(250, 140, 22, 0.15)' :
                                               incident.priority === 'MEDIUM' ? 'rgba(24, 144, 255, 0.15)' : 'rgba(82, 196, 26, 0.15)',
                              color: incident.priority === 'CRITICAL' ? '#ff4d4f' :
                                     incident.priority === 'HIGH' ? '#fa8c16' :
                                     incident.priority === 'MEDIUM' ? '#1890ff' : '#52c41a',
                              border: `1px solid ${
                                incident.priority === 'CRITICAL' ? 'rgba(255, 77, 79, 0.3)' :
                                incident.priority === 'HIGH' ? 'rgba(250, 140, 22, 0.3)' :
                                incident.priority === 'MEDIUM' ? 'rgba(24, 144, 255, 0.3)' : 'rgba(82, 196, 26, 0.3)'
                              }`
                            }}
                          >
                            {incident.priority}
                          </span>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ fontWeight: 600, color: '#ffffff', marginBottom: '4px' }}>
                            {incident.title}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                            Category: {getCategoryText(incident.category)}
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#cbd5e1' }}>
                          {incident.status}
                        </td>
                        <td style={{ padding: '16px 20px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                          <span style={{ color: incident.priority === 'CRITICAL' ? '#ff4d4f' : '#cbd5e1', fontWeight: 600 }}>
                            {incident.slaHours || incident.slaPolicy?.resolutionTimeHours || 4}h SLA
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', color: '#94a3b8' }}>
                          {incident.assigneeName || incident.assignee?.fullName || incident.assignee?.username || <span style={{ color: '#64748b' }}>Unassigned (Dispatch)</span>}
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectIncident) onSelectIncident(incident);
                            }}
                            style={{
                              background: 'transparent',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              color: '#ffffff',
                              padding: '5px 12px',
                              borderRadius: '9999px',
                              fontSize: '12px',
                              fontFamily: 'var(--font-display)',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <span>Triage</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="5" y1="12" x2="19" y2="12" />
                              <polyline points="12 5 19 12 12 19" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
          GLOBAL FOOTER (Strict replication of team COMPUTERS layout)
          ========================================================================= */}
      <footer 
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: '#000000',
          padding: '36px 0',
          textAlign: 'center',
          fontSize: '12px',
          color: '#64748b',
          fontFamily: 'var(--font-display)'
        }}
      >
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: 800, color: '#ffffff' }}>RESOLV</span>
            <span>|</span>
            <span>Enterprise IT Incident Management &amp; Resolution Hub</span>
          </div>
          <div>
            Built with ITIL v4 SLA Governance • Real-Time Resilience Mesh
          </div>
        </div>
      </footer>
    </div>
  );
};
