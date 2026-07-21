import React from 'react';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  actionButton?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, actionButton }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '40px 20px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--card-radius)',
        marginTop: '12px',
        marginBottom: '20px',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--primary-glow)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '14px',
        }}
      >
        <Icon size={28} style={{ color: 'var(--primary)' }} />
      </div>
      <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
        {title}
      </h3>
      {description && (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, maxWidth: '280px', lineHeight: 1.5 }}>
          {description}
        </p>
      )}
      {actionButton && <div style={{ marginTop: '16px' }}>{actionButton}</div>}
    </div>
  );
}
