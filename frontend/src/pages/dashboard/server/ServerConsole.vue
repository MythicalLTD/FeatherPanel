<!-- eslint-disable vue/no-v-html -->
<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6">
            <!-- Customization Toggle Button -->
            <div class="flex justify-end">
                <Button
                    variant="outline"
                    size="sm"
                    class="w-full sm:w-auto"
                    @click="showCustomization = !showCustomization"
                >
                    <Settings class="h-4 w-4 mr-2" />
                    <span class="hidden sm:inline">{{
                        showCustomization ? t('serverConsole.hideLayout') : t('serverConsole.customizeLayout')
                    }}</span>
                    <span class="sm:hidden">{{
                        showCustomization ? t('serverConsole.hideLayout') : t('serverConsole.customizeLayout')
                    }}</span>
                </Button>
            </div>

            <!-- Customization Panel -->
            <Card v-if="showCustomization" class="p-4 sm:p-6">
                <CardHeader>
                    <CardTitle class="flex items-center gap-2">
                        <Settings class="h-5 w-5" />
                        {{ t('serverConsole.customizeLayout') }}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        <!-- Component Visibility -->
                        <div class="space-y-4">
                            <div>
                                <h4 class="font-medium text-sm">{{ t('serverConsole.componentVisibility') }}</h4>
                                <p class="text-xs text-muted-foreground mt-1">
                                    {{ t('serverConsole.componentVisibilityDescription') }}
                                </p>
                            </div>
                            <div class="space-y-3">
                                <div class="space-y-2">
                                    <Label for="wingsStatus">{{ t('serverConsole.wingsConnectionStatus') }}</Label>
                                    <Select
                                        :model-value="customization.components.wingsStatus ? 'hide' : 'show'"
                                        @update:model-value="
                                            (value) => {
                                                customization.components.wingsStatus = value === 'hide';
                                            }
                                        "
                                    >
                                        <SelectTrigger>
                                            <SelectValue
                                                :placeholder="
                                                    customization.components.wingsStatus
                                                        ? t('serverConsole.hide')
                                                        : t('serverConsole.show')
                                                "
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="show">{{ t('serverConsole.show') }}</SelectItem>
                                            <SelectItem value="hide">{{ t('serverConsole.hide') }}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div class="space-y-2">
                                    <Label for="serverInfo">{{ t('serverConsole.serverInfoCards') }}</Label>
                                    <Select
                                        :model-value="customization.components.serverInfo ? 'hide' : 'show'"
                                        @update:model-value="
                                            (value) => {
                                                customization.components.serverInfo = value === 'hide';
                                            }
                                        "
                                    >
                                        <SelectTrigger>
                                            <SelectValue
                                                :placeholder="
                                                    customization.components.serverInfo
                                                        ? t('serverConsole.hide')
                                                        : t('serverConsole.show')
                                                "
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="show">{{ t('serverConsole.show') }}</SelectItem>
                                            <SelectItem value="hide">{{ t('serverConsole.hide') }}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div class="space-y-2">
                                    <Label for="terminal">{{ t('serverConsole.terminalConsole') }}</Label>
                                    <Select
                                        :model-value="customization.components.terminal ? 'hide' : 'show'"
                                        @update:model-value="
                                            (value) => {
                                                customization.components.terminal = value === 'hide';
                                            }
                                        "
                                    >
                                        <SelectTrigger>
                                            <SelectValue
                                                :placeholder="
                                                    customization.components.terminal
                                                        ? t('serverConsole.hide')
                                                        : t('serverConsole.show')
                                                "
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="show">{{ t('serverConsole.show') }}</SelectItem>
                                            <SelectItem value="hide">{{ t('serverConsole.hide') }}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div class="space-y-2">
                                    <Label for="performance">{{ t('serverConsole.performanceMonitoring') }}</Label>
                                    <Select
                                        :model-value="customization.components.performance ? 'hide' : 'show'"
                                        @update:model-value="
                                            (value) => {
                                                customization.components.performance = value === 'hide';
                                            }
                                        "
                                    >
                                        <SelectTrigger>
                                            <SelectValue
                                                :placeholder="
                                                    customization.components.performance
                                                        ? t('serverConsole.hide')
                                                        : t('serverConsole.show')
                                                "
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="show">{{ t('serverConsole.show') }}</SelectItem>
                                            <SelectItem value="hide">{{ t('serverConsole.hide') }}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <!-- Terminal Settings -->
                        <div class="space-y-4">
                            <h4 class="font-medium text-sm">{{ t('serverConsole.terminalSettings') }}</h4>
                            <div class="space-y-3">
                                <div class="space-y-2">
                                    <Label for="autoScroll">{{ t('serverConsole.autoScrollToBottom') }}</Label>
                                    <Select
                                        :model-value="customization.terminal.autoScroll ? 'enabled' : 'disabled'"
                                        @update:model-value="
                                            (value) => {
                                                customization.terminal.autoScroll = value === 'enabled';
                                            }
                                        "
                                    >
                                        <SelectTrigger>
                                            <SelectValue
                                                :placeholder="
                                                    customization.terminal.autoScroll
                                                        ? t('serverConsole.enabled')
                                                        : t('serverConsole.disabled')
                                                "
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="enabled">{{ t('serverConsole.enabled') }}</SelectItem>
                                            <SelectItem value="disabled">{{ t('serverConsole.disabled') }}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div class="space-y-2">
                                    <Label for="showTimestamps">{{ t('serverConsole.showTimestamps') }}</Label>
                                    <Select
                                        :model-value="customization.terminal.showTimestamps ? 'enabled' : 'disabled'"
                                        @update:model-value="
                                            (value) => {
                                                customization.terminal.showTimestamps = value === 'enabled';
                                            }
                                        "
                                    >
                                        <SelectTrigger>
                                            <SelectValue
                                                :placeholder="
                                                    customization.terminal.showTimestamps
                                                        ? t('serverConsole.enabled')
                                                        : t('serverConsole.disabled')
                                                "
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="enabled">{{ t('serverConsole.enabled') }}</SelectItem>
                                            <SelectItem value="disabled">{{ t('serverConsole.disabled') }}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div class="space-y-2">
                                    <Label for="maxLines">{{ t('serverConsole.maxTerminalLines') }}</Label>
                                    <Select
                                        :model-value="customization.terminal.maxLines"
                                        @update:model-value="
                                            (value) => {
                                                customization.terminal.maxLines = Number(value);
                                            }
                                        "
                                    >
                                        <SelectTrigger>
                                            <SelectValue :placeholder="customization.terminal.maxLines.toString()" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem :value="500">{{ t('serverConsole.maxLines500') }}</SelectItem>
                                            <SelectItem :value="1000">{{ t('serverConsole.maxLines1000') }}</SelectItem>
                                            <SelectItem :value="2000">{{ t('serverConsole.maxLines2000') }}</SelectItem>
                                            <SelectItem :value="5000">{{ t('serverConsole.maxLines5000') }}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <!-- Performance Chart Settings -->
                        <div class="space-y-4">
                            <h4 class="font-medium text-sm">{{ t('serverConsole.performanceCharts') }}</h4>
                            <div class="space-y-3">
                                <div class="space-y-2">
                                    <Label for="showCPU">{{ t('serverConsole.showCPUChart') }}</Label>
                                    <Select
                                        :model-value="customization.charts.showCPU ? 'enabled' : 'disabled'"
                                        @update:model-value="
                                            (value) => {
                                                customization.charts.showCPU = value === 'enabled';
                                            }
                                        "
                                    >
                                        <SelectTrigger>
                                            <SelectValue
                                                :placeholder="
                                                    customization.charts.showCPU
                                                        ? t('serverConsole.enabled')
                                                        : t('serverConsole.disabled')
                                                "
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="enabled">{{ t('serverConsole.enabled') }}</SelectItem>
                                            <SelectItem value="disabled">{{ t('serverConsole.disabled') }}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div class="space-y-2">
                                    <Label for="showMemory">{{ t('serverConsole.showMemoryChart') }}</Label>
                                    <Select
                                        :model-value="customization.charts.showMemory ? 'enabled' : 'disabled'"
                                        @update:model-value="
                                            (value) => {
                                                customization.charts.showMemory = value === 'enabled';
                                            }
                                        "
                                    >
                                        <SelectTrigger>
                                            <SelectValue
                                                :placeholder="
                                                    customization.charts.showMemory
                                                        ? t('serverConsole.enabled')
                                                        : t('serverConsole.disabled')
                                                "
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="enabled">{{ t('serverConsole.enabled') }}</SelectItem>
                                            <SelectItem value="disabled">{{ t('serverConsole.disabled') }}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div class="space-y-2">
                                    <Label for="showDisk">{{ t('serverConsole.showDiskChart') }}</Label>
                                    <Select
                                        :model-value="customization.charts.showDisk ? 'enabled' : 'disabled'"
                                        @update:model-value="
                                            (value) => {
                                                customization.charts.showDisk = value === 'enabled';
                                            }
                                        "
                                    >
                                        <SelectTrigger>
                                            <SelectValue
                                                :placeholder="
                                                    customization.charts.showDisk
                                                        ? t('serverConsole.enabled')
                                                        : t('serverConsole.disabled')
                                                "
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="enabled">{{ t('serverConsole.enabled') }}</SelectItem>
                                            <SelectItem value="disabled">{{ t('serverConsole.disabled') }}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div class="space-y-2">
                                    <Label for="showNetwork">{{ t('serverConsole.showNetworkChart') }}</Label>
                                    <Select
                                        :model-value="customization.charts.showNetwork ? 'enabled' : 'disabled'"
                                        @update:model-value="
                                            (value) => {
                                                customization.charts.showNetwork = value === 'enabled';
                                            }
                                        "
                                    >
                                        <SelectTrigger>
                                            <SelectValue
                                                :placeholder="
                                                    customization.charts.showNetwork
                                                        ? t('serverConsole.enabled')
                                                        : t('serverConsole.disabled')
                                                "
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="enabled">{{ t('serverConsole.enabled') }}</SelectItem>
                                            <SelectItem value="disabled">{{ t('serverConsole.disabled') }}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div class="space-y-2">
                                    <Label for="dataPoints">{{ t('serverConsole.dataPoints') }}</Label>
                                    <Select
                                        :model-value="customization.charts.dataPoints"
                                        @update:model-value="
                                            (value) => {
                                                customization.charts.dataPoints = Number(value);
                                            }
                                        "
                                    >
                                        <SelectTrigger>
                                            <SelectValue :placeholder="customization.charts.dataPoints.toString()" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem :value="30">{{ t('serverConsole.dataPoints30') }}</SelectItem>
                                            <SelectItem :value="60">{{ t('serverConsole.dataPoints60') }}</SelectItem>
                                            <SelectItem :value="120">{{ t('serverConsole.dataPoints120') }}</SelectItem>
                                            <SelectItem :value="300">{{ t('serverConsole.dataPoints300') }}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Console Filters Section -->
                    <div class="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t">
                        <h4 class="font-medium text-sm mb-4">{{ t('serverConsole.consoleFilters') }}</h4>
                        <div class="space-y-4">
                            <!-- Add New Filter -->
                            <div class="flex flex-col sm:flex-row gap-2">
                                <Input
                                    v-model="newFilter.pattern"
                                    :placeholder="t('serverConsole.filterPattern')"
                                    class="flex-1"
                                />
                                <div class="flex gap-2">
                                    <Select
                                        :model-value="newFilter.type"
                                        @update:model-value="
                                            (value) => (newFilter.type = value as 'hide' | 'replace' | 'highlight')
                                        "
                                    >
                                        <SelectTrigger class="w-full sm:w-32">
                                            <SelectValue :placeholder="t('serverConsole.filterType')" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="hide">{{ t('serverConsole.hide') }}</SelectItem>
                                            <SelectItem value="replace">{{ t('serverConsole.replace') }}</SelectItem>
                                            <SelectItem value="highlight">{{
                                                t('serverConsole.highlight')
                                            }}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        v-if="newFilter.type === 'replace'"
                                        v-model="newFilter.replacement"
                                        :placeholder="t('serverConsole.replacementText')"
                                        class="w-full sm:w-32"
                                    />
                                </div>
                                <Button size="sm" class="w-full sm:w-auto" @click="addFilter">
                                    <Plus class="h-4 w-4 mr-2" />
                                    {{ t('serverConsole.addFilter') }}
                                </Button>
                            </div>

                            <!-- Active Filters -->
                            <div v-if="customization.terminal.filters.length > 0" class="space-y-2">
                                <div
                                    v-for="(filter, index) in customization.terminal.filters"
                                    :key="index"
                                    class="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                                >
                                    <div class="flex-1 min-w-0">
                                        <div class="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                                            <Badge :variant="getFilterBadgeVariant(filter.type)" class="w-fit">
                                                {{ t(`serverConsole.${filter.type}`) }}
                                            </Badge>
                                            <span class="text-sm font-mono break-all">{{ filter.pattern }}</span>
                                        </div>
                                        <div v-if="filter.type === 'replace'" class="text-xs text-muted-foreground">
                                            → {{ filter.replacement }}
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        class="w-full sm:w-auto"
                                        @click="removeFilter(index)"
                                    >
                                        <Trash2 class="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Reset Button -->
                    <div class="mt-6 pt-4 border-t flex flex-col sm:flex-row gap-3">
                        <Button
                            variant="outline"
                            class="w-full sm:w-auto"
                            @click="async () => await resetCustomization()"
                        >
                            <RotateCcw class="h-4 w-4 mr-2" />
                            {{ t('serverConsole.resetToDefaults') }}
                        </Button>

                        <Button class="w-full sm:flex-1" @click="async () => await saveAndApplyCustomization()">
                            <Save class="h-4 w-4 mr-2" />
                            {{ t('serverConsole.saveAndApply') }}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <!-- Header Section -->
            <ServerHeader
                v-if="!customization.components.serverHeader"
                :server="server"
                :loading="loading"
                :wings-state="wingsState"
                @start="startServer"
                @restart="restartServer"
                @stop="stopServer"
                @kill="killServer"
            />

            <!-- Wings Connection Status Banner -->
            <div
                v-if="!customization.components.wingsStatus"
                class="flex items-start sm:items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border"
                :class="{
                    'border-green-200 bg-green-50 dark:bg-green-900/20': wingsConnectionInfo.status === 'healthy',
                    'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20': wingsConnectionInfo.status === 'error',
                    'border-red-200 bg-red-50 dark:bg-red-900/20': wingsConnectionInfo.status === 'disconnected',
                    'border-blue-200 bg-blue-50 dark:bg-blue-900/20': wingsConnectionInfo.status === 'connecting',
                }"
            >
                <span class="text-lg flex-shrink-0">{{ wingsConnectionInfo.icon }}</span>
                <span class="text-sm font-medium flex-1 min-w-0" :class="wingsConnectionInfo.color">
                    {{ wingsConnectionInfo.message }}
                </span>
                <div v-if="wingsConnectionInfo.status === 'connecting'" class="flex-shrink-0">
                    <div class="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
            </div>

            <!-- Server Info Cards -->
            <ServerInfoCards
                v-if="!customization.components.serverInfo"
                :server="server"
                :wings-uptime="wingsUptime"
                :wings-state="wingsState"
            />

            <!-- Terminal Console -->
            <div v-if="!customization.components.terminal" class="space-y-4">
                <ServerTerminal
                    :terminal-lines="filteredTerminalLines"
                    :wings-web-socket="wingsWebSocket"
                    :show-timestamps="customization.terminal.showTimestamps"
                    @clear="clearTerminal"
                    @download-logs="downloadLogs"
                />
            </div>

            <!-- Performance Monitoring -->
            <ServerPerformance
                v-if="!customization.components.performance"
                :server="server"
                :cpu-data="filteredCpuData"
                :memory-data="filteredMemoryData"
                :disk-data="filteredDiskData"
                :network-data="filteredNetworkData"
                :network-stats="networkStats"
                :show-cpu="customization.charts.showCPU"
                :show-memory="customization.charts.showMemory"
                :show-disk="customization.charts.showDisk"
                :show-network="customization.charts.showNetwork"
            />
        </div>
    </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import ServerHeader from '@/components/server/ServerHeader.vue';
