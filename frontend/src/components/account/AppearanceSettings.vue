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

            <!-- Base Color Theme Selector -->
            <div class="space-y-3">
                <div class="space-y-2">
                    <label class="text-sm font-medium">{{ $t('account.baseColorTheme') }}</label>
                    <p class="text-xs text-muted-foreground">{{ $t('account.baseColorThemeDescription') }}</p>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    <button
                        v-for="theme in availableColorThemes"
                        :key="theme"
                        class="flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 touch-manipulation capitalize"
                        :class="[
                            currentColorTheme === theme
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50',
                        ]"
                        :data-umami-event="`Change color theme to ${theme}`"
                        @click="handleColorThemeChange(theme)"
                    >
                        <div
                            class="w-12 h-12 rounded-lg border-2 transition-all"
                            :class="[currentColorTheme === theme ? 'border-primary scale-110' : 'border-border']"
                            :style="getThemeColorStyle(theme)"
                        ></div>
                        <span class="text-sm font-medium text-center">{{ theme }}</span>
                    </button>
                </div>
            </div>

            <!-- Accent Color Selector -->
            <div class="space-y-3">
                <div class="space-y-2">
                    <label class="text-sm font-medium">{{ $t('account.accentColor') }}</label>
                    <p class="text-xs text-muted-foreground">{{ $t('account.accentColorDescription') }}</p>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                    <button
                        v-for="accent in availableAccentColors.filter((a) => a !== 'custom')"
                        :key="accent"
                        class="flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 touch-manipulation capitalize"
                        :class="[
                            currentAccentColor === accent
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50',
                        ]"
                        :data-umami-event="`Change accent color to ${accent}`"
                        @click="handleAccentColorChange(accent)"
                    >
                        <div
                            class="w-10 h-10 rounded-lg border-2 transition-all"
                            :class="[currentAccentColor === accent ? 'border-primary scale-110' : 'border-border']"
                            :style="getAccentColorStyle(accent)"
                        ></div>
                        <span class="text-xs font-medium text-center">{{ accent }}</span>
                    </button>
                </div>

                <!-- Custom Color Picker -->
                <div class="space-y-2 pt-2">
                    <label class="text-sm font-medium">{{ $t('account.customColor') }}</label>
                    <div class="flex items-center gap-3">
                        <div class="flex-1 flex items-center gap-2">
                            <input
                                type="color"
                                :value="customColorHex"
                                class="h-10 w-20 rounded-lg border-2 border-border cursor-pointer"
                                @input="handleCustomColorChange"
                            />
                            <input
                                type="text"
                                :value="customColorHex"
                                placeholder="#000000"
                                class="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
                                @input="handleCustomColorHexChange"
                                @blur="handleCustomColorHexBlur"
                            />
                        </div>
                        <Button
                            v-if="currentAccentColor === 'custom'"
                            variant="outline"
                            size="sm"
                            @click="handleResetCustomColor"
                        >
                            {{ $t('account.reset') }}
                        </Button>
                    </div>
                    <p class="text-xs text-muted-foreground">{{ $t('account.customColorDescription') }}</p>
                </div>
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

        <!-- Sync and Reset Buttons -->
        <div class="pt-4 border-t border-border space-y-3">
            <Button
                variant="default"
                class="w-full"
                :disabled="preferencesStore.isSyncing"
                data-umami-event="Sync preferences to cloud"
                @click="handleSyncNow"
            >
                <CloudUpload class="h-4 w-4 mr-2" />
                <span v-if="preferencesStore.isSyncing">{{ $t('account.syncing') }}</span>
                <span v-else>{{ $t('account.syncToCloud') }}</span>
            </Button>
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
import { Sun, Moon, Upload, RotateCcw, Eye, EyeOff, PanelLeft, CloudUpload } from 'lucide-vue-next';
import { useTheme } from '@/composables/useTheme';
import { useColorTheme, type ColorTheme, type AccentColor } from '@/composables/useColorTheme';
import { useLanguage } from '@/composables/useLanguage';
import { useSidebarState, type SidebarVisibility } from '@/composables/useSidebarState';
import { useBackground } from '@/composables/useBackground';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
import { usePreferencesStore } from '@/stores/preferences';
import { useToast } from 'vue-toastification';

const { t: $t } = useI18n();
const toast = useToast();
const preferencesStore = usePreferencesStore();
const { isDark, toggleTheme, setTheme } = useTheme();
const {
    currentColorTheme,
    currentAccentColor,
    setColorTheme,
    setAccentColor,
    availableThemes: availableColorThemes,
    availableAccentColors,
    setCustomColor,
} = useColorTheme();
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
};

// Handle dock visibility change from select
const handleDockVisibilityChange = (value: string | number | boolean | bigint | Record<string, unknown> | null) => {
    if (typeof value === 'string') {
        const enabled = value === 'enabled';
        showDock.value = enabled;
        updateDockVisibility(enabled);
    }
};

