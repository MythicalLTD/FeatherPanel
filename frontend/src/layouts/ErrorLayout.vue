<template>
    <div class="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
        <!-- Background Picker Button - Top Left -->
        <div class="absolute top-4 left-4">
            <BackgroundPicker />
        </div>

        <div class="w-full max-w-sm">
            <div class="flex flex-col items-center gap-4">
                <FileWarningIcon class="size-10 text-destructive transition-all duration-300 animate-pulse" />
                <h1 class="text-xl font-bold text-destructive mt-2 transition-all duration-300">
                    <slot name="title">{{ title }}</slot>
                </h1>
                <p class="text-muted-foreground text-center transition-all duration-300">
                    <slot name="message">{{ message }}</slot>
                </p>
            </div>
            <Button class="w-full mt-6 transition-all duration-200 hover:scale-105" @click="goHome">
                {{ $t('Go Home') }}
            </Button>
            <div class="text-muted-foreground text-center text-xs mt-6 transition-all duration-200">
                <slot name="footer"></slot>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { useI18n } from 'vue-i18n';
import { FileWarningIcon } from 'lucide-vue-next';
import BackgroundPicker from '@/components/BackgroundPicker.vue';

const props = defineProps({
    errorCode: {
        type: [String, Number],
        default: '',
    },
    title: {
        type: String,
        default: 'Oops! Something went wrong.',
    },
    message: {
        type: String,
        default: 'An unexpected error has occurred. Please try again later.',
    },
});

document.title = `${props.errorCode} - ${props.title}`;

const { t: $t } = useI18n();
const router = useRouter();

function goHome() {
    router.push('/');
}
</script>

<style scoped>
/* Error icon animations */
.animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
    0%,
    100% {
        opacity: 1;
        transform: scale(1);
    }
    50% {
        opacity: 0.8;
        transform: scale(1.05);
    }
}

/* Smooth hover effects */
Button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

/* Text shadow effects */
h1 {
    text-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);
}

/* Smooth transitions for all elements */
* {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