import ServerInfoCards from '@/components/server/ServerInfoCards.vue';
import ServerPerformance from '@/components/server/ServerPerformance.vue';
import ServerTerminal from '@/components/server/ServerTerminal.vue';
import { Button } from '@/components/ui/button';
import { Settings, RotateCcw, Save } from 'lucide-vue-next';
import axios from 'axios';
import { useToast } from 'vue-toastification';
import { useI18n } from 'vue-i18n';
import type { Server, NetworkStats, TerminalLine } from '@/types/server';
import { useWingsWebSocket, type WingsStats } from '@/composables/useWingsWebSocket';
import Convert from 'ansi-to-html';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-vue-next';

// Filter interfaces
interface ConsoleFilter {
    pattern: string;
    type: 'hide' | 'replace' | 'highlight';
    replacement?: string;
}

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();
const settingsStore = useSettingsStore();
const { t } = useI18n();
const toast = useToast();

// Customization system
const showCustomization = ref(false);
const customization = ref({
    components: {
        serverHeader: false, // false = visible by default
        wingsStatus: false, // false = visible by default
        serverInfo: false, // false = visible by default
        terminal: false, // false = visible by default
        performance: false, // false = visible by default
    },
    terminal: {
        autoScroll: true, // enabled by default
        showTimestamps: false, // disabled by default
        maxLines: 100, // 100 by default
        filters: [] as ConsoleFilter[],
    },
    charts: {
        showCPU: true, // shown by default
        showMemory: true, // shown by default
        showDisk: true, // shown by default
        showNetwork: true, // shown by default
        dataPoints: 60, // 60 by default (good as is)
    },
});

