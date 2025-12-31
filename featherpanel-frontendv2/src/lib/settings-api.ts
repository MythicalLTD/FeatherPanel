import { SettingsResponse, AppSettings, CoreInfo } from "@/types/settings";

// Helper to determine base URL
export const getBaseUrl = () => {
  if (typeof window !== "undefined") return ""; // Client side, use relative path (proxied by Next.js)

  // Server-side: Use environment variable or default to Docker service name / localhost
  if (process.env.INTERNAL_API_URL) return process.env.INTERNAL_API_URL;
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;

  // Fallback for local development (matches next.config.ts)
  return "http://localhost:8721";
};

export const settingsApi = {
  getPublicSettings: async (): Promise<{
    settings: AppSettings;
    core: CoreInfo;
  } | null> => {
    try {
      const baseUrl = getBaseUrl();
      // If we are server side, we might need to use fetch directly or configure axios instance
      // Using fetch is safer for Next.js caching rules
      const res = await fetch(`${baseUrl}/api/system/settings`, {
        next: { revalidate: 60, tags: ["settings"] },
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (!res.ok) return null;

      const data: SettingsResponse = await res.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      return null;
    }
  },
};
