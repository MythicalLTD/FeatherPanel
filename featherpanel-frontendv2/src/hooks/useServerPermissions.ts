import { useContext } from "react";
import { ServerContext } from "@/contexts/ServerContext";

// uuidShort is used to identify the server but we now get it from context.
// However, the hook signature expects it. I'll keep it as _uuidShort to silence linter.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useServerPermissions(_uuidShort: string) {
  // Attempt to consume the context
  const context = useContext(ServerContext);

  // If context exists, return it
  if (context) {
    return context;
  }

  // If we are NOT in a ServerProvider (e.g., Dashboard page), return a safe fallback.
  // This effectively means "no server selected, no permissions".
  // This avoids errors when useNavigation calls this hook on global pages.
  return {
    server: null,
    loading: false,
    error: null,
    refreshServer: async () => {},
    hasPermission: () => false,
  };
}