// New filter for adding/editing filters
const newFilter = ref<ConsoleFilter>({
    pattern: '',
    type: 'hide',
    replacement: '',
});

// Flag to track if user is navigating away
const isNavigatingAway = ref(false);

// Track if WebSocket handlers are set up to prevent duplicates
const handlersSetup = ref(false);
let messageHandler: ((event: MessageEvent) => void) | null = null;

const server = ref<Server | null>(null);
const loading = ref(false);
const terminalLines = ref<TerminalLine[]>([]);
const networkStats = ref<NetworkStats>({
    upload: '0 B',
    download: '0 B',
});

// Wings real-time data
const wingsState = ref<string>('');
const wingsUptime = ref<number>(0);

// Terminal and WebSocket functionality
const wingsWebSocket = useWingsWebSocket(route.params.uuidShort as string, isNavigatingAway);

// Stats request interval
let statsInterval: number | null = null;

// Real-time performance data
const cpuData = ref<Array<{ timestamp: number; value: number }>>([]);
const memoryData = ref<Array<{ timestamp: number; value: number }>>([]);
const diskData = ref<Array<{ timestamp: number; value: number }>>([]);
const networkData = ref<Array<{ timestamp: number; value: number }>>([]);

// Performance data configuration - now dynamic based on customization
const maxDataPoints = computed(() => customization.value.charts.dataPoints);

