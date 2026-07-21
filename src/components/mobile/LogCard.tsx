import { useDemoMode } from '../../hooks/useDemoMode';
import { maskEmail } from '../../lib/masking';

export interface GovernanceEventItem {
  id: string;
  actor_user_id: string;
  target_user_id: string;
  action: string;
  reason: string;
  created_at: string;
  actor_email?: string;
  target_email?: string;
  metadata?: any;
}

interface LogCardProps {
  event: GovernanceEventItem;
}

function formatRelativeTime(dateString: string): string {
  try {
    const now = new Date().getTime();
    const past = new Date(dateString).getTime();
    const diffSeconds = Math.floor((now - past) / 1000);

    if (diffSeconds < 60) return 'Just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
}

export function LogCard({ event }: LogCardProps) {
  const { isDemoMode } = useDemoMode();

  const actionUpper = (event.action || 'ACTION').toUpperCase();
  const actorEmail = maskEmail(event.actor_email || 'System', isDemoMode);
  const targetEmail = maskEmail(event.target_email || 'Resident', isDemoMode);
  const timeAgo = formatRelativeTime(event.created_at);

  let borderHex = 'var(--primary)';
  if (actionUpper.includes('APPROV') || actionUpper.includes('GRANT')) {
    borderHex = 'var(--success)';
  } else if (actionUpper.includes('SUSPEND') || actionUpper.includes('REJECT') || actionUpper.includes('REMOVE')) {
    borderHex = 'var(--error)';
  } else if (actionUpper.includes('ACCESS') || actionUpper.includes('UPDATE')) {
    borderHex = 'var(--pending)';
  }

  return (
    <div
      className="card-mobile"
      style={{
        borderLeft: `4px solid ${borderHex}`,
        padding: '12px 14px',
        marginBottom: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: borderHex,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {event.action}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{timeAgo}</span>
      </div>

      <div style={{ fontSize: '13px', color: 'var(--text-primary)', margin: '4px 0' }}>
        <strong>{actorEmail}</strong> target <strong>{targetEmail}</strong>
      </div>

      {event.reason && (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '4px' }}>
          "{event.reason}"
        </div>
      )}
    </div>
  );
}
