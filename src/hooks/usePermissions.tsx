import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface Permissions {
  isAdmin: boolean;
  isApproved: boolean;
  isRejected: boolean;
  canReadFiles: boolean;
  canUploadFiles: boolean;
  hasSubmittedInfo: boolean;
  loading: boolean;
}

export function usePermissions(): Permissions {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [canReadFiles, setCanReadFiles] = useState(false);
  const [canUploadFiles, setCanUploadFiles] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [hasSubmittedInfo, setHasSubmittedInfo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setIsRejected(false);
      setCanReadFiles(false);
      setCanUploadFiles(false);
      setIsApproved(false);
      setHasSubmittedInfo(false);
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        setLoading(true);

        // 1. Fetch user's profile info
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('house_number, approval_status')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Failed to load profile:', profileError.message);
        }

        const houseNum = profile?.house_number;
        setHasSubmittedInfo(!!houseNum);

        // 2. Fetch admin role from user_roles
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        const adminStatus = !!roleData;
        setIsAdmin(adminStatus);

        // 3. Evaluate approval status with the hybrid source of truth
        const dbStatus = profile?.approval_status;

        if (dbStatus === 'approved') {
          // Explicitly approved in profiles table
          setIsApproved(true);
          setIsRejected(false);
          setCanReadFiles(true);
          setCanUploadFiles(true);
        } else if (dbStatus === 'rejected' || dbStatus === 'suspended') {
          // Explicitly rejected or suspended in profiles table
          setIsApproved(false);
          setIsRejected(true);
          setCanReadFiles(false);
          setCanUploadFiles(false);
        } else {
          // FALLBACK COMPATIBILITY LOGIC:
          // If approval_status is 'pending' or not present in the DB schema,
          // check the legacy roles/permissions tables.
          if (adminStatus) {
            setIsApproved(true);
            setIsRejected(false);
            setCanReadFiles(true);
            setCanUploadFiles(true);
          } else {
            const { data: permData } = await supabase
              .from('user_permissions')
              .select('permission')
              .eq('user_id', user.id);

            const permissions = permData?.map((p) => p.permission) || [];
            
            const rejected = permissions.includes('rejected');
            const canRead = permissions.includes('read_files');
            const canUpload = permissions.includes('upload_files');

            setIsRejected(rejected);
            setCanReadFiles(canRead);
            setCanUploadFiles(canUpload);
            setIsApproved(canRead || canUpload);
          }
        }
      } catch (error) {
        console.error('Error fetching user permissions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user]);

  return {
    isAdmin,
    isApproved,
    isRejected,
    canReadFiles,
    canUploadFiles,
    hasSubmittedInfo,
    loading,
  };
}
