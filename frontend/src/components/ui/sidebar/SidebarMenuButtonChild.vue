<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { Primitive, type PrimitiveProps } from 'reka-ui';
import { cn } from '@/lib/utils';
import { type SidebarMenuButtonVariants, sidebarMenuButtonVariants } from '.';
import { useRouter } from 'vue-router';

export interface SidebarMenuButtonProps extends PrimitiveProps {
    variant?: SidebarMenuButtonVariants['variant'];
    size?: SidebarMenuButtonVariants['size'];
    isActive?: boolean;
    class?: HTMLAttributes['class'];
    to?: string;
}

const props = withDefaults(defineProps<SidebarMenuButtonProps>(), {
    as: 'button',
    variant: 'default',
    size: 'default',
});
const router = useRouter();
const emits = defineEmits(['click']);

function handleClick(event: MouseEvent) {
    emits('click', event);
    if (props.to) {
        router.push(props.to);
    }
}
</script>

<template>
    <Primitive
        data-slot="sidebar-menu-button"
        data-sidebar="menu-button"
        :data-size="size"
        :data-active="isActive"
        :class="cn(sidebarMenuButtonVariants({ variant, size }), props.class)"
        :as="as"
        :as-child="asChild"
        v-bind="$attrs"
        @click="handleClick"
    >
        <slot />
    </Primitive>
</template>
