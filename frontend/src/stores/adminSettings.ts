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

import { defineStore } from 'pinia';
import axios from 'axios';

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
    value: boolean;
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

export interface Category {
    id: string;
    name: string;
    description: string;
    icon: string;
    settings_count: number;
}

export interface CategoryConfig {
    name: string;
    description: string;
    icon: string;
    settings: string[];
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

export interface CategoriesResponse {
    categories: Record<string, CategoryConfig>;
}

export interface CategorySettingsResponse {
    category: CategoryConfig;
    settings: Record<string, Setting>;
}

export const useAdminSettingsStore = defineStore('adminSettings', {
    state: () => ({
        settings: null as null | Record<string, Setting>,
        categories: [] as Category[],
        organizedSettings: null as null | OrganizedSettings,
        loading: false,
        saving: false,
        error: '',
        loaded: false,
    }),

    actions: {
        async fetchSettings() {
            try {
                this.loading = true;
                this.error = '';

                const response = await axios.get<{ success: boolean; data: SettingsResponse; message?: string }>(
                    '/api/admin/settings',
                );
                const data = response.data;

                if (data.success) {
                    this.settings = data.data.settings;
                    this.categories = Object.values(data.data.categories).map((cat: CategoryConfig) => ({
                        id: cat.name.toLowerCase().replace(/\s+/g, '_'),
                        name: cat.name,
                        description: cat.description,
                        icon: cat.icon,
                        settings_count: cat.settings.length,
                    }));
                    this.organizedSettings = data.data.organized_settings;
                    this.loaded = true;
                } else {
                    this.error = data.message || 'Failed to load settings';
                    this.loaded = false;
                }
            } catch (err: unknown) {
                console.error('Error fetching settings:', err);
                const error = err as { response?: { data?: { message?: string } } };
                this.error = error.response?.data?.message || 'Failed to load settings';
                this.loaded = false;
            } finally {
                this.loading = false;
            }
        },

        async saveSettings(settingsToUpdate: Record<string, string | number | boolean>) {
            try {
                this.saving = true;
                this.error = '';

                const response = await axios.patch<{ success: boolean; message?: string }>(
                    '/api/admin/settings',
                    settingsToUpdate,
                );
                const data = response.data;

                if (data.success) {
                    // Update the settings in the store
                    if (this.settings) {
                        Object.assign(this.settings, settingsToUpdate);
                    }
                    return { success: true, message: data.message };
                } else {
                    this.error = data.message || 'Failed to save settings';
                    return { success: false, message: this.error };
                }
            } catch (err: unknown) {
                console.error('Error saving settings:', err);
                const error = err as { response?: { data?: { message?: string } } };
                this.error = error.response?.data?.message || 'Failed to save settings';
                return { success: false, message: this.error };
            } finally {
                this.saving = false;
            }
        },

        async fetchCategories() {
            try {
                const response = await axios.get<{ success: boolean; data: CategoriesResponse }>(
                    '/api/admin/settings/categories',
                );
                const data = response.data;

                if (data.success) {
                    this.categories = Object.values(data.data.categories).map((cat: CategoryConfig) => ({
                        id: cat.name.toLowerCase().replace(/\s+/g, '_'),
                        name: cat.name,
                        description: cat.description,
                        icon: cat.icon,
                        settings_count: cat.settings.length,
                    }));
                }
            } catch (err: unknown) {
                console.error('Error fetching categories:', err);
            }
        },

        async fetchSettingsByCategory(category: string): Promise<CategorySettingsResponse> {
            try {
                const response = await axios.get<{
                    success: boolean;
                    data: CategorySettingsResponse;
                    message?: string;
                }>(`/api/admin/settings/category/${category}`);
                const data = response.data;

                if (data.success) {
                    return data.data;
                } else {
                    throw new Error(data.message || 'Failed to load category settings');
                }
            } catch (err: unknown) {
                console.error('Error fetching category settings:', err);
                throw err;
            }
        },

        resetSettings() {
            this.settings = null;
            this.categories = [];
            this.organizedSettings = null;
            this.loaded = false;
            this.error = '';
        },
    },

    getters: {
        getSettingsByCategory: (state) => (categoryId: string) => {
            if (!state.organizedSettings || !state.organizedSettings[categoryId]) {
                return null;
            }
            return state.organizedSettings[categoryId];
        },

        getCategoryById: (state) => (categoryId: string) => {
            return state.categories.find((cat) => cat.id === categoryId);
        },

        hasSettings: (state) => {
            return state.settings !== null && Object.keys(state.settings).length > 0;
        },

        getCategoriesWithSettings: (state) => {
            return state.categories.filter((cat) => cat.settings_count > 0);
        },
    },
});
