<template>
    <div class="space-y-6">
        <!-- Plugin Widgets: Appearance Tab Top -->
        <WidgetRenderer v-if="widgetsTop.length > 0" :widgets="widgetsTop" />

        <div>
            <h3 class="text-lg font-semibold">{{ $t('account.appearanceSettings') }}</h3>
            <p class="text-sm text-muted-foreground">{{ $t('account.appearanceSettingsDescription') }}</p>
        </div>

        <!-- Theme Settings -->
        <div class="space-y-4">
            <h4 class="text-base font-semibold">{{ $t('account.themeSettings') }}</h4>

            <!-- Theme Toggle -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div class="space-y-1 flex-1">
                    <p class="text-sm font-medium">{{ $t('account.darkMode') }}</p>
                    <p class="text-xs text-muted-foreground">{{ $t('account.darkModeDescription') }}</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    class="w-full sm:w-auto flex items-center justify-center gap-2"
                    data-umami-event="Toggle theme"
                    @click="handleToggleTheme"
                >
                    <Sun v-if="isDark" class="h-4 w-4" />
                    <Moon v-else class="h-4 w-4" />
                    {{ isDark ? $t('account.lightMode') : $t('account.darkMode') }}
                </Button>
            </div>
        </div>

        <!-- Background Settings -->
        <div class="space-y-4">
            <h4 class="text-base font-semibold">{{ $t('account.backgroundSettings') }}</h4>

            <!-- Light Mode Warning -->
            <div v-if="!isDark" class="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <div class="flex items-start gap-3">
                    <Sun class="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                    <div class="space-y-1">
                        <p class="text-sm font-medium text-orange-600 dark:text-orange-400">
                            {{ $t('account.backgroundDisabledInLightMode') }}
                        </p>
                        <p class="text-xs text-muted-foreground">
                            {{ $t('account.backgroundDisabledDescription') }}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Preset Backgrounds -->
            <div class="space-y-3" :class="{ 'opacity-50 pointer-events-none': !isDark }">
                <label class="text-sm font-medium">{{ $t('background.presets') }}</label>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <button
                        v-for="preset in presetBackgrounds"
                        :key="preset.id"
                        :disabled="!isDark"
                        class="relative group aspect-video rounded-md overflow-hidden border-2 transition-all duration-200 hover:scale-105 touch-manipulation"
                        :class="[
                            currentBackground === preset.url
                                ? 'border-primary'
                                : 'border-border hover:border-primary/50',
                            !isDark && 'cursor-not-allowed',
                        ]"
                        @click="isDark && selectPreset(preset)"
                    >
                        <img
                            :src="preset.id === 'none' ? preset.placeholder : preset.url"
                            :alt="preset.name"
                            class="w-full h-full object-cover"
                        />
                        <div
                            class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200"
                        />
                        <span class="absolute bottom-1 left-1 text-xs text-white font-medium bg-black/50 px-1 rounded">
                            {{ preset.name }}
                        </span>
                    </button>
                </div>
            </div>

            <!-- Custom Background Upload -->
            <div class="space-y-2" :class="{ 'opacity-50 pointer-events-none': !isDark }">
                <label class="text-sm font-medium">{{ $t('background.custom') }}</label>
                <input
                    ref="fileInput"
                    type="file"
                    accept="image/*"
                    class="hidden"
                    :disabled="!isDark"
                    @change="handleFileUpload"
                />
                <Button variant="outline" size="sm" class="w-full" :disabled="!isDark" @click="fileInput?.click()">
                    <Upload class="h-4 w-4 mr-2" />
                    {{ $t('background.uploadImage') }}
                </Button>
            </div>

            <!-- Background Settings -->
            <div class="space-y-4" :class="{ 'opacity-50 pointer-events-none': !isDark }">
                <div class="space-y-2">
                    <label class="text-sm font-medium">{{ $t('background.opacity') }}</label>
                    <div class="flex items-center gap-3">
                        <input
                            v-model="backgroundOpacity"
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            class="flex-1"
                            :disabled="!isDark"
                            @input="handleBackgroundOpacityChange"
                        />
                        <span class="text-sm text-muted-foreground w-12">{{ backgroundOpacity }}%</span>
                    </div>
                </div>

                <div class="space-y-2">
                    <label class="text-sm font-medium">{{ $t('background.blur') }}</label>
                    <div class="flex items-center gap-3">
                        <input
                            v-model="backgroundBlur"
                            type="range"
                            min="0"
                            max="20"
                            step="1"
                            class="flex-1"
                            :disabled="!isDark"
                            @input="handleBackgroundBlurChange"
                        />
                        <span class="text-sm text-muted-foreground w-12">{{ backgroundBlur }}px</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Language Settings -->
        <div class="space-y-4">
            <h4 class="text-base font-semibold">{{ $t('account.languageSettings') }}</h4>

            <div class="space-y-3">
                <div class="space-y-2">
                    <label class="text-sm font-medium">{{ $t('account.selectLanguage') }}</label>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                            v-for="language in availableLanguages"
                            :key="language.code"
                            class="flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 touch-manipulation"
                            :class="[
                                currentLanguage?.code === language.code
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50',
                            ]"
                            :data-umami-event="`Change language to ${language.name}`"
                            @click="handleLanguageChange(language)"
                        >
                            <span class="text-2xl shrink-0">{{ language.flag }}</span>
                            <div class="text-left flex-1">
                                <p class="text-sm font-medium">{{ language.name }}</p>
                                <p class="text-xs text-muted-foreground">{{ language.code.toUpperCase() }}</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Sidebar Settings -->
        <div class="space-y-4">
            <h4 class="text-base font-semibold">{{ $t('account.sidebarSettings') }}</h4>

            <div class="space-y-3">
                <div class="space-y-2">
                    <label class="text-sm font-medium">{{ $t('account.sidebarVisibility') }}</label>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                            v-for="option in sidebarOptions"
                            :key="option.value"
                            class="flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 touch-manipulation"
                            :class="[
                                sidebarVisibility === option.value
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50',
                                isReloading ? 'opacity-50 cursor-not-allowed' : '',
                            ]"
                            :disabled="isReloading"
                            :data-umami-event="`Change sidebar to ${option.label}`"
                            @click="updateSidebarVisibility(option.value)"
                        >
                            <component :is="option.icon" class="h-6 w-6" />
                            <span class="text-sm font-medium text-center">{{ option.label }}</span>
                        </button>
                    </div>
                    <p class="text-xs text-muted-foreground">
                        {{ $t('account.sidebarReloadNote') }}
                    </p>
                    <div v-if="isReloading" class="flex items-center gap-2 text-xs text-primary">
                        <div
                            class="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full"
                        ></div>
                        {{ $t('account.reloading') }}
                    </div>
                </div>
            </div>
        </div>

        <!-- Dock Settings -->
        <div class="space-y-4">
            <h4 class="text-base font-semibold">{{ $t('account.dockSettings') }}</h4>

            <div class="space-y-3">
                <div class="space-y-2">
                    <Label for="dock-visible">{{ $t('account.showDock') }}</Label>
                    <Select
                        :model-value="showDock ? 'enabled' : 'disabled'"
                        @update:model-value="handleDockVisibilityChange"
                    >
                        <SelectTrigger id="dock-visible">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="enabled">
                                <div class="flex items-center gap-2">
                                    <Eye class="h-4 w-4" />
                                    {{ $t('common.enable') }}
                                </div>
                            </SelectItem>
                            <SelectItem value="disabled">
                                <div class="flex items-center gap-2">
                                    <EyeOff class="h-4 w-4" />
                                    {{ $t('common.disable') }}
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    <p class="text-xs text-muted-foreground">{{ $t('account.showDockDescription') }}</p>
                </div>

                <div v-if="showDock" class="space-y-2">
                    <label class="text-sm font-medium">{{ $t('account.dockSize') }}</label>
                    <div class="flex items-center gap-3">
                        <input
                            v-model="dockSize"
                            type="range"
                            min="40"
                            max="80"
                            step="5"
                            class="flex-1"
                            @input="updateDockSize"
                        />
                        <span class="text-sm text-muted-foreground w-12">{{ dockSize }}px</span>
                    </div>
                </div>

                <div v-if="showDock" class="space-y-2">
                    <label class="text-sm font-medium">{{ $t('account.dockOpacity') }}</label>
                    <div class="flex items-center gap-3">
                        <input
                            v-model="dockOpacity"
                            type="range"
                            min="10"
                            max="100"
                            step="5"
                            class="flex-1"
                            @input="updateDockOpacity"
                        />
                        <span class="text-sm text-muted-foreground w-12">{{ dockOpacity }}%</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Custom Context Menu Settings -->
        <div class="space-y-4">
            <h4 class="text-base font-semibold">{{ $t('account.customContextMenuSettings') }}</h4>

            <div class="space-y-4">
                <!-- Enable/Disable Context Menu -->
                <div class="space-y-2">
                    <Label for="context-menu-enabled">{{ $t('account.enableCustomContextMenu') }}</Label>
                    <Select
                        :model-value="customContextMenuEnabled ? 'enabled' : 'disabled'"
                        @update:model-value="handleContextMenuChange"
                    >
                        <SelectTrigger id="context-menu-enabled">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="enabled">
                                <div class="flex items-center gap-2">
                                    <Eye class="h-4 w-4" />
                                    {{ $t('common.enable') }}
                                </div>
                            </SelectItem>
                            <SelectItem value="disabled">
                                <div class="flex items-center gap-2">
                                    <EyeOff class="h-4 w-4" />
                                    {{ $t('common.disable') }}
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    <p class="text-xs text-muted-foreground">{{ $t('account.customContextMenuDescription') }}</p>
                </div>

                <!-- Context Menu Options (only show when enabled) -->
                <div v-if="customContextMenuEnabled" class="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
                    <!-- Show Navigation Actions -->
                    <div class="space-y-2">
                        <Label for="context-menu-nav">{{ $t('account.showNavigationActions') }}</Label>
                        <Select
                            :model-value="contextMenuShowNavigation ? 'show' : 'hide'"
                            @update:model-value="handleContextMenuNavigationChange"
                        >
                            <SelectTrigger id="context-menu-nav">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="show">
                                    <div class="flex items-center gap-2">
                                        <Eye class="h-4 w-4" />
                                        {{ $t('common.show') }}
                                    </div>
                                </SelectItem>
                                <SelectItem value="hide">
                                    <div class="flex items-center gap-2">
                                        <EyeOff class="h-4 w-4" />
                                        {{ $t('common.hide') }}
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p class="text-xs text-muted-foreground">{{ $t('account.navigationActionsDescription') }}</p>
                    </div>

                    <!-- Show Clipboard Actions -->
                    <div class="space-y-2">
                        <Label for="context-menu-clipboard">{{ $t('account.showClipboardActions') }}</Label>
                        <Select
                            :model-value="contextMenuShowClipboard ? 'show' : 'hide'"
                            @update:model-value="handleContextMenuClipboardChange"
                        >
                            <SelectTrigger id="context-menu-clipboard">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="show">
                                    <div class="flex items-center gap-2">
                                        <Eye class="h-4 w-4" />
                                        {{ $t('common.show') }}
                                    </div>
                                </SelectItem>
                                <SelectItem value="hide">
                                    <div class="flex items-center gap-2">
                                        <EyeOff class="h-4 w-4" />
                                        {{ $t('common.hide') }}
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p class="text-xs text-muted-foreground">{{ $t('account.clipboardActionsDescription') }}</p>
                    </div>

                    <!-- Show Quick Actions -->
                    <div class="space-y-2">
                        <Label for="context-menu-quick">{{ $t('account.showQuickActions') }}</Label>
                        <Select
                            :model-value="contextMenuShowQuickActions ? 'show' : 'hide'"
                            @update:model-value="handleContextMenuQuickActionsChange"
                        >
                            <SelectTrigger id="context-menu-quick">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="show">
                                    <div class="flex items-center gap-2">
                                        <Eye class="h-4 w-4" />
                                        {{ $t('common.show') }}
                                    </div>
                                </SelectItem>
                                <SelectItem value="hide">
                                    <div class="flex items-center gap-2">
                                        <EyeOff class="h-4 w-4" />
                                        {{ $t('common.hide') }}
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p class="text-xs text-muted-foreground">{{ $t('account.quickActionsDescription') }}</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Reset Button -->
        <div class="pt-4 border-t border-border">
            <Button
                variant="outline"
                class="w-full"
                data-umami-event="Reset appearance settings"
                @click="resetAllSettings"
            >
                <RotateCcw class="h-4 w-4 mr-2" />
                {{ $t('account.resetAppearance') }}
            </Button>
        </div>

        <!-- Plugin Widgets: Appearance Tab Bottom -->
        <WidgetRenderer v-if="widgetsBottom.length > 0" :widgets="widgetsBottom" />
    </div>
