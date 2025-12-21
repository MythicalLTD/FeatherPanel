<template>
    <div v-if="widgets.length > 0" class="widgets-container relative">
        <!-- Developer Mode: Floating Reload Button -->
        <div v-if="settingsStore.appDeveloperMode" class="absolute bottom-6 right-6 z-30">
            <button
                class="flex items-center justify-center w-12 h-12 sm:w-auto sm:h-auto sm:px-4 sm:py-2 sm:gap-2 bg-linear-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-full sm:rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110 font-medium text-sm"
                :title="t('plugins.reloadIframe')"
                data-umami-event="Widget reload"
                @click="retryLoadAll"
            >
                <svg
                    class="w-5 h-5"
                    :class="{ 'animate-spin': isReloadingAll }"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    ></path>
                </svg>
                <span class="hidden sm:inline sm:ml-2">{{ t('plugins.reloadIframe') }}</span>
            </button>
        </div>

        <div v-for="widget in widgets" :key="widget.id" class="widget-container" :class="getWidgetGridClass(widget)">
            <Card
                v-if="shouldRenderAsCard(widget)"
                :class="getCardClass(widget)"
                :data-widget-card="widget.card?.variant ?? 'default'"
            >
                <CardHeader v-if="shouldShowHeader(widget)" :class="cn('space-y-1', widget.classes?.header)">
                    <div class="flex items-center gap-3">
                        <div
                            v-if="cardIcon(widget)"
                            class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"
                        >
                            <span class="text-sm font-semibold uppercase tracking-wide">{{ cardIcon(widget) }}</span>
                        </div>
                        <div class="flex flex-1 flex-col justify-center gap-1">
                            <CardTitle
                                v-if="headerTitle(widget)"
                                class="text-base font-semibold leading-none tracking-tight"
                            >
                                {{ headerTitle(widget) }}
                            </CardTitle>
                            <CardDescription v-if="headerDescription(widget)" class="text-sm text-muted-foreground">
                                {{ headerDescription(widget) }}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent :class="getCardContentClass(widget)">
                    <div class="relative w-full h-full flex-1" :style="getContentStyle(widget)">
                        <!-- Loading overlay -->
                        <div
                            v-if="loadingStates[widget.id]"
                            class="absolute inset-0 z-20 flex items-center justify-center bg-background/80"
                        >
                            <div class="flex flex-col items-center space-y-3 text-center">
                                <div
                                    class="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"
                                ></div>
                                <p class="text-sm text-muted-foreground">{{ getLoadingMessage(widget) }}</p>
                            </div>
                        </div>

                        <!-- Error overlay -->
                        <div
                            v-if="errorStates[widget.id]"
                            class="absolute inset-0 z-20 flex items-center justify-center bg-background/80"
                        >
                            <div class="max-w-md p-6 text-center">
                                <div
                                    class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20 text-destructive"
                                >
                                    <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                                        ></path>
                                    </svg>
                                </div>
                                <p class="mb-4 text-sm text-muted-foreground">
                                    {{ errorStates[widget.id] ?? getErrorMessage(widget) }}
                                </p>
                                <Button size="sm" variant="outline" @click="retryLoad(widget.id)">
                                    <RotateCcw class="mr-2 h-4 w-4" />
                                    {{ getRetryLabel(widget) }}
                                </Button>
                            </div>
                        </div>

                        <!-- Iframe -->
                        <iframe
                            v-if="!errorStates[widget.id]"
                            :data-widget-id="widget.id"
                            :src="getWidgetSrc(widget)"
                            class="h-full w-full border-0 transition-opacity duration-300"
                            :class="[
                                { 'opacity-0': loadingStates[widget.id], 'opacity-100': !loadingStates[widget.id] },
                                widget.classes?.iframe,
                            ]"
                            :style="getIframeStyle(widget)"
                            v-bind="getIframeAttributes(widget)"
                            @load="() => onIframeLoad(widget.id)"
                            @error="() => onIframeError(widget.id)"
                        ></iframe>
                    </div>
                </CardContent>

                <CardFooter
                    v-if="shouldShowFooter(widget)"
                    :class="cn('text-sm text-muted-foreground', widget.classes?.footer)"
                >
                    {{ widget.card?.footer?.text }}
                </CardFooter>
            </Card>

            <div
                v-else
                :class="
                    cn(
                        'relative w-full overflow-hidden rounded-lg border border-border/60 bg-card/70 backdrop-blur-sm',
                        widget.classes?.card,
                    )
                "
            >
                <div class="relative w-full h-full" :style="getContentStyle(widget)">
                    <!-- Loading overlay -->
                    <div
                        v-if="loadingStates[widget.id]"
                        class="absolute inset-0 z-20 flex items-center justify-center bg-background/80"
                    >
                        <div class="flex flex-col items-center space-y-3 text-center">
                            <div
                                class="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"
                            ></div>
                            <p class="text-sm text-muted-foreground">{{ getLoadingMessage(widget) }}</p>
                        </div>
                    </div>

                    <!-- Error overlay -->
                    <div
                        v-if="errorStates[widget.id]"
                        class="absolute inset-0 z-20 flex items-center justify-center bg-background/80"
                    >
                        <div class="max-w-md p-6 text-center">
                            <div
                                class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20 text-destructive"
                            >
                                <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                                    ></path>
                                </svg>
                            </div>
                            <p class="mb-4 text-sm text-muted-foreground">
                                {{ errorStates[widget.id] ?? getErrorMessage(widget) }}
                            </p>
                            <Button size="sm" variant="outline" @click="retryLoad(widget.id)">
                                <RotateCcw class="mr-2 h-4 w-4" />
                                {{ getRetryLabel(widget) }}
                            </Button>
                        </div>
                    </div>

                    <!-- Iframe -->
                    <iframe
                        v-if="!errorStates[widget.id]"
                        :data-widget-id="widget.id"
                        :src="getWidgetSrc(widget)"
                        class="h-full w-full border-0 transition-opacity duration-300"
                        :class="[
                            { 'opacity-0': loadingStates[widget.id], 'opacity-100': !loadingStates[widget.id] },
                            widget.classes?.iframe,
                        ]"
                        :style="getIframeStyle(widget)"
                        v-bind="getIframeAttributes(widget)"
                        @load="() => onIframeLoad(widget.id)"
                        @error="() => onIframeError(widget.id)"
                    ></iframe>
                </div>
            </div>
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

