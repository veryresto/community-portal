import { useState, useEffect } from 'react';
import { LogOut, LayoutGrid, FileText, CheckCircle2, User as UserIcon, ExternalLink, HelpCircle, Shield, FolderOpen } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { supabase } from '../lib/supabase';
import { AdminDashboardScreen } from './AdminDashboardScreen';
import { getAffiliationLabel } from '../constants/affiliations';
import { t } from '../lib/i18n';
import * as analytics from '../lib/analytics';

export function EcosystemLandingScreen() {
  const { user, signOut } = useAuth();
  const { isAdmin, isVerifier, isModerator, isGovernanceManager } = usePermissions();
  const [houseNumber, setHouseNumber] = useState<string | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);
  const [participantType, setParticipantType] = useState<string | null>(null);
  const [residentSubtype, setResidentSubtype] = useState<string | null>(null);
  const [requestedAffiliation, setRequestedAffiliation] = useState<string | null>(null);
  const [showAdminDashboard, setShowAdminDashboard] = useState(() => {
    return sessionStorage.getItem('current_view') === 'admin_dashboard';
  });

  useEffect(() => {
    analytics.track('page_viewed', { page: 'community_portal' });
  }, []);

  const handleOpenAdmin = () => {
    setShowAdminDashboard(true);
    sessionStorage.setItem('current_view', 'admin_dashboard');
  };

  const handleCloseAdmin = () => {
    setShowAdminDashboard(false);
    sessionStorage.setItem('current_view', 'hub');
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('house_number, whatsapp_number, participant_type, resident_subtype, requested_affiliation')
          .eq('id', user.id)
          .maybeSingle();

        if (data) {
          setHouseNumber(data.house_number);
          setWhatsappNumber(data.whatsapp_number);
          setParticipantType(data.participant_type);
          setResidentSubtype(data.resident_subtype);
          setRequestedAffiliation(data.requested_affiliation);
        }
      } catch (err) {
        console.error('Error fetching landing profile:', err);
      }
    };
    fetchProfile();
  }, [user?.id]);

  const isLocal = window.location.hostname.endsWith('.localtest.me') || 
                  window.location.hostname.endsWith('.lvh.me') || 
                  window.location.hostname === 'localhost';

  const iplFinderUrl = isLocal 
    ? (import.meta.env.VITE_IPL_FINDER_URL || 'http://ipl-finder.localtest.me:8080')
    : (import.meta.env.VITE_IPL_FINDER_URL || 'https://ipl-finder.veryresto.com');

  const rekapViewerUrl = isLocal
    ? (import.meta.env.VITE_REKAP_VIEWER_URL || 'http://rekap.localtest.me:3000')
    : (import.meta.env.VITE_REKAP_VIEWER_URL || 'https://rekap.veryresto.com');

  const communityDocsUrl = isLocal
    ? (import.meta.env.VITE_COMMUNITY_DOCS_URL || 'http://docs.localtest.me:3001')
    : (import.meta.env.VITE_COMMUNITY_DOCS_URL || 'https://info.veryresto.com');

  const apps = [
    {
      name: 'IPL Finder',
      slug: 'ipl_finder',
      description: t('landing.apps.ipl_finder.description'),
      icon: FileText,
      status: 'active',
      badgeText: 'Live',
      link: iplFinderUrl,
    },
    {
      name: 'Rekap Viewer',
      slug: 'rekap_viewer',
      description: t('landing.apps.rekap_viewer.description'),
      icon: LayoutGrid,
      status: 'active',
      badgeText: 'Live',
      link: rekapViewerUrl,
    },
    {
      name: 'Community Documents',
      slug: 'community_docs',
      description: t('landing.apps.community_docs.description'),
      icon: FolderOpen,
      status: 'active',
      badgeText: 'Live',
      link: communityDocsUrl,
    },
    {
      name: 'Kas Management',
      slug: 'kas_management',
      description: t('landing.apps.kas_management.description'),
      icon: HelpCircle,
      status: 'planned',
      badgeText: t('landing.coming_soon'),
      link: null,
    },
    {
      name: 'Surat Administration',
      slug: 'surat_admin',
      description: t('landing.apps.surat_admin.description'),
      icon: HelpCircle,
      status: 'planned',
      badgeText: t('landing.coming_soon'),
      link: null,
    },
  ];

  if (showAdminDashboard && isGovernanceManager) {
    return (
      <div className="ecosystem-container">
        <AdminDashboardScreen onBack={handleCloseAdmin} />
      </div>
    );
  }

  return (
    <div className="ecosystem-container animate-fade-in">
      {/* Premium Gradient Background Blur */}
      <div className="glow-accent glow-ecosystem"></div>

      <header className="ecosystem-header">
        <div className="header-brand">
          <div className="brand-badge">
            <CheckCircle2 className="badge-logo" />
            <span>{t('landing.identity_active')}</span>
          </div>
          <h1>Veryresto Hub</h1>
          <p>{t('landing.dashboard_subtitle')}</p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {isGovernanceManager && (
            <button 
              onClick={handleOpenAdmin} 
              className="hub-signout-btn" 
              type="button"
              style={{ 
                borderColor: 'var(--primary)', 
                color: 'var(--primary)',
                boxShadow: '0 4px 14px var(--primary-glow)'
              }}
            >
              <Shield className="btn-icon" />
              <span>{t('landing.admin_center')}</span>
            </button>
          )}

          <button onClick={signOut} className="hub-signout-btn" type="button">
            <LogOut className="btn-icon" />
            <span>{t('landing.sign_out')}</span>
          </button>
        </div>
      </header>

      <main className="ecosystem-layout">
        {/* Resident Profile Card */}
        <section className="profile-card glassmorphic animate-slide-up">
          <div className="profile-heading">
            {user?.user_metadata?.avatar_url || user?.user_metadata?.picture ? (
              <img
                className="profile-avatar"
                src={user.user_metadata.avatar_url || user.user_metadata.picture}
                alt="Avatar"
              />
            ) : (
              <div className="profile-avatar-fallback">
                <UserIcon className="fallback-avatar-icon" />
              </div>
            )}
            <div className="profile-info">
              <h2>{user?.user_metadata?.full_name || user?.email}</h2>
              <p className="user-email">{user?.email}</p>
              <div className="role-tags">
                <span className="role-tag status-approved">
                  {participantType === 'non_resident' 
                    ? t('landing.approved_non_resident') 
                    : `${t('landing.approved_resident')}${residentSubtype ? ` (${t('house_relationships.' + residentSubtype + '.label')})` : ''}`}
                </span>
                {isAdmin && <span className="role-tag status-admin">{t('landing.global_admin')}</span>}
                {isVerifier && <span className="role-tag status-verifier">{t('landing.verifier')}</span>}
                {isModerator && <span className="role-tag status-moderator">{t('landing.moderator')}</span>}
              </div>
            </div>
          </div>

          <div className="profile-details">
            {participantType === 'non_resident' ? (
              requestedAffiliation && (
                <div className="p-detail">
                  <span className="p-label">{t('landing.affiliation')}:</span>
                  <span className="p-value">{getAffiliationLabel(requestedAffiliation)}</span>
                </div>
              )
            ) : (
              <div className="p-detail">
                <span className="p-label">{t('landing.registered_house')}:</span>
                <span className="p-value">{houseNumber || t('landing.not_specified')}</span>
              </div>
            )}
            {whatsappNumber && (
              <div className="p-detail">
                <span className="p-label">{t('landing.whatsapp_contact')}:</span>
                <span className="p-value">{whatsappNumber}</span>
              </div>
            )}
            <div className="p-detail">
              <span className="p-label">{t('landing.account_id')}:</span>
              <span className="p-value-mono">{user?.id.substring(0, 18)}...</span>
            </div>
          </div>
        </section>

        {/* Directory Grid */}
        <section className="apps-section">
          <h2>{t('landing.community_apps')}</h2>
          <div className="apps-grid">
            {apps.map((app, index) => {
              const Icon = app.icon;
              return (
                <div
                  key={index}
                  className={`app-hub-card glassmorphic ${app.status} animate-slide-up`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="card-top">
                    <div className="app-icon-wrapper">
                      <Icon className="app-card-icon" />
                    </div>
                    <span className={`status-pill ${app.status}`}>{app.badgeText}</span>
                  </div>

                  <div className="card-body">
                    <h3>{app.name}</h3>
                    <p>{app.description}</p>
                  </div>

                  <div className="card-action">
                    {app.link ? (
                      <a
                        href={app.link}
                        target="_blank"
                        rel="noreferrer"
                        className="app-launch-btn"
                        onClick={() => {
                          analytics.track('application_opened', {
                            application: app.slug
                          });
                        }}
                      >
                        <span>{t('landing.launch_app')}</span>
                        <ExternalLink className="launch-icon" />
                      </a>
                    ) : (
                      <button className="app-launch-btn disabled" disabled type="button">
                        <span>{t('landing.coming_soon')}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
