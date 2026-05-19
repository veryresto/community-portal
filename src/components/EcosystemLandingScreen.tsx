import { useState, useEffect } from 'react';
import { LogOut, LayoutGrid, FileText, CheckCircle2, User as UserIcon, ExternalLink, HelpCircle, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { supabase } from '../lib/supabase';
import { AdminDashboardScreen } from './AdminDashboardScreen';

export function EcosystemLandingScreen() {
  const { user, signOut } = useAuth();
  const { isAdmin, isGovernanceManager } = usePermissions();
  const [houseNumber, setHouseNumber] = useState<string | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('house_number, whatsapp_number')
          .eq('id', user.id)
          .maybeSingle();

        if (data) {
          setHouseNumber(data.house_number);
          setWhatsappNumber(data.whatsapp_number);
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

  const apps = [
    {
      name: 'IPL Finder',
      description: 'Search, index, and manage bank e-statements and CSV records. Active document audit trail.',
      icon: FileText,
      status: 'active',
      badgeText: 'Live',
      link: iplFinderUrl,
    },
    {
      name: 'Rekap Viewer',
      description: 'Fly.io cached backend display for Sheets logs, reports, and real-time community summaries.',
      icon: LayoutGrid,
      status: 'active',
      badgeText: 'Live',
      link: rekapViewerUrl,
    },
    {
      name: 'Kas Management',
      description: 'Decentralized cashbook treasury, monthly billing tracking, and balance sheet reporting.',
      icon: HelpCircle,
      status: 'planned',
      badgeText: 'Planned',
      link: null,
    },
    {
      name: 'Surat Administration',
      description: 'Instant official resident correspondence generation and custom PDF permit drafting tools.',
      icon: HelpCircle,
      status: 'planned',
      badgeText: 'Planned',
      link: null,
    },
  ];

  if (showAdminDashboard && isGovernanceManager) {
    return (
      <div className="ecosystem-container">
        <AdminDashboardScreen onBack={() => setShowAdminDashboard(false)} />
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
            <span>Identity Active</span>
          </div>
          <h1>Veryresto Hub</h1>
          <p>Central Community App Dashboard</p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {isGovernanceManager && (
            <button 
              onClick={() => setShowAdminDashboard(true)} 
              className="hub-signout-btn" 
              type="button"
              style={{ 
                borderColor: 'var(--primary)', 
                color: 'var(--primary)',
                boxShadow: '0 4px 14px var(--primary-glow)'
              }}
            >
              <Shield className="btn-icon" />
              <span>Admin Center</span>
            </button>
          )}

          <button onClick={signOut} className="hub-signout-btn" type="button">
            <LogOut className="btn-icon" />
            <span>Sign Out</span>
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
                <span className="role-tag status-approved">Approved Resident</span>
                {isAdmin && <span className="role-tag status-admin">Global Admin</span>}
              </div>
            </div>
          </div>

          <div className="profile-details">
            <div className="p-detail">
              <span className="p-label">Registered House:</span>
              <span className="p-value">{houseNumber || 'Not specified'}</span>
            </div>
            {whatsappNumber && (
              <div className="p-detail">
                <span className="p-label">WhatsApp Contact:</span>
                <span className="p-value">{whatsappNumber}</span>
              </div>
            )}
            <div className="p-detail">
              <span className="p-label">Account ID:</span>
              <span className="p-value-mono">{user?.id.substring(0, 18)}...</span>
            </div>
          </div>
        </section>

        {/* Directory Grid */}
        <section className="apps-section animate-slide-up delay-1">
          <h2>Community Applications</h2>
          <div className="apps-grid">
            {apps.map((app, index) => {
              const Icon = app.icon;
              return (
                <div key={index} className={`app-hub-card glassmorphic ${app.status}`}>
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
                      >
                        <span>Launch App</span>
                        <ExternalLink className="launch-icon" />
                      </a>
                    ) : (
                      <button className="app-launch-btn disabled" disabled type="button">
                        <span>Coming Soon</span>
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
