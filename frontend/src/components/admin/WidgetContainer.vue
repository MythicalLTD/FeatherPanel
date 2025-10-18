<template>
    <div
        class="widget-container relative rounded-xl"
        :class="{
            'opacity-50': !enabled && !isCustomizing,
            'ring-2 ring-primary': isCustomizing,
            'hover:shadow-lg': !isCustomizing && withBorders,
            'border bg-card text-card-foreground shadow-sm transition-all duration-200': withBorders
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

import { GripVertical, Eye, EyeOff } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';

interface Props {
    title: string;
    enabled?: boolean;
    isCustomizing?: boolean;
    withBorders?: boolean;
}

withDefaults(defineProps<Props>(), {
    enabled: true,
    isCustomizing: false,
    withBorders: true,
});

const emit = defineEmits<{
    toggleEnabled: [];
}>();

const toggleEnabled = () => {
    emit('toggleEnabled');
};
</script>
