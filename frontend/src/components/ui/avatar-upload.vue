<template>
    <div class="space-y-4">
        <Label>{{ label }}</Label>

        <!-- Avatar Display Area -->
        <div class="flex items-center gap-6">
            <!-- Current Avatar -->
            <div class="relative">
                <div
                    class="w-24 h-24 rounded-full border-2 border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
                    :class="{ 'border-primary': hasNewFile }"
                >
                    <img v-if="displayImage" :src="displayImage" alt="Avatar" class="w-full h-full object-cover" />
                    <div v-else class="text-gray-400 dark:text-gray-500">
                        <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fill-rule="evenodd"
                                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                                clip-rule="evenodd"
                            />
                        </svg>
                    </div>
                </div>

                <!-- Remove Button -->
                <button
                    v-if="displayImage && !disabled"
                    type="button"
                    @click="clearAvatar"
                    class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs transition-colors duration-200"
                    :disabled="disabled"
                >
                    ×
                </button>

                <!-- Upload Progress Indicator -->
                <div
                    v-if="isUploading"
                    class="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center"
                >
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                </div>
            </div>

            <!-- Upload Controls -->
            <div class="flex-1 space-y-3">
                <div class="space-y-2">
                    <!-- File Input -->
                    <div class="relative">
                        <Input
                            id="avatar-upload"
                            type="file"
                            accept="image/*"
                            :disabled="disabled || isUploading"
                            @change="handleFileSelect"
                            class="hidden"
                        />
                        <Label
                            for="avatar-upload"
                            class="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            :class="{ 'opacity-50 cursor-not-allowed': disabled || isUploading }"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                />
                            </svg>
                            {{ hasNewFile ? $t('account.changeAvatar') : $t('account.uploadAvatar') }}
                        </Label>
                    </div>

                    <!-- File Info -->
                    <div v-if="selectedFile" class="text-sm text-muted-foreground">
                        <div class="flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                            {{ selectedFile.name }}
                            <span class="text-xs text-gray-500">({{ formatFileSize(selectedFile.size) }})</span>
                        </div>
                    </div>

                    <!-- Help Text -->
                    <p class="text-xs text-muted-foreground">
                        {{ $t('account.avatarUploadHint') }}
                    </p>
                </div>

                <!-- Error Message -->
                <div v-if="errorMessage" class="text-sm text-red-600 dark:text-red-400">
                    {{ errorMessage }}
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
    modelValue?: string;
    label?: string;
    disabled?: boolean;
    isUploading?: boolean;
}

interface Emits {
    (e: 'update:modelValue', value: string): void;
    (e: 'file-selected', file: File | null): void;
    (e: 'clear'): void;
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: '',
    label: 'Avatar',
    disabled: false,
    isUploading: false,
});

const emit = defineEmits<Emits>();

const { t: $t } = useI18n();

const selectedFile = ref<File | null>(null);
const previewUrl = ref<string>('');
const errorMessage = ref<string>('');

// Computed properties
const displayImage = computed(() => {
    return previewUrl.value || props.modelValue;
});

const hasNewFile = computed(() => {
    return selectedFile.value !== null;
});

// Watch for model value changes to clear preview if needed
watch(
    () => props.modelValue,
    (newValue) => {
        if (!newValue && !selectedFile.value) {
            previewUrl.value = '';
        }
    },
);

// File handling
const handleFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) {
        clearFile();
        return;
    }

    // Clear previous errors
    errorMessage.value = '';

    // Validate file type
    if (!file.type.startsWith('image/')) {
        errorMessage.value = $t('account.invalidImageType');
        clearFile();
        return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        errorMessage.value = $t('account.imageTooLarge');
        clearFile();
        return;
    }

    selectedFile.value = file;

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
        previewUrl.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);

    // Emit file selection
    emit('file-selected', file);
};

const clearFile = () => {
    selectedFile.value = null;
    previewUrl.value = '';
    errorMessage.value = '';

    // Reset file input
    const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
    if (fileInput) {
        fileInput.value = '';
    }

    emit('file-selected', null);
};

const clearAvatar = () => {
    clearFile();
    emit('update:modelValue', '');
    emit('clear');
};

// Utility function to format file size
const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
</script>
