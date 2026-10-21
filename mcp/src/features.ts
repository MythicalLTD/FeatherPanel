import { FeatherPanelClient } from "./client.js";

export type PanelFeatures = {
  game: boolean;
  web: boolean;
  vds: boolean;
  tickets: boolean;
  knowledgebase: boolean;
};

/** Missing or empty settings values count as enabled; only literal "false" disables. */
export function isSettingEnabled(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") {
      return true;
    }
    return trimmed.toLowerCase() !== "false";
  }
  return true;
}

function featuresFromSettings(
  settings: Record<string, unknown> | undefined,
): PanelFeatures {
  const s = settings ?? {};
  return {
    game: isSettingEnabled(s.module_game_enabled),
    web: isSettingEnabled(s.module_web_enabled),
    vds: isSettingEnabled(s.module_vds_enabled),
    tickets: isSettingEnabled(s.ticket_system_enabled),
    knowledgebase: isSettingEnabled(s.knowledgebase_enabled),
  };
}

export const DEFAULT_PANEL_FEATURES: PanelFeatures = {
  game: true,
  web: true,
  vds: true,
  tickets: true,
  knowledgebase: true,
};

type PublicSettingsResponse = {
  settings?: Record<string, unknown>;
};

/** Fetch public panel settings and derive enabled MCP feature modules. */
export async function resolvePanelFeatures(
  client: FeatherPanelClient,
): Promise<PanelFeatures> {
  try {
    const data = await client.get<
      PublicSettingsResponse & Record<string, unknown>
    >("/api/system/settings");
    const settings =
      data.settings ??
      (typeof data === "object" && data !== null
        ? (data as Record<string, unknown>)
        : undefined);
    return featuresFromSettings(settings);
  } catch (error) {
    console.error(
      "FeatherPanel MCP: failed to load public settings; enabling all modules:",
      error instanceof Error ? error.message : error,
    );
    return { ...DEFAULT_PANEL_FEATURES };
  }
}

export function isFeatureEnabled(
  features: PanelFeatures | undefined,
  key: keyof PanelFeatures,
): boolean {
  if (!features) {
    return true;
  }
  return features[key];
}
