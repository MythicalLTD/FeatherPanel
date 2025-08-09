<template>
    <div
        v-if="isVisible"
        :class="[
            'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all',
            'data-[swipe=move]:transition-none data-[swipe=cancel]:transition-all data-[swipe=end]:animate-out',
            toastVariants.variant[props.variant],
            props.class,
        ]"
        :data-swipe="swipeDirection"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
    >
        <div class="grid gap-1">
            <div v-if="title" class="text-sm font-semibold [&+div]:mt-0.5">
                {{ title }}
            </div>
            <div v-if="description" class="text-sm opacity-90">
                {{ description }}
            </div>
        </div>
        <button
            v-if="action"
            @click="action.onClick"
            :class="[
                'inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive',
                action.class,
            ]"
        >
            {{ action.label }}
        </button>
        <button
            @click="dismiss"
            :class="[
                'absolute right-2 top-2 rounded-md p-1 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:right-2 group-[.destructive]:top-2 group-[.destructive]:rounded-md group-[.destructive]:border-red-600/40 group-[.destructive]:bg-red-600/10 group-[.destructive]:p-1 group-[.destructive]:opacity-0 group-[.destructive]:transition-opacity group-[.destructive]:hover:border-red-600/30 group-[.destructive]:hover:bg-red-600/20 group-[.destructive]:hover:text-red-600 group-[.destructive]:focus:opacity-100 group-[.destructive]:focus:outline-none group-[.destructive]:focus:ring-2 group-[.destructive]:focus:ring-red-600 group-[.destructive]:focus:ring-offset-2 group-[.destructive]:group-hover:opacity-100',
                closeButtonClass,
            ]"
        >
            <X class="h-4 w-4" />
            <span class="sr-only">Close</span>
        </button>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { X } from 'lucide-vue-next';
import { cn } from '@/lib/utils';
import { toastVariants, type ToastVariants } from '.';

export interface ToastActionElement {
    label: string;
    onClick: () => void;
    class?: string;
}

export interface ToastProps {
    class?: string;
    variant?: ToastVariants['variant'];
    title?: string;
    description?: string;
    action?: ToastActionElement;
    duration?: number;
    closeButtonClass?: string;
}

const props = withDefaults(defineProps<ToastProps>(), {
    variant: 'default',
    duration: 5000,
    closeButtonClass: 'text-foreground',
});

const emit = defineEmits<{
    dismiss: [];
}>();

const isVisible = ref(true);
const swipeDirection = ref<'move' | 'cancel' | 'end'>('cancel');
const swipeOffset = ref(0);
const isDragging = ref(false);
const startX = ref(0);

const onPointerDown = (event: PointerEvent) => {
    isDragging.value = true;
    startX.value = event.clientX;
    swipeOffset.value = 0;
};

const onPointerMove = (event: PointerEvent) => {
    if (!isDragging.value) return;

    const deltaX = event.clientX - startX.value;
    swipeOffset.value = deltaX;

    if (Math.abs(deltaX) > 10) {
        swipeDirection.value = 'move';
    }
};

const onPointerUp = () => {
    isDragging.value = false;

    if (Math.abs(swipeOffset.value) > 100) {
        swipeDirection.value = 'end';
        dismiss();
    } else {
        swipeDirection.value = 'cancel';
    }

    swipeOffset.value = 0;
};

const dismiss = () => {
    isVisible.value = false;
    emit('dismiss');
};

let timeoutId: number | null = null;

onMounted(() => {
    if (props.duration > 0) {
        timeoutId = setTimeout(() => {
            dismiss();
        }, props.duration);
    }
});

onUnmounted(() => {
    if (timeoutId) {
        clearTimeout(timeoutId);
    }
});
</script>