</template>

<script setup lang="ts">
// MIT License
//
// Copyright (c) 2025 MythicalSystems
// Copyright (c) 2025 Cassian Gherman (NaysKutzu)
// Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { computed, ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Sun, Moon, Upload, RotateCcw, Eye, EyeOff, PanelLeft } from 'lucide-vue-next';
import { useTheme } from '@/composables/useTheme';
import { useLanguage } from '@/composables/useLanguage';
import { useSidebarState, type SidebarVisibility } from '@/composables/useSidebarState';
import { useBackground } from '@/composables/useBackground';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';

const { t: $t } = useI18n();
const { isDark, toggleTheme, setTheme } = useTheme();
const { currentLanguage, availableLanguages, changeLanguage } = useLanguage();
const { sidebarVisibility, updateSidebarVisibility: originalUpdateSidebarVisibility } = useSidebarState();
const {
    currentBackground,
    backgroundOpacity,
    backgroundBlur,
    setBackground,
    setBackgroundOpacity,
    setBackgroundBlur,
    resetBackground,
} = useBackground();

// Custom sidebar visibility update with loading state
const updateSidebarVisibility = (visibility: SidebarVisibility) => {
    const previousVisibility = sidebarVisibility.value;

    // Show loading state if switching to/from hidden
    if (visibility === 'hidden' || previousVisibility === 'hidden') {
        isReloading.value = true;
    }

    originalUpdateSidebarVisibility(visibility);
    // Auto-sync will handle backend update every 5 minutes
};

