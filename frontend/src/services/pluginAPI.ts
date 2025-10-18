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
/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/**
 * Plugin API Service
 * Provides a safe API for plugins to interact with the FeatherPanel frontend
 */

import type { App } from 'vue';
import type { Router } from 'vue-router';
import { useToast } from 'vue-toastification';

export interface PluginAPI {
    // Core app references
    app: App | null;
    router: Router | null;

    // UI utilities
    toast: typeof useToast;

    // DOM utilities
    dom: {
        createElement: (tag: string, attributes?: Record<string, string>, content?: string) => HTMLElement;
        querySelector: (selector: string) => Element | null;
        querySelectorAll: (selector: string) => NodeListOf<Element>;
        addStylesheet: (css: string, id?: string) => HTMLStyleElement;
        removeStylesheet: (id: string) => void;
        injectHTML: (
            selector: string,
            html: string,
            position?: 'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend',
        ) => boolean;
    };

    // Event system
    events: {
        on: (event: string, callback: Function) => void;
        off: (event: string, callback: Function) => void;
        emit: (event: string, data?: any) => void;
    };

    // Storage utilities
    storage: {
        get: (key: string) => string | null;
        set: (key: string, value: string) => void;
        remove: (key: string) => void;
        clear: () => void;
    };

    // HTTP utilities
    http: {
        get: (url: string, options?: RequestInit) => Promise<Response>;
        post: (url: string, data?: any, options?: RequestInit) => Promise<Response>;
        put: (url: string, data?: any, options?: RequestInit) => Promise<Response>;
        delete: (url: string, options?: RequestInit) => Promise<Response>;
    };
}

class PluginAPIService implements PluginAPI {
    public app: App | null = null;
    public router: Router | null = null;
    public toast = useToast;

    private eventListeners: Map<string, Function[]> = new Map();

    constructor() {
        this.setupEventSystem();
    }

    /**
     * Initialize the plugin API with app and router references
     */
    initialize(app: App, router: Router) {
        this.app = app;
        this.router = router;
    }

    /**
     * DOM manipulation utilities
     */
    dom = {
        createElement: (tag: string, attributes: Record<string, string> = {}, content?: string): HTMLElement => {
            const element = document.createElement(tag);

            Object.entries(attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });

            if (content) {
                element.innerHTML = content;
            }

            return element;
        },

        querySelector: (selector: string) => document.querySelector(selector),

        querySelectorAll: (selector: string) => document.querySelectorAll(selector),

        addStylesheet: (css: string, id?: string): HTMLStyleElement => {
            const styleId = id || `plugin-style-${Date.now()}`;

            // Remove existing stylesheet with same ID
            const existing = document.getElementById(styleId);
            if (existing) {
                existing.remove();
            }

            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = css;
            document.head.appendChild(style);

            return style;
        },

        removeStylesheet: (id: string): void => {
            const element = document.getElementById(id);
            if (element) {
                element.remove();
            }
        },

        injectHTML: (
            selector: string,
            html: string,
            position: 'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend' = 'beforeend',
        ): boolean => {
            const target = document.querySelector(selector);
            if (!target) {
                console.warn(`Plugin API: Target element not found: ${selector}`);
                return false;
            }

            target.insertAdjacentHTML(position, html);
            return true;
        },
    };

    /**
     * Event system for plugin communication
     */
    private setupEventSystem() {
        // Listen for Vue router events
        if (typeof window !== 'undefined') {
            window.addEventListener('featherpanel:route-changed', (event: any) => {
                this.events.emit('route-changed', event.detail);
            });
        }
    }

    events = {
        on: (event: string, callback: Function): void => {
            if (!this.eventListeners.has(event)) {
                this.eventListeners.set(event, []);
            }
            this.eventListeners.get(event)!.push(callback);
        },

        off: (event: string, callback: Function): void => {
            const listeners = this.eventListeners.get(event);
            if (listeners) {
                const index = listeners.indexOf(callback);
                if (index > -1) {
                    listeners.splice(index, 1);
                }
            }
        },

        emit: (event: string, data?: any): void => {
            const listeners = this.eventListeners.get(event);
            if (listeners) {
                listeners.forEach((callback) => {
                    try {
                        callback(data);
                    } catch (error) {
                        console.error(`Plugin event callback error for '${event}':`, error);
                    }
                });
            }

            // Also emit as DOM event for cross-plugin communication
            if (typeof window !== 'undefined') {
                window.dispatchEvent(
                    new CustomEvent(`featherpanel:${event}`, {
                        detail: data,
                    }),
                );
            }
        },
    };

    /**
     * Storage utilities (localStorage wrapper with error handling)
     */
    storage = {
        get: (key: string): string | null => {
            try {
                return localStorage.getItem(`featherpanel_plugin_${key}`);
            } catch (error) {
                console.error('Plugin storage get error:', error);
                return null;
            }
        },

        set: (key: string, value: string): void => {
            try {
                localStorage.setItem(`featherpanel_plugin_${key}`, value);
            } catch (error) {
                console.error('Plugin storage set error:', error);
            }
        },

        remove: (key: string): void => {
            try {
                localStorage.removeItem(`featherpanel_plugin_${key}`);
            } catch (error) {
                console.error('Plugin storage remove error:', error);
            }
        },

        clear: (): void => {
            try {
                const keys = Object.keys(localStorage).filter((key) => key.startsWith('featherpanel_plugin_'));
                keys.forEach((key) => localStorage.removeItem(key));
            } catch (error) {
                console.error('Plugin storage clear error:', error);
            }
        },
    };

    /**
     * HTTP utilities with proper error handling
     */
    http = {
        get: async (url: string, options: RequestInit = {}): Promise<Response> => {
            return this.makeRequest('GET', url, undefined, options);
        },

        post: async (url: string, data?: any, options: RequestInit = {}): Promise<Response> => {
            return this.makeRequest('POST', url, data, options);
        },

        put: async (url: string, data?: any, options: RequestInit = {}): Promise<Response> => {
            return this.makeRequest('PUT', url, data, options);
        },

        delete: async (url: string, options: RequestInit = {}): Promise<Response> => {
            return this.makeRequest('DELETE', url, undefined, options);
        },
    };

    private async makeRequest(method: string, url: string, data?: any, options: RequestInit = {}): Promise<Response> {
        const config: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return response;
        } catch (error) {
            console.error(`Plugin HTTP ${method} error:`, error);
            throw error;
        }
    }
}

// Create singleton instance
export const pluginAPI = new PluginAPIService();

// Expose to global scope for plugins
if (typeof window !== 'undefined') {
    (window as any).FeatherPanel = (window as any).FeatherPanel || ({} as Record<string, unknown>);
    ((window as any).FeatherPanel as Record<string, unknown>).api = pluginAPI;
}
