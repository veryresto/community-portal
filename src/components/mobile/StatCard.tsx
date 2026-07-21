export interface StatItem {
  id: string;
  label: string;
  value: number | string;
  color?: string;
}

interface StatCardProps {
  stats: StatItem[];
  activeStatId?: string;
  onStatClick?: (id: string) => void;
}

export function StatCard({ stats, activeStatId, onStatClick }: StatCardProps) {
  return (
    <div className="h-scroll" style={{ marginBottom: '16px' }}>
      {stats.map((item) => {
        const isActive = activeStatId === item.id;
        return (
          <div
            key={item.id}
            onClick={() => onStatClick && onStatClick(item.id)}
            style={{
              minWidth: '120px',
              flex: '1 0 auto',
              background: 'var(--bg-secondary)',
              border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border-color)'}`,
              borderRadius: 'var(--card-radius)',
              padding: '12px 16px',
              cursor: onStatClick ? 'pointer' : 'default',
              boxShadow: isActive ? '0 0 0 2px var(--primary-glow)' : 'var(--shadow-card)',
              transition: 'all 0.2s ease',
            }}
          >
            <div
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: item.color || 'var(--primary)',
                lineHeight: 1.2,
              }}
            >
              {item.value}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                marginTop: '2px',
                fontWeight: 500,
              }}
            >
              {item.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