// Initialize charts with initial data point so they always display
const initTimestamp = Date.now();
cpuData.value.push({ timestamp: initTimestamp, value: 0 });
memoryData.value.push({ timestamp: initTimestamp, value: 0 });
diskData.value.push({ timestamp: initTimestamp, value: 0 });
networkData.value.push({ timestamp: initTimestamp, value: 0 });

// Filtered data based on customization
const filteredCpuData = computed(() => (customization.value.charts.showCPU ? cpuData.value : []));
const filteredMemoryData = computed(() => (customization.value.charts.showMemory ? memoryData.value : []));
const filteredDiskData = computed(() => (customization.value.charts.showDisk ? diskData.value : []));
const filteredNetworkData = computed(() => (customization.value.charts.showNetwork ? networkData.value : []));

// Filtered terminal lines based on customization
const filteredTerminalLines = computed(() => {
    let lines = terminalLines.value;

    // Apply max lines limit
    if (lines.length > customization.value.terminal.maxLines) {
        lines = lines.slice(-customization.value.terminal.maxLines);
    }

    // Apply filters
    if (customization.value.terminal.filters.length > 0) {
        lines = lines.filter((line) => {
            const content = line.content;

            // Check if any hide filters match
            const hideFilters = customization.value.terminal.filters.filter((f) => f.type === 'hide');
            for (const filter of hideFilters) {
                try {
                    const regex = new RegExp(filter.pattern, 'i');
                    if (regex.test(content)) {
                        return false; // Hide this line
                    }
                } catch {
                    // Invalid regex, skip this filter
                    console.warn('Invalid regex pattern:', filter.pattern);
                }
            }

            return true; // Show this line
        });

        // Apply replacements and highlights
        lines = lines.map((line) => {
            let processedContent = line.content;

            // Apply replace filters
            const replaceFilters = customization.value.terminal.filters.filter((f) => f.type === 'replace');
            for (const filter of replaceFilters) {
                try {
                    const regex = new RegExp(filter.pattern, 'gi');
                    processedContent = processedContent.replace(regex, filter.replacement || '');
                } catch {
                    console.warn('Invalid regex pattern:', filter.pattern);
                }
            }

            // Apply highlight filters (wrap in span with highlight class)
            const highlightFilters = customization.value.terminal.filters.filter((f) => f.type === 'highlight');
            for (const filter of highlightFilters) {
                try {
                    const regex = new RegExp(filter.pattern, 'gi');
                    processedContent = processedContent.replace(
                        regex,
                        '<span class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">$&</span>',
                    );
                } catch {
                    console.warn('Invalid regex pattern:', filter.pattern);
                }
            }

            return {
                ...line,
                content: processedContent,
            };
        });
    }

    return lines;
});

// ANSI to HTML converter
const ansiConverter = new Convert({
    fg: '#d1d5db', // Default text color (gray-300)
    bg: '#000000', // Default background color (black)
    newline: false,
    escapeXML: true,
    stream: true,
});

const breadcrumbs = computed(() => [
    { text: t('common.dashboard'), href: '/dashboard' },
    { text: t('common.servers'), href: '/dashboard' },
    { text: server.value?.name || t('common.server'), href: `/server/${route.params.uuidShort}` },
    { text: t('common.console'), isCurrent: true, href: `/server/${route.params.uuidShort}` },
]);

// Wings connection status display
const wingsConnectionInfo = computed(() => {
    if (!wingsWebSocket.isConnected) {
        return {
            status: 'disconnected',
            message: 'Wings daemon disconnected - Using API fallback mode',
            color: 'text-red-500',
            icon: '🔌',
        };
    } else if (wingsWebSocket.wingsStatus?.value === 'healthy') {
        return {
            status: 'healthy',
            message: 'Wings daemon connected - Server management available',
            color: 'text-green-500',
            icon: '✅',
        };
    } else if (wingsWebSocket.wingsStatus?.value === 'error') {
        return {
            status: 'error',
            message: 'Wings daemon error - Limited functionality',
            color: 'text-yellow-500',
            icon: '⚠️',
        };
    } else {
        return {
            status: 'connecting',
            message: 'Connecting to Wings daemon...',
            color: 'text-blue-500',
            icon: '🔄',
        };
    }
});

