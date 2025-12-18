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

import { computed } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import { Heart, ExternalLink } from 'lucide-vue-next';
import { Separator } from '@/components/ui/separator';

const settingsStore = useSettingsStore();

// Settings are fetched once in App.vue - no need to fetch here
// The store guards against duplicate fetches, so we can safely access settings

const currentYear = computed(() => new Date().getFullYear());
const appName = computed(() => String(settingsStore.appName || 'FeatherPanel'));
const privacyPolicyUrl = computed(() => String(settingsStore.legalPrivacy || ''));
const termsOfServiceUrl = computed(() => String(settingsStore.legalTos || ''));
const appVersion = computed(() => String(settingsStore.appVersion || '1.0.0'));
</script>

<template>
    <footer class="border-t border-border/40 bg-background/95 backdrop-blur-sm fixed bottom-0 left-0 right-0">
        <div class="container mx-auto px-3 sm:px-4">
            <!-- Mobile: Centered minimal layout -->
            <div class="flex sm:hidden flex-col items-center justify-center py-3 text-xs text-muted-foreground gap-2">
                <div class="flex items-center gap-2.5">
                    <a
                        v-if="privacyPolicyUrl"
                        :href="privacyPolicyUrl"
                        class="hover:text-foreground transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Privacy
                    </a>
                    <span v-if="privacyPolicyUrl && termsOfServiceUrl" class="text-muted-foreground/40">•</span>
                    <a
                        v-if="termsOfServiceUrl"
                        :href="termsOfServiceUrl"
                        class="hover:text-foreground transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Terms
                    </a>
                </div>
                <div class="text-[10px] text-muted-foreground/70">&copy; {{ currentYear }} {{ appName }}</div>
            </div>

            <!-- Tablet & Desktop: Full layout -->
            <div class="hidden sm:flex items-center justify-between py-2.5 text-xs">
                <!-- Left: Copyright & Attribution -->
                <div class="flex items-center gap-2 text-muted-foreground">
                    <span>&copy; {{ currentYear }}</span>
                    <span>{{ appName }}</span>
                    <span class="hidden md:inline text-muted-foreground/60">v{{ appVersion }}</span>
                    <Separator orientation="vertical" class="h-3 hidden md:block" />
                    <div class="hidden lg:flex items-center gap-1">
                        <Heart :size="10" class="text-red-500 dark:text-red-400 fill-current heart-beat" />
                        <a
                            href="https://mythical.systems"
                            class="hover:text-foreground transition-colors"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            MythicalSystems
                        </a>
                    </div>
                </div>

                <!-- Right: Links -->
                <div class="flex items-center gap-3">
                    <a
                        v-if="privacyPolicyUrl"
                        :href="privacyPolicyUrl"
                        class="text-muted-foreground hover:text-foreground transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Privacy
                    </a>
                    <Separator v-if="privacyPolicyUrl && termsOfServiceUrl" orientation="vertical" class="h-3" />
                    <a
                        v-if="termsOfServiceUrl"
                        :href="termsOfServiceUrl"
                        class="text-muted-foreground hover:text-foreground transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Terms
                    </a>
                    <Separator orientation="vertical" class="h-3" />
                    <a
                        href="https://github.com/MythicalLTD/FeatherPanel"
                        class="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Docs
                        <ExternalLink :size="10" class="opacity-60" />
                    </a>
                </div>
            </div>
        </div>
    </footer>
</template>

<style scoped>
@keyframes heart-beat {
    0%,
    100% {
        transform: scale(1);
    }
    10%,
    30% {
        transform: scale(1.1);
    }
    20%,
    40% {
        transform: scale(0.95);
    }
}

.heart-beat {
    animation: heart-beat 2s ease-in-out infinite;
}
</style>
