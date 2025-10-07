<template>
    <div
        class="widget-container relative rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-200"
        :class="{
            'opacity-50': !enabled && !isCustomizing,
            'ring-2 ring-primary': isCustomizing,
            'hover:shadow-lg': !isCustomizing,
        }"
    >
        <!-- Widget Header (only shown in customization mode) -->
        <div
            v-if="isCustomizing"
            class="widget-drag-handle absolute -top-4 left-4 right-4 flex items-center justify-between gap-2 bg-muted/80 backdrop-blur-sm border border-border px-4 py-2.5 rounded-lg shadow-lg z-10 cursor-move hover:bg-muted hover:border-primary/40 transition-all"
        >
            <div class="flex items-center gap-3">
                <GripVertical :size="18" class="flex-shrink-0 text-muted-foreground" />
                <span class="font-semibold text-sm text-foreground">{{ title }}</span>
            </div>
            <Button
                variant="ghost"
                size="sm"
                class="h-8 w-8 p-0 hover:bg-background flex-shrink-0"
                @click.stop="toggleEnabled"
            >
                <component
                    :is="enabled ? Eye : EyeOff"
                    :size="18"
                    :class="enabled ? 'text-foreground' : 'text-muted-foreground'"
                />
            </Button>
        </div>

        <!-- Widget Content -->
        <div :class="{ 'mt-8': isCustomizing, 'pointer-events-none opacity-60': !enabled && isCustomizing }">
            <slot />
        </div>
    </div>
</template>

<script setup lang="ts">
import { GripVertical, Eye, EyeOff } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';

interface Props {
    title: string;
    enabled?: boolean;
    isCustomizing?: boolean;
}

withDefaults(defineProps<Props>(), {
    enabled: true,
    isCustomizing: false,
});

const emit = defineEmits<{
    toggleEnabled: [];
}>();

const toggleEnabled = () => {
    emit('toggleEnabled');
};
</script>
