<template>
    <DashboardLayout :breadcrumbs="[{ text: $t('dashboard.title'), isCurrent: true, href: '/dashboard' }]">
        <div class="flex flex-col gap-6">
            <div class="flex items-center gap-4">
                <h1 class="text-2xl font-bold">{{ $t('dashboard.title') }}</h1>
            </div>

            <!-- Server List Section -->
            <ServerList />
        </div>
    </DashboardLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useSessionStore } from '@/stores/session';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import ServerList from '@/components/dashboard/ServerList.vue';

const sessionStore = useSessionStore();

onMounted(async () => {
    await sessionStore.checkSessionOrRedirect();
});
</script>
