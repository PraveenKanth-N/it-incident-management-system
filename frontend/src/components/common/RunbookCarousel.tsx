import React, { useState } from 'react';

export interface RunbookArticle {
  id: string;
  category: string;
  date: string;
  title: string;
  excerpt: string;
  imageGradient: string;
  readTime: string;
  iconType: 'network' | 'cloud' | 'security' | 'ai';
}

const DEFAULT_ARTICLES: RunbookArticle[] = [
  {
    id: 'rb-1',
    category: 'INCIDENT PLAYBOOK',
    date: 'October 16, 2026',
    title: 'The 2026 CIO Mandate: Why Leading Tech Executives Are Trading ‘Management’ for ‘Orchestration’',
    excerpt: 'The role of the Incident Commander has reached a turning point. In 2026, teams are evaluated on automated shift-left healing, not reactive ticket triage.',
    imageGradient: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
    readTime: '6 min read',
    iconType: 'ai'
  },
  {
    id: 'rb-2',
    category: 'INFRASTRUCTURE DRIFT',
    date: 'October 12, 2026',
    title: '3 Hybrid Cloud Mistakes That Quietly Spike P1 Outage Frequency Under 12 Months',
    excerpt: 'Enterprise architects often overlook multi-region ingress route flap and async DB replica drift until cascading microservice timeouts trigger sev-1 alarms.',
    imageGradient: 'linear-gradient(135deg, #4a044e 0%, #701a75 50%, #86198f 100%)',
    readTime: '8 min read',
    iconType: 'cloud'
  },
  {
    id: 'rb-3',
    category: 'AIOPS AUTOMATION',
    date: 'October 08, 2026',
    title: 'Zero Incident Thinking: Moving from Mean-Time-to-Resolve to Continuous Auto-Remediation',
    excerpt: 'How leading digital banks suppress 88% of noise alarms using real-time Bayesian correlation and pre-approved autonomous containment runbooks.',
    imageGradient: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
    readTime: '5 min read',
    iconType: 'network'
  },
  {
    id: 'rb-4',
    category: 'SECURITY & DRIFT',
    date: 'October 02, 2026',
    title: 'Zero-Trust Endpoint Isolation Playbook for Enterprise Identity Compromise',
    excerpt: 'Immediate revoke workflows for Okta and Entra ID tokens during credential stuffing attacks, preventing lateral data exfiltration across VPCs.',
    imageGradient: 'linear-gradient(135deg, #7c2d12 0%, #9a3412 50%, #c2410c 100%)',
    readTime: '7 min read',
    iconType: 'security'
  }
];

export const RunbookCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const maxIndex = Math.max(0, DEFAULT_ARTICLES.length - 3);

  const handlePrev = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(maxIndex, prev + 1));
  };

  return (
    <section 
      id="runbooks-carousel"
      style={{
        padding: '90px 0',
        backgroundColor: '#f8fafc',
        color: '#0f172a',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div className="container">
        {/* Header with Navigation Controls strictly replicating frame_060s */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: '48px',
            flexWrap: 'wrap',
            gap: '24px'
          }}
        >
          <div>
            <span 
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: '#0284c7',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: '8px'
              }}
            >
              Enterprise Incident Knowledge Base
            </span>
            <h2 
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: '#0f172a',
                margin: 0
              }}
            >
              Incident Playbooks &amp; IT Insights
            </h2>
          </div>

          {/* Circular Navigation Buttons strictly replicating frame_060s */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              aria-label="Previous Slide"
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                border: '1.5px solid #cbd5e1',
                backgroundColor: currentIndex === 0 ? '#f1f5f9' : '#ffffff',
                color: currentIndex === 0 ? '#94a3b8' : '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: currentIndex === 0 ? 'none' : '0 2px 6px rgba(0, 0, 0, 0.06)'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>

            <button
              onClick={handleNext}
              disabled={currentIndex >= maxIndex}
              aria-label="Next Slide"
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: currentIndex >= maxIndex ? '#94a3b8' : '#00b4d8',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: currentIndex >= maxIndex ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: currentIndex >= maxIndex ? 'none' : '0 4px 14px rgba(0, 180, 216, 0.4)'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>

        {/* Sliding Card Track (frame_060s: White cards with bottom cyan glow gradient) */}
        <div style={{ overflow: 'hidden', padding: '12px 4px 24px 4px' }}>
          <div 
            style={{
              display: 'flex',
              gap: '28px',
              transform: `translateX(-${currentIndex * 380}px)`,
              transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {DEFAULT_ARTICLES.map((article) => (
              <div
                key={article.id}
                style={{
                  minWidth: '350px',
                  maxWidth: '350px',
                  background: 'linear-gradient(to bottom, #ffffff 68%, #e0f7fa 100%)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease'
                }}
              >
                {/* Visual Header Image Banner */}
                <div 
                  style={{
                    height: '190px',
                    background: article.imageGradient,
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {/* Subtle technical wireframe motif */}
                  <svg width="100%" height="100%" viewBox="0 0 350 190" fill="none" style={{ position: 'absolute', top: 0, left: 0, opacity: 0.35 }}>
                    <path d="M0 100 Q 175 20 350 100" stroke="#38bdf8" strokeWidth="1.5" fill="none" />
                    <path d="M0 140 Q 175 60 350 140" stroke="#818cf8" strokeWidth="1.5" fill="none" />
                    <circle cx="175" cy="60" r="6" fill="#38bdf8" />
                    <circle cx="80" cy="80" r="4" fill="#a78bfa" />
                    <circle cx="270" cy="80" r="4" fill="#34d399" />
                  </svg>
                  <div 
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 800,
                      fontSize: '1.25rem',
                      color: '#ffffff',
                      textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                      textAlign: 'center',
                      padding: '0 20px',
                      zIndex: 2
                    }}
                  >
                    {article.category}
                  </div>
                </div>

                {/* Content Body */}
                <div 
                  style={{
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    {/* Date Tag */}
                    <div 
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#0284c7',
                        marginBottom: '10px'
                      }}
                    >
                      {article.date} • {article.readTime}
                    </div>

                    {/* Headline */}
                    <h3 
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.125rem',
                        fontWeight: 700,
                        color: '#0f172a',
                        lineHeight: 1.35,
                        marginBottom: '12px',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {article.title}
                    </h3>

                    {/* Excerpt */}
                    <p 
                      style={{
                        fontSize: '0.875rem',
                        color: '#475569',
                        lineHeight: 1.55,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {article.excerpt}
                    </p>
                  </div>

                  {/* Bottom Link: "Know More →" strictly replicating frame_060s */}
                  <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(2, 132, 199, 0.15)' }}>
                    <a 
                      href="#runbooks-carousel"
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#00a3c4',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>Know More</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
