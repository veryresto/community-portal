import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { triggerHapticFeedback } from './BottomTabBar';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="bottom-sheet-backdrop"
        onClick={() => {
          triggerHapticFeedback(5);
          onClose();
        }}
        aria-hidden="true"
      />
      <div className="bottom-sheet-container" role="dialog" aria-modal="true" aria-label={title || 'Bottom Sheet'}>
        <div className="bottom-sheet-handle-row" onClick={onClose}>
          <div className="bottom-sheet-handle" />
        </div>

        {title && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 20px 12px',
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>{title}</h3>
            <button
              type="button"
              onClick={() => {
                triggerHapticFeedback(5);
                onClose();
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
              }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="bottom-sheet-content">{children}</div>
      </div>
    </>
  );
}
