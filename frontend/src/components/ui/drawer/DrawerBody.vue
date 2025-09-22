<script lang="ts" setup>
import type { HTMLAttributes } from 'vue';
import { cn } from '@/lib/utils';

const props = defineProps<{
    class?: HTMLAttributes['class'];
}>();
</script>

<template>
    <div data-slot="drawer-body" :class="cn('flex-1 overflow-y-auto p-4', props.class)">
        <slot />
    </div>
</template>
