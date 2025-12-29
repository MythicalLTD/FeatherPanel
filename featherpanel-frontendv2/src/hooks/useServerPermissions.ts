import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useSession } from "@/contexts/SessionContext";
import { Server } from "@/types/server";
import PermissionsClass from "@/lib/permissions";

export function useServerPermissions(uuidShort: string) {
  const { user: sessionUser, hasPermission: hasGlobalPermission } =
    useSession();
  const [server, setServer] = useState<Server | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchServer = async () => {
      if (!uuidShort) return;

      try {
        setLoading(true);
        const { data } = await axios.get<{ success: boolean; data: Server }>(
          `/api/user/servers/${uuidShort}`
        );

        if (mounted && data.success) {
          setServer(data.data);
        }
      } catch (err) {
        if (mounted) {
          console.error("Failed to fetch server permissions:", err);
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchServer();

    return () => {
      mounted = false;
    };
  }, [uuidShort]);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      // 1. Global Admin
      if (hasGlobalPermission(PermissionsClass.ADMIN_ROOT)) return true;

      // 2. Wait for server data
      if (!server || !sessionUser) return false;

      // 3. Server Owner
      if (server.user_id === sessionUser.id) return true;

      // 4. Subuser Permissions
      if (server.is_subuser && server.subuser_permissions) {
        return server.subuser_permissions.includes(permission);
      }

      return false;
    },
    [server, sessionUser, hasGlobalPermission]
  );

  return {
    hasPermission,
    loading,
    error,
    server,
  };
}