// Theme functions (using shared theme composable)

// Wrapped theme toggle
const handleToggleTheme = () => {
    toggleTheme();
    // Reapply color theme after theme change
    setTimeout(() => {
        setColorTheme(currentColorTheme.value);
    }, 100);
    // Auto-sync will handle backend update every 5 minutes
};

// Handle color theme change
const handleColorThemeChange = (theme: ColorTheme) => {
    setColorTheme(theme);
    // Force immediate style recalculation
    requestAnimationFrame(() => {
        // Access offsetHeight to trigger style recalculation
        void document.documentElement.offsetHeight;
    });
    // Auto-sync will handle backend update every 5 minutes
};

// Handle accent color change
const handleAccentColorChange = (accent: AccentColor) => {
    setAccentColor(accent);
    // Force immediate style recalculation
    requestAnimationFrame(() => {
        // Access offsetHeight to trigger style recalculation
        void document.documentElement.offsetHeight;
    });
    // Auto-sync will handle backend update every 5 minutes
};

// Get theme color style for preview (using dark mode card colors for better visibility)
const getThemeColorStyle = (theme: ColorTheme): Record<string, string> => {
    // Use dark mode card colors which have more chroma and show theme character better
    const themeColorMap: Record<ColorTheme, { light: string; dark: string }> = {
        neutral: {
            light: 'oklch(0.97 0 0)',
            dark: 'oklch(0.145 0 0)',
        },
        stone: {
            light: 'oklch(0.968 0.007 247.896)',
            dark: 'oklch(0.208 0.042 265.755)',
        },
        zinc: {
            light: 'oklch(0.967 0.003 264.542)',
            dark: 'oklch(0.21 0.034 264.665)',
        },
        gray: {
            light: 'oklch(0.97 0 0)',
            dark: 'oklch(0.145 0 0)',
        },
        slate: {
            light: 'oklch(0.968 0.007 247.896)',
            dark: 'oklch(0.208 0.042 265.755)',
        },
        warm: {
            light: 'oklch(0.97 0.008 65)',
            dark: 'oklch(0.20 0.018 50)',
        },
        cool: {
            light: 'oklch(0.967 0.005 225)',
            dark: 'oklch(0.21 0.03 235)',
        },
        rose: {
            light: 'oklch(0.97 0.008 350)',
            dark: 'oklch(0.20 0.018 345)',
        },
        emerald: {
            light: 'oklch(0.967 0.005 160)',
            dark: 'oklch(0.21 0.025 165)',
        },
        amber: {
            light: 'oklch(0.97 0.008 75)',
            dark: 'oklch(0.20 0.018 75)',
        },
        violet: {
            light: 'oklch(0.967 0.005 280)',
            dark: 'oklch(0.21 0.03 270)',
        },
        teal: {
            light: 'oklch(0.967 0.005 180)',
            dark: 'oklch(0.21 0.025 180)',
        },
        indigo: {
            light: 'oklch(0.967 0.005 270)',
            dark: 'oklch(0.21 0.03 265)',
        },
        crimson: {
            light: 'oklch(0.97 0.008 15)',
            dark: 'oklch(0.20 0.018 20)',
        },
        sky: {
            light: 'oklch(0.967 0.005 210)',
            dark: 'oklch(0.21 0.025 210)',
        },
        lime: {
            light: 'oklch(0.967 0.005 120)',
            dark: 'oklch(0.21 0.025 120)',
        },
        sand: {
            light: 'oklch(0.97 0.007 55)',
            dark: 'oklch(0.20 0.015 50)',
        },
        ocean: {
            light: 'oklch(0.967 0.006 200)',
            dark: 'oklch(0.21 0.03 200)',
        },
        forest: {
            light: 'oklch(0.967 0.005 140)',
            dark: 'oklch(0.21 0.025 140)',
        },
        sunset: {
            light: 'oklch(0.97 0.008 30)',
            dark: 'oklch(0.20 0.018 25)',
        },
    };

    const lightColor = themeColorMap[theme].light;
    const darkColor = themeColorMap[theme].dark;

    // Create a gradient showing both variants
    return {
        background: `linear-gradient(135deg, ${lightColor} 0%, ${darkColor} 100%)`,
    };
};

