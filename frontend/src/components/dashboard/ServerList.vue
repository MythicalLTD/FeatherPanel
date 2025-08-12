<template>
    <div class="space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h3 class="text-lg font-semibold">{{ $t('servers.title') }}</h3>
                <p class="text-sm text-muted-foreground">{{ $t('servers.description') }}</p>
            </div>
            <Button variant="outline" size="sm" :disabled="loading" @click="fetchServers">
                <RefreshCw class="h-4 w-4 mr-2" :class="{ 'animate-spin': loading }" />
                {{ $t('servers.refresh') }}
            </Button>
        </div>

        <!-- Search and Filters -->
        <div class="flex flex-col sm:flex-row gap-4">
            <div class="relative flex-1">
                <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    v-model="searchQuery"
                    :placeholder="$t('servers.searchPlaceholder')"
                    class="pl-10"
                    @input="handleSearch"
                />
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-12">
            <div class="flex items-center gap-2">
                <RefreshCw class="h-5 w-5 animate-spin" />
                <span class="text-sm text-muted-foreground">{{ $t('servers.loading') }}</span>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="flex items-center justify-center py-12">
            <div class="text-center">
                <AlertCircle class="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 class="text-lg font-semibold mb-2">{{ $t('servers.errorTitle') }}</h3>
                <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
                <Button @click="fetchServers">{{ $t('servers.retry') }}</Button>
            </div>
        </div>

        <!-- Servers Grid -->
        <div v-else-if="servers.length > 0" class="space-y-4">
            <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card
                    v-for="server in servers"
                    :key="server.id"
                    class="group hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-primary/20 hover:scale-[1.02] bg-gradient-to-br from-card to-card/50"
                    @click="openServerDetails(server)"
                >
                    <CardHeader class="pb-3">
                        <div class="flex items-start justify-between">
                            <div class="flex-1 min-w-0">
                                <CardTitle class="text-base truncate">{{ server.name }}</CardTitle>
                                <p class="text-sm text-muted-foreground truncate">
                                    {{ server.description || $t('servers.noDescription') }}
                                </p>
                            </div>
                            <Badge :variant="getStatusVariant(server.status)">
                                {{ $t(`servers.status.${server.status}`) }}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent class="pt-0">
                        <div class="space-y-3">
                            <!-- Server Info -->
                            <div class="grid grid-cols-2 gap-3 text-sm">
                                <div class="flex items-center gap-2">
                                    <Server class="h-4 w-4 text-muted-foreground" />
                                    <span class="text-muted-foreground">{{ $t('servers.node') }}:</span>
                                    <span class="font-medium truncate">{{ server.node?.name || 'N/A' }}</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <Hash class="h-4 w-4 text-muted-foreground" />
                                    <span class="text-muted-foreground">{{ $t('servers.realm') }}:</span>
                                    <span class="font-medium truncate">{{ server.realm?.name || 'N/A' }}</span>
                                </div>
                            </div>

                            <!-- Resources -->
                            <div class="grid grid-cols-3 gap-2 text-xs">
                                <div
                                    class="text-center p-2 bg-muted/50 rounded-lg border border-border/50 group-hover:bg-muted/70 transition-colors"
                                >
                                    <div class="font-semibold text-primary">{{ formatMemory(server.memory) }}</div>
                                    <div class="text-muted-foreground">{{ $t('servers.memory') }}</div>
                                </div>
                                <div
                                    class="text-center p-2 bg-muted/50 rounded-lg border border-border/50 group-hover:bg-muted/70 transition-colors"
                                >
                                    <div class="font-semibold text-primary">{{ formatDisk(server.disk) }}</div>
                                    <div class="text-muted-foreground">{{ $t('servers.disk') }}</div>
                                </div>
                                <div
                                    class="text-center p-2 bg-muted/50 rounded-lg border border-border/50 group-hover:bg-muted/70 transition-colors"
                                >
                                    <div class="font-semibold text-primary">{{ server.cpu }}%</div>
                                    <div class="text-muted-foreground">{{ $t('servers.cpu') }}</div>
                                </div>
                            </div>

                            <!-- Spell Info -->
                            <div class="flex items-center gap-2 text-sm">
                                <Sparkles class="h-4 w-4 text-muted-foreground" />
                                <span class="text-muted-foreground">{{ $t('servers.spell') }}:</span>
                                <span class="font-medium truncate">{{ server.spell?.name || 'N/A' }}</span>
                            </div>

                            <!-- Click indicator -->
                            <div class="flex items-center justify-end pt-2">
                                <div class="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                                    {{ $t('servers.clickToView') }} →
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <!-- Pagination -->
            <div v-if="pagination.total_pages > 1" class="flex items-center justify-between">
                <div class="text-sm text-muted-foreground">
                    {{
                        $t('servers.showing', {
                            from: pagination.from,
                            to: pagination.to,
                            total: pagination.total_records,
                        })
                    }}
                </div>
                <div class="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        :disabled="!pagination.has_prev"
                        @click="changePage(pagination.current_page - 1)"
                    >
                        <ChevronLeft class="h-4 w-4" />
                        {{ $t('servers.previous') }}
                    </Button>
                    <div class="flex items-center gap-1">
                        <span class="text-sm font-medium">{{ pagination.current_page }}</span>
                        <span class="text-sm text-muted-foreground">/</span>
                        <span class="text-sm text-muted-foreground">{{ pagination.total_pages }}</span>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        :disabled="!pagination.has_next"
                        @click="changePage(pagination.current_page + 1)"
                    >
                        {{ $t('servers.next') }}
                        <ChevronRight class="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else class="flex items-center justify-center py-12">
            <div class="text-center">
                <Server class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 class="text-lg font-semibold mb-2">{{ $t('servers.noServers') }}</h3>
                <p class="text-sm text-muted-foreground">{{ $t('servers.noServersDescription') }}</p>
            </div>
        </div>

        <!-- No Search Results -->
        <div
            v-if="!loading && !error && filteredServers.length === 0 && servers.length > 0"
            class="flex items-center justify-center py-12"
        >
            <div class="text-center">
                <Search class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 class="text-lg font-semibold mb-2">{{ $t('servers.noSearchResults') }}</h3>
                <p class="text-sm text-muted-foreground">{{ $t('servers.tryDifferentSearch') }}</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useSessionStore } from '@/stores/session';
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, RefreshCw, Server, Hash, Sparkles, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import axios from 'axios';

