<script lang="ts">
import { defineComponent, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import DebugPanel from './components/DebugPanel.vue';
import axios from 'axios';

export default defineComponent({
    name: 'App',
    components: {
        DebugPanel,
    },
    setup() {
        const router = useRouter();
        const debugPanel = ref<InstanceType<typeof DebugPanel> | null>(null);
        const isPageTransitioning = ref(false);

        // Only one transition type: 'fade'
        const transitionName = 'page-transition-fade';

        // Debug mode setup (network only)
        const setupDebugMode = () => {
            const originalFetch = window.fetch;
            window.fetch = async (...args) => {
                const [url, options] = args;
                let requestBody: unknown = undefined;
                if (options?.body) {
                    if (options.body instanceof FormData) {
                        const formDataObj: Record<string, string> = {};
                        options.body.forEach((value, key) => {
                            formDataObj[key] = value.toString();
                        });
                        requestBody = formDataObj;
                    } else if (typeof options.body === 'string') {
                        try {
                            requestBody = JSON.parse(options.body);
                        } catch {
                            requestBody = options.body;
                        }
                    } else {
                        requestBody = options.body;
                    }
                }
                const response = await originalFetch(...args);
                const responseClone = response.clone();
                try {
                    const responseBody = await responseClone.json();
                    debugPanel.value?.addLog('network', {
                        url: url as string,
                        method: options?.method || 'GET',
                        status: response.status,
                        statusText: response.statusText,
                        requestBody,
                        responseBody,
                    });
                } catch {
                    try {
                        const responseText = await responseClone.text();
                        debugPanel.value?.addLog('network', {
                            url: url as string,
                            method: options?.method || 'GET',
                            status: response.status,
                            statusText: response.statusText,
                            requestBody,
                            responseBody: responseText,
                        });
                    } catch {
                        debugPanel.value?.addLog('network', {
                            url: url as string,
                            method: options?.method || 'GET',
                            status: response.status,
                            statusText: response.statusText,
                            requestBody,
                        });
                    }
                }
                return response;
            };

            // Axios interceptors for DebugPanel (network only)
            axios.interceptors.request.use(
                (config) => {
                    debugPanel.value?.addLog('network', {
                        url: config.url,
                        method: config.method?.toUpperCase() || 'GET',
                        requestBody: config.data,
                        headers: config.headers,
                    });
                    return config;
                },
                (error) => {
                    return Promise.reject(error);
                },
            );

            axios.interceptors.response.use(
                (response) => {
                    debugPanel.value?.addLog('network', {
                        url: response.config.url,
                        method: response.config.method?.toUpperCase() || 'GET',
                        status: response.status,
                        statusText: response.statusText,
                        requestBody: response.config.data,
                        responseBody: response.data,
                        headers: response.headers,
                    });
                    return response;
                },
                (error) => {
                    return Promise.reject(error);
                },
            );
        };

        onMounted(() => {
            setupDebugMode();
        });

        router.beforeEach((to, from, next) => {
            isPageTransitioning.value = true;
            window.scrollTo(0, 0);
            next();
        });

        return {
            debugPanel,
            isPageTransitioning,
            transitionName,
        };
    },
});
</script>

<template>
    <div class="app-container">
        <!-- Router view with only fade transition -->
        <router-view v-slot="{ Component }">
            <transition
                :name="transitionName"
                mode="out-in"
                @after-leave="isPageTransitioning = false"
                @enter="isPageTransitioning = true"
                @after-enter="isPageTransitioning = false"
            >
                <component :is="Component" :key="$route.fullPath" />
            </transition>
        </router-view>
        <DebugPanel ref="debugPanel" />
    </div>
</template>

<style>
.app-container {
    position: relative;
    min-height: 100vh;
}

/* Fade transition */
.page-transition-fade-enter-active,
.page-transition-fade-leave-active {
    transition: opacity 0.3s ease;
}

.page-transition-fade-enter-from,
.page-transition-fade-leave-to {
    opacity: 0;
}
</style>