// Get accent color style for preview (using actual oklch values)
const getAccentColorStyle = (accent: AccentColor): Record<string, string> => {
    const accentColorMap: Record<AccentColor, { light: string; dark: string }> = {
        default: {
            light: 'oklch(0.205 0 0)',
            dark: 'oklch(0.985 0 0)',
        },
        blue: {
            light: 'oklch(0.522 0.177 251.116)',
            dark: 'oklch(0.696 0.17 251.116)',
        },
        red: {
            light: 'oklch(0.577 0.245 27.325)',
            dark: 'oklch(0.704 0.191 22.216)',
        },
        rose: {
            light: 'oklch(0.646 0.222 16.439)',
            dark: 'oklch(0.645 0.246 16.439)',
        },
        orange: {
            light: 'oklch(0.7 0.15 70)',
            dark: 'oklch(0.769 0.188 70.08)',
        },
        green: {
            light: 'oklch(0.6 0.118 184.704)',
            dark: 'oklch(0.696 0.17 184.704)',
        },
        yellow: {
            light: 'oklch(0.828 0.189 84.429)',
            dark: 'oklch(0.828 0.189 84.429)',
        },
        violet: {
            light: 'oklch(0.488 0.243 264.376)',
            dark: 'oklch(0.488 0.243 264.376)',
        },
        cyan: {
            light: 'oklch(0.6 0.15 200)',
            dark: 'oklch(0.696 0.17 200)',
        },
        emerald: {
            light: 'oklch(0.6 0.12 160)',
            dark: 'oklch(0.696 0.17 160)',
        },
        indigo: {
            light: 'oklch(0.522 0.177 270)',
            dark: 'oklch(0.696 0.17 270)',
        },
        pink: {
            light: 'oklch(0.646 0.222 350)',
            dark: 'oklch(0.645 0.246 350)',
        },
        teal: {
            light: 'oklch(0.6 0.12 180)',
            dark: 'oklch(0.696 0.17 180)',
        },
        sky: {
            light: 'oklch(0.6 0.15 220)',
            dark: 'oklch(0.696 0.17 220)',
        },
        lime: {
            light: 'oklch(0.7 0.15 120)',
            dark: 'oklch(0.769 0.188 120)',
        },
        amber: {
            light: 'oklch(0.75 0.15 75)',
            dark: 'oklch(0.769 0.188 75)',
        },
        fuchsia: {
            light: 'oklch(0.646 0.222 320)',
            dark: 'oklch(0.645 0.246 320)',
        },
        custom: {
            light: customColorHex.value || '#3b82f6',
            dark: customColorHex.value || '#3b82f6',
        },
    };

    if (accent === 'custom') {
        // For custom, use hex directly
        return {
            backgroundColor: customColorHex.value || '#3b82f6',
        };
    }

    const colorValue = isDark.value ? accentColorMap[accent].dark : accentColorMap[accent].light;
    return {
        backgroundColor: colorValue,
    };
};

// Custom color state
const customColorHex = ref<string>('#3b82f6');

// Load custom color on mount
onMounted(() => {
    const savedCustom = localStorage.getItem('custom-accent-color');
    if (savedCustom) {
        try {
            const custom = JSON.parse(savedCustom);
            // Convert oklch to hex for display (simplified - extract from computed style)
            const tempEl = document.createElement('div');
            tempEl.style.color = custom.light;
            document.body.appendChild(tempEl);
            const computed = window.getComputedStyle(tempEl).color;
            document.body.removeChild(tempEl);
            // Convert rgb to hex
            const rgbMatch = computed.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (rgbMatch && rgbMatch[1] && rgbMatch[2] && rgbMatch[3]) {
                const r = rgbMatch[1];
                const g = rgbMatch[2];
                const b = rgbMatch[3];
                customColorHex.value = `#${parseInt(r).toString(16).padStart(2, '0')}${parseInt(g).toString(16).padStart(2, '0')}${parseInt(b).toString(16).padStart(2, '0')}`;
            }
        } catch {
            // Ignore
        }
    }
});

// Handle custom color change
const handleCustomColorChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const hex = target.value;
    customColorHex.value = hex;
    setCustomColor(hex);
    requestAnimationFrame(() => {
        void document.documentElement.offsetHeight;
    });
};

// Handle custom color hex input
const handleCustomColorHexChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    let hex = target.value.trim();
    if (!hex.startsWith('#')) {
        hex = '#' + hex;
    }
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        customColorHex.value = hex;
        setCustomColor(hex);
        requestAnimationFrame(() => {
            void document.documentElement.offsetHeight;
        });
    }
};

// Handle custom color hex blur (validate and apply)
const handleCustomColorHexBlur = (event: Event) => {
    const target = event.target as HTMLInputElement;
    let hex = target.value.trim();
    if (!hex.startsWith('#')) {
        hex = '#' + hex;
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        // Reset to current value if invalid
        target.value = customColorHex.value;
    }
};

// Reset custom color
const handleResetCustomColor = () => {
    customColorHex.value = '#3b82f6';
    setAccentColor('default');
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

// Handle manual sync to cloud
const handleSyncNow = async () => {
    const success = await preferencesStore.syncNow();
    if (success) {
        toast.success($t('account.syncSuccess') || 'Preferences synced to cloud successfully!');
    } else {
        toast.error($t('account.syncError') || 'Failed to sync preferences to cloud');
    }
};

// Reset all settings
const resetAllSettings = () => {
    // Reset theme
    setTheme(false);

    // Reset color theme
    setColorTheme('neutral');
    setAccentColor('default');

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
