/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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
