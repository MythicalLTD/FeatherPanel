<template>
    <div class="space-y-6">
        <div>
            <h3 class="text-lg font-semibold">{{ $t('account.appearanceSettings') }}</h3>
            <p class="text-sm text-muted-foreground">{{ $t('account.appearanceSettingsDescription') }}</p>
        </div>

        <!-- Theme Settings -->
        <div class="space-y-4">
            <h4 class="text-sm font-medium">{{ $t('account.theme') }}</h4>

            <!-- Theme Toggle -->
            <div class="flex items-center justify-between">
                <div class="space-y-1">
                    <p class="text-sm font-medium">{{ $t('account.darkMode') }}</p>
                    <p class="text-xs text-muted-foreground">{{ $t('account.darkModeDescription') }}</p>
                </div>
                <Button variant="outline" size="sm" class="flex items-center gap-2" @click="toggleTheme">
                    <Sun v-if="isDark" class="h-4 w-4" />
                    <Moon v-else class="h-4 w-4" />
                    {{ isDark ? $t('account.lightMode') : $t('account.darkMode') }}
                </Button>
            </div>

            <!-- Theme Color -->
            <div class="space-y-3">
                <label class="text-sm font-medium">{{ $t('account.themeColor') }}</label>
                <div class="flex gap-2">
                    <button
                        v-for="color in themeColors"
                        :key="color.name"
                        class="w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110"
                        :class="[currentThemeColor === color.value ? 'border-primary' : 'border-border', color.bgClass]"
                        :title="color.name"
                        @click="setThemeColor(color.value)"
                    />
                </div>
            </div>
        </div>

        <!-- Background Settings -->
        <div class="space-y-4">
            <h4 class="text-sm font-medium">{{ $t('background.customize') }}</h4>

            <!-- Preset Backgrounds -->
            <div class="space-y-3">
                <label class="text-sm font-medium">{{ $t('background.presets') }}</label>
                <div class="grid grid-cols-4 gap-2">
                    <button
                        v-for="preset in presetBackgrounds"
                        :key="preset.id"
                        class="relative group aspect-video rounded-md overflow-hidden border-2 transition-all duration-200 hover:scale-105"
                        :class="
                            currentBackground === preset.url
                                ? 'border-primary'
                                : 'border-border hover:border-primary/50'
                        "
                        @click="selectPreset(preset)"
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
            <div class="space-y-2">
                <label class="text-sm font-medium">{{ $t('background.custom') }}</label>
                <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileUpload" />
                <Button variant="outline" size="sm" class="w-full" @click="fileInput?.click()">
                    <Upload class="h-4 w-4 mr-2" />
                    {{ $t('background.uploadImage') }}
                </Button>
            </div>

            <!-- Background Settings -->
            <div class="space-y-4">
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
                            @input="setBackgroundOpacity(backgroundOpacity)"
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
                            @input="setBackgroundBlur(backgroundBlur)"
                        />
                        <span class="text-sm text-muted-foreground w-12">{{ backgroundBlur }}px</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Language Settings -->
        <div class="space-y-4">
            <h4 class="text-sm font-medium">{{ $t('account.language') }}</h4>

            <div class="space-y-3">
                <div class="space-y-2">
                    <label class="text-sm font-medium">{{ $t('account.selectLanguage') }}</label>
                    <div class="grid grid-cols-2 gap-2">
                        <button
                            v-for="language in availableLanguages"
                            :key="language.code"
                            class="flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105"
                            :class="[
                                currentLanguage?.code === language.code
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50',
                            ]"
                            @click="changeLanguage(language)"
                        >
                            <span class="text-2xl">{{ language.flag }}</span>
                            <div class="text-left">
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
            <h4 class="text-sm font-medium">{{ $t('account.sidebarSettings') }}</h4>

            <div class="space-y-3">
                <div class="space-y-2">
                    <label class="text-sm font-medium">{{ $t('account.sidebarVisibility') }}</label>
                    <div class="grid grid-cols-3 gap-2">
                        <button
                            v-for="option in sidebarOptions"
                            :key="option.value"
                            class="flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105"
                            :class="[
                                sidebarVisibility === option.value
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50',
                                isReloading ? 'opacity-50 cursor-not-allowed' : '',
                            ]"
                            :disabled="isReloading"
                            @click="updateSidebarVisibility(option.value)"
                        >
                            <component :is="option.icon" class="h-5 w-5" />
                            <span class="text-xs font-medium">{{ option.label }}</span>
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
            <h4 class="text-sm font-medium">{{ $t('account.dockSettings') }}</h4>

            <div class="space-y-3">
                <div class="flex items-center justify-between">
                    <div class="space-y-1">
                        <p class="text-sm font-medium">{{ $t('account.showDock') }}</p>
                        <p class="text-xs text-muted-foreground">{{ $t('account.showDockDescription') }}</p>
                    </div>
                    <Switch v-model="showDock" @update:model-value="updateDockVisibility" />
                </div>

                <div class="space-y-2">
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

                <div class="space-y-2">
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

        <!-- Reset Button -->
        <div class="pt-4 border-t border-border">
            <Button variant="outline" class="w-full" @click="resetAllSettings">
                <RotateCcw class="h-4 w-4 mr-2" />
                {{ $t('account.resetAppearance') }}
            </Button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Sun, Moon, Upload, RotateCcw, Eye, EyeOff, PanelLeft } from 'lucide-vue-next';
