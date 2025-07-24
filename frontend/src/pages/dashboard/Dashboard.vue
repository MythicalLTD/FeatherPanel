<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Dashboard', isCurrent: true, href: '/dashboard' }]">
        <div class="flex flex-col gap-4">
            <h1 class="text-2xl font-bold">Dashboard</h1>
        </div>
    </DashboardLayout>
</template>

<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue';
</script>
