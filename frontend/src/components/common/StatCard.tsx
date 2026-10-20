import React from 'react';

export type StatVariant = 'p1-rose' | 'cyan' | 'emerald' | 'amber';

interface StatCardProps {
  value: string;
  label: string;
  subtext: string;
  variant: StatVariant;
  pillTag?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  subtext,
  variant,
  pillTag,
  onClick
}) => {
  const getGradientClass = () => {
    switch (variant) {
      case 'p1-rose': return 'gradient-text-p1';
      case 'cyan': return 'gradient-text-cyan';
      case 'emerald': return 'gradient-text-emerald';
      case 'amber': return 'gradient-text-amber';
      default: return 'gradient-text-p1';
    }
  };

  const getPillStyle = () => {
    switch (variant) {
      case 'p1-rose':
        return { background: 'rgba(255, 106, 136, 0.15)', color: '#ff9a8b', border: '1px solid rgba(255, 106, 136, 0.3)' };
      case 'cyan':
        return { background: 'rgba(0, 242, 254, 0.12)', color: '#00f2fe', border: '1px solid rgba(0, 242, 254, 0.3)' };
      case 'emerald':
        return { background: 'rgba(0, 255, 135, 0.12)', color: '#00ff87', border: '1px solid rgba(0, 255, 135, 0.3)' };
      case 'amber':
        return { background: 'rgba(254, 225, 64, 0.12)', color: '#fee140', border: '1px solid rgba(254, 225, 64, 0.3)' };
    }
  };

  return (
    <div 
      className="glass-card" 
      onClick={onClick}
      style={{
        padding: '30px 26px',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '210px',
        position: 'relative',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Upper corner badge if present */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minHeight: '22px', marginBottom: '4px' }}>
        {pillTag && (
          <span
            style={{
              fontSize: '10px',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              letterSpacing: '0.04em',
              padding: '3px 9px',
              borderRadius: '9999px',
              textTransform: 'uppercase',
              ...getPillStyle()
            }}
          >
            {pillTag}
          </span>
        )}
      </div>

      {/* Main Stat Number with multi-stop gradient (Strict replication of frame_000s) */}
      <div 
        className={getGradientClass()}
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '3.6rem',
          fontWeight: 800,
          lineHeight: 1.0,
          letterSpacing: '-0.03em',
          marginBottom: '12px'
        }}
      >
        {value}
      </div>

      {/* Primary Metric Label directly beneath the number (frame_000s) */}
      <div>
        <h4 
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.15rem',
            fontWeight: 700,
            color: '#ffffff',
            lineHeight: 1.3,
            margin: '0 0 6px 0',
            letterSpacing: '-0.01em'
          }}
        >
          {label}
        </h4>

        {/* Subtitle / Telemetry Detail */}
        <div 
          style={{
            fontSize: '0.8125rem',
            color: '#94a3b8',
            lineHeight: 1.4,
            fontWeight: 500
          }}
        >
          {subtext}
        </div>
      </div>
    </div>
  );
};
