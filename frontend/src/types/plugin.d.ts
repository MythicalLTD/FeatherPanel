/*
MIT License

Copyright (c) 2025 MythicalSystems and Contributors
Copyright (c) 2025 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

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
