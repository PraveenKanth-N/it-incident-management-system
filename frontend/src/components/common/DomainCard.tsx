import React, { useState } from 'react';

export type GraphicType = 'datacenter' | 'cloud' | 'application' | 'workplace';

interface DomainCardProps {
  title: string;
  graphic: GraphicType;
  description: string;
  incidentCount: number;
  criticalCount: number;
  onViewQueue?: () => void;
}

export const DomainCard: React.FC<DomainCardProps> = ({
  title,
  graphic,
  description,
  incidentCount,
  criticalCount,
  onViewQueue
}) => {
  const [isHovered, setIsHovered] = useState(() => typeof window !== 'undefined' && (window.location.search.includes('hover=all') || window.location.search.includes(`hover=${graphic}`)));

  // SVG Geometric Artworks strictly replicating frame_005s / frame_010s
  const renderGraphicArtwork = () => {
    switch (graphic) {
      case 'datacenter':
        return (
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(ellipse at 85% 30%, #7a0026 0%, #300010 50%, #0d0006 100%)',
              overflow: 'hidden',
              zIndex: 1
            }}
          >
            <svg width="100%" height="100%" viewBox="0 0 320 440" fill="none" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0 }}>
              {/* Deep Wine Angled Geometric Planes */}
              <polygon points="40,440 280,180 320,240 120,440" fill="rgba(122, 0, 38, 0.4)" />
              <polygon points="120,440 320,240 320,380 180,440" fill="rgba(61, 0, 18, 0.6)" />
              <path d="M0 440 L220 200 L320 320" stroke="rgba(255, 65, 108, 0.35)" strokeWidth="1.5" fill="none" />
              <path d="M60 440 L260 220 L320 300" stroke="rgba(255, 75, 43, 0.25)" strokeWidth="1" fill="none" />
              <circle cx="220" cy="200" r="4" fill="#ff4b2b" />
            </svg>
          </div>
        );
      case 'cloud':
        return (
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(ellipse at 30% 40%, #4a0e4e 0%, #20002b 55%, #07000c 100%)',
              overflow: 'hidden',
              zIndex: 1
            }}
          >
            <svg width="100%" height="100%" viewBox="0 0 320 440" fill="none" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0 }}>
              {/* Interlocking Diagonal Chevron Slabs */}
              <polygon points="160,120 300,260 250,330 160,230 70,330 20,260" fill="rgba(138, 35, 135, 0.3)" stroke="rgba(233, 64, 87, 0.4)" strokeWidth="1.5" />
              <polygon points="160,200 270,310 230,370 160,290 90,370 50,310" fill="rgba(184, 69, 194, 0.2)" stroke="rgba(242, 113, 33, 0.3)" strokeWidth="1" />
              <line x1="160" y1="80" x2="160" y2="440" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" strokeDasharray="4 4" />
            </svg>
          </div>
        );
      case 'application':
        return (
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(ellipse at 50% 30%, #002b4e 0%, #001224 55%, #00070e 100%)',
              overflow: 'hidden',
              zIndex: 1
            }}
          >
            <svg width="100%" height="100%" viewBox="0 0 320 440" fill="none" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0 }}>
              {/* Vertical Rising Architectural Towers & Beams */}
              <rect x="40" y="240" width="45" height="200" fill="rgba(0, 198, 255, 0.2)" stroke="rgba(0, 198, 255, 0.4)" />
              <rect x="100" y="160" width="55" height="280" fill="rgba(0, 114, 255, 0.3)" stroke="rgba(0, 114, 255, 0.5)" />
              <rect x="175" y="120" width="60" height="320" fill="rgba(127, 0, 255, 0.25)" stroke="rgba(127, 0, 255, 0.45)" />
              <rect x="250" y="220" width="45" height="220" fill="rgba(0, 198, 255, 0.2)" stroke="rgba(0, 198, 255, 0.4)" />
              {/* Vertical Luminous Beams */}
              <line x1="127" y1="0" x2="127" y2="160" stroke="rgba(0, 242, 254, 0.6)" strokeWidth="1.5" />
              <line x1="205" y1="0" x2="205" y2="120" stroke="rgba(127, 0, 255, 0.6)" strokeWidth="1.5" />
            </svg>
          </div>
        );
      case 'workplace':
        return (
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(ellipse at 60% 40%, #593500 0%, #291800 55%, #0c0700 100%)',
              overflow: 'hidden',
              zIndex: 1
            }}
          >
            <svg width="100%" height="100%" viewBox="0 0 320 440" fill="none" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0 }}>
              {/* Stepped Amber Diagonal Planes */}
              <polygon points="20,440 100,200 180,200 100,440" fill="rgba(247, 151, 30, 0.25)" stroke="rgba(255, 210, 0, 0.35)" />
              <polygon points="90,440 180,150 260,150 170,440" fill="rgba(247, 151, 30, 0.35)" stroke="rgba(255, 210, 0, 0.45)" />
              <polygon points="170,440 250,90 310,90 230,440" fill="rgba(254, 225, 64, 0.25)" stroke="rgba(254, 225, 64, 0.45)" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: '#090d16',
        borderRadius: '20px',
        border: isHovered ? '1px solid rgba(255, 255, 255, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: isHovered ? '0 25px 50px -12px rgba(0, 0, 0, 0.9)' : '0 10px 25px -10px rgba(0, 0, 0, 0.6)',
        transform: isHovered ? 'translateY(-6px)' : 'none',
        transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden',
        height: '430px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      {/* Background Geometric Art (Strict replication of frame_005s) */}
      {renderGraphicArtwork()}

      {/* Dark Hover Scrim Overlay (Strict replication of frame_010s) */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: isHovered 
            ? 'linear-gradient(180deg, rgba(0, 0, 0, 0.82) 0%, rgba(5, 5, 10, 0.96) 100%)' 
            : 'linear-gradient(180deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.75) 100%)',
          transition: 'background 0.3s ease',
          zIndex: 2,
          pointerEvents: 'none'
        }}
      />

      {/* Card Content Top: Header Title placed over artwork (frame_005s) */}
      <div style={{ position: 'relative', zIndex: 3, padding: '30px 26px 0 26px' }}>
        <h3 
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.4rem',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.25,
            letterSpacing: '-0.02em',
            margin: 0
          }}
        >
          {title}
        </h3>
      </div>

      {/* Card Content Bottom: Description + Metrics / Gradient Pill Button (frame_010s) */}
      <div style={{ position: 'relative', zIndex: 3, padding: '0 26px 30px 26px' }}>
        {/* Description that reveals with high contrast on hover */}
        <p 
          style={{
            fontSize: '0.875rem',
            color: '#cbd5e1',
            lineHeight: 1.6,
            marginBottom: '20px',
            opacity: isHovered ? 1 : 0.6,
            transition: 'opacity 0.25s ease',
            display: '-webkit-box',
            WebkitLineClamp: isHovered ? 4 : 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {description}
        </p>

        {/* Footer: Non-hover shows telemetry; hover shows gradient pill button (frame_010s) */}
        <div style={{ minHeight: '44px', display: 'flex', alignItems: 'center' }}>
          {!isHovered ? (
            <div 
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '12px',
                borderTop: '1px solid rgba(255, 255, 255, 0.12)'
              }}
            >
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                <strong style={{ color: '#ffffff', fontWeight: 700 }}>{incidentCount}</strong> Active Tickets
              </span>
              {criticalCount > 0 && (
                <span 
                  style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    background: 'rgba(255, 77, 79, 0.2)',
                    color: '#ff4d4f',
                    padding: '2px 9px',
                    borderRadius: '9999px',
                    border: '1px solid rgba(255, 77, 79, 0.4)'
                  }}
                >
                  {criticalCount} P1 Breach
                </span>
              )}
            </div>
          ) : (
            <button
              onClick={onViewQueue}
              className="btn-pill btn-pill-amber-pink"
              style={{
                width: '100%',
                padding: '11px 20px',
                fontSize: '13px',
                animation: 'fadeIn 0.2s ease forwards'
              }}
            >
              <span>Learn More</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
