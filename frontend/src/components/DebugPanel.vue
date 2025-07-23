<template>
    <div class="fixed bottom-5 right-5 z-50">
        <div
            v-if="isDebugPanelOpen"
            class="bg-gray-900/95 text-white rounded-lg shadow-2xl w-[800px] max-h-[600px] transition-all duration-300 transform"
            :class="[
                isDebugPanelOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
                'backdrop-blur-sm border border-gray-700/50',
            ]"
        >
            <div class="flex justify-between items-center p-4 bg-gray-800/50 rounded-t-lg border-b border-gray-700/50">
                <div class="flex items-center space-x-3">
                    <h3 class="text-lg font-semibold">Debug Panel</h3>
                    <span class="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-full">Ctrl+I to toggle</span>
                </div>
                <div class="flex items-center space-x-2">
                    <button
                        class="p-2 text-gray-400 hover:text-white transition-colors rounded-md hover:bg-gray-700/50"
                        title="Clear Logs"
                        @click="clearLogs"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path
                                fill-rule="evenodd"
                                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                clip-rule="evenodd"
                            />
                        </svg>
                    </button>
                    <button
                        class="p-2 text-gray-400 hover:text-white transition-colors rounded-md hover:bg-gray-700/50"
                        @click="toggleDebugMode"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path
                                fill-rule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clip-rule="evenodd"
                            />
                        </svg>
                    </button>
                </div>
            </div>

            <div class="p-4">
                <div class="flex space-x-2 mb-4">
                    <button
                        v-for="tab in debugTabs"
                        :key="tab.id"
                        :class="[
                            'px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
                            activeTab === tab.id
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:shadow-md',
                        ]"
                        @click="activeTab = tab.id"
                    >
                        {{ tab.name }}
                        <span
                            v-if="getLogCount()"
                            class="ml-2 px-2 py-0.5 text-xs rounded-full"
                            :class="activeTab === tab.id ? 'bg-blue-500/30' : 'bg-gray-700'"
                        >
                            {{ getLogCount() }}
                        </span>
                    </button>
                </div>

                <div class="bg-gray-800/50 rounded-lg p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                    <!-- Network Tab -->
                    <div v-if="activeTab === 'network'" class="space-y-4">
                        <div
                            v-for="(log, index) in networkLogs"
                            :key="index"
                            class="bg-gray-900/50 rounded-lg p-3 space-y-2 border border-gray-700/50 hover:border-gray-600/50 transition-colors"
                        >
                            <div class="flex justify-between items-center text-xs text-gray-400">
                                <span>{{ log.time }}</span>
                                <div class="flex items-center space-x-2">
                                    <span
                                        :class="[
                                            'px-2 py-1 rounded text-xs font-medium',
                                            log.status >= 400
                                                ? 'bg-red-500/20 text-red-400'
                                                : 'bg-green-500/20 text-green-400',
                                        ]"
                                    >
                                        {{ log.status }} {{ log.statusText }}
                                    </span>
                                </div>
                            </div>
                            <div class="font-mono text-sm break-all">{{ log.url }}</div>
                            <div v-if="log.method" class="text-xs text-gray-400">
                                Method: <span class="text-blue-400">{{ log.method }}</span>
                            </div>
                            <div v-if="log.requestBody" class="mt-2">
                                <div class="flex justify-end">
                                    <button
                                        class="p-1 text-gray-400 hover:text-white transition-colors rounded hover:bg-gray-700/50"
                                        title="Copy JSON"
                                        @click="copyJson(log.requestBody)"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            class="h-4 w-4"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                            <path
                                                d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"
                                            />
                                        </svg>
                                    </button>
                                </div>
                                <pre class="bg-gray-900 p-2 rounded text-xs overflow-x-auto custom-scrollbar">{{
                                    JSON.stringify(log.requestBody, null, 2)
                                }}</pre>
                            </div>
                            <div class="mt-2">
                                <div class="flex justify-end">
                                    <button
                                        class="p-1 text-gray-400 hover:text-white transition-colors rounded hover:bg-gray-700/50"
                                        title="Copy JSON"
                                        @click="copyJson(log.responseBody)"
                                        :disabled="!log.responseBody"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            class="h-4 w-4"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                            <path
                                                d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"
                                            />
                                        </svg>
                                    </button>
                                </div>
                                <pre
                                    v-if="log.responseBody !== undefined && log.responseBody !== null"
                                    class="bg-gray-900 p-2 rounded text-xs overflow-x-auto custom-scrollbar"
                                    >{{ JSON.stringify(log.responseBody, null, 2) }}</pre
                                >
                                <div v-else class="bg-gray-900 p-2 rounded text-xs text-gray-500">No response body</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue';
import type { NetworkLog } from '../types/debug';

export default defineComponent({
    name: 'DebugPanel',
    setup() {
        const isDebugPanelOpen = ref(false);
        const activeTab = ref('network');
        const networkLogs = ref<NetworkLog[]>([]);

        const debugTabs = [{ id: 'network', name: 'Network' }];

        const getLogCount = () => networkLogs.value.length;

        const copyJson = (data: unknown): void => {
            navigator.clipboard.writeText(JSON.stringify(data, null, 2));
        };

        const addLog = (type: 'network', data: unknown): void => {
            const timestamp = new Date().toLocaleTimeString();
            networkLogs.value.unshift({ ...(data as NetworkLog), time: timestamp });
        };

        const clearLogs = (): void => {
            networkLogs.value = [];
        };

        const toggleDebugMode = (): void => {
            isDebugPanelOpen.value = !isDebugPanelOpen.value;
        };

        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.ctrlKey && event.key === 'i') {
                event.preventDefault();
                toggleDebugMode();
            }
        };

        onMounted(() => {
            window.addEventListener('keydown', handleKeyDown);
        });

        onUnmounted(() => {
            window.removeEventListener('keydown', handleKeyDown);
        });

        return {
            isDebugPanelOpen,
            activeTab,
            debugTabs,
            networkLogs,
            addLog,
            clearLogs,
            getLogCount,
            copyJson,
            toggleDebugMode,
        };
    },
});
</script>

<style scoped>
.custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgba(156, 163, 175, 0.5);
    border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: rgba(156, 163, 175, 0.7);
}

/* Animation for new logs */
@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.log-entry {
    animation: slideIn 0.2s ease-out;
}

/* Button hover effect */
button {
    position: relative;
    overflow: hidden;
}

button::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 5px;
    height: 5px;
    background: rgba(255, 255, 255, 0.5);
    opacity: 0;
    border-radius: 100%;
    transform: scale(1, 1) translate(-50%);
    transform-origin: 50% 50%;
}

button:hover::after {
    animation: ripple 1s ease-out;
}

@keyframes ripple {
    0% {
        transform: scale(0, 0);
        opacity: 0.5;
    }
    100% {
        transform: scale(20, 20);
        opacity: 0;
    }
}
</style>
