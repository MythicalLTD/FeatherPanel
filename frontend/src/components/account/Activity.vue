<template>
    <div class="space-y-6">
        <div>
            <h3 class="text-lg font-medium">{{ $t('account.activity.title') }}</h3>
            <p class="text-sm text-muted-foreground">{{ $t('account.activity.description') }}</p>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-12">
            <div class="flex items-center gap-3">
                <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                <span class="text-muted-foreground">{{ $t('account.activity.loading') }}</span>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="message?.type === 'error'" class="flex flex-col items-center justify-center py-12 text-center">
            <div class="text-red-500 mb-4">
                <svg class="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                </svg>
            </div>
            <h3 class="text-lg font-medium text-muted-foreground mb-2">{{ $t('account.activity.loadError') }}</h3>
            <p class="text-sm text-muted-foreground max-w-sm">
                {{ message.text }}
            </p>
            <Button class="mt-4" @click="fetchActivity">{{ $t('account.activity.tryAgain') }}</Button>
        </div>

        <!-- Activity Timeline -->
        <div v-else class="space-y-4">
            <!-- Search Bar -->
            <div class="relative">
                <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    v-model="searchQuery"
                    :placeholder="$t('account.activity.searchPlaceholder')"
                    class="pl-10"
                    @input="handleSearch"
                />
            </div>

            <!-- Activity Count -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p class="text-sm text-muted-foreground text-center sm:text-left">
                    {{ $t('account.activity.totalActivities', { count: totalActivities }) }}
                </p>
                <Button variant="outline" size="sm" class="w-full sm:w-auto" @click="fetchActivity">
                    <RefreshCw class="h-4 w-4 mr-2" />
                    {{ $t('account.activity.refresh') }}
                </Button>
            </div>

            <!-- Timeline -->
            <div v-if="filteredActivities.length > 0" class="relative">
                <!-- Timeline line -->
                <div class="absolute left-6 top-0 bottom-0 w-0.5 bg-border"></div>

                <div class="space-y-4">
                    <div v-for="activity in filteredActivities" :key="activity.id" class="relative flex gap-4">
                        <!-- Timeline dot -->
                        <div
                            class="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/20"
                        >
                            <div class="h-3 w-3 rounded-full bg-primary"></div>
                        </div>

                        <!-- Activity content -->
                        <div class="flex-1 space-y-2 pb-4">
                            <div class="space-y-2">
                                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                    <div class="space-y-1 flex-1">
                                        <h4 class="text-sm font-medium leading-none">
                                            {{ activity.name }}
                                        </h4>
                                        <p v-if="activity.context" class="text-sm text-muted-foreground">
                                            {{ activity.context }}
                                        </p>
                                    </div>
                                    <div class="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                                        <Clock class="h-3 w-3" />
                                        {{ formatDate(activity.created_at) }}
                                    </div>
                                </div>
                            </div>

                            <!-- Activity metadata -->
                            <div class="flex items-center gap-4 text-xs text-muted-foreground">
                                <div v-if="activity.ip_address" class="flex items-center gap-1">
                                    <Globe class="h-3 w-3" />
                                    <span class="font-mono">{{ activity.ip_address }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div v-else class="text-center py-12">
                <div class="mx-auto h-12 w-12 text-muted-foreground mb-4">
                    <Activity class="h-12 w-12" />
                </div>
                <h3 class="text-sm font-medium text-muted-foreground mb-2">
                    {{ searchQuery ? $t('account.activity.noSearchResults') : $t('account.activity.noActivities') }}
                </h3>
                <p class="text-xs text-muted-foreground">
                    {{
                        searchQuery
                            ? $t('account.activity.tryDifferentSearch')
                            : $t('account.activity.noActivitiesDescription')
                    }}
                </p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSessionStore } from '@/stores/session';
import { Search, RefreshCw, Clock, Globe, Activity } from 'lucide-vue-next';
import axios from 'axios';

const { t } = useI18n();
const sessionStore = useSessionStore();

type Activity = {
    id: number;
    user_uuid: string;
    name: string;
    context?: string;
    ip_address?: string;
    created_at: string;
    updated_at: string;
};

const activities = ref<Activity[]>([]);
const loading = ref(false);
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null);
const searchQuery = ref('');

const totalActivities = computed(() => activities.value.length);

const filteredActivities = computed(() => {
    if (!searchQuery.value) return activities.value;

    const query = searchQuery.value.toLowerCase();
    return activities.value.filter(
        (activity) =>
            activity.name.toLowerCase().includes(query) ||
            (activity.context && activity.context.toLowerCase().includes(query)) ||
            (activity.ip_address && activity.ip_address.toLowerCase().includes(query)),
    );
});

async function fetchActivity() {
    loading.value = true;
    message.value = null;

    try {
        // First ensure we have a valid session
        await sessionStore.checkSessionOrRedirect();

        const { data } = await axios.get('/api/user/session');
        if (data && data.success && data.data && data.data.activity) {
            activities.value = data.data.activity.data || [];
        } else {
            activities.value = [];
        }
    } catch (error) {
        console.error('Error fetching activity:', error);
        message.value = {
            type: 'error',
            text: t('account.activity.fetchError'),
        };
        activities.value = [];
    } finally {
        loading.value = false;
    }
}

function handleSearch() {
    // Search is handled by the computed filteredActivities
}

function formatDate(dateString: string): string {
    if (!dateString) return '-';

    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 1) {
            return t('account.activity.justNow');
        } else if (diffInHours < 24) {
            const hours = Math.floor(diffInHours);
            return t('account.activity.hoursAgo', { hours });
        } else if (diffInHours < 48) {
            return t('account.activity.yesterday');
        } else {
            return (
                date.toLocaleDateString() +
                ' ' +
                date.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                })
            );
        }
    } catch {
        return dateString;
    }
}

onMounted(fetchActivity);
</script>
