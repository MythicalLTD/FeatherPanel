<template>
    <div class="relative">
        <!-- Background Picker Button -->
        <button
            class="flex items-center justify-center w-10 h-10 rounded-lg bg-muted hover:bg-muted/80 transition-all duration-200 hover:scale-105"
            :title="$t('background.customize')"
            @click="isOpen = !isOpen"
        >
            <ImageIcon class="size-5 text-foreground" />
        </button>

        <!-- Background Picker Dropdown -->
        <div
            v-if="isOpen"
            class="fixed right-4 top-12 w-80 bg-white dark:bg-gray-900 border border-border rounded-lg shadow-2xl z-[999999] p-4 space-y-4"
        >
            <div class="flex items-center justify-between">
                <h3 class="font-semibold text-foreground">{{ $t('background.customize') }}</h3>
                <button class="text-muted-foreground hover:text-foreground transition-colors" @click="isOpen = false">
                    <X class="size-4" />
                </button>
            </div>

            <!-- Preset Backgrounds -->
            <div class="space-y-3">
                <h4 class="text-sm font-medium text-foreground">{{ $t('background.presets') }}</h4>
                <div class="grid grid-cols-3 gap-2">
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
            <div class="space-y-3">
                <h4 class="text-sm font-medium text-foreground">{{ $t('background.custom') }}</h4>
                <div class="space-y-2">
                    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileUpload" />
                    <button
                        class="w-full py-2 px-3 border border-border rounded-md hover:border-primary/50 transition-colors text-sm"
                        @click="fileInput?.click()"
                    >
                        {{ $t('background.uploadImage') }}
                    </button>
                </div>
            </div>

            <!-- Background Settings -->
            <div class="space-y-3">
                <h4 class="text-sm font-medium text-foreground">{{ $t('background.settings') }}</h4>

                <!-- Background Opacity -->
                <div class="space-y-2">
                    <label class="text-xs text-muted-foreground">{{ $t('background.opacity') }}</label>
                    <input
                        v-model="backgroundOpacity"
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        class="w-full"
                        @input="updateBackgroundOpacity"
                    />
                    <div class="text-xs text-muted-foreground">{{ backgroundOpacity }}%</div>
                </div>

                <!-- Background Blur -->
                <div class="space-y-2">
                    <label class="text-xs text-muted-foreground">{{ $t('background.blur') }}</label>
                    <input
                        v-model="backgroundBlur"
                        type="range"
                        min="0"
                        max="20"
                        step="1"
                        class="w-full"
                        @input="updateBackgroundBlur"
                    />
                    <div class="text-xs text-muted-foreground">{{ backgroundBlur }}px</div>
                </div>
            </div>

            <!-- Reset Button -->
            <div class="pt-2 border-t border-border">
                <button
                    class="w-full py-2 px-3 text-sm text-destructive hover:text-destructive/80 transition-colors"
                    @click="resetBackground"
                >
                    {{ $t('background.reset') }}
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { ImageIcon, X } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();

// State
const isOpen = ref(false);
const currentBackground = ref('');
const backgroundOpacity = ref(20);
const backgroundBlur = ref(0);
const fileInput = ref<HTMLInputElement | null>(null);

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

// Load background settings from localStorage
const loadBackgroundSettings = () => {
    const savedBackground = localStorage.getItem('background_image');
    const savedOpacity = localStorage.getItem('background_opacity');
    const savedBlur = localStorage.getItem('background_blur');

    if (savedBackground) {
        currentBackground.value = savedBackground;
        applyBackground(savedBackground);
    }

    if (savedOpacity) {
        backgroundOpacity.value = parseInt(savedOpacity);
        updateBackgroundOpacity();
    }

    if (savedBlur) {
        backgroundBlur.value = parseInt(savedBlur);
        updateBackgroundBlur();
    }
};

// Apply background to body
const applyBackground = (url: string) => {
    const body = document.body;

    if (url) {
        body.style.setProperty('--background-image', `url(${url})`);
        body.classList.add('has-custom-background');
    } else {
        body.style.removeProperty('--background-image');
        body.classList.remove('has-custom-background');
    }
};

// Select preset background
const selectPreset = (preset: { id: string; name: string; url: string; placeholder?: string }) => {
    if (preset.id === 'none') {
        currentBackground.value = '';
        localStorage.removeItem('background_image');
        applyBackground('');
    } else {
        currentBackground.value = preset.url;
        localStorage.setItem('background_image', preset.url);
        applyBackground(preset.url);
    }
    isOpen.value = false;
};

// Handle file upload
const handleFileUpload = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            currentBackground.value = result;
            localStorage.setItem('background_image', result);
            applyBackground(result);
            isOpen.value = false;
        };
        reader.readAsDataURL(file);
    }

    // Reset file input
    if (target) target.value = '';
};

// Update background opacity
const updateBackgroundOpacity = () => {
    document.documentElement.style.setProperty('--background-opacity', `${backgroundOpacity.value / 100}`);
    localStorage.setItem('background_opacity', backgroundOpacity.value.toString());
};

// Update background blur
const updateBackgroundBlur = () => {
    document.documentElement.style.setProperty('--background-blur', `${backgroundBlur.value}px`);
    localStorage.setItem('background_blur', backgroundBlur.value.toString());
};

// Reset background
const resetBackground = () => {
    currentBackground.value = '';
    backgroundOpacity.value = 20;
    backgroundBlur.value = 0;

    localStorage.removeItem('background_image');
    localStorage.removeItem('background_opacity');
    localStorage.removeItem('background_blur');

    applyBackground('');
    updateBackgroundOpacity();
    updateBackgroundBlur();

    isOpen.value = false;
};

// Close dropdown when clicking outside
const handleClickOutside = (event: Event) => {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
        isOpen.value = false;
    }
};

// Watch for theme changes to update background
watch(
    () => document.body.classList.contains('dark'),
    () => {
        // Reapply background when theme changes
        if (currentBackground.value) {
            applyBackground(currentBackground.value);
        }
    },
);

onMounted(() => {
    loadBackgroundSettings();
    document.addEventListener('click', handleClickOutside);
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

/* Dark theme slider background */
:deep(.dark) input[type='range'] {
    background: #374151;
}

/* Light theme slider background */
:deep(.light) input[type='range'] {
    background: #d1d5db;
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

/* Track styling for Firefox */
input[type='range']::-moz-range-track {
    height: 6px;
    border-radius: 3px;
    background: #e5e7eb;
    border: none;
}

:deep(.dark) input[type='range']::-moz-range-track {
    background: #374151;
}

:deep(.light) input[type='range']::-moz-range-track {
    background: #d1d5db;
}

/* Focus states */
input[type='range']:focus {
    outline: none;
}

input[type='range']:focus::-webkit-slider-thumb {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

input[type='range']:focus::-moz-range-thumb {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}
</style>