// File input ref
const fileInput = ref<HTMLInputElement | null>(null);

// Dock state
const showDock = ref(false);
const dockSize = ref(48);
const dockOpacity = ref(80);

// Custom context menu state
const customContextMenuEnabled = ref(false);
const contextMenuShowNavigation = ref(true);
const contextMenuShowClipboard = ref(true);
const contextMenuShowQuickActions = ref(true);

// Loading state for sidebar changes
const isReloading = ref(false);

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('account');
const widgetsTop = computed(() => getWidgets('account', 'appearance-top'));
const widgetsBottom = computed(() => getWidgets('account', 'appearance-bottom'));

// Sidebar options
const sidebarOptions = [
    {
        value: 'visible' as SidebarVisibility,
        label: $t('account.sidebarVisible'),
        icon: Eye,
    },
    {
        value: 'collapsed' as SidebarVisibility,
        label: $t('account.sidebarCollapsed'),
        icon: PanelLeft,
    },
    {
        value: 'hidden' as SidebarVisibility,
        label: $t('account.sidebarHidden'),
        icon: EyeOff,
    },
];

// Preset backgrounds
const presetBackgrounds = [
    {
        id: 'none',
        name: 'None',
        url: '',
        placeholder:
            'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA4MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg2MFY0MEgyMFYyMFoiIGZpbGw9IiNFNUU3RUIiLz4KPHBhdGggZD0iTTMwIDMwSDUwVjQwSDMwVjMwWiIgZmlsbD0iI0QxRDVEMiIvPgo8L3N2Zz4K',
    },
    {
        id: 'gaming',
        name: 'Gaming',
        url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=600&fit=crop',
    },
    {
        id: 'server',
        name: 'Server',
        url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=600&fit=crop',
    },
    {
        id: 'abstract',
        name: 'Abstract',
        url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=600&fit=crop',
    },
    {
        id: 'space',
        name: 'Space',
        url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop',
    },
    {
        id: 'minecraft',
        name: 'Minecraft',
        url: 'https://cdn.mythical.systems/mc.jpg',
    },
    {
        id: 'mountains',
        name: 'Mountains',
        url: 'https://cdn.mythical.systems/background.jpg',
    },
    {
        id: 'animated',
        name: 'Animated',
        url: 'https://cdn.mythical.systems/background.gif',
    },
];

