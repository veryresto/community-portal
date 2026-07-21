import { User as UserIcon, Shield, ChevronRight } from 'lucide-react';
import { Badge } from './Badge';
import { useDemoMode } from '../../hooks/useDemoMode';
import { maskName, maskEmail } from '../../lib/masking';
import { getAffiliationLabel } from '../../constants/affiliations';

interface ProfileCardProps {
  user: any;
  participantType: string | null;
  residentSubtype: string | null;
  requestedAffiliation: string | null;
  houseNumber: string | null;
  whatsappNumber: string | null;
  isAdmin: boolean;
  isVerifier: boolean;
  isModerator: boolean;
  isGovernanceManager: boolean;
  onOpenAdmin?: () => void;
}

export function ProfileCard({
  user,
  participantType,
  residentSubtype,
  requestedAffiliation,
  houseNumber,
  isAdmin,
  isVerifier,
  isModerator,
  isGovernanceManager,
  onOpenAdmin,
}: ProfileCardProps) {
  const { isDemoMode } = useDemoMode();

  const fullName = maskName(user?.user_metadata?.full_name || user?.email, isDemoMode);
  const email = maskEmail(user?.email, isDemoMode);
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <div className="card-mobile" style={{ padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Avatar"
            style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary) 0%, #ec4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <UserIcon size={24} />
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fullName}
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {email}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
        <Badge
          label={
            participantType === 'non_resident'
              ? 'APPROVED NON-RESIDENT'
              : `RESIDENT ${residentSubtype ? `(${residentSubtype.toUpperCase()})` : ''}`
          }
          variant={participantType === 'non_resident' ? 'non-resident' : 'resident'}
        />
        {isAdmin && <Badge label="GLOBAL ADMIN" variant="global-admin" />}
        {isVerifier && <Badge label="RESIDENT VERIFIER" variant="resident-verifier" />}
        {isModerator && <Badge label="MODERATOR" variant="secretariat-admin" />}
      </div>

      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {participantType === 'non_resident' ? (
          requestedAffiliation && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Affiliation</span>
              <span style={{ fontWeight: 600 }}>{getAffiliationLabel(requestedAffiliation)}</span>
            </div>
          )
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Registered House</span>
            <span style={{ fontWeight: 600 }}>{houseNumber || 'Not specified'}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Account ID</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', opacity: 0.8 }}>
            {user?.id ? `${user.id.substring(0, 14)}...` : 'N/A'}
          </span>
        </div>
      </div>

      {isGovernanceManager && onOpenAdmin && (
        <button
          type="button"
          className="btn-mobile btn-mobile-primary"
          onClick={onOpenAdmin}
          style={{ width: '100%', marginTop: '14px' }}
        >
          <Shield size={16} />
          <span>Open Admin Governance Center</span>
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
