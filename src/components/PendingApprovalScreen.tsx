import { useState, useEffect } from 'react';
import { Clock, LogOut, Check, Home, Phone, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

export function PendingApprovalScreen() {
  const { user, signOut } = useAuth();
  const [houseNumber, setHouseNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [savedHouseNumber, setSavedHouseNumber] = useState<string | null>(null);
  const [savedWhatsappNumber, setSavedWhatsappNumber] = useState<string | null>(null);
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
          .select('house_number, whatsapp_number')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data?.house_number) {
          setSavedHouseNumber(data.house_number);
          setHouseNumber(data.house_number);
        }
        if (data?.whatsapp_number) {
          setSavedWhatsappNumber(data.whatsapp_number);
          setWhatsappNumber(data.whatsapp_number);
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

    if (!houseNumber.trim()) {
      showToast('House number is required', 'error');
      return;
    }

    if (houseNumber.length > 25) {
      showToast('House number must be 25 characters or less', 'error');
      return;
    }

    if (whatsappNumber && whatsappNumber.length > 25) {
      showToast('WhatsApp number must be 25 characters or less', 'error');
      return;
    }

    setLoading(true);
    const isFirstSubmission = !savedHouseNumber;

    try {
      // 1. Update profiles table
      const { error } = await supabase
        .from('profiles')
        .update({
          house_number: houseNumber.trim(),
          whatsapp_number: whatsappNumber.trim() || null,
          approval_status: 'pending', // Explicitly mark status as pending on submission
        })
        .eq('id', user?.id);

      if (error) throw error;

      setSavedHouseNumber(houseNumber.trim());
      setSavedWhatsappNumber(whatsappNumber.trim() || null);

      // 2. Trigger edge function notification if it's the first submission
      if (isFirstSubmission) {
        try {
          await supabase.functions.invoke('send-notification-email', {
            body: {
              type: 'new_user',
              userEmail: user?.email,
              userName: user?.user_metadata?.full_name || user?.user_metadata?.name,
              houseNumber: houseNumber.trim(),
            },
          });
          console.log('Admin notification sent');
        } catch (notifError) {
          console.error('Failed to send admin notification:', notifError);
          // Let submission pass even if email alert fails
        }
      }

      showToast('House registration details saved successfully!', 'success');
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
          ) : savedHouseNumber ? (
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
                <div className="detail-row">
                  <Home className="row-icon" />
                  <span className="row-label">Registered House Number:</span>
                  <span className="row-value">{savedHouseNumber}</span>
                </div>
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
                <p>Once an admin grants baseline approval, this portal will auto-unlock to display your active ecosystem applications.</p>
              </div>
            </div>
          ) : (
            /* Registration Form State */
            <form onSubmit={handleSubmit} className="portal-form">
              <p className="form-intro">
                Please complete your local community profile details to request access to ecosystem applications.
              </p>

              <div className="form-group">
                <label htmlFor="houseNumber">
                  <Home className="input-label-icon" />
                  <span>House Number <span className="required-star">*</span></span>
                </label>
                <input
                  id="houseNumber"
                  type="text"
                  placeholder="e.g., Block A, No. 12"
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  maxLength={25}
                  required
                  disabled={loading}
                />
                <span className="input-hint">Maximum 25 characters.</span>
              </div>

              <div className="form-group">
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
                <span className="input-hint">Used solely by administrators for resident verification.</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="submit-button"
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
