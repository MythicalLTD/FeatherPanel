<template>
    <div
        aria-live="assertive"
        class="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-50"
    >
        <div class="flex w-full flex-col items-center space-y-4 sm:items-end">
            <TransitionGroup name="toast" tag="div" class="flex w-full flex-col items-center space-y-4 sm:items-end">
                <Toast
                    v-for="toast in toasts"
                    :key="toast.id"
                    :variant="toast.variant"
                    :title="toast.title"
                    :description="toast.description"
                    :action="toast.action"
                    :duration="toast.duration"
                    @dismiss="removeToast(toast.id)"
                />
            </TransitionGroup>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, provide } from 'vue';
import Toast from './Toast.vue';
import type { ToastProps } from './Toast.vue';

export interface ToastItem extends ToastProps {
    id: string;
}

const toasts = ref<ToastItem[]>([]);

const addToast = (toast: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    toasts.value.push({ ...toast, id });
};

const removeToast = (id: string) => {
    const index = toasts.value.findIndex((toast) => toast.id === id);
    if (index > -1) {
        toasts.value.splice(index, 1);
    }
};

const removeAllToasts = () => {
    toasts.value = [];
};

// Provide toast functions to child components
provide('toast', {
    addToast,
    removeToast,
    removeAllToasts,
});
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
    transition: all 0.3s ease;
}

.toast-enter-from {
    opacity: 0;
    transform: translateX(100%);
}

.toast-leave-to {
    opacity: 0;
    transform: translateX(100%);
}

.toast-move {
    transition: transform 0.3s ease;
}
</style>
