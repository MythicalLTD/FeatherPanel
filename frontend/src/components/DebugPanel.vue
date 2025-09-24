<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { X, ChevronDown, ChevronRight, Copy, Trash2, Filter } from 'lucide-vue-next';

interface ApiRequest {
    id: string;
    timestamp: number;
    method: string;
    url: string;
    requestBody?: unknown;
    responseData?: unknown;
    status?: number;
    duration?: number;
    error?: string;
}

interface DebugSettings {
    hiddenMethods: string[];
    hiddenUrls: string[];
    minStatusCode: number;
    maxStatusCode: number;
    showOnlyErrors: boolean;
}

const isVisible = ref(false);
const requests = ref<ApiRequest[]>([]);
const expandedRequests = ref<Set<string>>(new Set());
const showFilters = ref(false);

// Filter settings
const filterSettings = ref<DebugSettings>({
    hiddenMethods: [],
    hiddenUrls: [],
    minStatusCode: 0,
    maxStatusCode: 999,
    showOnlyErrors: false,
});

// Load settings from localStorage
const loadSettings = () => {
    try {
        const saved = localStorage.getItem('debug-panel-settings');
        if (saved) {
            const parsed = JSON.parse(saved) as DebugSettings;
            Object.assign(filterSettings.value, parsed);
        }
    } catch (error) {
        console.warn('Failed to load debug panel settings:', error);
    }
};

// Save settings to localStorage
const saveSettings = () => {
    try {
        localStorage.setItem('debug-panel-settings', JSON.stringify(filterSettings.value));
    } catch (error) {
        console.warn('Failed to save debug panel settings:', error);
    }
};

// Filtered requests computed property
const filteredRequests = computed(() => {
    return requests.value.filter((request) => {
        // Filter by method
        if (filterSettings.value.hiddenMethods.includes(request.method.toLowerCase())) {
            return false;
        }

        // Filter by URL patterns
        if (filterSettings.value.hiddenUrls.some((pattern) => request.url.includes(pattern))) {
            return false;
        }

        // Filter by status code
        if (request.status !== undefined) {
            if (
                request.status < filterSettings.value.minStatusCode ||
                request.status > filterSettings.value.maxStatusCode
            ) {
                return false;
            }
        }

        // Show only errors
        if (
            filterSettings.value.showOnlyErrors &&
            !request.error &&
            (request.status === undefined || request.status < 400)
        ) {
            return false;
        }

        return true;
    });
});

// Toggle panel with Ctrl+I
const handleKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey && event.key === 'i') {
        event.preventDefault();
        togglePanel();
    }
};

const togglePanel = () => {
    isVisible.value = !isVisible.value;
};

const clearRequests = () => {
    requests.value = [];
    expandedRequests.value.clear();
};

const toggleRequest = (id: string) => {
    if (expandedRequests.value.has(id)) {
        expandedRequests.value.delete(id);
    } else {
        expandedRequests.value.add(id);
    }
};

const copyToClipboard = async (text: string) => {
    try {
        await navigator.clipboard.writeText(text);
    } catch (err) {
        console.error('Failed to copy to clipboard:', err);
    }
};

const formatJson = (data: unknown): string => {
    try {
        return JSON.stringify(data, null, 2);
    } catch {
        return String(data);
    }
};

const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
};

const getStatusColor = (status?: number): string => {
    if (!status) return 'text-gray-400 bg-gray-800';
    if (status >= 200 && status < 300) return 'text-emerald-300 bg-emerald-900/50 border-emerald-700';
    if (status >= 300 && status < 400) return 'text-blue-300 bg-blue-900/50 border-blue-700';
    if (status >= 400 && status < 500) return 'text-amber-300 bg-amber-900/50 border-amber-700';
    return 'text-red-300 bg-red-900/50 border-red-700';
};

const getMethodColor = (method: string): string => {
    switch (method.toLowerCase()) {
        case 'get':
            return 'bg-emerald-900/50 text-emerald-300 border-emerald-600';
        case 'post':
            return 'bg-blue-900/50 text-blue-300 border-blue-600';
        case 'put':
            return 'bg-amber-900/50 text-amber-300 border-amber-600';
        case 'delete':
            return 'bg-red-900/50 text-red-300 border-red-600';
        case 'patch':
            return 'bg-purple-900/50 text-purple-300 border-purple-600';
        default:
            return 'bg-gray-900/50 text-gray-300 border-gray-600';
    }
};

