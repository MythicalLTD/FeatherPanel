<script lang="ts" setup>
import type { HTMLAttributes } from 'vue';
import { ref, onMounted, nextTick, watchEffect } from 'vue';

const props = defineProps<{
    class?: HTMLAttributes['class'];
}>();

const navRef = ref<HTMLElement | null>(null);

// Auto-scroll to end when breadcrumbs update (e.g., new pages)
onMounted(() => {
    watchEffect(async () => {
        await nextTick();
        if (navRef.value) {
            navRef.value.scrollLeft = navRef.value.scrollWidth;
        }
    });
});
</script>

<template>
    <nav
        aria-label="breadcrumb"
        data-slot="breadcrumb"
        :class="[
            'w-full overflow-x-auto whitespace-nowrap border-b border-border/60',
            'sm:bg-transparent sm:border-none sm:backdrop-blur-0',
            props.class,
        ]"
        ref="navRef"
    >
        <ol class="flex items-center gap-1 sm:gap-1.5 min-w-max px-2 py-2 sm:p-0">
            <slot />
        </ol>
    </nav>
</template>