// Watch for customization changes to debug
watch(
    customization,
    (newVal) => {
        console.log('Customization changed:', newVal);
    },
    { deep: true },
);

// Customization functions
async function saveCustomization(): Promise<void> {
    try {
        const customizationData = {
            components: customization.value.components,
            terminal: customization.value.terminal,
            charts: customization.value.charts,
        };

        // Save to localStorage for immediate use
        localStorage.setItem('featherpanel-console-customization', JSON.stringify(customizationData));

        console.log('Console customization saved:', customizationData);
        console.log('Filters saved:', customization.value.terminal.filters);
    } catch (error) {
        console.error('Error saving console customization:', error);
    }
}

async function loadCustomization(): Promise<void> {
    try {
        // Fallback to localStorage for backward compatibility
        const localSaved = localStorage.getItem('featherpanel-console-customization');
        if (localSaved) {
            const parsed = JSON.parse(localSaved);
            console.log('Loading from localStorage (fallback):', parsed);

            // Type guard to ensure parsed data has the expected structure
            if (
                parsed &&
                typeof parsed === 'object' &&
                'components' in parsed &&
                'terminal' in parsed &&
                'charts' in parsed
            ) {
                const typedParsed = parsed as {
                    components: Record<string, boolean>;
                    terminal: Record<string, unknown>;
                    charts: Record<string, unknown>;
                };

                customization.value = {
                    components: { ...customization.value.components, ...typedParsed.components },
                    terminal: {
                        ...customization.value.terminal,
                        ...typedParsed.terminal,
                        filters: (typedParsed.terminal?.filters as ConsoleFilter[]) || [],
                    },
                    charts: { ...customization.value.charts, ...typedParsed.charts },
                };
            } else {
                console.warn('Invalid customization data structure in localStorage, using defaults');
            }
        } else {
            console.log('No saved customization found, using defaults');
        }
    } catch (error) {
        console.error('Error loading console customization:', error);
    }
}

async function resetCustomization(): Promise<void> {
    customization.value = {
        components: {
            serverHeader: false, // false = visible by default
            wingsStatus: false, // false = visible by default
            serverInfo: false, // false = visible by default
            terminal: false, // false = visible by default
            performance: false, // false = visible by default
        },
        terminal: {
            autoScroll: true, // enabled by default
            showTimestamps: false, // disabled by default

            maxLines: 100, // 100 by default
            filters: [],
        },
        charts: {
            showCPU: true, // shown by default
            showMemory: true, // shown by default
            showDisk: true, // shown by default
            showNetwork: true, // shown by default
            dataPoints: 60, // 60 by default (good as is)
        },
    };
    await saveCustomization();
    toast.success(t('serverConsole.layoutResetToDefaults'));
}

async function saveAndApplyCustomization(): Promise<void> {
    await saveCustomization();
    toast.success(t('serverConsole.customizationSaved'));
    // No immediate re-render needed, customization is reactive
}

onMounted(async () => {
    await sessionStore.checkSessionOrRedirect(router);
    await settingsStore.fetchSettings(); // Load settings for app name

    // Load customization settings
    await loadCustomization();

    await fetchServer();

    // Set up navigation detection to prevent false "lost connection" messages
    const unsubscribe = router.beforeEach((to, from, next) => {
        if (from.path.includes('/server/')) {
            isNavigatingAway.value = true;
        }
        next();
    });

    // Clean up navigation listener on unmount
    onUnmounted(() => {
        unsubscribe();
    });

    // Always try to connect to Wings daemon - it's always online and can handle all requests
    await wingsWebSocket.connect();

    // Always request stats and logs - Wings will handle if server is offline gracefully
    requestServerStats();
    requestServerLogs();

    // Always set up periodic stats requests every 5 seconds - Wings handles offline servers
    statsInterval = setInterval(() => {
        if (wingsWebSocket.isConnected) {
            requestServerStats();
        }
    }, 5000);

    // Add informative message for offline servers
    if (server.value?.status !== 'running') {
        addTerminalLine(t('serverConsole.consoleReadyOffline'), 'info');

        // Initialize performance charts with zero data for offline servers
        const timestamp = Date.now();
        addDataPoint(cpuData.value, timestamp, 0);
        addDataPoint(memoryData.value, timestamp, 0);
        addDataPoint(diskData.value, timestamp, 0);
        addDataPoint(networkData.value, timestamp, 0);
    }

    // Set up WebSocket handlers when websocket becomes available
    watch(
        () => wingsWebSocket.websocket.value,
        (newWebSocket) => {
            if (newWebSocket) {
                setupWebSocketHandlers();
            }
        },
        { immediate: true },
    );

    // Re-setup handlers on reconnection and handle connection status changes
    watch(
        () => wingsWebSocket.isConnected.value,
        (isConnected, wasConnected) => {
            if (isConnected && wasConnected === false) {
                // Reconnected - setup handlers again and log the reconnection
                if (wingsWebSocket.websocket.value) {
                    setupWebSocketHandlers();
                }
                console.log('WebSocket reconnected, checking Wings health...');
            }
        },
    );

    // Watch for connection status changes
    watch(
        () => wingsWebSocket.isReconnecting.value,
        (isReconnecting) => {
            if (isReconnecting) {
                // Don't spam users with reconnection attempts - just log it
                console.log(`Reconnecting to Wings daemon... (${wingsWebSocket.reconnectAttempts.value}/5)`);
            }
        },
    );

    // Watch Wings health status for critical changes
    watch(
        () => wingsWebSocket.wingsStatus?.value,
        (wingsStatus, previousStatus) => {
            if (wingsStatus === 'error' && previousStatus === 'healthy') {
                toast.error('⚠️ Wings daemon stopped responding - switching to API fallback mode');
            } else if (wingsStatus === 'healthy' && previousStatus === 'error') {
                // Don't show success toast for recovery - users can see the banner status
                console.log('Wings daemon recovered and is healthy again');
            }
        },
    );
});

