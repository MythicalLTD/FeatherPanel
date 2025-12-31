import { MetadataRoute } from "next";

import { settingsApi } from "@/lib/settings-api";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const data = await settingsApi.getPublicSettings();
  const settings = data?.settings;

  if (!settings || settings.app_pwa_enabled !== "true") {
    return {
      name: "FeatherPanel",
      short_name: "FeatherPanel",
      icons: [],
      start_url: "/",
      display: "browser",
      background_color: "#ffffff",
      theme_color: "#000000",
    };
  }

  return {
    name: settings.app_name || "FeatherPanel",
    short_name: settings.app_pwa_short_name || "FeatherPanel",
    description:
      settings.app_pwa_description || "Manage your game servers on the go.",
    start_url: "/",
    display: "standalone",
    background_color: settings.app_pwa_bg_color || "#ffffff",
    theme_color: settings.app_pwa_theme_color || "#000000",
    icons: [
      {
        src: settings.app_logo_dark || "/favicon.ico",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
