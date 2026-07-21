import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { triggerHapticFeedback } from './BottomTabBar';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  description: string;
  confirmText?: string;
  requireReason?: boolean;
  isDanger?: boolean;
  loading?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  requireReason = false,
  isDanger = true,
  loading = false,
}: ConfirmationDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (requireReason && !reason.trim()) {
      setError('Please provide a reason for this action.');
      return;
    }
    setError(null);
    triggerHapticFeedback(15);
    onConfirm(reason.trim());
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            background: isDanger ? 'var(--error-bg)' : 'var(--pending-bg)',
            border: `1px solid ${isDanger ? 'var(--error-border)' : 'var(--pending-border)'}`,
            padding: '14px 16px',
            borderRadius: '12px',
          }}
        >
          <AlertTriangle
            size={20}
            style={{ color: isDanger ? 'var(--error)' : 'var(--pending)', flexShrink: 0, marginTop: '2px' }}
          />
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            {description}
          </p>
        </div>

        {requireReason && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Reason for Action <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <textarea
              className="search-input-mobile"
              style={{
                height: '80px',
                padding: '10px 14px',
                borderRadius: '8px',
                resize: 'none',
              }}
              placeholder="Enter details or rationale for audit logs..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            {error && <span style={{ fontSize: '12px', color: 'var(--error)' }}>{error}</span>}
          </div>
        )}

        <div className="btn-row-mobile">
          <button
            type="button"
            className="btn-mobile"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`btn-mobile ${isDanger ? 'btn-mobile-danger' : 'btn-mobile-primary'}`}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}