import { ref, onMounted, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { Card } from '@/components/ui/card';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-vue-next';
import { useSettingsStore } from '@/stores/settings';
import type { PluginWidget } from '@/composables/usePluginWidgets';
import { cn } from '@/lib/utils';

const props = defineProps<{
    widgets: PluginWidget[];
    height?: string;
}>();

const { t } = useI18n();
const settingsStore = useSettingsStore();
const route = useRoute();

const loadingStates = ref<Record<string, boolean>>({});
const errorStates = ref<Record<string, string | null>>({});
const isReloadingAll = ref(false);

// Get current route path for widgets
const currentRoutePath = computed(() => route.path);

// Initialize loading states
onMounted(async () => {
    // Settings are fetched once in App.vue - no need to fetch here

    props.widgets.forEach((widget) => {
        loadingStates.value[widget.id] = true;
        errorStates.value[widget.id] = null;
    });
});

watch(
    () => props.widgets.map((widget) => widget.id),
    (ids) => {
        const existingIds = new Set(Object.keys(loadingStates.value));

        ids.forEach((id) => {
            if (!existingIds.has(id)) {
                loadingStates.value[id] = true;
                errorStates.value[id] = null;
            }
        });

        Object.keys(loadingStates.value).forEach((id) => {
            if (!ids.includes(id)) {
                delete loadingStates.value[id];
                delete errorStates.value[id];
            }
        });
    },
);

function getWidgetSrc(widget: PluginWidget): string {
    const baseUrl = `/components/${widget.plugin}/${widget.component}`;

    // Add current route path as query parameter so widgets know where they are
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}route=${encodeURIComponent(currentRoutePath.value)}`;
}

function onIframeLoad(widgetId: string): void {
    loadingStates.value[widgetId] = false;
    errorStates.value[widgetId] = null;
}

function onIframeError(widgetId: string): void {
    loadingStates.value[widgetId] = false;
    errorStates.value[widgetId] = getErrorMessageById(widgetId);
}

function retryLoad(widgetId: string): void {
    errorStates.value[widgetId] = null;
    loadingStates.value[widgetId] = true;

    const iframe = document.querySelector(`iframe[data-widget-id="${widgetId}"]`) as HTMLIFrameElement;
    if (iframe) {
        const src = iframe.src;
        iframe.src = '';
        setTimeout(() => {
            iframe.src = src;
        }, 100);
    }
}

function retryLoadAll(): void {
    isReloadingAll.value = true;

    props.widgets.forEach((widget) => {
        errorStates.value[widget.id] = null;
        loadingStates.value[widget.id] = true;

        const iframe = document.querySelector(`iframe[data-widget-id="${widget.id}"]`) as HTMLIFrameElement;
        if (iframe) {
            const src = iframe.src;
            iframe.src = '';
            setTimeout(() => {
                iframe.src = src;
            }, 100);
        }
    });

    setTimeout(() => {
        isReloadingAll.value = false;
    }, 500);
}

function shouldRenderAsCard(widget: PluginWidget): boolean {
    if (widget.card === null) {
        return true;
    }

    if (typeof widget.card?.enabled === 'boolean') {
        return widget.card.enabled;
    }

    return true;
}

function shouldShowHeader(widget: PluginWidget): boolean {
    if (!shouldRenderAsCard(widget)) {
        return false;
    }

    const headerConfig = widget.card?.header;

    if (!headerConfig) {
        return Boolean(widget.title || widget.description || widget.icon);
    }

    if (typeof headerConfig.show === 'boolean') {
        return headerConfig.show;
    }

    return Boolean(
        headerConfig.title || headerConfig.description || widget.title || widget.description || cardIcon(widget),
    );
}

function headerTitle(widget: PluginWidget): string | null {
    const explicitTitle = widget.card?.header?.title ?? widget.title ?? null;
    return explicitTitle ?? null;
}

function headerDescription(widget: PluginWidget): string | null {
    const explicitDescription = widget.card?.header?.description ?? widget.description ?? null;
    return explicitDescription ?? null;
}

function shouldShowFooter(widget: PluginWidget): boolean {
    if (!shouldRenderAsCard(widget)) {
        return false;
    }

    const footer = widget.card?.footer;
    if (!footer) {
        return false;
    }

    if (typeof footer.show === 'boolean') {
        return footer.show && Boolean(footer.text);
    }

    return Boolean(footer.text);
}

function cardIcon(widget: PluginWidget): string | null {
    return widget.card?.header?.icon ?? widget.icon ?? null;
}

function getCardClass(widget: PluginWidget): string {
    const variant = widget.card?.variant ?? 'default';
    const base = 'flex h-full flex-col overflow-hidden border shadow-sm transition-colors duration-200';

    const variantMap: Record<string, string> = {
        default: 'border-border/70 bg-card',
        outline: 'border-primary/40 bg-card',
        ghost: 'border-transparent bg-transparent shadow-none backdrop-blur-sm',
        soft: 'border-border/40 bg-muted/40',
    };

    return cn(base, variantMap[variant] ?? variantMap.default, widget.classes?.card);
}

function getCardContentClass(widget: PluginWidget): string {
    const padding = widget.card?.padding ?? 'md';

    const paddingMap: Record<string, string> = {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
    };

    return cn('relative flex-1', paddingMap[padding] ?? paddingMap.md, widget.card?.bodyClass, widget.classes?.content);
}

function getContentStyle(widget: PluginWidget): Record<string, string> {
    const style: Record<string, string> = {};
    const fallbackHeight = props.height ?? '400px';

    style.minHeight = widget.iframe?.minHeight ?? fallbackHeight;

    if (widget.iframe?.maxHeight) {
        style.maxHeight = widget.iframe.maxHeight;
    }

    return style;
}

function getIframeStyle(widget: PluginWidget): Record<string, string> {
    const styles: Record<string, string> = {};

    if (widget.iframe?.minHeight) {
        styles.minHeight = widget.iframe.minHeight;
    } else if (props.height) {
        styles.minHeight = props.height;
    }

    if (widget.iframe?.maxHeight) {
        styles.maxHeight = widget.iframe.maxHeight;
    }

    return styles;
}

function getIframeAttributes(widget: PluginWidget): Record<string, string> {
    const attributes: Record<string, string> = {};

    if (widget.iframe?.sandbox) {
        attributes.sandbox = widget.iframe.sandbox;
    }

    if (widget.iframe?.allow) {
        attributes.allow = widget.iframe.allow;
    }

    if (widget.iframe?.loading) {
        attributes.loading = widget.iframe.loading;
    }

    if (widget.iframe?.referrerPolicy) {
        attributes.referrerpolicy = widget.iframe.referrerPolicy;
    }

    if (widget.iframe?.title) {
        attributes.title = widget.iframe.title;
    }

    if (widget.iframe?.ariaLabel) {
        attributes['aria-label'] = widget.iframe.ariaLabel;
    }

    return attributes;
}

function getWidgetGridClass(widget: PluginWidget): string {
    const layout = widget.layout;

    if (layout) {
        const fragments: string[] = [];
        const mapping: Record<string, string> = {
            columns: 'col-span',
            sm: 'sm:col-span',
            md: 'md:col-span',
            lg: 'lg:col-span',
            xl: 'xl:col-span',
        };

        Object.entries(mapping).forEach(([key, prefix]) => {
            const value = layout[key as keyof typeof layout];
            if (value && value >= 1 && value <= 12) {
                fragments.push(`${prefix}-${value}`);
            }
        });

        if (fragments.length > 0) {
            return cn(fragments.join(' '), widget.classes?.container);
        }
    }

    const size = widget.size;

    if (typeof size === 'string') {
        switch (size) {
            case 'half':
                return cn('col-span-12 md:col-span-6 lg:col-span-6', widget.classes?.container);
            case 'third':
                return cn('col-span-12 md:col-span-6 lg:col-span-4', widget.classes?.container);
            case 'quarter':
                return cn('col-span-12 md:col-span-6 lg:col-span-3', widget.classes?.container);
            case 'full':
            default:
                return cn('col-span-12', widget.classes?.container);
        }
    }

    if (typeof size === 'object' && size !== null) {
        const fragments: string[] = [];

        if (size.default) {
            fragments.push(`col-span-${size.default}`);
        }
        if (size.sm) {
            fragments.push(`sm:col-span-${size.sm}`);
        }
        if (size.md) {
            fragments.push(`md:col-span-${size.md}`);
        }
        if (size.lg) {
            fragments.push(`lg:col-span-${size.lg}`);
        }
        if (size.xl) {
            fragments.push(`xl:col-span-${size.xl}`);
        }

        if (fragments.length > 0) {
            return cn(fragments.join(' '), widget.classes?.container);
        }
    }

    return cn('col-span-12', widget.classes?.container);
}

function getLoadingMessage(widget: PluginWidget): string {
    return widget.behavior?.loadingMessage ?? t('plugins.loadingContent');
}

function getErrorMessage(widget: PluginWidget): string {
    return widget.behavior?.errorMessage ?? t('plugins.failedToLoadContent');
}

function getErrorMessageById(widgetId: string): string {
    const widget = props.widgets.find((item) => item.id === widgetId);
    if (!widget) {
        return t('plugins.failedToLoadContent');
    }

    return getErrorMessage(widget);
}

function getRetryLabel(widget: PluginWidget): string {
    return widget.behavior?.retryLabel ?? t('plugins.retry');
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
    min-width: 0;
}

iframe {
    display: block;
    width: 100%;
    height: 100%;
}
</style>
