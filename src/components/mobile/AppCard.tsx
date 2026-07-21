import React from 'react';
import { ExternalLink } from 'lucide-react';
import { triggerHapticFeedback } from './BottomTabBar';
import * as analytics from '../../lib/analytics';

export interface ApplicationItem {
  name: string;
  slug: string;
  description: string;
  icon: React.ElementType;
  status: 'active' | 'planned';
  badgeText: string;
  link: string | null;
}

interface AppCardProps {
  app: ApplicationItem;
}

export function AppCard({ app }: AppCardProps) {
  const Icon = app.icon;
  const isLive = app.status === 'active' && !!app.link;

  return (
    <div
      className="card-mobile"
      style={{
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        margin: 0,
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: isLive ? 'var(--primary-glow)' : 'var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isLive ? 'var(--primary)' : 'var(--text-muted)',
            }}
          >
            <Icon size={20} />
          </div>

          <span
            className={`badge-mobile ${isLive ? 'badge-approved' : 'badge-standard-resident'}`}
            style={{ fontSize: '9px', padding: '2px 6px' }}
          >
            {app.badgeText}
          </span>
        </div>

        <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
          {app.name}
        </h3>
        <p
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            margin: 0,
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {app.description}
        </p>
      </div>

      <div style={{ marginTop: '14px' }}>
        {isLive ? (
          <a
            href={app.link!}
            target="_blank"
            rel="noreferrer"
            className="btn-mobile btn-mobile-primary"
            style={{ width: '100%', textDecoration: 'none', height: '36px', minHeight: '36px' }}
            onClick={() => {
              triggerHapticFeedback(12);
              analytics.track('application_opened', { application: app.slug });
            }}
          >
            <span>Launch</span>
            <ExternalLink size={14} />
          </a>
        ) : (
          <button
            type="button"
            className="btn-mobile"
            disabled
            style={{ width: '100%', height: '36px', minHeight: '36px' }}
          >
            Coming Soon
          </button>
        )}
      </div>
    </div>
  );
}
