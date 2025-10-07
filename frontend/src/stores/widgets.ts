import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface Widget {
    id: string;
    name: string;
    component: string;
    enabled: boolean;
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
            order: 0,
            size: 'full',
        },
        {
            id: 'quick-stats',
            name: 'Quick Statistics',
            component: 'QuickStatsWidget',
            enabled: true,
            order: 1,
            size: 'full',
        },
        {
            id: 'security-alerts',
            name: 'Security Alerts',
            component: 'SecurityAlertsWidget',
            enabled: true,
            order: 2,
            size: 'full',
        },
        {
            id: 'quick-links',
            name: 'Quick Links',
            component: 'QuickLinksWidget',
            enabled: true,
            order: 3,
            size: 'full',
        },
        {
            id: 'system-health',
            name: 'System Health',
            component: 'SystemHealthWidget',
            enabled: true,
            order: 4,
            size: 'full',
        },
        {
            id: 'version-info',
            name: 'Version Information',
            component: 'VersionInfoWidget',
            enabled: true,
            order: 5,
            size: 'full',
        },
        {
            id: 'cron-status',
            name: 'Automation Tasks',
            component: 'CronStatusWidget',
            enabled: true,
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
            order: 0,
            size: 'full',
        },
        {
            id: 'quick-stats',
            name: 'Quick Statistics',
            component: 'QuickStatsWidget',
            enabled: true,
            order: 1,
            size: 'full',
        },
        {
            id: 'security-alerts',
            name: 'Security Alerts',
            component: 'SecurityAlertsWidget',
            enabled: true,
            order: 2,
            size: 'full',
        },
        {
            id: 'quick-links',
            name: 'Quick Links',
            component: 'QuickLinksWidget',
            enabled: true,
            order: 3,
            size: 'full',
        },
        {
            id: 'system-health',
            name: 'System Health',
            component: 'SystemHealthWidget',
            enabled: true,
            order: 4,
            size: 'full',
        },
        {
            id: 'version-info',
            name: 'Version Information',
            component: 'VersionInfoWidget',
            enabled: true,
            order: 5,
            size: 'full',
        },
        {
            id: 'cron-status',
            name: 'Automation Tasks',
            component: 'CronStatusWidget',
            enabled: true,
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