// Load settings from localStorage
const loadSettings = () => {
    // Dock settings
    const savedShowDock = localStorage.getItem('dock-visible');
    const savedDockSize = localStorage.getItem('dock-size');
    const savedDockOpacity = localStorage.getItem('dock-opacity');

    if (savedShowDock !== null) {
        showDock.value = savedShowDock === 'true';
    } else {
        // Default to disabled
        showDock.value = false;
    }
    updateDockVisibility(showDock.value);

    if (savedDockSize) {
        dockSize.value = parseInt(savedDockSize);
        updateDockSize();
    }

    if (savedDockOpacity) {
        dockOpacity.value = parseInt(savedDockOpacity);
        updateDockOpacity();
    }

    // Custom context menu settings (default: disabled)
    const savedCustomContextMenu = localStorage.getItem('custom-context-menu-enabled');
    if (savedCustomContextMenu !== null) {
        customContextMenuEnabled.value = savedCustomContextMenu === 'true';
    } else {
        customContextMenuEnabled.value = false;
    }

    const savedShowNavigation = localStorage.getItem('context-menu-show-navigation');
    if (savedShowNavigation !== null) {
        contextMenuShowNavigation.value = savedShowNavigation === 'true';
    }

    const savedShowClipboard = localStorage.getItem('context-menu-show-clipboard');
    if (savedShowClipboard !== null) {
        contextMenuShowClipboard.value = savedShowClipboard === 'true';
    }

    const savedShowQuickActions = localStorage.getItem('context-menu-show-quick-actions');
    if (savedShowQuickActions !== null) {
        contextMenuShowQuickActions.value = savedShowQuickActions === 'true';
    }
};

