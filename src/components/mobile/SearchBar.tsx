import { Search, X, SlidersHorizontal } from 'lucide-react';
import { triggerHapticFeedback } from './BottomTabBar';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  onFilterClick?: () => void;
  isFilterActive?: boolean;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search residents...',
  onFilterClick,
  isFilterActive = false,
}: SearchBarProps) {
  return (
    <div className="search-bar-mobile">
      <div className="search-input-wrapper">
        <Search className="search-input-icon" />
        <input
          type="text"
          className="search-input-mobile"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
        />
        {value && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => {
              triggerHapticFeedback(5);
              onChange('');
            }}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {onFilterClick && (
        <button
          type="button"
          className={`filter-btn-mobile ${isFilterActive ? 'active' : ''}`}
          onClick={() => {
            triggerHapticFeedback(10);
            onFilterClick();
          }}
          aria-label="Open filter settings"
        >
          <SlidersHorizontal size={20} />
        </button>
      )}
    </div>
  );
}
