import { triggerHapticFeedback } from './BottomTabBar';

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

interface FilterChipProps {
  options: FilterOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function FilterChip({ options, selectedId, onSelect }: FilterChipProps) {
  return (
    <div className="h-scroll" style={{ marginBottom: '12px' }}>
      {options.map((opt) => {
        const isSelected = opt.id === selectedId;
        return (
          <button
            key={opt.id}
            type="button"
            className={`btn-mobile ${isSelected ? 'btn-mobile-primary' : ''}`}
            onClick={() => {
              triggerHapticFeedback(8);
              onSelect(opt.id);
            }}
            style={{
              borderRadius: '20px',
              height: '32px',
              minHeight: '32px',
              padding: '0 14px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            {opt.label}
            {typeof opt.count === 'number' && (
              <span
                style={{
                  marginLeft: '4px',
                  opacity: 0.8,
                  fontSize: '11px',
                  fontWeight: 700
                }}
              >
                ({opt.count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