import { useTheme } from '@/composables/useTheme';
import { useLanguage } from '@/composables/useLanguage';
import { useSidebarState, type SidebarVisibility } from '@/composables/useSidebarState';
import { useBackground } from '@/composables/useBackground';

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
};

// Theme colors
const themeColors = [
    { name: 'Blue', value: 'blue', bgClass: 'bg-blue-500' },
    { name: 'Green', value: 'green', bgClass: 'bg-green-500' },
    { name: 'Purple', value: 'purple', bgClass: 'bg-purple-500' },
    { name: 'Orange', value: 'orange', bgClass: 'bg-orange-500' },
    { name: 'Pink', value: 'pink', bgClass: 'bg-pink-500' },
    { name: 'Red', value: 'red', bgClass: 'bg-red-500' },
    { name: 'Indigo', value: 'indigo', bgClass: 'bg-indigo-500' },
    { name: 'Teal', value: 'teal', bgClass: 'bg-teal-500' },
];

const currentThemeColor = ref('blue');

// File input ref
const fileInput = ref<HTMLInputElement | null>(null);

// Dock state
const showDock = ref(false);
const dockSize = ref(48);
const dockOpacity = ref(80);

// Loading state for sidebar changes
const isReloading = ref(false);

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
];

// Load settings from localStorage
const loadSettings = () => {
    // Theme color settings
    const savedThemeColor = localStorage.getItem('theme-color');
    if (savedThemeColor) {
        currentThemeColor.value = savedThemeColor;
        applyThemeColor(savedThemeColor);
    }

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

// Theme functions (using shared theme composable)

const setThemeColor = (color: string) => {
    currentThemeColor.value = color;
    applyThemeColor(color);
    localStorage.setItem('theme-color', color);
};

const applyThemeColor = (color: string) => {
    document.documentElement.setAttribute('data-theme-color', color);
};

// Background functions
const selectPreset = (preset: { id: string; name: string; url: string; placeholder?: string }) => {
    if (preset.id === 'none') {
        setBackground('');
    } else {
        setBackground(preset.url);
    }
};

const handleFileUpload = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            setBackground(result);
        };
        reader.readAsDataURL(file);
    }

    if (target) target.value = '';
};

// Dock functions
const updateDockVisibility = (visible: boolean) => {
    document.documentElement.style.setProperty('--dock-display', visible ? 'flex' : 'none');
    localStorage.setItem('dock-visible', visible.toString());
};

const updateDockSize = () => {
    document.documentElement.style.setProperty('--dock-item-size', `${dockSize.value}px`);
    localStorage.setItem('dock-size', dockSize.value.toString());
};

const updateDockOpacity = () => {
    document.documentElement.style.setProperty('--dock-opacity', `${dockOpacity.value / 100}`);
    localStorage.setItem('dock-opacity', dockOpacity.value.toString());
};

// Reset all settings
const resetAllSettings = () => {
    // Reset theme
    setTheme(false);

    // Reset theme color
    currentThemeColor.value = 'blue';
    applyThemeColor('blue');
    localStorage.setItem('theme-color', 'blue');

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
    showDock.value = false;
    dockSize.value = 48;
    dockOpacity.value = 80;
    localStorage.setItem('dock-visible', 'false');
    localStorage.setItem('dock-size', '48');
    localStorage.setItem('dock-opacity', '80');
    updateDockVisibility(false);
    updateDockSize();
    updateDockOpacity();
};

onMounted(() => {
    loadSettings();
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
