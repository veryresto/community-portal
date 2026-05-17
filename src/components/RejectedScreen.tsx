import { XCircle, LogOut, Info } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function RejectedScreen() {
  const { user, signOut } = useAuth();

  return (
    <div className="portal-container">
      {/* Decorative Red Blur Accent */}
      <div className="glow-accent glow-error animate-pulse-slow"></div>

      <div className="auth-card glassmorphic">
        <div className="status-header animate-fade-in">
          <div className="status-badge error">
            <XCircle className="badge-icon" />
            <span>Access Denied</span>
          </div>
          <h1 className="portal-title text-error">Registration Rejected</h1>
          <p className="portal-subtitle">
            Hello, <span className="highlight-text">{user?.user_metadata?.full_name || user?.email}</span>
          </p>
        </div>

        <div className="info-divider"></div>

        <div className="content-section animate-slide-up">
          <div className="alert-content-box">
            <p className="alert-title">Your account registration was rejected by an administrator.</p>
            <p className="alert-desc">
              Your credentials have been checked but do not match our authorized community member directory, or your submitted house verification could not be confirmed.
            </p>
          </div>

          <div className="notice-box error-notice">
            <Info className="notice-icon text-error" />
            <p>
              If you believe this is a mistake or wish to appeal this decision, please reach out to the community association administration office directly.
            </p>
          </div>
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