const toggleMethodFilter = (method: string) => {
    if (filterSettings.value.hiddenMethods.includes(method)) {
        filterSettings.value.hiddenMethods = filterSettings.value.hiddenMethods.filter((m) => m !== method);
    } else {
        filterSettings.value.hiddenMethods.push(method);
    }
    saveSettings();
};

const addUrlPattern = (pattern: string) => {
    const trimmed = pattern.trim();
    if (trimmed && !filterSettings.value.hiddenUrls.includes(trimmed)) {
        filterSettings.value.hiddenUrls.push(trimmed);
        saveSettings();
    }
};

const removeUrlPattern = (pattern: string) => {
    filterSettings.value.hiddenUrls = filterSettings.value.hiddenUrls.filter((p) => p !== pattern);
    saveSettings();
};

const newUrlPattern = ref('');

// Intercept ALL HTTP requests (fetch + XMLHttpRequest)
const originalFetch = window.fetch;
const originalXMLHttpRequest = window.XMLHttpRequest;
let requestCounter = 0;

const interceptFetch = () => {
    window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
        const [input, init] = args;
        const url = typeof input === 'string' ? input : (input as Request).url;

        // Only monitor API requests
        if (!url.includes('/api/')) {
            return originalFetch(...args);
        }

        const requestId = `req_${++requestCounter}_${Date.now()}`;
        const startTime = Date.now();
        const method = init?.method || 'GET';
        let requestBody: unknown = null;

        // Extract request body
        if (init?.body) {
            if (init.body instanceof FormData) {
                requestBody = 'FormData (file upload)';
            } else if (init.body instanceof URLSearchParams) {
                requestBody = Object.fromEntries(init.body.entries());
            } else {
                try {
                    requestBody = JSON.parse(init.body as string);
                } catch {
                    requestBody = init.body;
                }
            }
        }

        // Create initial request entry
        const request: ApiRequest = {
            id: requestId,
            timestamp: Date.now(),
            method,
            url,
            requestBody,
        };

        requests.value.unshift(request);

        try {
            const response = await originalFetch(...args);
            const duration = Date.now() - startTime;

            // Clone response to read body without consuming it
            const responseClone = response.clone();
            let responseData: unknown = null;

            try {
                const contentType = response.headers.get('content-type');
                if (contentType?.includes('application/json')) {
                    responseData = await responseClone.json();
                } else {
                    responseData = await responseClone.text();
                }
            } catch {
                responseData = 'Unable to parse response';
            }

            // Update the request with response data
            const requestIndex = requests.value.findIndex((r) => r.id === requestId);
            if (requestIndex !== -1) {
                const existingRequest = requests.value[requestIndex];
                // Ensure all required fields are present and not undefined
                if (
                    existingRequest &&
                    typeof existingRequest.id === 'string' &&
                    typeof existingRequest.timestamp === 'number' &&
                    typeof existingRequest.method === 'string' &&
                    typeof existingRequest.url === 'string'
                ) {
                    requests.value[requestIndex] = {
                        id: existingRequest.id,
                        timestamp: existingRequest.timestamp,
                        method: existingRequest.method,
                        url: existingRequest.url,
                        requestBody: existingRequest.requestBody,
                        responseData,
                        status: response.status,
                        duration,
                        error: existingRequest.error,
                    };
                }
            }

            return response;
        } catch (error) {
            const duration = Date.now() - startTime;

            // Update the request with error
            const requestIndex = requests.value.findIndex((r) => r.id === requestId);
            if (requestIndex !== -1) {
                const existingRequest = requests.value[requestIndex];
                if (
                    existingRequest &&
                    typeof existingRequest.id === 'string' &&
                    typeof existingRequest.timestamp === 'number' &&
                    typeof existingRequest.method === 'string' &&
                    typeof existingRequest.url === 'string'
                ) {
                    requests.value[requestIndex] = {
                        id: existingRequest.id,
                        timestamp: existingRequest.timestamp,
                        method: existingRequest.method,
                        url: existingRequest.url,
                        requestBody: existingRequest.requestBody,
                        error: error instanceof Error ? error.message : String(error),
                        duration,
                    };
                }
            }

            throw error;
        }
    };
};

