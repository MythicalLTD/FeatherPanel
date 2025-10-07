<template>
    <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="translate-x-full opacity-0"
        enter-to-class="translate-x-0 opacity-100"
        leave-active-class="transition-all duration-300 ease-in"
        leave-from-class="translate-x-0 opacity-100"
        leave-to-class="translate-x-full opacity-0"
    >
        <div
            v-if="isOpen"
            class="fixed top-24 right-6 w-80 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl p-5 z-50"
        >
            <div class="flex items-center justify-between mb-5">
                <h3 class="text-lg font-semibold flex items-center gap-2 text-foreground">
                    <Settings :size="20" class="text-muted-foreground" />
                    Customize Widgets
                </h3>
                <Button variant="ghost" size="sm" class="h-8 w-8 p-0 hover:bg-muted" @click="emit('close')">
                    <X :size="18" />
                </Button>
            </div>

            <div class="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-2 custom-scrollbar">
                <div
                    v-for="widget in widgets"
                    :key="widget.id"
                    class="group flex items-center justify-between p-3 rounded-lg border transition-all duration-200"
                    :class="
                        widget.enabled
                            ? 'bg-muted/40 border-border hover:bg-muted hover:border-primary/40'
                            : 'bg-muted/20 border-border/50 hover:bg-muted/40'
                    "
                >
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                        <div
                            class="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0"
                            :class="widget.enabled ? 'bg-primary/10' : 'bg-muted/50'"
                        >
                            <div
                                class="h-2 w-2 rounded-full"
                                :class="widget.enabled ? 'bg-primary' : 'bg-muted-foreground/30'"
                            ></div>
                        </div>
                        <span
                            class="font-medium truncate text-sm"
                            :class="widget.enabled ? 'text-foreground' : 'text-muted-foreground'"
                        >
                            {{ widget.name }}
                        </span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        class="h-8 w-8 p-0 flex-shrink-0 transition-colors"
                        :class="widget.enabled ? 'hover:bg-muted-foreground/10' : 'hover:bg-muted'"
                        @click="emit('toggleWidget', widget.id)"
                    >
                        <component
                            :is="widget.enabled ? Eye : EyeOff"
                            :size="16"
                            :class="widget.enabled ? 'text-foreground' : 'text-muted-foreground'"
                        />
                    </Button>
                </div>
            </div>

            <div class="mt-5 pt-4 border-t border-border/50 space-y-3">
                <Button
                    variant="outline"
                    class="w-full flex items-center justify-center gap-2 hover:bg-muted transition-colors text-sm"
                    @click="emit('reset')"
                >
                    <RotateCcw :size="16" />
                    Reset to Default
                </Button>
                <div class="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Eye :size="14" />
                    Click the eye icon to show/hide widgets
                </div>
            </div>
        </div>
    </Transition>
</template>

<script setup lang="ts">
import { Settings, X, Eye, EyeOff, RotateCcw } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import type { Widget } from '@/stores/widgets';

interface Props {
    widgets: Widget[];
    isOpen: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
    close: [];
    toggleWidget: [id: string];
    reset: [];
}>();
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: hsl(var(--muted-foreground) / 0.3);
    border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--muted-foreground) / 0.5);
}
</style>
