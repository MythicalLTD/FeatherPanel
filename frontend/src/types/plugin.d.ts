/**
 * Plugin System Type Definitions
 * Provides TypeScript support for plugin development
 */

export interface PluginManifest {
    name: string;
    version: string;
    description: string;
    author: string;
    homepage?: string;
    dependencies?: string[];
    permissions?: PluginPermission[];
}

export interface PluginPermission {
    type: 'dom' | 'storage' | 'network' | 'router';
    description: string;
    required: boolean;
}

export interface PluginContext {
    manifest: PluginManifest;
    api: typeof window.FeatherPanel.api;
    loader: typeof window.FeatherPanel.pluginLoader;
}

export interface PluginHooks {
    onLoad?: (context: PluginContext) => void | Promise<void>;
    onUnload?: (context: PluginContext) => void | Promise<void>;
    onRouteChange?: (
        to: Record<string, unknown>,
        from: Record<string, unknown>,
        context: PluginContext,
    ) => void | Promise<void>;
    onAppReady?: (context: PluginContext) => void | Promise<void>;
}

export interface FeatherPanelPlugin {
    manifest: PluginManifest;
    hooks: PluginHooks;
    initialize: (context: PluginContext) => void | Promise<void>;
    destroy?: () => void | Promise<void>;
}

// Import types from plugin services
import type { PluginAPI } from '../services/pluginAPI';
import type { pluginLoader } from '../services/pluginLoader';

// Global plugin registry
declare global {
    interface Window {
        FeatherPanel: Record<string, unknown> & {
            pluginLoader?: typeof pluginLoader;
            api?: PluginAPI;
            plugins?: Map<string, FeatherPanelPlugin>;
            registerPlugin?: (plugin: FeatherPanelPlugin) => void;
        };
    }
}
