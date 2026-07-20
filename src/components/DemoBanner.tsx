import { AlertCircle } from 'lucide-react';
import { useDemoMode } from '../hooks/useDemoMode';
import { t } from '../lib/i18n';

export function DemoBanner() {
  const { isDemoMode } = useDemoMode();

  if (!isDemoMode) return null;

  return (
    <div className="demo-banner">
      <AlertCircle className="demo-banner-icon" />
      <div className="demo-banner-content">
        <strong>{t('login.demo_banner_title') || 'Demo Mode'}</strong>
        <span>
          {t('login.demo_banner_desc') ||
            'You are exploring the application using a read-only demo account. Some personal information has been hidden to protect resident privacy.'}
        </span>
      </div>
    </div>
  );
}
