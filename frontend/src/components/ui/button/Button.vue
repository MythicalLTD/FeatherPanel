<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { computed, useAttrs } from 'vue';
import { Primitive, type PrimitiveProps } from 'reka-ui';
import { cn } from '@/lib/utils';
import { type ButtonVariants, buttonVariants } from '.';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface Props extends PrimitiveProps {
    variant?: ButtonVariants['variant'];
    size?: ButtonVariants['size'];
    class?: HTMLAttributes['class'];
    title?: string;
}

const props = withDefaults(defineProps<Props>(), {
    as: 'button',
});

const attrs = useAttrs();

// Merge props and attrs, excluding title when using custom tooltip
const buttonAttrs = computed(() => {
    const { title: _titleProp, as, asChild, variant, size, class: _classProp, ...restProps } = props;
    const { title: _titleAttr, ...restAttrs } = attrs;
    return { ...restAttrs, ...restProps };
});
</script>

<template>
    <TooltipProvider v-if="title">
        <Tooltip>
            <TooltipTrigger as-child>
                <Primitive
                    data-slot="button"
                    :as="as"
                    :as-child="asChild"
                    :class="cn(buttonVariants({ variant, size }), props.class)"
                    v-bind="buttonAttrs"
                >
                    <slot />
                </Primitive>
            </TooltipTrigger>
            <TooltipContent>
                {{ title }}
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>

    <Primitive
        v-else
        data-slot="button"
        :as="as"
        :as-child="asChild"
        :class="cn(buttonVariants({ variant, size }), props.class)"
        v-bind="$attrs"
    >
        <slot />
    </Primitive>
</template>
