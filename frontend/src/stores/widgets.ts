/*
MIT License

Copyright (c) 2025 MythicalSystems
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

import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface Widget {
    id: string;
    name: string;
    component: string;
    enabled: boolean;
    withBorders: boolean;
    order: number;
    size: 'small' | 'medium' | 'large' | 'full';
}

const WIDGET_VERSION = '2.0.0'; // Increment this when adding new widgets

export const useWidgetsStore = defineStore('widgets', () => {
    const widgets = ref<Widget[]>([
        {
            id: 'welcome',
            name: 'Welcome & Quick Actions',
            component: 'WelcomeWidget',
            enabled: true,
            withBorders: true,
            order: 0,
            size: 'full',
        },
        {
            id: 'quick-stats',
            name: 'Quick Statistics',
            component: 'QuickStatsWidget',
            enabled: true,
            withBorders: true,
            order: 1,
            size: 'full',
        },
        {
            id: 'security-alerts',
            name: 'Security Alerts',
            component: 'SecurityAlertsWidget',
            enabled: true,
            withBorders: false,
            order: 2,
            size: 'full',
        },
        {
            id: 'quick-links',
            name: 'Quick Links',
            component: 'QuickLinksWidget',
            enabled: true,
            withBorders: true,
            order: 3,
            size: 'full',
        },
        {
            id: 'system-health',
            name: 'System Health',
            component: 'SystemHealthWidget',
            enabled: true,
            withBorders: true,
            order: 4,
            size: 'full',
        },
        {
            id: 'version-info',
            name: 'Version Information',
            component: 'VersionInfoWidget',
            enabled: true,
            withBorders: true,
            order: 5,
            size: 'full',
        },
        {
            id: 'cron-status',
            name: 'Automation Tasks',
            component: 'CronStatusWidget',
            enabled: true,
            withBorders: true,
            order: 6,
            size: 'full',
        },
    ]);

    const isCustomizing = ref(false);

    // Default widgets configuration
    const defaultWidgets: Widget[] = [
        {
            id: 'welcome',
            name: 'Welcome & Quick Actions',
            component: 'WelcomeWidget',
            enabled: true,
            withBorders: true,
            order: 0,
            size: 'full',
        },
        {
            id: 'quick-stats',
            name: 'Quick Statistics',
            component: 'QuickStatsWidget',
            enabled: true,
            withBorders: true,
            order: 1,
            size: 'full',
        },
        {
            id: 'security-alerts',
            name: 'Security Alerts',
            component: 'SecurityAlertsWidget',
            enabled: true,
            withBorders: false,
            order: 2,
            size: 'full',
        },
        {
            id: 'quick-links',
            name: 'Quick Links',
            component: 'QuickLinksWidget',
            enabled: true,
            withBorders: true,
            order: 3,
            size: 'full',
        },
        {
            id: 'system-health',
            name: 'System Health',
            component: 'SystemHealthWidget',
            enabled: true,
            withBorders: true,
            order: 4,
            size: 'full',
        },
        {
            id: 'version-info',
            name: 'Version Information',
            component: 'VersionInfoWidget',
            enabled: true,
            withBorders: true,
            order: 5,
            size: 'full',
        },
        {
            id: 'cron-status',
            name: 'Automation Tasks',
            component: 'CronStatusWidget',
            enabled: true,
            withBorders: true,
            order: 6,
            size: 'full',
        },
    ];

    // Load from localStorage
    const loadWidgets = () => {
        const savedVersion = localStorage.getItem('dashboard-widgets-version');
        const saved = localStorage.getItem('dashboard-widgets');

        // Force reset if version mismatch or corrupted data
        if (savedVersion !== WIDGET_VERSION) {
            console.log('Widget version mismatch, resetting to defaults');
            widgets.value = [...defaultWidgets];
            localStorage.setItem('dashboard-widgets-version', WIDGET_VERSION);
            saveWidgets();
            return;
        }

        if (saved) {
            try {
                const parsed = JSON.parse(saved) as Widget[];

                // Merge saved widgets with default widgets
                // This ensures new widgets are added when they don't exist
                const savedIds = new Set(parsed.map((w) => w.id));
                const newWidgets = defaultWidgets.filter((w) => !savedIds.has(w.id));

                // Combine and sort
                widgets.value = [...parsed, ...newWidgets].sort((a, b) => a.order - b.order);

                // Re-index order
                widgets.value = widgets.value.map((w, index) => ({ ...w, order: index }));

                // Save the merged result
                saveWidgets();
            } catch (e) {
                console.error('Failed to load widgets from localStorage', e);
                widgets.value = defaultWidgets;
            }
        }
    };

    // Save to localStorage
    const saveWidgets = () => {
        localStorage.setItem('dashboard-widgets', JSON.stringify(widgets.value));
    };

    const toggleWidget = (id: string) => {
        const widget = widgets.value.find((w) => w.id === id);
        if (widget) {
            widget.enabled = !widget.enabled;
            saveWidgets();
        }
    };

    const reorderWidgets = (newOrder: Widget[]) => {
        widgets.value = newOrder.map((w, index) => ({ ...w, order: index }));
        saveWidgets();
    };

    const resetWidgets = () => {
        widgets.value = [...defaultWidgets];
        saveWidgets();
    };

    const toggleCustomizing = () => {
        isCustomizing.value = !isCustomizing.value;
    };

    return {
        widgets,
        isCustomizing,
        loadWidgets,
        saveWidgets,
        toggleWidget,
        reorderWidgets,
        resetWidgets,
        toggleCustomizing,
    };
});