// Handle dock visibility change from select
const handleDockVisibilityChange = (value: string | number | boolean | bigint | Record<string, unknown> | null) => {
    if (typeof value === 'string') {
        const enabled = value === 'enabled';
        showDock.value = enabled;
        updateDockVisibility(enabled);
    }
};

// Handle context menu change from select
const handleContextMenuChange = (value: string | number | boolean | bigint | Record<string, unknown> | null) => {
    if (typeof value === 'string') {
        updateCustomContextMenuEnabled(value === 'enabled');
    }
};

// Handle context menu navigation visibility
const handleContextMenuNavigationChange = (
    value: string | number | boolean | bigint | Record<string, unknown> | null,
) => {
    if (typeof value === 'string') {
        contextMenuShowNavigation.value = value === 'show';
        localStorage.setItem('context-menu-show-navigation', (value === 'show').toString());
        window.dispatchEvent(
            new CustomEvent('context-menu-options-change', {
                detail: {
                    showNavigation: value === 'show',
                    showClipboard: contextMenuShowClipboard.value,
                    showQuickActions: contextMenuShowQuickActions.value,
                },
            }),
        );
    }
};

// Handle context menu clipboard visibility
const handleContextMenuClipboardChange = (
    value: string | number | boolean | bigint | Record<string, unknown> | null,
) => {
    if (typeof value === 'string') {
        contextMenuShowClipboard.value = value === 'show';
        localStorage.setItem('context-menu-show-clipboard', (value === 'show').toString());
        window.dispatchEvent(
            new CustomEvent('context-menu-options-change', {
                detail: {
                    showNavigation: contextMenuShowNavigation.value,
                    showClipboard: value === 'show',
                    showQuickActions: contextMenuShowQuickActions.value,
                },
            }),
        );
    }
};

// Handle context menu quick actions visibility
const handleContextMenuQuickActionsChange = (
    value: string | number | boolean | bigint | Record<string, unknown> | null,
) => {
    if (typeof value === 'string') {
        contextMenuShowQuickActions.value = value === 'show';
        localStorage.setItem('context-menu-show-quick-actions', (value === 'show').toString());
        window.dispatchEvent(
            new CustomEvent('context-menu-options-change', {
                detail: {
                    showNavigation: contextMenuShowNavigation.value,
                    showClipboard: contextMenuShowClipboard.value,
                    showQuickActions: value === 'show',
                },
            }),
        );
    }
};

// Theme functions (using shared theme composable)
const { applyTheme } = useTheme();

// Wrapped theme toggle
const handleToggleTheme = () => {
    toggleTheme();
    // Auto-sync will handle backend update every 5 minutes
};

// Wrapped language change
const handleLanguageChange = (language: { code: string; name: string; flag: string }) => {
    changeLanguage(language);
    // Auto-sync will handle backend update every 5 minutes
};

