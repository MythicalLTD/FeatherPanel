<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSettingsStore } from '@/stores/settings';

const { t } = useI18n();
const settingsStore = useSettingsStore();
onMounted(async () => {
    await settingsStore.fetchSettings();
});
const currentYear = computed(() => new Date().getFullYear());
const appName = computed(() => String(settingsStore.appName || 'FeatherPanel'));
const privacyPolicyUrl = computed(() => String(settingsStore.legalPrivacy || ''));
const termsOfServiceUrl = computed(() => String(settingsStore.legalTos || ''));
</script>

<template>
    <footer class="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div class="container mx-auto px-4 py-3 sm:py-6">
            <div class="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                <!-- Main content - simplified for mobile -->
                <div
                    class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground"
                >
                    <!-- Mobile: Single line with heart and copyright -->
                    <div class="flex items-center gap-2 sm:hidden">
                        <span class="text-red-500 animate-pulse">❤️</span>
                        <span>&copy; {{ currentYear }} {{ appName }}</span>
                    </div>

                    <!-- Desktop: Full attribution -->
                    <div class="hidden sm:flex items-center gap-2">
                        <span class="text-red-500 animate-pulse">❤️</span>
                        <span>{{ t('footer.madeWith', 'Made with') }}</span>
                        <span class="font-medium text-primary">{{ t('footer.love', 'love') }}</span>
                        <span>{{ t('footer.by', 'by') }}</span>
                        <a
                            href="https://mythical.systems"
                            class="font-semibold text-primary hover:text-primary/80 transition-colors duration-200 underline underline-offset-2"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            MythicalSystems
                        </a>
                    </div>

                    <!-- Copyright for desktop -->
                    <div class="hidden sm:flex items-center gap-2">
                        <span class="text-muted-foreground/60">•</span>
                        <span>&copy; {{ currentYear }} {{ appName }}</span>
                        <span class="text-muted-foreground/60">•</span>
                        <span>{{ t('footer.allRightsReserved', 'All rights reserved.') }}</span>
                    </div>
                </div>

                <!-- Links - compact on mobile -->
                <div class="flex items-center justify-center sm:justify-end gap-4 sm:gap-6 text-xs sm:text-sm">
                    <a
                        :href="privacyPolicyUrl"
                        class="text-muted-foreground hover:text-primary transition-colors duration-200"
                    >
                        {{ t('footer.privacy', 'Privacy') }}
                    </a>
                    <a
                        :href="termsOfServiceUrl"
                        class="text-muted-foreground hover:text-primary transition-colors duration-200"
                    >
                        {{ t('footer.terms', 'Terms') }}
                    </a>
                </div>
            </div>
        </div>
    </footer>
</template>
<style scoped>
/* Status indicator animation */
@keyframes pulse {
    0%,
    100% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
}

.animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Backdrop blur support */
@supports (backdrop-filter: blur(8px)) {
    footer {
        backdrop-filter: blur(8px);
    }
}
</style>