const sessionStore = useSessionStore();
const router = useRouter();

// Define emits
const emit = defineEmits<{
    'servers-updated': [servers: Server[]];
}>();

interface ServerNode {
    id: number;
    name: string;
    fqdn: string;
}

interface ServerRealm {
    id: number;
    name: string;
}

interface ServerSpell {
    id: number;
    name: string;
}

interface ServerAllocation {
    id: number;
    ip: string;
    port: number;
}

interface Server {
    id: number;
    name: string;
    uuidShort: string;
    description: string;
    status: string;
    memory: number;
    disk: number;
    cpu: number;
    node_id: number;
    realms_id: number;
    spell_id: number;
    allocation_id: number;
    node?: ServerNode;
    realm?: ServerRealm;
    spell?: ServerSpell;
    allocation?: ServerAllocation;
    created_at: string;
    updated_at: string;
}

interface Pagination {
    current_page: number;
    per_page: number;
    total_records: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
    from: number;
    to: number;
}

const servers = ref<Server[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const searchQuery = ref('');
const currentPage = ref(1);
const pagination = ref<Pagination>({
    current_page: 1,
    per_page: 10,
    total_records: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false,
    from: 0,
    to: 0,
});

const filteredServers = computed(() => {
    if (!searchQuery.value.trim()) {
        return servers.value;
    }
    const query = searchQuery.value.toLowerCase();
    return servers.value.filter(
        (server) =>
            server.name.toLowerCase().includes(query) ||
            server.description?.toLowerCase().includes(query) ||
            server.node?.name.toLowerCase().includes(query) ||
            server.realm?.name.toLowerCase().includes(query) ||
            server.spell?.name.toLowerCase().includes(query),
    );
});

onMounted(async () => {
    await sessionStore.checkSessionOrRedirect();
    await fetchServers();
});

// Watch for servers changes and emit updates
watch(
    servers,
    (newServers) => {
        emit('servers-updated', newServers);
    },
    { immediate: true },
);

async function fetchServers() {
    loading.value = true;
    error.value = null;

    try {
        const response = await axios.get('/api/user/servers', {
            params: {
                page: currentPage.value,
                limit: pagination.value.per_page,
                search: searchQuery.value.trim(),
            },
        });

        if (response.data.success) {
            servers.value = response.data.data.servers;
            pagination.value = response.data.data.pagination;
        } else {
            error.value = response.data.message || 'Failed to fetch servers';
        }
    } catch (err: unknown) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        error.value = axiosError.response?.data?.message || 'An error occurred while fetching servers';
    } finally {
        loading.value = false;
    }
}

function handleSearch() {
    currentPage.value = 1;
    fetchServers();
}

async function changePage(page: number) {
    currentPage.value = page;
    await fetchServers();
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
        case 'running':
            return 'default';
        case 'stopped':
            return 'secondary';
        case 'installing':
            return 'outline';
        case 'error':
            return 'destructive';
        default:
            return 'outline';
    }
}

function formatMemory(memory: number): string {
    if (memory >= 1024) {
        return `${(memory / 1024).toFixed(1)} GB`;
    }
    return `${memory} MB`;
}

function formatDisk(disk: number): string {
    if (disk >= 1024) {
        return `${(disk / 1024).toFixed(1)} GB`;
    }
    return `${disk} MB`;
}

function openServerDetails(server: Server) {
    router.push(`/server/${server.uuidShort}`);
}
</script>
