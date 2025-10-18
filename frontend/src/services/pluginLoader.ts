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

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Plugin Loader Service
 * Handles loading of plugin CSS and JavaScript files from the backend
 */

export interface PluginLoadResult {
    success: boolean;
    error?: string;
    type: 'css' | 'js';
}

class PluginLoaderService {
    private loadedResources: Set<string> = new Set();
    private retryCount = 3;
    private retryDelay = 1000;

    /**
     * Load plugin CSS from the backend
     */
    async loadPluginCSS(): Promise<PluginLoadResult> {
        const cssUrl = '/api/system/plugin-css';

        if (this.loadedResources.has(cssUrl)) {
            return { success: true, type: 'css' };
        }

        try {
            // Check if CSS is available first
            const response = await fetch(cssUrl, { method: 'HEAD' });
            if (!response.ok) {
                throw new Error(`CSS endpoint returned ${response.status}`);
            }

            // Create and inject CSS link
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = cssUrl;
            cssLink.type = 'text/css';

            return new Promise((resolve) => {
                cssLink.onload = () => {
                    this.loadedResources.add(cssUrl);
                    resolve({ success: true, type: 'css' });
                };

                cssLink.onerror = () => {
                    console.error('❌ Failed to load plugin CSS');
                    resolve({
                        success: false,
                        error: 'Failed to load CSS file',
                        type: 'css',
                    });
                };

                document.head.appendChild(cssLink);
            });
        } catch (error) {
            console.error('❌ Plugin CSS loading error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                type: 'css',
            };
        }
    }

    /**
     * Load plugin JavaScript from the backend
     */
    async loadPluginJS(): Promise<PluginLoadResult> {
        const jsUrl = '/api/system/plugin-js';

        if (this.loadedResources.has(jsUrl)) {
            return { success: true, type: 'js' };
        }

        try {
            // Check if JS is available first
            const response = await fetch(jsUrl, { method: 'HEAD' });
            if (!response.ok) {
                throw new Error(`JS endpoint returned ${response.status}`);
            }

            // Create and inject JS script
            const script = document.createElement('script');
            script.src = jsUrl;
            script.type = 'application/javascript';
            script.async = true;

            return new Promise((resolve) => {
                script.onload = () => {
                    this.loadedResources.add(jsUrl);

                    // Emit a custom event for plugins to hook into
                    window.dispatchEvent(
                        new CustomEvent('featherpanel:plugins:loaded', {
                            detail: { type: 'js' },
                        }),
                    );

                    resolve({ success: true, type: 'js' });
                };

                script.onerror = () => {
                    console.error('❌ Failed to load plugin JavaScript');
                    resolve({
                        success: false,
                        error: 'Failed to load JS file',
                        type: 'js',
                    });
                };

                document.head.appendChild(script);
            });
        } catch (error) {
            console.error('❌ Plugin JavaScript loading error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                type: 'js',
            };
        }
    }

    /**
     * Load all plugin resources with retry logic
     */
    async loadAllPlugins(options: { retries?: number; delay?: number } = {}): Promise<PluginLoadResult[]> {
        const retries = options.retries ?? this.retryCount;
        const delay = options.delay ?? this.retryDelay;

        const loadWithRetry = async (
            loadFn: () => Promise<PluginLoadResult>,
            attempts = 0,
        ): Promise<PluginLoadResult> => {
            const result = await loadFn();

            if (!result.success && attempts < retries) {
                console.log(`🔄 Retrying ${result.type} load (attempt ${attempts + 1}/${retries})`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                return loadWithRetry(loadFn, attempts + 1);
            }

            return result;
        };

        const results = await Promise.all([
            loadWithRetry(() => this.loadPluginCSS()),
            loadWithRetry(() => this.loadPluginJS()),
        ]);

        const successCount = results.filter((r) => r.success).length;
        console.log(`🔌 Plugin loading completed: ${successCount}/${results.length} successful`);

        // Emit completion event
        window.dispatchEvent(
            new CustomEvent('featherpanel:plugins:all-loaded', {
                detail: { results },
            }),
        );

        return results;
    }

    /**
     * Reload plugin resources (useful for development)
     */
    async reloadPlugins(): Promise<PluginLoadResult[]> {
        // Clear loaded resources cache
        this.loadedResources.clear();

        // Remove existing plugin resources
        const existingCSS = document.querySelector('link[href*="/api/system/plugin-css"]');
        const existingJS = document.querySelector('script[src*="/api/system/plugin-js"]');

        if (existingCSS) existingCSS.remove();
        if (existingJS) existingJS.remove();

        return this.loadAllPlugins();
    }

    /**
     * Check if plugins are loaded
     */
    isLoaded(type?: 'css' | 'js'): boolean {
        if (type === 'css') {
            return this.loadedResources.has('/api/system/plugin-css');
        }
        if (type === 'js') {
            return this.loadedResources.has('/api/system/plugin-js');
        }
        return this.loadedResources.has('/api/system/plugin-css') && this.loadedResources.has('/api/system/plugin-js');
    }
}

// Create singleton instance
export const pluginLoader = new PluginLoaderService();

// Expose to global scope for plugins
if (typeof window !== 'undefined') {
    (window as any).FeatherPanel = (window as any).FeatherPanel || {};
    (window as any).FeatherPanel.pluginLoader = pluginLoader;
}
