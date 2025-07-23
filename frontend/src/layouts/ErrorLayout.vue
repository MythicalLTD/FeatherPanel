<template>
    <div class="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
        <div class="w-full max-w-sm">
            <div class="flex flex-col items-center gap-4">
                <FileWarningIcon class="size-10 text-destructive" />
                <h1 class="text-xl font-bold text-destructive mt-2">
                    <slot name="title">{{ title }}</slot>
                </h1>
                <p class="text-muted-foreground text-center">
                    <slot name="message">{{ message }}</slot>
                </p>
            </div>
            <Button class="w-full mt-6" @click="goHome">
                {{ $t('Go Home') }}
            </Button>
            <div class="text-muted-foreground text-center text-xs mt-6">
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
