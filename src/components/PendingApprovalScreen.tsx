import { useState, useEffect } from 'react';
import { Clock, LogOut, Check, Home, Phone, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { AFFILIATION_OPTIONS, getAffiliationLabel } from '../constants/affiliations';

export function PendingApprovalScreen() {
  const { user, signOut } = useAuth();
  const [participantType, setParticipantType] = useState<'resident' | 'non_resident'>('resident');
  const [residentSubtype, setResidentSubtype] = useState<'owner' | 'renter'>('owner');
  const [houseNumber, setHouseNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [requestedAffiliation, setRequestedAffiliation] = useState('');
  const [otherAffiliation, setOtherAffiliation] = useState('');

  const [savedParticipantType, setSavedParticipantType] = useState<string | null>(null);
  const [savedResidentSubtype, setSavedResidentSubtype] = useState<string | null>(null);
  const [savedHouseNumber, setSavedHouseNumber] = useState<string | null>(null);
  const [savedWhatsappNumber, setSavedWhatsappNumber] = useState<string | null>(null);
  const [savedRequestedAffiliation, setSavedRequestedAffiliation] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('house_number, whatsapp_number, participant_type, resident_subtype, requested_affiliation')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          // Check if onboarding details have actually been submitted
          const hasSubmitted =
            (data.participant_type === 'resident' && data.house_number) ||
            (data.participant_type === 'non_resident' && data.requested_affiliation);

          if (hasSubmitted) {
            setSavedParticipantType(data.participant_type);
            setSavedResidentSubtype(data.resident_subtype);
            setSavedHouseNumber(data.house_number);
            setSavedRequestedAffiliation(data.requested_affiliation);
            setSavedWhatsappNumber(data.whatsapp_number);
          }

          if (data.participant_type) {
            setParticipantType(data.participant_type as 'resident' | 'non_resident');
          }
          if (data.resident_subtype) {
            setResidentSubtype(data.resident_subtype as 'owner' | 'renter');
          }
          if (data.house_number) {
            setHouseNumber(data.house_number);
          }
          if (data.whatsapp_number) {
            setWhatsappNumber(data.whatsapp_number);
          }
          if (data.requested_affiliation) {
            const standardKeys = AFFILIATION_OPTIONS.map(o => o.value).filter(v => v !== 'other');
            if (standardKeys.includes(data.requested_affiliation)) {
              setRequestedAffiliation(data.requested_affiliation);
            } else {
              setRequestedAffiliation('other');
              setOtherAffiliation(data.requested_affiliation);
            }
          }
        }
      } catch (err: any) {
        console.error('Error fetching profile:', err);
        showToast('Error fetching profile details', 'error');
      } finally {
        setFetching(false);
      }
    };

    fetchProfile();
  }, [user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (participantType === 'resident') {
      if (!houseNumber.trim()) {
        showToast('House number is required', 'error');
        return;
      }
      if (houseNumber.length > 25) {
        showToast('House number must be 25 characters or less', 'error');
        return;
      }
      if (!residentSubtype) {
        showToast('Resident subtype is required', 'error');
        return;
      }
    } else {
      if (!requestedAffiliation) {
        showToast('Affiliation selection is required', 'error');
        return;
      }
      if (requestedAffiliation === 'other' && !otherAffiliation.trim()) {
        showToast('Please specify your affiliation', 'error');
        return;
      }
    }

    if (whatsappNumber && whatsappNumber.length > 25) {
      showToast('WhatsApp number must be 25 characters or less', 'error');
      return;
    }

    setLoading(true);
    const isFirstSubmission = !savedParticipantType;
    const finalAffiliation = requestedAffiliation === 'other' ? otherAffiliation.trim() : requestedAffiliation;

    try {
      // 1. Update profiles table
      const { error } = await supabase
        .from('profiles')
        .update({
          participant_type: participantType,
          resident_subtype: participantType === 'resident' ? residentSubtype : null,
          house_number: participantType === 'resident' ? houseNumber.trim() : null,
          requested_affiliation: participantType === 'non_resident' ? finalAffiliation : null,
          whatsapp_number: whatsappNumber.trim() || null,
          approval_status: 'pending', // Explicitly mark status as pending on submission
        })
        .eq('id', user?.id);

      if (error) throw error;

      setSavedParticipantType(participantType);
      setSavedResidentSubtype(participantType === 'resident' ? residentSubtype : null);
      setSavedHouseNumber(participantType === 'resident' ? houseNumber.trim() : null);
      setSavedRequestedAffiliation(participantType === 'non_resident' ? finalAffiliation : null);
      setSavedWhatsappNumber(whatsappNumber.trim() || null);

      // 2. Trigger edge function notification if it's the first submission
      if (isFirstSubmission) {
        // Construct description to send via the houseNumber email field
        let customDesc = '';
        if (participantType === 'resident') {
          customDesc = `Resident ${residentSubtype === 'owner' ? 'Owner' : 'Renter'} (House: ${houseNumber.trim()})`;
        } else {
          customDesc = `Non-Resident (${finalAffiliation})`;
        }

        try {
          await supabase.functions.invoke('send-notification-email', {
            body: {
              type: 'new_user',
              userEmail: user?.email,
              userName: user?.user_metadata?.full_name || user?.user_metadata?.name,
              houseNumber: customDesc,
            },
          });
          console.log('Admin notification sent');
        } catch (notifError) {
          console.error('Failed to send admin notification:', notifError);
        }
      }

      showToast('Registration details saved successfully!', 'success');
    } catch (error: any) {
      console.error(error);
      showToast(error.message || 'Error saving registration details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-container">
      {/* Decorative Blur Accents */}
      <div className="glow-accent glow-success"></div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className={`toast-overlay ${toastMessage.type} animate-slide-up`}>
          <span>{toastMessage.text}</span>
        </div>
      )}

      <div className="auth-card glassmorphic">
        <div className="status-header animate-fade-in">
          <div className="status-badge pending">
            <Clock className="badge-icon spin-subtle" />
            <span>Awaiting Verification</span>
          </div>
          <h1 className="portal-title">Waiting Room</h1>
          <p className="portal-subtitle">
            Welcome, <span className="highlight-text">{user?.user_metadata?.full_name || user?.email}</span>
          </p>
        </div>

        <div className="info-divider"></div>

        <div className="content-section animate-slide-up">
          {fetching ? (
            <div className="loading-container">
              <span className="spinner"></span>
              <p>Loading your registration details...</p>
            </div>
          ) : savedParticipantType ? (
            /* Submissive Verification Card State */
            <div className="submission-summary">
              <div className="success-badge">
                <Check className="check-icon" />
                <span>Information Submitted</span>
              </div>
              <p className="summary-desc">
                Your registration is currently under review by our community administrators. We will contact you or update your account status shortly.
              </p>

              <div className="saved-details">
                <div className="detail-row" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                  <span className="row-label">Classification:</span>
                  <span className="row-value" style={{ textTransform: 'capitalize' }}>
                    {savedParticipantType === 'resident'
                      ? `Resident (${savedResidentSubtype || ''})`
                      : 'Non-Resident'}
                  </span>
                </div>
                {savedParticipantType === 'resident' && savedHouseNumber && (
                  <div className="detail-row">
                    <Home className="row-icon" />
                    <span className="row-label">Registered House Number:</span>
                    <span className="row-value">{savedHouseNumber}</span>
                  </div>
                )}
                {savedParticipantType === 'non_resident' && savedRequestedAffiliation && (
                  <div className="detail-row">
                    <span className="row-label">Requested Affiliation:</span>
                    <span className="row-value">
                      {getAffiliationLabel(savedRequestedAffiliation)}
                    </span>
                  </div>
                )}
                {savedWhatsappNumber && (
                  <div className="detail-row">
                    <Phone className="row-icon" />
                    <span className="row-label">WhatsApp Contact:</span>
                    <span className="row-value">{savedWhatsappNumber}</span>
                  </div>
                )}
              </div>

              <div className="notice-box">
                <ShieldCheck className="notice-icon" />
                <p>Once an admin grants approval, your account will be activated with appropriate application access mappings.</p>
              </div>
            </div>
          ) : (
            /* Registration Form State */
            <form onSubmit={handleSubmit} className="portal-form">
              <p className="form-intro">
                Please complete your local community profile details to request access to ecosystem applications.
              </p>

              {/* Step 1: Participant Classification Segmented Control */}
              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Who are you in this community? <span className="required-star">*</span></label>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button
                    type="button"
                    className={`segment-btn ${participantType === 'resident' ? 'active' : ''}`}
                    onClick={() => setParticipantType('resident')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '12px',
                      border: '1px solid',
                      borderColor: participantType === 'resident' ? 'var(--primary)' : 'var(--border-color)',
                      backgroundColor: participantType === 'resident' ? 'var(--primary-glow)' : 'var(--bg-secondary)',
                      color: participantType === 'resident' ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '13.5px'
                    }}
                  >
                    Resident
                  </button>
                  <button
                    type="button"
                    className={`segment-btn ${participantType === 'non_resident' ? 'active' : ''}`}
                    onClick={() => setParticipantType('non_resident')}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '12px',
                      border: '1px solid',
                      borderColor: participantType === 'non_resident' ? 'var(--primary)' : 'var(--border-color)',
                      backgroundColor: participantType === 'non_resident' ? 'var(--primary-glow)' : 'var(--bg-secondary)',
                      color: participantType === 'non_resident' ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '13.5px'
                    }}
                  >
                    Non-Resident
                  </button>
                </div>
              </div>

              {/* Step 2: Dynamic Form Fields based on Classification */}
              {participantType === 'resident' && (
                <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '4px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>Resident Subtype <span className="required-star">*</span></label>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                      <button
                        type="button"
                        className={`segment-btn ${residentSubtype === 'owner' ? 'active' : ''}`}
                        onClick={() => setResidentSubtype('owner')}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: '10px',
                          border: '1px solid',
                          borderColor: residentSubtype === 'owner' ? 'var(--primary)' : 'var(--border-color)',
                          backgroundColor: residentSubtype === 'owner' ? 'var(--primary-glow)' : 'var(--bg-secondary)',
                          color: residentSubtype === 'owner' ? 'var(--primary)' : 'var(--text-secondary)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                          fontSize: '13px'
                        }}
                      >
                        Owner
                      </button>
                      <button
                        type="button"
                        className={`segment-btn ${residentSubtype === 'renter' ? 'active' : ''}`}
                        onClick={() => setResidentSubtype('renter')}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: '10px',
                          border: '1px solid',
                          borderColor: residentSubtype === 'renter' ? 'var(--primary)' : 'var(--border-color)',
                          backgroundColor: residentSubtype === 'renter' ? 'var(--primary-glow)' : 'var(--bg-secondary)',
                          color: residentSubtype === 'renter' ? 'var(--primary)' : 'var(--text-secondary)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                          fontSize: '13px'
                        }}
                      >
                        Renter
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="houseNumber">
                      <Home className="input-label-icon" />
                      <span>House Number <span className="required-star">*</span></span>
                    </label>
                    <input
                      id="houseNumber"
                      type="text"
                      placeholder="e.g., Z10A"
                      value={houseNumber}
                      onChange={(e) => setHouseNumber(e.target.value)}
                      maxLength={4}
                      required
                      disabled={loading}
                    />
                    <span className="input-hint">Maximum 4 characters.</span>
                  </div>
                </div>
              )}

              {participantType === 'non_resident' && (
                <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '4px' }}>
                  <div className="form-group">
                    <label htmlFor="requestedAffiliation">
                      <span>Requested Affiliation <span className="required-star">*</span></span>
                    </label>
                    <select
                      id="requestedAffiliation"
                      value={requestedAffiliation}
                      onChange={(e) => setRequestedAffiliation(e.target.value)}
                      disabled={loading}
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        fontSize: '14px',
                        fontFamily: 'var(--font-sans)',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        marginTop: '8px'
                      }}
                    >
                      <option value="">-- Select your affiliation --</option>
                      {AFFILIATION_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {requestedAffiliation === 'other' && (
                    <div className="form-group animate-slide-up">
                      <label htmlFor="otherAffiliation">
                        <span>Specify Affiliation <span className="required-star">*</span></span>
                      </label>
                      <input
                        id="otherAffiliation"
                        type="text"
                        placeholder="e.g., Garden Maintenance, Electrician"
                        value={otherAffiliation}
                        onChange={(e) => setOtherAffiliation(e.target.value)}
                        maxLength={25}
                        required
                        disabled={loading}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Common Contact Info */}
              <div className="form-group" style={{ marginTop: '4px' }}>
                <label htmlFor="whatsappNumber">
                  <Phone className="input-label-icon" />
                  <span>WhatsApp Number (Optional)</span>
                </label>
                <input
                  id="whatsappNumber"
                  type="tel"
                  placeholder="e.g., 08123456789"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  maxLength={25}
                  disabled={loading}
                />
                <span className="input-hint">Used solely by administrators for verification.</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="submit-button"
                style={{ marginTop: '12px' }}
              >
                {loading ? (
                  <span className="spinner"></span>
                ) : (
                  <>
                    <span>Submit Details</span>
                    <ArrowRight className="btn-arrow" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <div className="card-footer actions">
          <button onClick={signOut} className="signout-button" type="button">
            <LogOut className="signout-icon" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
