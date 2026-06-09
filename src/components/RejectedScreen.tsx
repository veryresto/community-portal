import { XCircle, LogOut, Info } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { t } from '../lib/i18n';

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
            <span>{t('rejected.access_denied')}</span>
          </div>
          <h1 className="portal-title text-error">{t('rejected.title')}</h1>
          <p className="portal-subtitle">
            {t('rejected.hello', { name: user?.user_metadata?.full_name || user?.email || '' })}
          </p>
        </div>

        <div className="info-divider"></div>

        <div className="content-section animate-slide-up">
          <div className="alert-content-box">
            <p className="alert-title">{t('rejected.alert_title')}</p>
            <p className="alert-desc">{t('rejected.alert_desc')}</p>
          </div>

          <div className="notice-box error-notice">
            <Info className="notice-icon text-error" />
            <p>{t('rejected.appeal_notice')}</p>
          </div>
        </div>

        <div className="card-footer actions">
          <button onClick={signOut} className="signout-button" type="button">
            <LogOut className="signout-icon" />
            <span>{t('rejected.sign_out')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
