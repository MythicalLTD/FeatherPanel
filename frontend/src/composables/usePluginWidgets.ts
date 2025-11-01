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

import { ref, computed } from 'vue';
import axios from 'axios';

export interface PluginWidget {
    id: string;
    plugin: string;
    pluginName: string;
    component: string;
    enabled: boolean;
    priority: number;
    size?: 'full' | 'half' | 'third' | 'quarter';
}

export interface WidgetsByLocation {
    [location: string]: PluginWidget[];
}

export interface WidgetsByPage {
    [page: string]: WidgetsByLocation;
}

const widgets = ref<WidgetsByPage>({});
const loading = ref(false);
const error = ref<string | null>(null);

/**
 * Fetch widgets from the backend API
 * @param page Optional page filter (e.g., 'server-console')
 */
export async function fetchWidgets(page?: string): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
        const params = page ? { page } : {};
        const response = await axios.get<{
            success: boolean;
            data: { widgets: WidgetsByPage };
        }>('/api/system/plugin-widgets', { params });

        if (response.data.success) {
            widgets.value = response.data.data.widgets;
        } else {
            error.value = 'Failed to load widgets';
        }
    } catch (err) {
        console.error('Error fetching widgets:', err);
        error.value = 'Failed to load widgets';
    } finally {
        loading.value = false;
    }
}

/**
 * Get widgets for a specific page and location
 * @param page Page identifier (e.g., 'server-console')
 * @param location Location identifier (e.g., 'under-server-info-cards')
 */
export function getWidgets(page: string, location: string): PluginWidget[] {
    return widgets.value[page]?.[location]?.filter((widget) => widget.enabled) || [];
}

/**
 * Composable function to use plugin widgets
 * @param page Page identifier to filter widgets
 */
export function usePluginWidgets(page?: string) {
    const widgetsForPage = computed(() => {
        if (!page) return widgets.value;
        return { [page]: widgets.value[page] || {} };
    });

    return {
        widgets: widgetsForPage,
        loading,
        error,
        fetchWidgets: () => fetchWidgets(page),
        getWidgets,
    };
}
