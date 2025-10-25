<script setup lang="ts">
import { useEventListener, useMediaQuery, useVModel } from '@vueuse/core';
import { TooltipProvider } from 'reka-ui';
import { computed, type HTMLAttributes, type Ref, ref } from 'vue';
import { cn } from '@/lib/utils';
import { provideSidebarContext, SIDEBAR_KEYBOARD_SHORTCUT, SIDEBAR_WIDTH, SIDEBAR_WIDTH_ICON } from './utils';

const props = withDefaults(
    defineProps<{
        defaultOpen?: boolean;
        open?: boolean;
        class?: HTMLAttributes['class'];
    }>(),
    {
        defaultOpen: true,
        open: undefined,
    },
);

const emits = defineEmits<{
    'update:open': [open: boolean];
}>();

const isMobile = useMediaQuery('(max-width: 768px)');
const openMobile = ref(false);

// Load saved sidebar state from localStorage
const getSavedSidebarState = (): boolean => {
    try {
        // First check sidebar-visibility for persistence across settings
        const visibility = localStorage.getItem('sidebar-visibility');
        if (visibility) {
            if (visibility === 'hidden') {
                return false;
            }
            if (visibility === 'collapsed') {
                return false;
            }
            if (visibility === 'visible') {
                return true;
            }
        }

        // Fallback to featherpanel-sidebar-expanded
        const saved = localStorage.getItem('featherpanel-sidebar-expanded');
        if (saved !== null) {
            return JSON.parse(saved);
        }

        return props.defaultOpen ?? true;
    } catch {
        return props.defaultOpen ?? true;
    }
};

const open = useVModel(props, 'open', emits, {
    defaultValue: getSavedSidebarState(),
    passive: (props.open === undefined) as false,
}) as Ref<boolean>;

function setOpen(value: boolean) {
    open.value = value; // emits('update:open', value)

    // Save sidebar state to localStorage
    try {
        localStorage.setItem('featherpanel-sidebar-expanded', JSON.stringify(value));

        // Also update sidebar-visibility based on current value (only if not hidden)
        const currentVisibility = localStorage.getItem('sidebar-visibility');
        if (currentVisibility !== 'hidden') {
            // Only update sidebar-visibility if not hidden
            localStorage.setItem('sidebar-visibility', value ? 'visible' : 'collapsed');
        }
    } catch (error) {
        console.warn('Failed to save sidebar state to localStorage:', error);
    }
}

function setOpenMobile(value: boolean) {
    openMobile.value = value;
}

// Helper to toggle the sidebar.
function toggleSidebar() {
    return isMobile.value ? setOpenMobile(!openMobile.value) : setOpen(!open.value);
}

useEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
    }
});

// We add a state so that we can do data-state="expanded" or "collapsed".
// This makes it easier to style the sidebar with Tailwind classes.
const state = computed(() => (open.value ? 'expanded' : 'collapsed'));

provideSidebarContext({
    state,
    open,
    setOpen,
    isMobile,
    openMobile,
    setOpenMobile,
    toggleSidebar,
});
</script>

<template>
    <div
        data-slot="sidebar-wrapper"
        :style="{
            '--sidebar-width': SIDEBAR_WIDTH,
            '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
        }"
        :class="cn('group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full', props.class)"
        v-bind="$attrs"
    >
        <TooltipProvider :delay-duration="0">
            <slot />
        </TooltipProvider>
    </div>
</template>