onUnmounted(() => {
    // Clean up message handler
    if (messageHandler && wingsWebSocket.websocket.value) {
        wingsWebSocket.websocket.value.removeEventListener('message', messageHandler);
    }
    handlersSetup.value = false;
    messageHandler = null;

    wingsWebSocket.cleanup();
    if (statsInterval) {
        clearInterval(statsInterval);
        statsInterval = null;
    }
});

async function fetchServer(): Promise<void> {
    loading.value = true;
    try {
        const response = await axios.get(`/api/user/servers/${route.params.uuidShort}`);
        if (response.data.success) {
            server.value = response.data.data;
            // Wings connection is handled in onMounted - no need for conditional logic here
        } else {
            toast.error(t('serverConsole.failedToFetch'));
            router.push('/dashboard');
        }
    } catch {
        toast.error(t('serverConsole.failedToFetch'));
        router.push('/dashboard');
    } finally {
        loading.value = false;
    }
}

function setupWebSocketHandlers(): void {
    if (!wingsWebSocket.websocket.value) return;

    // Remove old handler if it exists to prevent duplicates
    if (messageHandler && handlersSetup.value) {
        wingsWebSocket.websocket.value.removeEventListener('message', messageHandler);
    }

    // Create new message handler
    messageHandler = (event) => {
        try {
            const data = JSON.parse(event.data);

            if (data.event === 'console output') {
                // Handle console output from Wings
                const output = data.args[0];
                console.log(`Received console output: "${output}"`);

                // Filter out command echoes - don't show output that matches recent commands
                const trimmedOutput = output.trim();

                // Since console is read-only, we don't need to filter command echoes
                const isCommandEcho = false;

                if (!isCommandEcho) {
                    // Clean up Wings daemon console output prefixes before adding to terminal
                    const cleanedOutput = output.replace(/^>\s*/gm, '');
                    addTerminalLine(cleanedOutput, 'output');
                } else {
                    console.log(`Filtered out command echo: "${trimmedOutput}"`);
                }
            } else if (data.event === 'status') {
                // Update server status and Wings state
                const newStatus = data.args[0];
                wingsState.value = newStatus;
                if (server.value) {
                    server.value.status = newStatus;
                }

                // Add status change to terminal
                addTerminalLine(t('serverConsole.statusChanged', { status: newStatus }), 'info');

                // Handle specific status transitions
                if (newStatus === 'running') {
                    // Server is now running - request logs and start stats collection
                    requestServerLogs();
                    if (!statsInterval) {
                        statsInterval = setInterval(() => {
                            if (wingsWebSocket.isConnected) {
                                requestServerStats();
                            }
                        }, 5000);
                    }
                } else if (newStatus === 'offline' || newStatus === 'stopped') {
                    // Server is offline - stop stats collection
                    if (statsInterval) {
                        clearInterval(statsInterval);
                        statsInterval = null;
                    }
                }
            } else if (data.event === 'stats') {
                // Update real-time stats
                try {
                    const stats: WingsStats = JSON.parse(data.args[0]);
                    updateServerStats(stats);
                    updatePerformanceCharts(stats);

                    // Update Wings state and uptime
                    wingsState.value = stats.state;
                    wingsUptime.value = stats.uptime;
                } catch (parseError) {
                    console.warn('Failed to parse stats:', parseError);
                }
            } else if (data.event === 'daemon error') {
                addTerminalLine(t('serverConsole.daemonError', { message: String(data.args?.[0] ?? '') }), 'error');
            } else if (data.event === 'jwt error') {
                addTerminalLine(t('serverConsole.jwtError', { message: String(data.args?.[0] ?? '') }), 'error');
                toast.error(t('serverConsole.authErrorRefresh'));
            } else if (data.event === 'token expiring') {
                addTerminalLine(t('serverConsole.tokenExpiringReconnecting'), 'warning');
                // Token expiration is handled automatically by the WebSocket composable
            } else if (data.event === 'token expired') {
                addTerminalLine(t('serverConsole.tokenExpiredRefresh'), 'error');
                // Page reload is handled automatically by the WebSocket composable
            } else if (data.event === 'install started') {
                addTerminalLine(t('serverConsole.installStarted'), 'info');
            } else if (data.event === 'install output') {
                addTerminalLine(data.args[0], 'info');
            } else if (data.event === 'install completed') {
                addTerminalLine(t('serverConsole.installCompleted'), 'info');
                toast.success(t('serverConsole.installCompleted'));
            } else if (data.event === 'backup completed') {
                addTerminalLine(t('serverConsole.backupCompleted'), 'info');
                toast.success(t('serverConsole.backupCompleted'));
            } else if (data.event === 'transfer status') {
                addTerminalLine(t('serverConsole.transferStatus', { status: String(data.args?.[0] ?? '') }), 'info');
            } else if (data.event === 'transfer logs') {
                addTerminalLine(data.args[0], 'info');
            } else if (data.event === 'deleted') {
                addTerminalLine(t('serverConsole.serverDeleted'), 'error');
                toast.error(t('serverConsole.serverDeleted'));
                router.push('/dashboard');
            }
        } catch {
            // Handle raw text output
            addTerminalLine(event.data, 'output');
        }
    };

    // Add the new handler
    wingsWebSocket.websocket.value.addEventListener('message', messageHandler);
    handlersSetup.value = true;
}

function updateServerStats(stats: WingsStats): void {
    if (!server.value) return;

    // Update CPU usage
    server.value.cpu = Math.round(stats.cpu_absolute || 0);

    // Update memory usage (convert bytes to MiB)
    server.value.memory = Math.round((stats.memory_bytes || 0) / (1024 * 1024));

    // Update memory limit (convert bytes to MiB)
    server.value.memoryLimit = Math.round((stats.memory_limit_bytes || 0) / (1024 * 1024));

    // Update disk usage (convert bytes to MiB)
    server.value.disk = Math.round((stats.disk_bytes || 0) / (1024 * 1024));

    // Update network stats
    networkStats.value = {
        upload: formatBytes(stats.network?.tx_bytes || 0),
        download: formatBytes(stats.network?.rx_bytes || 0),
    };
}