// Background functions
const selectPreset = (preset: { id: string; name: string; url: string; placeholder?: string }) => {
    const url = preset.id === 'none' ? '' : preset.url;
    setBackground(url);
    // Auto-sync will handle backend update every 5 minutes
};

const handleFileUpload = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            setBackground(result);
            // Auto-sync will handle backend update every 5 minutes
        };
        reader.readAsDataURL(file);
    }

    if (target) target.value = '';
};

const handleBackgroundOpacityChange = () => {
    setBackgroundOpacity(backgroundOpacity.value);
    // Auto-sync will handle backend update every 5 minutes
};

const handleBackgroundBlurChange = () => {
    setBackgroundBlur(backgroundBlur.value);
    // Auto-sync will handle backend update every 5 minutes
};

// Dock functions
const updateDockVisibility = (visible: boolean) => {
    showDock.value = visible;
    document.documentElement.style.setProperty('--dock-display', visible ? 'flex' : 'none');
    localStorage.setItem('dock-visible', visible.toString());
    // Auto-sync will handle backend update every 5 minutes
};

const updateDockSize = () => {
    document.documentElement.style.setProperty('--dock-item-size', `${dockSize.value}px`);
    localStorage.setItem('dock-size', dockSize.value.toString());
    // Auto-sync will handle backend update every 5 minutes
};

const updateDockOpacity = () => {
    document.documentElement.style.setProperty('--dock-opacity', `${dockOpacity.value / 100}`);
    localStorage.setItem('dock-opacity', dockOpacity.value.toString());
    // Auto-sync will handle backend update every 5 minutes
};

// Custom context menu functions
const updateCustomContextMenuEnabled = (enabled: boolean) => {
    customContextMenuEnabled.value = enabled;
    localStorage.setItem('custom-context-menu-enabled', enabled.toString());
    window.dispatchEvent(new CustomEvent('custom-context-menu-toggle', { detail: { enabled } }));
    // Auto-sync will handle backend update every 5 minutes
};

// Reset all settings
const resetAllSettings = () => {
    // Reset theme
    setTheme(false);

    // Reset theme color
    applyTheme(false);

    // Reset background
    resetBackground();

    // Reset language
    const englishLanguage = availableLanguages.find((lang) => lang.code === 'en');
    if (englishLanguage) {
        changeLanguage(englishLanguage);
    }

    // Reset sidebar
    updateSidebarVisibility('visible');

    // Reset dock
    updateDockVisibility(false);
    dockSize.value = 48;
    dockOpacity.value = 80;
    localStorage.setItem('dock-size', '48');
    localStorage.setItem('dock-opacity', '80');
    updateDockSize();
    updateDockOpacity();

    // Reset custom context menu
    updateCustomContextMenuEnabled(false);
    contextMenuShowNavigation.value = true;
    contextMenuShowClipboard.value = true;
    contextMenuShowQuickActions.value = true;
    localStorage.setItem('context-menu-show-navigation', 'true');
    localStorage.setItem('context-menu-show-clipboard', 'true');
    localStorage.setItem('context-menu-show-quick-actions', 'true');
};

// Watch for theme changes and clear background when switching to light mode
watch(isDark, (newIsDark, oldIsDark) => {
    // If switching from dark to light mode, clear the background
    if (oldIsDark === true && newIsDark === false) {
        if (currentBackground.value) {
            setBackground('');
        }
    }
});

onMounted(async () => {
    loadSettings();

    // Fetch plugin widgets
    await fetchPluginWidgets();
});
</script>

<style scoped>
/* Custom range input styling */
input[type='range'] {
    -webkit-appearance: none;
    appearance: none;
    height: 6px;
    border-radius: 3px;
    background: #e5e7eb;
    outline: none;
    cursor: pointer;
}

:deep(.dark) input[type='range'] {
    background: #374151;
}

input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

input[type='range']::-webkit-slider-thumb:hover {
    transform: scale(1.1);
    background: #2563eb;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

input[type='range']::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease;
}

input[type='range']::-moz-range-thumb:hover {
    transform: scale(1.1);
    background: #2563eb;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

input[type='range']::-moz-range-track {
    height: 6px;
    border-radius: 3px;
    background: #e5e7eb;
    border: none;
}

:deep(.dark) input[type='range']::-moz-range-track {
    background: #374151;
}
</style>
