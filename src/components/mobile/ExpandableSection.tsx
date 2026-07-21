import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { triggerHapticFeedback } from './BottomTabBar';

interface ExpandableSectionProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export function ExpandableSection({
  title,
  subtitle,
  badge,
  defaultExpanded = true,
  children,
}: ExpandableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div
      style={{
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--card-radius)',
        background: 'var(--bg-secondary)',
        marginBottom: '10px',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => {
          triggerHapticFeedback(8);
          setIsExpanded(!isExpanded);
        }}
        style={{
          width: '100%',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          color: 'var(--text-primary)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>{title}</h4>
            {badge}
          </div>
          {subtitle && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              {subtitle}
            </p>
          )}
        </div>

        <ChevronDown
          size={18}
          style={{
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 200ms ease',
            color: 'var(--text-muted)',
          }}
        />
      </button>

      {isExpanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-color)' }}>
          {children}
        </div>
      )}
    </div>
  );
}