function updatePerformanceCharts(stats: WingsStats): void {
    const timestamp = Date.now();

    // Update CPU chart
    addDataPoint(cpuData.value, timestamp, stats.cpu_absolute);

    // Update memory chart (convert to MiB)
    addDataPoint(memoryData.value, timestamp, (stats.memory_bytes || 0) / (1024 * 1024));

    // Update disk chart (convert to MiB)
    addDataPoint(diskData.value, timestamp, (stats.disk_bytes || 0) / (1024 * 1024));

    // Update network chart (total bytes)
    const totalNetwork = (stats.network?.rx_bytes || 0) + (stats.network?.tx_bytes || 0);
    addDataPoint(networkData.value, timestamp, totalNetwork);
}

function addDataPoint(dataArray: Array<{ timestamp: number; value: number }>, timestamp: number, value: number): void {
    dataArray.push({ timestamp, value });

    // Keep only last N data points based on customization
    if (dataArray.length > maxDataPoints.value) {
        dataArray.shift();
    }
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function processAnsiContent(content: string): string {
    try {
        // Convert ANSI escape codes to HTML
        return ansiConverter.toHtml(content);
    } catch (error) {
        console.warn('Failed to parse ANSI content:', error);
        // Fallback to original content if parsing fails
        return content;
    }
}

/**
 * Replace Pterodactyl/Pelican references with custom app name from settings
 */
function replaceBrandNames(content: string): string {
    if (!content || !settingsStore.appName) return content;

    const customAppName = String(settingsStore.appName);

    // Create replacement patterns with proper case handling
    const replacements = [
        // Exact case matches
        { pattern: /\bPterodactyl\b/g, replacement: customAppName },
        { pattern: /\bpterodactyl\b/g, replacement: customAppName.toLowerCase() },
        { pattern: /\bPTERODACTYL\b/g, replacement: customAppName.toUpperCase() },
        { pattern: /\bPelican\b/g, replacement: customAppName },
        { pattern: /\bpelican\b/g, replacement: customAppName.toLowerCase() },
        { pattern: /\bPELICAN\b/g, replacement: customAppName.toUpperCase() },
    ];

    let result = content;
    for (const { pattern, replacement } of replacements) {
        result = result.replace(pattern, replacement);
    }

    return result;
}

function handleApiError(error: unknown, action: string): void {
    let errorMessage = `${action} failed`;

    if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as {
            response?: { data?: { message?: string; error_message?: string }; status?: number };
        };

        if (axiosError.response?.data?.message) {
            errorMessage = `${action} failed: ${axiosError.response.data.message}`;
        } else if (axiosError.response?.data?.error_message) {
            errorMessage = `${action} failed: ${axiosError.response.data.error_message}`;
        } else if (axiosError.response?.status) {
            errorMessage = `${action} failed: HTTP ${axiosError.response.status}`;
        }
    } else if (error instanceof Error) {
        errorMessage = `${action} failed: ${error.message}`;
    }

    toast.error(errorMessage);
    console.error(`${action} error:`, error);
}

function addTerminalLine(content: string, type: 'output' | 'error' | 'warning' | 'info' | 'command' = 'output'): void {
    // Debug: Log raw content to see what's causing the '>' characters
    if (type === 'output' && content.includes('>')) {
        console.log('Raw content with >:', content);
        console.log('Content length:', content.length);
        console.log('First few characters:', content.substring(0, 10));
    }

    // First replace brand names with custom app name
    const brandReplacedContent = replaceBrandNames(content);

    // Clean up Wings daemon console output prefixes for output lines
    let cleanedContent = brandReplacedContent;
    if (type === 'output' || type === 'error') {
        // Remove Wings daemon '> ' prefixes that appear at the start of console lines
        cleanedContent = brandReplacedContent.replace(/^>\s*/, '');

        // Also remove any '>' characters that might appear at the beginning of lines
        cleanedContent = cleanedContent.replace(/^>\s*/gm, '');
    }

    // Process ANSI content for output lines, but not for command/info lines
    const processedContent =
        type === 'output' || type === 'error' ? processAnsiContent(cleanedContent) : cleanedContent;

    // Debug: Log processed content
    if (type === 'output' && processedContent.includes('>')) {
        console.log('Processed content with >:', processedContent);
    }

    const newLine: TerminalLine = {
        id: Date.now() + Math.random(),
        content: processedContent,
        timestamp: new Date().toISOString(),
        type: type,
    };
    terminalLines.value.push(newLine);

    // Keep only last N lines based on customization
    if (terminalLines.value.length > customization.value.terminal.maxLines) {
        terminalLines.value.shift();
    }

    // Auto-scroll to bottom if enabled
    if (customization.value.terminal.autoScroll) {
        nextTick(() => {
            const container = document.querySelector('.terminal-container');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        });
    }
}

async function startServer(): Promise<void> {
    try {
        loading.value = true;

        // Prefer Wings WebSocket for immediate response
        if (wingsWebSocket.isConnected && wingsWebSocket.websocket.value) {
            // Immediately update local status to show starting
            if (server.value) {
                server.value.status = 'starting';
            }
            wingsState.value = 'starting';

            wingsWebSocket.websocket.value.send(
                JSON.stringify({
                    event: 'set state',
                    args: ['start'],
                }),
            );
            toast.success(t('serverConsole.serverStarting'));

            // Set up stats collection for the starting server
            if (!statsInterval) {
                statsInterval = setInterval(() => {
                    if (wingsWebSocket.isConnected) {
                        requestServerStats();
                    }
                }, 5000);
            }
        } else {
            // Fallback to API if Wings not available
            toast.info(t('serverConsole.usingFallbackApiMode'));

            await axios.post(`/api/user/servers/${route.params.uuidShort}/power/start`);
            toast.success(t('serverConsole.serverStarting'));
            await fetchServer();
            await wingsWebSocket.connect();
        }
    } catch (error) {
        // Reset status on error
        if (server.value) {
            server.value.status = 'offline';
        }
        wingsState.value = 'offline';
        handleApiError(error, t('serverConsole.serverStarting'));
    } finally {
        loading.value = false;
    }
}

