/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

import axios from 'axios';

// Setting Types
export interface BaseSetting {
    name: string;
    description: string;
    type: 'text' | 'select' | 'textarea' | 'toggle' | 'number' | 'password';
    required: boolean;
    placeholder: string;
    validation: string;
    category: string;
    sensitive?: boolean;
}

export interface TextSetting extends BaseSetting {
    type: 'text';
    value: string;
    options: string[];
}

export interface SelectSetting extends BaseSetting {
    type: 'select';
    value: string;
    options: string[];
}

export interface TextareaSetting extends BaseSetting {
    type: 'textarea';
    value: string;
    options: string[];
}

export interface ToggleSetting extends BaseSetting {
    type: 'toggle';
    value: boolean; // API might return "true"/"false" strings sometimes, but let's try to stick to boolean or handle conversion
    options: string[];
}

export interface NumberSetting extends BaseSetting {
    type: 'number';
    value: number;
    options: string[];
}

export interface PasswordSetting extends BaseSetting {
    type: 'password';
    value: string;
    options: string[];
    sensitive: true;
}

export type Setting = TextSetting | SelectSetting | TextareaSetting | ToggleSetting | NumberSetting | PasswordSetting;

// Category Types
export interface CategoryConfig {
    name: string;
    description: string;
    icon: string;
    settings: string[];
}

export interface Category {
    id: string;
    name: string;
    description: string;
    icon: string;
    settings_count: number;
}

export interface OrganizedSettings {
    [category: string]: {
        category: CategoryConfig;
        settings: {
            [key: string]: Setting;
        };
    };
}

export interface SettingsResponse {
    settings: Record<string, Setting>;
    categories: Record<string, CategoryConfig>;
    organized_settings: OrganizedSettings;
}

// API Functions
export const adminSettingsApi = {
    fetchSettings: async () => {
        const { data } = await axios.get<{ success: boolean; data: SettingsResponse; message?: string }>(
            '/api/admin/settings',
        );
        return data;
    },

    updateSettings: async (settings: Record<string, string | number | boolean>) => {
        const { data } = await axios.patch<{ success: boolean; message?: string }>('/api/admin/settings', settings);
        return data;
    },

    uploadLogs: async () => {
        const { data } = await axios.post<{
            success: boolean;
            data: {
                web: { success: boolean; id?: string; url?: string; raw?: string; error?: string };
                app: { success: boolean; id?: string; url?: string; raw?: string; error?: string };
            };
            message?: string;
        }>('/api/admin/log-viewer/upload');
        return data;
    },
};
