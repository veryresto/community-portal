import { AuthProvider, useAuth } from './hooks/useAuth';
import { usePermissions } from './hooks/usePermissions';
import { LoginScreen } from './components/LoginScreen';
import { PendingApprovalScreen } from './components/PendingApprovalScreen';
import { RejectedScreen } from './components/RejectedScreen';
import { EcosystemLandingScreen } from './components/EcosystemLandingScreen';

function MainAppContent() {
  const { user, session, loading: authLoading } = useAuth();
  const { isApproved, isRejected, loading: permLoading } = usePermissions();

  // Show a premium visual spinner if authenticating or fetching permissions
  if (authLoading || permLoading) {
    return (
      <div className="portal-container">
        <div className="glow-accent glow-1"></div>
        <div className="loading-container glassmorphic" style={{ borderRadius: '24px', maxWidth: '320px', width: '100%' }}>
          <span className="spinner"></span>
          <p style={{ fontSize: '14px', fontWeight: 500 }}>Connecting to Portal...</p>
        </div>
      </div>
    );
  }

  // Route 1: User not logged in -> Show Login
  if (!user) {
    return <LoginScreen />;
  }

  // Route 2: Account explicitly rejected/suspended -> Access Denied Screen
  if (isRejected) {
    return <RejectedScreen />;
  }

  // Route 3: Account not approved yet -> Waiting Room Details collection or Awaiting review
  if (!isApproved) {
    return <PendingApprovalScreen />;
  }

  // Route 4: Account approved -> Portal landing hub directory
  // If a valid redirect_to parameter is present, redirect to the consumer app instead
  const searchParams = new URLSearchParams(window.location.search);
  const rawRedirectTo = searchParams.get('redirect_to');
  const redirectTo = getValidatedRedirectUrl(rawRedirectTo);

  if (redirectTo && session) {
    const ssoUrl = `${redirectTo}/#access_token=${encodeURIComponent(session.access_token)}&refresh_token=${encodeURIComponent(session.refresh_token)}`;
    window.location.replace(ssoUrl);
    return (
      <div className="portal-container">
        <div className="glow-accent glow-1"></div>
        <div className="loading-container glassmorphic" style={{ borderRadius: '24px', maxWidth: '320px', width: '100%' }}>
          <span className="spinner"></span>
          <p style={{ fontSize: '14px', fontWeight: 500 }}>Redirecting back to application...</p>
        </div>
      </div>
    );
  }

  return <EcosystemLandingScreen />;
}

const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:5173',
  'http://ipl-finder.lvh.me:8080',
  'http://community.lvh.me:5173',
  'https://ipl-finder-sr3.netlify.app',
  'https://rekap.veryresto.com',
  'https://ipl-finder.veryresto.com',
  'https://ipl-finder.fly.dev'
];

const getValidatedRedirectUrl = (urlParam: string | null): string | null => {
  if (!urlParam) return null;
  try {
    const url = new URL(urlParam);
    if (ALLOWED_ORIGINS.includes(url.origin)) {
      return urlParam;
    }
  } catch (e) {
    // Invalid URL structure
  }
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