async function stopServer(): Promise<void> {
    try {
        loading.value = true;

        // Prefer Wings WebSocket for immediate response
        if (wingsWebSocket.isConnected && wingsWebSocket.websocket.value) {
            // Immediately update local status to show stopping
            if (server.value) {
                server.value.status = 'stopping';
            }
            wingsState.value = 'stopping';

            wingsWebSocket.websocket.value.send(
                JSON.stringify({
                    event: 'set state',
                    args: ['stop'],
                }),
            );
            toast.success(t('serverConsole.serverStopping'));
        } else {
            // Fallback to API if Wings not available
            toast.info(t('serverConsole.usingFallbackApiMode'));

            await axios.post(`/api/user/servers/${route.params.uuidShort}/power/stop`);
            toast.success(t('serverConsole.serverStopping'));
        }

        // Always disconnect WebSocket when stopping server
        // Note: Don't disconnect immediately, let Wings send the final status

        // Clear stats interval since server will be offline
        if (statsInterval) {
            clearInterval(statsInterval);
            statsInterval = null;
        }
    } catch (error) {
        handleApiError(error, t('serverConsole.serverStopping'));
    } finally {
        loading.value = false;
    }
}

async function restartServer(): Promise<void> {
    try {
        loading.value = true;

        // Prefer Wings WebSocket for immediate response
        if (wingsWebSocket.isConnected && wingsWebSocket.websocket.value) {
            // Immediately update local status to show stopping (restart = stop then start)
            if (server.value) {
                server.value.status = 'stopping';
            }
            wingsState.value = 'stopping';

            wingsWebSocket.websocket.value.send(
                JSON.stringify({
                    event: 'set state',
                    args: ['restart'],
                }),
            );
            toast.success(t('serverConsole.serverRestarting'));
        } else {
            // Fallback to API if Wings not available
            toast.info(t('serverConsole.usingFallbackApiMode'));

            await axios.post(`/api/user/servers/${route.params.uuidShort}/power/restart`);
            toast.success(t('serverConsole.serverRestarting'));

            // Wait a bit for the restart to begin
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Fetch server status and reconnect if running
            await fetchServer();
            await wingsWebSocket.connect();
        }
    } catch (error) {
        handleApiError(error, t('serverConsole.serverRestarting'));
    } finally {
        loading.value = false;
    }
}

async function killServer(): Promise<void> {
    try {
        loading.value = true;

        // Prefer Wings WebSocket for immediate response
        if (wingsWebSocket.isConnected && wingsWebSocket.websocket.value) {
            // Immediately update local status to show offline (kill = immediate stop)
            if (server.value) {
                server.value.status = 'offline';
            }
            wingsState.value = 'offline';

            wingsWebSocket.websocket.value.send(
                JSON.stringify({
                    event: 'set state',
                    args: ['kill'],
                }),
            );
            toast.success(t('serverConsole.serverKilling'));
        } else {
            // Fallback to API if Wings not available
            toast.info(t('serverConsole.usingFallbackApiMode'));

            await axios.post(`/api/user/servers/${route.params.uuidShort}/power/kill`);
            toast.success(t('serverConsole.serverKilling'));
        }

        // Clear stats interval since server will be offline
        if (statsInterval) {
            clearInterval(statsInterval);
            statsInterval = null;
        }
    } catch (error) {
        handleApiError(error, t('serverConsole.serverKilling'));
    } finally {
        loading.value = false;
    }
}

function clearTerminal(): void {
    terminalLines.value = [];
}

function downloadLogs(): void {
    // TODO: Implement log download
    toast.info(t('serverConsole.logDownloadComingSoon'));
}

function requestServerStats(): void {
    if (wingsWebSocket.websocket.value && wingsWebSocket.websocket.value.readyState === WebSocket.OPEN) {
        try {
            wingsWebSocket.websocket.value.send(
                JSON.stringify({
                    event: 'send stats',
                    args: [],
                }),
            );
        } catch (error) {
            console.warn('Failed to request server stats:', error);
        }
    }
}

function requestServerLogs(): void {
    if (wingsWebSocket.websocket.value && wingsWebSocket.websocket.value.readyState === WebSocket.OPEN) {
        try {
            wingsWebSocket.websocket.value.send(
                JSON.stringify({
                    event: 'send logs',
                    args: [],
                }),
            );
        } catch (error) {
            console.warn('Failed to request server logs:', error);
        }
    }
}

// Filter functions
function getFilterBadgeVariant(
    type: 'hide' | 'replace' | 'highlight',
): 'secondary' | 'destructive' | 'default' | 'outline' | null | undefined {
    switch (type) {
        case 'hide':
            return 'secondary';
        case 'replace':
            return 'destructive';
        case 'highlight':
            return 'default';
        default:
            return 'default';
    }
}

function addFilter(): void {
    if (newFilter.value.pattern && newFilter.value.type) {
        const filter: ConsoleFilter = {
            pattern: newFilter.value.pattern,
            type: newFilter.value.type,
            replacement: newFilter.value.replacement || '',
        };
        customization.value.terminal.filters.push(filter);
        newFilter.value = { pattern: '', type: 'hide', replacement: '' };
        toast.success(t('serverConsole.filterAdded'));
    } else {
        toast.warning(t('serverConsole.filterMissingFields'));
    }
}

function removeFilter(index: number): void {
    customization.value.terminal.filters.splice(index, 1);
    toast.success(t('serverConsole.filterRemoved'));
}
</script>