// Intercept XMLHttpRequest (catches axios, jQuery, and other libraries)
const interceptXMLHttpRequest = () => {
    window.XMLHttpRequest = function () {
        const xhr = new originalXMLHttpRequest();
        const requestId = `req_${++requestCounter}_${Date.now()}`;
        let startTime = 0;
        let requestBody: unknown = null;
        let method = 'GET';
        let url = '';

        // Override open method
        const originalOpen = xhr.open;
        xhr.open = function (
            httpMethod: string,
            requestUrl: string,
            async?: boolean,
            user?: string | null,
            password?: string | null,
        ) {
            method = httpMethod.toUpperCase();
            url = requestUrl;

            // Only monitor API requests
            if (!url.includes('/api/')) {
                return originalOpen.call(this, httpMethod, requestUrl, async ?? true, user, password);
            }

            console.log('Debug Panel: Intercepting XMLHttpRequest:', method, url);
            return originalOpen.call(this, httpMethod, requestUrl, async ?? true, user, password);
        };

        // Override send method
        const originalSend = xhr.send;
        xhr.send = function (body?: any) {
            // Only monitor API requests
            if (!url.includes('/api/')) {
                return originalSend.call(this, body);
            }

            startTime = Date.now();

            // Extract request body
            if (body) {
                if (body instanceof FormData) {
                    requestBody = 'FormData (file upload)';
                } else if (body instanceof URLSearchParams) {
                    requestBody = Object.fromEntries(body.entries());
                } else if (typeof body === 'string') {
                    try {
                        requestBody = JSON.parse(body);
                    } catch {
                        requestBody = body;
                    }
                } else {
                    requestBody = body;
                }
            }

            // Create initial request entry
            const request: ApiRequest = {
                id: requestId,
                timestamp: Date.now(),
                method,
                url,
                requestBody,
            };

            requests.value.unshift(request);

            return originalSend.call(this, body);
        };

        // Handle response
        xhr.addEventListener('loadend', () => {
            // Only monitor API requests
            if (!url.includes('/api/')) {
                return;
            }

            const duration = Date.now() - startTime;
            let responseData: unknown = null;

            try {
                const contentType = xhr.getResponseHeader('content-type') || '';
                if (contentType.includes('application/json') && xhr.responseText) {
                    responseData = JSON.parse(xhr.responseText);
                } else {
                    responseData = xhr.responseText;
                }
            } catch {
                responseData = xhr.responseText || 'Unable to parse response';
            }

            // Update the request with response data
            const requestIndex = requests.value.findIndex((r) => r.id === requestId);
            if (requestIndex !== -1) {
                const existingRequest = requests.value[requestIndex];
                if (
                    existingRequest &&
                    typeof existingRequest.id === 'string' &&
                    typeof existingRequest.timestamp === 'number' &&
                    typeof existingRequest.method === 'string' &&
                    typeof existingRequest.url === 'string'
                ) {
                    const isError = xhr.status >= 400 || xhr.status === 0;
                    requests.value[requestIndex] = {
                        id: existingRequest.id,
                        timestamp: existingRequest.timestamp,
                        method: existingRequest.method,
                        url: existingRequest.url,
                        requestBody: existingRequest.requestBody,
                        responseData,
                        status: xhr.status,
                        duration,
                        error: isError ? `HTTP ${xhr.status}: ${xhr.statusText}` : undefined,
                    };
                }
            }
        });

        return xhr;
    } as any;
};

// Restore original fetch and XMLHttpRequest
const restoreFetch = () => {
    window.fetch = originalFetch;
};

const restoreXMLHttpRequest = () => {
    window.XMLHttpRequest = originalXMLHttpRequest;
};

onMounted(() => {
    document.addEventListener('keydown', handleKeyDown);
    interceptFetch();
    interceptXMLHttpRequest();
    loadSettings();

    console.log('🎉 Debug Panel loaded!');
    console.log('📚 Intercepting ALL HTTP requests (fetch + XMLHttpRequest)');
    console.log('  • Press Ctrl+I to toggle the debug panel');
    console.log('  • All requests to /api/* will be automatically captured');
});

onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown);
    restoreFetch();
    restoreXMLHttpRequest();
});

// Expose methods for parent component
defineExpose({
    togglePanel,
});
</script>

