<template>
    <div v-if="widgets.length > 0" class="widgets-container">
        <div
            v-for="widget in widgets"
            :key="widget.id"
            class="widget-container"
            :class="getWidgetSizeClass(widget.size || 'full')"
        >
            <Card class="border-2 overflow-hidden h-full">
                <div class="relative w-full" :style="{ minHeight: height || '400px' }">
                    <!-- Loading overlay -->
                    <div
                        v-if="loadingStates[widget.id]"
                        class="absolute inset-0 flex items-center justify-center z-20 bg-background/80"
                    >
                        <div class="flex flex-col items-center space-y-4">
                            <div
                                class="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"
                            ></div>
                            <p class="text-sm text-muted-foreground">{{ t('plugins.loadingContent') }}</p>
                        </div>
                    </div>

                    <!-- Error overlay -->
                    <div
                        v-if="errorStates[widget.id]"
                        class="absolute inset-0 flex items-center justify-center z-20 bg-background/80"
                    >
                        <div class="text-center p-6 max-w-md">
                            <div
                                class="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
                            >
                                <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                                    ></path>
                                </svg>
                            </div>
                            <p class="text-sm text-muted-foreground mb-4">{{ errorStates[widget.id] }}</p>
                            <Button size="sm" variant="outline" @click="retryLoad(widget.id)">
                                <RotateCcw class="h-4 w-4 mr-2" />
                                {{ t('plugins.retry') }}
                            </Button>
                        </div>
                    </div>

                    <!-- Iframe -->
                    <iframe
                        v-if="!errorStates[widget.id]"
                        :data-widget-id="widget.id"
                        :src="getWidgetSrc(widget)"
                        class="w-full h-full border-0 transition-opacity duration-300"
                        :class="{ 'opacity-0': loadingStates[widget.id], 'opacity-100': !loadingStates[widget.id] }"
                        :style="{ minHeight: height || '400px' }"
                        @load="() => onIframeLoad(widget.id)"
                        @error="() => onIframeError(widget.id)"
                    ></iframe>
                </div>
            </Card>
        </div>
    </div>
</template>

<script setup lang="ts">
/*
MIT License

Copyright (c) 2025 MythicalSystems
Copyright (c) 2025 Cassian Gherman (NaysKutzu)
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

import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-vue-next';
import type { PluginWidget } from '@/composables/usePluginWidgets';

const props = defineProps<{
    widgets: PluginWidget[];
    height?: string;
}>();

const { t } = useI18n();

const loadingStates = ref<Record<string, boolean>>({});
const errorStates = ref<Record<string, string | null>>({});

// Initialize loading states
onMounted(() => {
    props.widgets.forEach((widget) => {
        loadingStates.value[widget.id] = true;
        errorStates.value[widget.id] = null;
    });
});

function getWidgetSrc(widget: PluginWidget): string {
    return `/components/${widget.plugin}/${widget.component}`;
}

function onIframeLoad(widgetId: string): void {
    loadingStates.value[widgetId] = false;
    errorStates.value[widgetId] = null;
}

function onIframeError(widgetId: string): void {
    loadingStates.value[widgetId] = false;
    errorStates.value[widgetId] = t('plugins.failedToLoadContent');
}

function retryLoad(widgetId: string): void {
    errorStates.value[widgetId] = null;
    loadingStates.value[widgetId] = true;

    // Force iframe reload
    const iframe = document.querySelector(`iframe[data-widget-id="${widgetId}"]`) as HTMLIFrameElement;
    if (iframe) {
        const src = iframe.src;
        iframe.src = '';
        setTimeout(() => {
            iframe.src = src;
        }, 100);
    }
}

function getWidgetSizeClass(size: 'full' | 'half' | 'third' | 'quarter'): string {
    switch (size) {
        case 'half':
            return 'col-span-1 md:col-span-6 lg:col-span-6';
        case 'third':
            return 'col-span-1 md:col-span-6 lg:col-span-4';
        case 'quarter':
            return 'col-span-1 md:col-span-6 lg:col-span-3';
        case 'full':
        default:
            return 'col-span-1 md:col-span-12 lg:col-span-12';
    }
}
</script>

<style scoped>
.widgets-container {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 1rem;
    width: 100%;
}

.widget-container {
    width: 100%;
    min-width: 0; /* Prevent grid overflow */
}

iframe {
    display: block;
    width: 100%;
    height: 100%;
}
</style>
