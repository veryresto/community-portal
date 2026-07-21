import { ScrollText, ChevronLeft, ChevronRight } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { FilterChip } from './FilterChip';
import type { FilterOption } from './FilterChip';
import { LogCard } from './LogCard';
import type { GovernanceEventItem } from './LogCard';
import { EmptyState } from './EmptyState';
import { triggerHapticFeedback } from './BottomTabBar';

interface MobileLogsScreenProps {
  logs: GovernanceEventItem[];
  loading: boolean;
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  actionFilter: string;
  onActionFilterChange: (action: string) => void;
}

export function MobileLogsScreen({
  logs,
  loading,
  totalCount,
  page,
  pageSize,
  onPageChange,
  searchQuery,
  onSearchChange,
  actionFilter,
  onActionFilterChange,
}: MobileLogsScreenProps) {
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const actionFilterOptions: FilterOption[] = [
    { id: 'all', label: 'All Actions' },
    { id: 'approval', label: 'Approvals' },
    { id: 'role', label: 'Roles' },
    { id: 'access', label: 'App Access' },
  ];

  return (
    <div>
      <div style={{ marginBottom: '14px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Ecosystem Audit Logs</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
          Recent governance and privilege modification events across the ecosystem
        </p>
      </div>

      <SearchBar
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Filter by action, user email, reason..."
      />

      <FilterChip
        options={actionFilterOptions}
        selectedId={actionFilter}
        onSelect={onActionFilterChange}
      />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="skeleton-mobile"
              style={{ height: '80px', borderRadius: 'var(--card-radius)' }}
            />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No audit events"
          description="No governance audit log entries found matching your query."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {logs.map((event) => (
            <LogCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalCount > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Page {page} of {totalPages} ({totalCount} total)
          </span>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn-mobile"
              disabled={page <= 1}
              onClick={() => {
                triggerHapticFeedback(8);
                onPageChange(page - 1);
              }}
              style={{ height: '36px', minHeight: '36px', padding: '0 10px' }}
            >
              <ChevronLeft size={16} />
              <span>Prev</span>
            </button>
            <button
              type="button"
              className="btn-mobile"
              disabled={page >= totalPages}
              onClick={() => {
                triggerHapticFeedback(8);
                onPageChange(page + 1);
              }}
              style={{ height: '36px', minHeight: '36px', padding: '0 10px' }}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
