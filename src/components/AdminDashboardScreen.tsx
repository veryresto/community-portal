import { useState, useEffect } from 'react';
import { 
  Users, Shield, Database, Activity, Check, X, ShieldAlert, 
  Info, AlertTriangle, ArrowLeft, Sparkles, Edit 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';

interface AdminDashboardScreenProps {
  onBack: () => void;
}

interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  house_number: string;
  whatsapp_number: string;
  approval_status: 'pending' | 'approved' | 'suspended' | 'rejected';
  participant_type?: 'resident' | 'non_resident';
  resident_subtype?: 'owner' | 'renter' | null;
  requested_affiliation?: string | null;
}

interface UserRole {
  user_id: string;
  role: 'admin' | 'resident_verifier' | 'platform_moderator';
}

interface Application {
  id: string;
  slug: string;
  name: string;
  url: string;
}

interface AppRole {
  id: string;
  app_id: string;
  name: string;
  description: string;
}

interface UserAppRole {
  id: string;
  user_id: string;
  app_role_id: string;
}

interface GovernanceEvent {
  id: string;
  actor_user_id: string;
  target_user_id: string;
  action: string;
  reason: string;
  created_at: string;
  actor_email?: string;
  target_email?: string;
  metadata?: any;
}

export function AdminDashboardScreen({ onBack }: AdminDashboardScreenProps) {
  const { user } = useAuth();
  const { isAdmin, isVerifier, isModerator, loading: permLoading } = usePermissions();
  
  // Tab states: 'approvals', 'roles', 'app_governance', 'audit'
  const [activeTab, setActiveTab] = useState<'approvals' | 'roles' | 'app_governance' | 'audit'>(() => {
    const saved = sessionStorage.getItem('admin_active_tab');
    if (saved === 'approvals' || saved === 'roles' || saved === 'app_governance' || saved === 'audit') {
      return saved;
    }
    return 'approvals';
  });

  const handleTabChange = (tab: 'approvals' | 'roles' | 'app_governance' | 'audit') => {
    setActiveTab(tab);
    sessionStorage.setItem('admin_active_tab', tab);
  };
  
  // Shared States
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [appRoles, setAppRoles] = useState<AppRole[]>([]);
  const [userAppRoles, setUserAppRoles] = useState<UserAppRole[]>([]);
  const [governanceEvents, setGovernanceEvents] = useState<GovernanceEvent[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal / Context states for Rejection or Suspension Reason
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [modalContext, setModalContext] = useState<{
    profile: Profile;
    action: 'reject' | 'suspend' | 'remove_role';
    roleKey?: string;
  } | null>(null);
  const [actionReason, setActionReason] = useState('');
  
  // Selected Profile for App Governance Matrix
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Inline Profile Edit States (Option 2)
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    house_number: '',
    whatsapp_number: '',
    participant_type: 'resident' as 'resident' | 'non_resident',
    resident_subtype: 'owner' as 'owner' | 'renter' | '',
    requested_affiliation: ''
  });
  const [editError, setEditError] = useState<string | null>(null);

  // Determine if actor has rights to edit/approve profiles (admin or verifier only)
  const canManageProfiles = isAdmin || isVerifier;

  // Load baseline data on mount
  useEffect(() => {
    fetchBaselineData();
  }, []);

  // Redirect to approvals tab if permissions load and user is not admin but viewing admin-only tabs
  useEffect(() => {
    if (!permLoading) {
      if ((activeTab === 'roles' || activeTab === 'audit') && !isAdmin) {
        handleTabChange('approvals');
      }
    }
  }, [isAdmin, permLoading, activeTab]);

  const fetchBaselineData = async () => {
    try {
      setLoading(true);
      // 1. Fetch Profiles that have completed onboarding (i.e. participant_type is not null)
      const { data: pData } = await supabase
        .from('profiles')
        .select('*')
        .not('participant_type', 'is', null)
        .order('created_at', { ascending: false });
      setProfiles(pData || []);

      // 2. Fetch Global Roles
      const { data: rData } = await supabase
        .from('user_roles')
        .select('*');
      setUserRoles(rData || []);

      // 3. Fetch applications registry
      const { data: appData } = await supabase
        .from('applications')
        .select('*');
      setApplications(appData || []);

      // 4. Fetch application roles/templates
      const { data: roleTemplates } = await supabase
        .from('app_roles')
        .select('*');
      setAppRoles(roleTemplates || []);

      // 5. Fetch user assigned app roles
      const { data: uarData } = await supabase
        .from('user_app_roles')
        .select('*');
      setUserAppRoles(uarData || []);

      // 6. Fetch Governance Events (Audit Log)
      const { data: evData } = await supabase
        .from('governance_events')
        .select('*')
        .order('created_at', { ascending: false });
      
      const mappedEvents = (evData || []).map(ev => ({
        ...ev,
        actor_email: ev.metadata?.actor_email || 'System',
        target_email: ev.metadata?.target_email || 'Resident'
      }));
      setGovernanceEvents(mappedEvents);

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to log audit event to governance_events
  const logGovernanceAction = async (
    targetUserId: string, 
    action: string, 
    reason: string, 
    targetEmail: string,
    customMetadata: Record<string, any> = {}
  ) => {
    try {
      await supabase
        .from('governance_events')
        .insert({
          actor_user_id: user?.id,
          target_user_id: targetUserId,
          action,
          reason: reason || null,
          metadata: {
            actor_email: user?.email,
            target_email: targetEmail,
            ...customMetadata
          }
        });
    } catch (err) {
      console.error('Failed to write governance event:', err);
    }
  };

  // Helper normalization and validation functions (Option 2)
  const normalizeHouseNumber = (val: string) => val.trim().replace(/\s+/g, ' ');
  const normalizeWhatsAppNumber = (val: string) => val.replace(/[^\d+]/g, '');

  const validateProfileEdit = (
    partType: 'resident' | 'non_resident',
    houseNum: string,
    whatsappNum: string,
    subType: string,
    affiliation: string
  ): string | null => {
    if (partType === 'resident') {
      if (!houseNum) return 'House number is required for residents.';
      if (houseNum.length > 25) return 'House number must be 25 characters or less.';
      if (!subType) return 'Resident subtype (owner/renter) is required.';
    } else {
      if (!affiliation) return 'Affiliation is required for non-residents.';
    }
    
    if (whatsappNum) {
      const digitsOnly = whatsappNum.replace(/\D/g, '');
      if (digitsOnly.length < 9 || digitsOnly.length > 15) {
        return 'WhatsApp number must contain between 9 and 15 digits.';
      }
    }
    return null;
  };

  const handleStartEdit = (profile: Profile) => {
    setEditingProfileId(profile.id);
    setEditForm({
      house_number: profile.house_number || '',
      whatsapp_number: profile.whatsapp_number || '',
      participant_type: (profile.participant_type || 'resident') as 'resident' | 'non_resident',
      resident_subtype: (profile.resident_subtype || 'owner') as 'owner' | 'renter' | '',
      requested_affiliation: profile.requested_affiliation || ''
    });
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingProfileId(null);
    setEditError(null);
  };

  const handleSaveProfileEdit = async (profile: Profile) => {
    const normHouse = editForm.participant_type === 'resident' ? normalizeHouseNumber(editForm.house_number) : '';
    const normWhatsApp = editForm.whatsapp_number ? normalizeWhatsAppNumber(editForm.whatsapp_number) : '';
    const affiliation = editForm.participant_type === 'non_resident' ? editForm.requested_affiliation.trim() : '';

    const validationError = validateProfileEdit(
      editForm.participant_type,
      normHouse,
      normWhatsApp,
      editForm.resident_subtype,
      affiliation
    );
    if (validationError) {
      setEditError(validationError);
      return;
    }

    setLoading(true);
    setEditError(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          participant_type: editForm.participant_type,
          resident_subtype: editForm.participant_type === 'resident' ? editForm.resident_subtype : null,
          house_number: editForm.participant_type === 'resident' ? normHouse : null,
          requested_affiliation: editForm.participant_type === 'non_resident' ? affiliation : null,
          whatsapp_number: normWhatsApp || null
        })
        .eq('id', profile.id);

      if (error) throw error;

      // Log structured metadata showing before and after states
      await logGovernanceAction(
        profile.id,
        'modified_resident_profile',
        'Corrected user profile classification details',
        profile.email,
        {
          before: {
            participant_type: profile.participant_type,
            resident_subtype: profile.resident_subtype,
            house_number: profile.house_number,
            requested_affiliation: profile.requested_affiliation,
            whatsapp_number: profile.whatsapp_number
          },
          after: {
            participant_type: editForm.participant_type,
            resident_subtype: editForm.participant_type === 'resident' ? editForm.resident_subtype : null,
            house_number: editForm.participant_type === 'resident' ? normHouse : null,
            requested_affiliation: editForm.participant_type === 'non_resident' ? affiliation : null,
            whatsapp_number: normWhatsApp || null
          }
        }
      );

      setEditingProfileId(null);
      await fetchBaselineData();
    } catch (err: any) {
      console.error(err);
      setEditError(err.message || 'Failed to save changes.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to extract state updates and profile edits from audit logs
  const getProfileAuditDetails = (profileId: string) => {
    const profileEvents = governanceEvents.filter(ev => ev.target_user_id === profileId);
    
    // Latest event that approved, rejected, or suspended
    const stateEvent = profileEvents.find(ev => 
      ev.action === 'approved_resident' || 
      ev.action === 'rejected_resident' || 
      ev.action === 'suspended_resident'
    );
    
    // Latest event that modified house number
    const houseEditEvent = profileEvents.find(ev => 
      ev.action === 'modified_resident_profile' &&
      ev.metadata &&
      (ev.metadata as any).before?.house_number !== (ev.metadata as any).after?.house_number
    );
    
    // Latest event that modified whatsapp number
    const whatsappEditEvent = profileEvents.find(ev => 
      ev.action === 'modified_resident_profile' &&
      ev.metadata &&
      (ev.metadata as any).before?.whatsapp_number !== (ev.metadata as any).after?.whatsapp_number
    );
    
    return { stateEvent, houseEditEvent, whatsappEditEvent };
  };

  // Handle Approve Resident (Global standing)
  const handleApproveResident = async (profile: Profile) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ approval_status: 'approved' })
        .eq('id', profile.id);

      if (error) throw error;

      await logGovernanceAction(profile.id, 'approved_resident', 'Verification check passed', profile.email);
      showToastBanner('Resident globally approved successfully', 'success');
      await fetchBaselineData();
    } catch (err: any) {
      showToastBanner(err.message || 'Approval failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Trigger Rejection / Suspension Modal
  const triggerReasonModal = (profile: Profile, action: 'reject' | 'suspend') => {
    setModalContext({ profile, action });
    setActionReason('');
    setReasonModalOpen(true);
  };

  // Execute Negative Action (Reject / Suspend) with required reason
  const executeNegativeAction = async () => {
    if (!actionReason.trim()) {
      showToastBanner('A reason is strictly required for this operational action', 'error');
      return;
    }

    if (!modalContext) return;
    const { profile, action } = modalContext;
    setLoading(true);
    setReasonModalOpen(false);

    try {
      const targetStatus = action === 'reject' ? 'rejected' : 'suspended';
      const { error } = await supabase
        .from('profiles')
        .update({ approval_status: targetStatus })
        .eq('id', profile.id);

      if (error) throw error;

      // If user is rejected or suspended, we also revoke all their assigned app role templates
      if (targetStatus === 'suspended' || targetStatus === 'rejected') {
        await supabase
          .from('user_app_roles')
          .delete()
          .eq('user_id', profile.id);
      }

      await logGovernanceAction(
        profile.id, 
        `${action}ed_resident`, 
        actionReason.trim(), 
        profile.email
      );

      showToastBanner(`Resident successfully ${action}ed`, 'success');
      await fetchBaselineData();
    } catch (err: any) {
      showToastBanner(err.message || 'Operation failed', 'error');
    } finally {
      setLoading(false);
      setModalContext(null);
    }
  };

  // Assign Global Role (admin, verifier, moderator)
  const handleAssignGlobalRole = async (targetUserId: string, role: string, targetEmail: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: targetUserId, role })
        .select();

      if (error) throw error;

      await logGovernanceAction(targetUserId, `assigned_global_role:${role}`, 'Elevated platform privileges', targetEmail);
      showToastBanner(`Elevated privilege to global ${role}`, 'success');
      await fetchBaselineData();
    } catch (err: any) {
      showToastBanner(err.message || 'Role assignment failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Remove Global Role
  const handleRemoveGlobalRole = async (targetUserId: string, role: string, targetEmail: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', targetUserId)
        .eq('role', role);

      if (error) throw error;

      await logGovernanceAction(targetUserId, `removed_global_role:${role}`, 'Revoked global privilege', targetEmail);
      showToastBanner(`Revoked global role: ${role}`, 'success');
      await fetchBaselineData();
    } catch (err: any) {
      showToastBanner(err.message || 'Role removal failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // App-RBAC Mapping: Change User's Template Role for specific Application
  const handleAppRoleTemplateChange = async (userId: string, appSlug: string, newRoleId: string | 'none', userEmail: string) => {
    setLoading(true);
    try {
      const app = applications.find(a => a.slug === appSlug);
      if (!app) return;

      // 1. Fetch current role template for this user/app if exists
      const targetRoles = appRoles.filter(ar => ar.app_id === app.id);
      const roleIds = targetRoles.map(r => r.id);

      const existingMapping = userAppRoles.find(
        uar => uar.user_id === userId && roleIds.includes(uar.app_role_id)
      );

      // 2. Delete existing mapping if it exists
      if (existingMapping) {
        await supabase
          .from('user_app_roles')
          .delete()
          .eq('id', existingMapping.id);
      }

      // 3. Insert new mapping if they did not select 'none'
      if (newRoleId !== 'none') {
        const { error } = await supabase
          .from('user_app_roles')
          .insert({
            user_id: userId,
            app_role_id: newRoleId,
            granted_by: user?.id
          });

        if (error) throw error;

        const roleObj = appRoles.find(r => r.id === newRoleId);
        await logGovernanceAction(
          userId, 
          `assigned_app_role:${appSlug}.${roleObj?.name}`, 
          `Granted app governance template access`, 
          userEmail
        );
        showToastBanner(`Assigned ${app.name} role: ${roleObj?.name}`, 'success');
      } else {
        await logGovernanceAction(
          userId, 
          `revoked_app_role:${appSlug}`, 
          `Revoked all application capabilities`, 
          userEmail
        );
        showToastBanner(`Revoked all access to ${app.name}`, 'success');
      }

      await fetchBaselineData();
    } catch (err: any) {
      showToastBanner(err.message || 'Template mapping failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Toast / Status Alerts
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const showToastBanner = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filtering
  const filteredProfiles = profiles.filter(p => {
    const searchString = `${p.full_name || ''} ${p.email || ''} ${p.house_number || ''}`.toLowerCase();
    return searchString.includes(searchQuery.toLowerCase());
  });

  const filteredEvents = governanceEvents.filter(ev => {
    const searchString = `${ev.action} ${ev.reason || ''} ${ev.actor_email || ''} ${ev.target_email || ''}`.toLowerCase();
    return searchString.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="admin-dashboard-layout animate-fade-in">
      {/* Glow Backdrop Accent */}
      <div className="glow-accent glow-ecosystem"></div>

      {toastMessage && (
        <div className={`toast-overlay ${toastMessage.type} animate-slide-up`}>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <header className="admin-header">
        <div>
          <button onClick={onBack} className="admin-btn secondary" style={{ marginBottom: '12px' }}>
            <ArrowLeft className="btn-icon" />
            <span>Return to Hub</span>
          </button>
          <h1>Governance & Identity Center</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Shared Identity Ecosystem Administration Panel</p>
        </div>
        
        <div className="role-tags">
          {isAdmin && <span className="role-tag status-admin" style={{ padding: '6px 12px' }}>Super Admin</span>}
          {isVerifier && <span className="role-tag status-approved" style={{ padding: '6px 12px' }}>Verifier</span>}
          {isModerator && <span className="role-tag status-approved" style={{ padding: '6px 12px', borderColor: 'var(--pending)' }}>Moderator</span>}
        </div>
      </header>

      {/* Navigation Sub-Tabs */}
      <nav className="admin-nav-tabs">
        {(isAdmin || isVerifier) && (
          <button 
            onClick={() => { handleTabChange('approvals'); setSearchQuery(''); }}
            className={`admin-tab-btn ${activeTab === 'approvals' ? 'active' : ''}`}
          >
            <Users style={{ width: '16px' }} />
            <span>Resident Approvals</span>
          </button>
        )}
        
        {isAdmin && (
          <button 
            onClick={() => { handleTabChange('roles'); setSearchQuery(''); }}
            className={`admin-tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
          >
            <Shield style={{ width: '16px' }} />
            <span>Platform Roles</span>
          </button>
        )}

        {(isAdmin || isVerifier) && (
          <button 
            onClick={() => { handleTabChange('app_governance'); setSearchQuery(''); setSelectedProfileId(profiles[0]?.id || null); }}
            className={`admin-tab-btn ${activeTab === 'app_governance' ? 'active' : ''}`}
          >
            <Database style={{ width: '16px' }} />
            <span>App Access Governance</span>
          </button>
        )}

        {isAdmin && (
          <button 
            onClick={() => { handleTabChange('audit'); setSearchQuery(''); }}
            className={`admin-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          >
            <Activity style={{ width: '16px' }} />
            <span>Ecosystem Audit Logs</span>
          </button>
        )}
      </nav>

      {/* Tab Panels */}
      <div className="admin-content-card glassmorphic animate-slide-up">
        {loading && (
          <div className="loading-container">
            <span className="spinner"></span>
            <p>Fetching platform data...</p>
          </div>
        )}

        {!loading && activeTab === 'approvals' && (
          <div>
            <div className="admin-section-header">
              <h2>Resident Approvals & Waiting Room</h2>
              <p>Verify newly registered house numbers and grant baseline community standing.</p>
            </div>

            <div className="search-bar-wrapper">
              <input 
                type="text"
                placeholder="Search by name, email, or house number..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {filteredProfiles.length === 0 ? (
              <div className="empty-state">
                <Users className="empty-icon" />
                <p>No residents match the active search criteria.</p>
              </div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User Info</th>
                      <th>House / Affiliation</th>
                      <th>WhatsApp Contact</th>
                      <th>Approval Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProfiles.map(profile => {
                      const { stateEvent, houseEditEvent, whatsappEditEvent } = getProfileAuditDetails(profile.id);
                      return (
                        <tr key={profile.id}>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontWeight: 600 }}>{profile.full_name || 'Anonymous User'}</span>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{profile.email}</span>
                              <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                                <span className={`role-tag ${profile.participant_type === 'resident' ? 'status-approved' : 'status-verifier'}`} style={{ fontSize: '9px', padding: '1px 6px' }}>
                                  {profile.participant_type || 'resident'}
                                </span>
                                {profile.participant_type === 'resident' && profile.resident_subtype && (
                                  <span className="role-tag status-admin" style={{ fontSize: '9px', padding: '1px 6px', backgroundColor: 'transparent' }}>
                                    {profile.resident_subtype}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            {editingProfileId === profile.id ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div>
                                  <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Type</label>
                                  <select
                                    value={editForm.participant_type}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, participant_type: e.target.value as any }))}
                                    className="search-input"
                                    style={{ padding: '4px 6px', fontSize: '13px', width: '140px', margin: 0 }}
                                  >
                                    <option value="resident">Resident</option>
                                    <option value="non_resident">Non-Resident</option>
                                  </select>
                                </div>
                                {editForm.participant_type === 'resident' ? (
                                  <>
                                    <div>
                                      <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Subtype</label>
                                      <select
                                        value={editForm.resident_subtype}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, resident_subtype: e.target.value as any }))}
                                        className="search-input"
                                        style={{ padding: '4px 6px', fontSize: '13px', width: '140px', margin: 0 }}
                                      >
                                        <option value="owner">Owner</option>
                                        <option value="renter">Renter</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '2px' }}>House No.</label>
                                      <input
                                        type="text"
                                        className="search-input"
                                        style={{ padding: '4px 6px', fontSize: '13px', width: '140px', margin: 0 }}
                                        value={editForm.house_number}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, house_number: e.target.value }))}
                                      />
                                    </div>
                                  </>
                                ) : (
                                  <div>
                                    <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Affiliation</label>
                                    <input
                                      type="text"
                                      className="search-input"
                                      style={{ padding: '4px 6px', fontSize: '13px', width: '140px', margin: 0 }}
                                      placeholder="e.g. security, secretariat"
                                      value={editForm.requested_affiliation}
                                      onChange={(e) => setEditForm(prev => ({ ...prev, requested_affiliation: e.target.value }))}
                                    />
                                  </div>
                                )}
                                {editError && <span style={{ color: 'var(--danger)', fontSize: '11px' }}>{editError}</span>}
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {profile.participant_type === 'non_resident' ? (
                                  <span style={{ fontWeight: 600, color: 'var(--pending)' }}>
                                    {profile.requested_affiliation || 'Non-Resident Staff'}
                                  </span>
                                ) : (
                                  <span>{profile.house_number}</span>
                                )}
                                {houseEditEvent && (
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }} title={`Edited: ${houseEditEvent.reason}`}>
                                    Corrected by {houseEditEvent.actor_email}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td>
                            {editingProfileId === profile.id ? (
                              <input
                                type="text"
                                className="search-input"
                                style={{ padding: '6px 8px', fontSize: '14px', width: '150px', margin: 0 }}
                                placeholder="e.g. 08123456789"
                                value={editForm.whatsapp_number}
                                onChange={(e) => setEditForm(prev => ({ ...prev, whatsapp_number: e.target.value }))}
                              />
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span>{profile.whatsapp_number || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>None</span>}</span>
                                {whatsappEditEvent && (
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }} title={`Edited: ${whatsappEditEvent.reason}`}>
                                    Corrected by {whatsappEditEvent.actor_email}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span className={`pill-badge ${profile.approval_status}`}>
                                {profile.approval_status}
                              </span>
                              {stateEvent && (
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  {profile.approval_status === 'approved' ? 'Approved' : 
                                   profile.approval_status === 'rejected' ? 'Rejected' : 'Suspended'} by {stateEvent.actor_email}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            {canManageProfiles ? (
                              <div className="admin-action-group" style={{ justifyContent: 'flex-end' }}>
                                {editingProfileId === profile.id ? (
                                  <>
                                    <button 
                                      onClick={() => handleSaveProfileEdit(profile)}
                                      className="admin-btn primary"
                                      disabled={loading}
                                    >
                                      <Check style={{ width: '14px' }} />
                                      <span>Save</span>
                                    </button>
                                    <button 
                                      onClick={handleCancelEdit}
                                      className="admin-btn secondary"
                                      disabled={loading}
                                    >
                                      <X style={{ width: '14px' }} />
                                      <span>Cancel</span>
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button 
                                      onClick={() => handleStartEdit(profile)}
                                      className="admin-btn secondary"
                                      title="Edit resident profile details"
                                    >
                                      <Edit style={{ width: '14px' }} />
                                      <span>Edit</span>
                                    </button>

                                    {profile.approval_status === 'pending' && (
                                      <>
                                        <button 
                                          onClick={() => handleApproveResident(profile)}
                                          className="admin-btn primary"
                                        >
                                          <Check style={{ width: '14px' }} />
                                          <span>Approve</span>
                                        </button>
                                        <button 
                                          onClick={() => triggerReasonModal(profile, 'reject')}
                                          className="admin-btn danger"
                                        >
                                          <X style={{ width: '14px' }} />
                                          <span>Reject</span>
                                        </button>
                                      </>
                                    )}

                                    {profile.approval_status === 'approved' && (
                                      <button 
                                        onClick={() => triggerReasonModal(profile, 'suspend')}
                                        className="admin-btn danger"
                                      >
                                        <ShieldAlert style={{ width: '14px' }} />
                                        <span>Suspend</span>
                                      </button>
                                    )}

                                    {profile.approval_status === 'suspended' && (
                                      <button 
                                        onClick={() => handleApproveResident(profile)}
                                        className="admin-btn primary"
                                      >
                                        <Check style={{ width: '14px' }} />
                                        <span>Re-Approve</span>
                                      </button>
                                    )}

                                    {profile.approval_status === 'rejected' && (
                                      <button 
                                        onClick={() => handleApproveResident(profile)}
                                        className="admin-btn primary"
                                      >
                                        <Check style={{ width: '14px' }} />
                                        <span>Re-Approve</span>
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            ) : (
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                  Read-only (Admins/Verifiers only)
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === 'roles' && (
          <div>
            <div className="admin-section-header">
              <h2>Global Privileged Roles</h2>
              <p>Elevate verified community members to manage approvals, settings, or platform security.</p>
            </div>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Resident Info</th>
                    <th>WhatsApp Contact</th>
                    <th>Global Privileges</th>
                    <th style={{ textAlign: 'right' }}>Manage Privilege</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.filter(p => p.approval_status === 'approved').map(profile => {
                    const roles = userRoles.filter(ur => ur.user_id === profile.id).map(r => r.role);
                    
                    return (
                      <tr key={profile.id}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600 }}>{profile.full_name || 'Anonymous Resident'}</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{profile.email}</span>
                          </div>
                        </td>
                        <td>{profile.whatsapp_number || <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                        <td>
                          <div className="role-tags">
                            {roles.length === 0 ? (
                              <span className="role-tag status-approved" style={{ color: 'var(--text-muted)', border: '1px solid var(--border-color)', backgroundColor: 'transparent' }}>Standard Resident</span>
                            ) : (
                              roles.map(r => (
                                <span key={r} className="role-tag status-admin" style={{ 
                                  backgroundColor: r === 'admin' ? 'var(--primary-glow)' : 'var(--success-bg)',
                                  borderColor: r === 'admin' ? 'var(--primary)' : 'var(--success-border)',
                                  color: r === 'admin' ? 'var(--primary)' : 'var(--success)'
                                }}>
                                  {r === 'admin' ? 'Super Admin' : r.replace('_', ' ')}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="admin-action-group" style={{ justifyContent: 'flex-end' }}>
                            {/* Toggle Verifier */}
                            {roles.includes('resident_verifier') ? (
                              <button 
                                onClick={() => handleRemoveGlobalRole(profile.id, 'resident_verifier', profile.email)}
                                className="admin-btn danger"
                              >
                                <span>Demote Verifier</span>
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleAssignGlobalRole(profile.id, 'resident_verifier', profile.email)}
                                className="admin-btn secondary"
                              >
                                <span>Promote Verifier</span>
                              </button>
                            )}

                            {/* Toggle Moderator */}
                            {roles.includes('platform_moderator') ? (
                              <button 
                                onClick={() => handleRemoveGlobalRole(profile.id, 'platform_moderator', profile.email)}
                                className="admin-btn danger"
                              >
                                <span>Demote Moderator</span>
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleAssignGlobalRole(profile.id, 'platform_moderator', profile.email)}
                                className="admin-btn secondary"
                              >
                                <span>Promote Moderator</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && activeTab === 'app_governance' && (
          <div>
            <div className="admin-section-header">
              <h2>App Access Governance (App-RBAC)</h2>
              <p>Map approved community members to application-specific role templates.</p>
            </div>

            <div className="gov-layout">
              {/* Left Column: User Selector */}
              <div className="gov-list-panel">
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
                  <input 
                    type="text" 
                    placeholder="Search approved residents..." 
                    className="search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {profiles
                  .filter(p => p.approval_status === 'approved' && `${p.full_name || ''} ${p.email || ''}`.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(p => (
                    <div 
                      key={p.id}
                      onClick={() => setSelectedProfileId(p.id)}
                      className={`gov-user-item ${selectedProfileId === p.id ? 'active' : ''}`}
                    >
                      <span style={{ fontWeight: 600, display: 'block', fontSize: '13.5px' }}>{p.full_name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.email}</span>
                    </div>
                  ))}
              </div>

              {/* Right Column: App Access Matrix */}
              <div className="gov-detail-panel">
                {selectedProfileId ? (() => {
                  const activeProfile = profiles.find(p => p.id === selectedProfileId);
                  if (!activeProfile) return null;

                  return (
                    <>
                      {/* Identity Card Profile Details (Separation of concerns) */}
                      <section className="profile-card glassmorphic" style={{ padding: '24px', backgroundColor: 'var(--bg-primary)' }}>
                        <div className="profile-heading">
                          {activeProfile.avatar_url ? (
                            <img className="profile-avatar" src={activeProfile.avatar_url} style={{ width: '48px', height: '48px' }} />
                          ) : (
                            <div className="profile-avatar-fallback" style={{ width: '48px', height: '48px' }}>
                              <Users className="fallback-avatar-icon" style={{ width: '20px', height: '20px' }} />
                            </div>
                          )}
                          <div className="profile-info">
                            <h3 style={{ fontSize: '16px' }}>{activeProfile.full_name}</h3>
                            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>{activeProfile.email}</p>
                            <span className="pill-badge approved" style={{ marginTop: '6px' }}>
                              🟢 Approved {activeProfile.participant_type === 'non_resident' ? 'Non-Resident' : 'Resident'}
                            </span>
                          </div>
                        </div>
                      </section>

                      {/* App Access Matrix Card */}
                      <section className="matrix-card glassmorphic">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Sparkles className="notice-icon" />
                          <h3 style={{ fontSize: '15px' }}>Application Access Mapping</h3>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '12.5px', marginTop: '6px' }}>
                          Map this resident's access to application-specific role templates.
                        </p>

                        <div className="matrix-grid">
                          {applications.map(app => {
                            const availableAppRoles = appRoles.filter(ar => ar.app_id === app.id);
                            
                            // Find user's currently assigned role for this app
                            const userAssignedAppRole = userAppRoles.find(uar => 
                              uar.user_id === activeProfile.id && 
                              availableAppRoles.map(ar => ar.id).includes(uar.app_role_id)
                            );
                            
                            const currentRoleId = userAssignedAppRole ? userAssignedAppRole.app_role_id : 'none';

                            return (
                              <div key={app.id} className="matrix-row">
                                <div>
                                  <div className="matrix-row-title">
                                    {userAssignedAppRole ? '✓ ' : '✗ '} {app.name}
                                  </div>
                                  <div className="matrix-row-desc">
                                    Namespace: {app.slug}
                                  </div>
                                </div>
                                <select
                                  value={currentRoleId}
                                  onChange={(e) => handleAppRoleTemplateChange(
                                    activeProfile.id, 
                                    app.slug, 
                                    e.target.value,
                                    activeProfile.email
                                  )}
                                  className="matrix-select"
                                >
                                  <option value="none">No Access</option>
                                  {availableAppRoles.map(role => (
                                    <option key={role.id} value={role.id}>
                                      Role: {role.name.toUpperCase()}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    </>
                  );
                })() : (
                  <div className="empty-state">
                    <Info className="empty-icon" />
                    <p>Select an approved resident from the list to manage application access.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!loading && activeTab === 'audit' && (
          <div>
            <div className="admin-section-header">
              <h2>Ecosystem Governance Logs</h2>
              <p>Searchable and immutable ledger of approvals, rejections, suspensions, and role changes.</p>
            </div>

            <div className="search-bar-wrapper">
              <input 
                type="text"
                placeholder="Search audit trail by actor, action, or context..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {filteredEvents.length === 0 ? (
              <div className="empty-state">
                <Activity className="empty-icon" />
                <p>No audit logging records matched your search query.</p>
              </div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Actor</th>
                      <th>Action Code</th>
                      <th>Target User</th>
                      <th>Reason / Operational Context</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map(ev => (
                      <tr key={ev.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                          {new Date(ev.created_at).toLocaleString()}
                        </td>
                        <td style={{ fontWeight: 500, fontSize: '13px' }}>{ev.actor_email}</td>
                        <td>
                          <span className="role-tag status-admin" style={{ fontSize: '10px', textTransform: 'lowercase', fontFamily: 'var(--font-mono)' }}>
                            {ev.action}
                          </span>
                        </td>
                        <td style={{ fontSize: '13px' }}>{ev.target_email}</td>
                        <td>
                          {ev.reason ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                              <AlertTriangle style={{ width: '13px', color: 'var(--pending)', flexShrink: 0 }} />
                              <span>{ev.reason}</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '12px' }}>System automated action</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Required Operational Reason Modal */}
      {reasonModalOpen && modalContext && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-card glassmorphic animate-slide-up">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--error)' }}>
              <AlertTriangle style={{ width: '22px' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Operational Reason Required</h2>
            </div>
            
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
              You are {modalContext.action === 'reject' ? 'rejecting' : 'suspending'} registration for{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{modalContext.profile.full_name}</strong> ({modalContext.profile.email}).
              Provide operational context for this action:
            </p>

            <textarea
              placeholder={`e.g., Suspended due to resident move-out`}
              className="admin-textarea"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              required
            />

            <div className="modal-footer">
              <button 
                onClick={() => setReasonModalOpen(false)}
                className="admin-btn secondary"
              >
                Cancel
              </button>
              <button 
                onClick={executeNegativeAction}
                className="admin-btn danger"
              >
                Confirm {modalContext.action === 'reject' ? 'Rejection' : 'Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
