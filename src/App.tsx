import { AuthProvider, useAuth } from './hooks/useAuth';
import { usePermissions } from './hooks/usePermissions';
import { LoginScreen } from './components/LoginScreen';
import { PendingApprovalScreen } from './components/PendingApprovalScreen';
import { RejectedScreen } from './components/RejectedScreen';
import { EcosystemLandingScreen } from './components/EcosystemLandingScreen';

function MainAppContent() {
  const { user, loading: authLoading } = useAuth();
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
  return <EcosystemLandingScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
