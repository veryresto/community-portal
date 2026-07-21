import { Home, UserCheck, Shield, Layers, ScrollText } from 'lucide-react';

export type MobileTab = 'hub' | 'approvals' | 'roles' | 'app-rbac' | 'logs';

interface BottomTabBarProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  isGovernanceManager: boolean;
}

export function triggerHapticFeedback(pattern = 10) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Haptics disabled or unsupported
    }
  }
}

export function BottomTabBar({ activeTab, onTabChange, isGovernanceManager }: BottomTabBarProps) {
  const tabs: { id: MobileTab; label: string; icon: typeof Home; adminOnly: boolean }[] = [
    { id: 'hub', label: 'Hub', icon: Home, adminOnly: false },
    { id: 'approvals', label: 'Approvals', icon: UserCheck, adminOnly: true },
    { id: 'roles', label: 'Roles', icon: Shield, adminOnly: true },
    { id: 'app-rbac', label: 'App-RBAC', icon: Layers, adminOnly: true },
    { id: 'logs', label: 'Logs', icon: ScrollText, adminOnly: true },
  ];

  // Filter tabs if user is not a Governance Manager
  const visibleTabs = tabs.filter(t => !t.adminOnly || isGovernanceManager);

  return (
    <nav className="bottom-tab-bar" role="tablist" aria-label="Main Navigation">
      {visibleTabs.map((t) => {
        const Icon = t.icon;
        const isActive = activeTab === t.id;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={isActive}
            className={`tab-item ${isActive ? 'active' : ''}`}
            onClick={() => {
              triggerHapticFeedback(12);
              onTabChange(t.id);
            }}
            type="button"
          >
            <div className="tab-icon-wrapper">
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
            </div>
            <span>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
