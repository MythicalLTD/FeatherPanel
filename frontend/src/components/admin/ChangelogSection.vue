<template>
    <div class="space-y-2">
        <h5 class="font-medium flex items-center gap-2" :class="`text-${color}-600`">
            <span class="w-2 h-2 rounded-full" :class="`bg-${color}-500`"></span>
            {{ title }}
        </h5>
        <ul class="space-y-1 text-sm text-muted-foreground">
            <li v-for="item in items" :key="item" class="flex items-start gap-2">
                <span :class="`text-${color}-500 mt-1`">{{ icon }}</span>
                <span>{{ item }}</span>
            </li>
        </ul>
    </div>
</template>

<script setup lang="ts">
interface Props {
    title: string;
    items: string[];
    color: 'emerald' | 'blue' | 'purple' | 'amber' | 'red';
    icon: string;
}

defineProps<Props>();
</script>
