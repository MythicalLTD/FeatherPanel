<template>
    <DashboardLayout :breadcrumbs="[{ text: 'API Keys', isCurrent: true, href: '/admin/api-keys' }]">
        <div class="min-h-screen bg-background p-6">
            <!-- Reuse the existing ApiKeys component -->
            <div class="max-w-7xl mx-auto">
                <ApiKeys />
            </div>
        </div>
    </DashboardLayout>
</template>

<script setup lang="ts">
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import ApiKeys from '@/components/account/ApiKeys.vue';
</script>