<template>
    <Transition name="debug-panel" appear>
        <div v-if="isVisible" class="fixed inset-0 z-[9999] pointer-events-none">
            <!-- Backdrop -->
            <div class="fixed inset-0 bg-black/5 backdrop-blur-[1px]"></div>

            <!-- Debug Panel -->
            <div
                class="absolute top-4 right-4 w-[28rem] max-h-[85vh] bg-gray-900/95 border border-gray-700 rounded-xl shadow-2xl backdrop-blur-md pointer-events-auto"
            >
                <!-- Header -->
                <div
                    class="flex items-center justify-between p-4 bg-gradient-to-r from-gray-800 to-gray-900 rounded-t-xl border-b border-gray-700"
                >
                    <div class="flex items-center gap-3">
                        <div class="relative">
                            <div class="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                            <div
                                class="absolute inset-0 w-3 h-3 bg-emerald-400 rounded-full animate-ping opacity-75"
                            ></div>
                        </div>
                        <h3 class="font-bold text-white text-sm tracking-wide">API Debug Console</h3>
                        <span class="text-xs text-gray-400 bg-gray-700/50 px-2 py-0.5 rounded">all requests</span>
                        <kbd
                            class="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded-md border border-gray-600 font-mono"
                            >Ctrl+I</kbd
                        >
                    </div>
                    <div class="flex items-center gap-1">
                        <button
                            :class="
                                showFilters
                                    ? 'text-blue-400 bg-blue-500/10'
                                    : 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10'
                            "
                            class="p-2 rounded-lg transition-all duration-200"
                            title="Toggle filters"
                            @click="
                                showFilters = !showFilters;
                                saveSettings();
                            "
                        >
                            <Filter :size="16" />
                        </button>
                        <button
                            class="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                            title="Clear requests"
                            @click="clearRequests"
                        >
                            <Trash2 :size="16" />
                        </button>
                        <button
                            class="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-all duration-200"
                            @click="togglePanel"
                        >
                            <X :size="16" />
                        </button>
                    </div>
                </div>

                <!-- Filters -->
                <div v-if="showFilters" class="px-4 py-3 bg-gray-800/30 border-b border-gray-700 space-y-4">
                    <div class="grid grid-cols-2 gap-3">
                        <!-- Method filters -->
                        <div>
                            <label class="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 block"
                                >Hide Methods</label
                            >
                            <div class="flex gap-1 flex-wrap">
                                <button
                                    v-for="method in ['get', 'post', 'put', 'delete', 'patch']"
                                    :key="method"
                                    :class="
                                        filterSettings.hiddenMethods.includes(method) ? 'opacity-50 line-through' : ''
                                    "
                                    class="px-2 py-1 text-xs rounded-md transition-all duration-200 hover:opacity-80"
                                    :style="{
                                        backgroundColor:
                                            method === 'get'
                                                ? 'rgba(16, 185, 129, 0.1)'
                                                : method === 'post'
                                                  ? 'rgba(59, 130, 246, 0.1)'
                                                  : method === 'put'
                                                    ? 'rgba(245, 158, 11, 0.1)'
                                                    : method === 'delete'
                                                      ? 'rgba(239, 68, 68, 0.1)'
                                                      : 'rgba(147, 51, 234, 0.1)',
                                        color:
                                            method === 'get'
                                                ? 'rgb(16, 185, 129)'
                                                : method === 'post'
                                                  ? 'rgb(59, 130, 246)'
                                                  : method === 'put'
                                                    ? 'rgb(245, 158, 11)'
                                                    : method === 'delete'
                                                      ? 'rgb(239, 68, 68)'
                                                      : 'rgb(147, 51, 234)',
                                    }"
                                    @click="toggleMethodFilter(method)"
                                >
                                    {{ method.toUpperCase() }}
                                </button>
                            </div>
                        </div>

                        <!-- Status filters -->
                        <div>
                            <label class="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 block"
                                >Status Range</label
                            >
                            <div class="flex gap-2 items-center">
                                <input
                                    v-model.number="filterSettings.minStatusCode"
                                    type="number"
                                    min="0"
                                    max="999"
                                    class="w-16 px-2 py-1 text-xs bg-gray-900/60 border border-gray-600 rounded text-gray-300 focus:border-blue-500 focus:outline-none"
                                    placeholder="0"
                                    @change="saveSettings"
                                />
                                <span class="text-gray-400 text-xs">to</span>
                                <input
                                    v-model.number="filterSettings.maxStatusCode"
                                    type="number"
                                    min="0"
                                    max="999"
                                    class="w-16 px-2 py-1 text-xs bg-gray-900/60 border border-gray-600 rounded text-gray-300 focus:border-blue-500 focus:outline-none"
                                    placeholder="999"
                                    @change="saveSettings"
                                />
                            </div>
                        </div>
                    </div>

                    <!-- URL Pattern Filters -->
                    <div>
                        <label class="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 block"
                            >Hide URL Patterns</label
                        >
                        <div class="space-y-2">
                            <!-- Add new pattern -->
                            <div class="flex gap-2">
                                <input
                                    v-model="newUrlPattern"
                                    type="text"
                                    placeholder="e.g., /api/logs, /health, session"
                                    class="flex-1 px-2 py-1 text-xs bg-gray-900/60 border border-gray-600 rounded text-gray-300 focus:border-blue-500 focus:outline-none"
                                    @keyup.enter="
                                        addUrlPattern(newUrlPattern);
                                        newUrlPattern = '';
                                    "
                                />
                                <button
                                    :disabled="!newUrlPattern.trim()"
                                    class="px-2 py-1 text-xs bg-blue-900/50 text-blue-300 border border-blue-600 rounded hover:bg-blue-800/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                    @click="
                                        addUrlPattern(newUrlPattern);
                                        newUrlPattern = '';
                                    "
                                >
                                    Add
                                </button>
                            </div>

                            <!-- Current hidden patterns -->
                            <div v-if="filterSettings.hiddenUrls.length > 0" class="flex gap-1 flex-wrap">
                                <span
                                    v-for="pattern in filterSettings.hiddenUrls"
                                    :key="pattern"
                                    class="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-800/80 text-gray-300 border border-gray-600 rounded"
                                >
                                    <span class="font-mono">{{ pattern }}</span>
                                    <button
                                        class="ml-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-sm transition-colors duration-200"
                                        title="Remove pattern"
                                        @click="removeUrlPattern(pattern)"
                                    >
                                        <X :size="10" />
                                    </button>
                                </span>
                            </div>

                            <div v-if="filterSettings.hiddenUrls.length === 0" class="text-xs text-gray-500 italic">
                                No URL patterns hidden
                            </div>
                        </div>
                    </div>

                    <!-- Error filter -->
                    <div class="space-y-2">
                        <div class="flex items-center gap-3">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input
                                    v-model="filterSettings.showOnlyErrors"
                                    type="checkbox"
                                    class="w-3 h-3 text-red-500 bg-gray-900 border-gray-600 rounded focus:ring-red-500"
                                    @change="saveSettings"
                                />
                                <span class="text-xs text-gray-300">Show only errors</span>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Stats -->
                <div
                    class="flex items-center justify-between px-4 py-3 text-xs bg-gray-800/50 border-b border-gray-700"
                >
                    <div class="flex items-center gap-2 text-gray-300">
                        <div class="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <span class="font-medium">{{ filteredRequests.length }} of {{ requests.length }} requests</span>
                    </div>
                    <div v-if="requests.length > 0" class="text-gray-400">
                        Latest: {{ formatTimestamp(requests[0]?.timestamp || 0) }}
                    </div>
                </div>

                <!-- Requests List -->
                <div
                    class="max-h-[50vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
                >
                    <div v-if="filteredRequests.length === 0 && requests.length === 0" class="p-6 text-center">
                        <div class="text-gray-400 text-sm mb-2">No API requests yet</div>
                        <div class="text-gray-500 text-xs">Make some API calls to see them here</div>
                    </div>

                    <div v-else-if="filteredRequests.length === 0 && requests.length > 0" class="p-6 text-center">
                        <div class="text-gray-400 text-sm mb-2">No requests match current filters</div>
                        <div class="text-gray-500 text-xs">Adjust filters to see more requests</div>
                    </div>

                    <div
                        v-for="request in filteredRequests"
                        :key="request.id"
                        class="border-b border-gray-700/50 last:border-b-0"
                    >
                        <!-- Request Header -->
                        <div
                            class="p-4 hover:bg-gray-800/50 cursor-pointer select-none transition-all duration-200 group"
                            @click="toggleRequest(request.id)"
                        >
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center gap-3">
                                    <component
                                        :is="expandedRequests.has(request.id) ? ChevronDown : ChevronRight"
                                        :size="14"
                                        class="text-gray-500 group-hover:text-gray-300 transition-colors duration-200"
                                    />
                                    <span
                                        :class="getMethodColor(request.method)"
                                        class="px-2 py-1 text-xs font-bold rounded-md border"
                                    >
                                        {{ request.method }}
                                    </span>
                                    <span
                                        v-if="request.status"
                                        :class="getStatusColor(request.status)"
                                        class="text-xs font-medium px-2 py-1 rounded-md"
                                    >
                                        {{ request.status }}
                                    </span>
                                    <span
                                        v-if="request.duration"
                                        class="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded-md font-mono"
                                    >
                                        {{ request.duration }}ms
                                    </span>
                                </div>
                                <span class="text-xs text-gray-400 font-mono">
                                    {{ formatTimestamp(request.timestamp) }}
                                </span>
                            </div>
                            <div class="text-sm font-mono text-gray-300 truncate bg-gray-800/50 px-3 py-2 rounded-lg">
                                {{ request.url }}
                            </div>
                            <div
                                v-if="request.error"
                                class="text-xs text-red-400 mt-2 bg-red-900/20 border border-red-800/50 px-3 py-2 rounded-lg"
                            >
                                <span class="font-medium">Error:</span> {{ request.error }}
                            </div>
                        </div>

                        <!-- Request Details -->
                        <div v-if="expandedRequests.has(request.id)" class="px-4 pb-4 bg-gray-800/30">
                            <!-- URL -->
                            <div class="mb-4">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-xs font-semibold text-gray-300 uppercase tracking-wider"
                                        >URL</span
                                    >
                                    <button
                                        class="text-xs text-gray-400 hover:text-gray-200 p-1 hover:bg-gray-700 rounded transition-all duration-200"
                                        title="Copy URL"
                                        @click="copyToClipboard(request.url)"
                                    >
                                        <Copy :size="12" />
                                    </button>
                                </div>
                                <div
                                    class="text-xs font-mono bg-gray-900/60 border border-gray-700/50 p-3 rounded-lg break-all text-gray-300"
                                >
                                    {{ request.url }}
                                </div>
                            </div>

                            <!-- Request Body -->
                            <div v-if="request.requestBody" class="mb-4">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-xs font-semibold text-gray-300 uppercase tracking-wider"
                                        >Request Body</span
                                    >
                                    <button
                                        class="text-xs text-gray-400 hover:text-gray-200 p-1 hover:bg-gray-700 rounded transition-all duration-200"
                                        title="Copy request body"
                                        @click="copyToClipboard(formatJson(request.requestBody))"
                                    >
                                        <Copy :size="12" />
                                    </button>
                                </div>
                                <pre
                                    class="text-xs bg-gray-900/60 border border-gray-700/50 p-3 rounded-lg overflow-x-auto text-gray-300"
                                    >{{ formatJson(request.requestBody) }}</pre
                                >
                            </div>

                            <!-- Response Data -->
                            <div v-if="request.responseData" class="mb-4">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-xs font-semibold text-gray-300 uppercase tracking-wider"
                                        >Response</span
                                    >
                                    <button
                                        class="text-xs text-gray-400 hover:text-gray-200 p-1 hover:bg-gray-700 rounded transition-all duration-200"
                                        title="Copy response"
                                        @click="copyToClipboard(formatJson(request.responseData))"
                                    >
                                        <Copy :size="12" />
                                    </button>
                                </div>
                                <pre
                                    class="text-xs bg-gray-900/60 border border-gray-700/50 p-3 rounded-lg overflow-x-auto max-h-40 text-gray-300"
                                    >{{ formatJson(request.responseData) }}</pre
                                >
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
pre {
    white-space: pre-wrap;
    word-break: break-word;
}

/* Custom scrollbar for dark theme */
.scrollbar-thin {
    scrollbar-width: thin;
}

.scrollbar-thumb-gray-600 {
    scrollbar-color: #4b5563 #1f2937;
}

.scrollbar-track-gray-800 {
    scrollbar-color: #4b5563 #1f2937;
}

/* Webkit scrollbar styling */
::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}

::-webkit-scrollbar-track {
    background: #1f2937;
    border-radius: 3px;
}

::-webkit-scrollbar-thumb {
    background: #4b5563;
    border-radius: 3px;
    border: 1px solid #374151;
}

::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
}

::-webkit-scrollbar-corner {
    background: #1f2937;
}

/* Animation for status indicator */
@keyframes pulse {
    0%,
    100% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
}

@keyframes ping {
    75%,
    100% {
        transform: scale(2);
        opacity: 0;
    }
}

.animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-ping {
    animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
}

/* Debug panel enter/leave animations */
.debug-panel-enter-active,
.debug-panel-leave-active {
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.debug-panel-enter-from {
    opacity: 0;
    transform: translateX(100%) scale(0.95);
}

.debug-panel-leave-to {
    opacity: 0;
    transform: translateX(50%) scale(0.95);
}
</style>
