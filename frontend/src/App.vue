<script lang="ts">
// MIT License
//
// Copyright (c) 2025 MythicalSystems
// Copyright (c) 2025 Cassian Gherman (NaysKutzu)
// Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { defineComponent, ref } from 'vue';
import { useRouter } from 'vue-router';
import DebugPanel from './components/DebugPanel.vue';
import KernXWebExecutor from './components/KernXWebExecutor.vue';

export default defineComponent({
    name: 'App',
    components: {
        DebugPanel,
        KernXWebExecutor,
    },
    setup() {
        const router = useRouter();
        const debugPanel = ref<InstanceType<typeof DebugPanel> | null>(null);
        const kernXExecutor = ref<InstanceType<typeof KernXWebExecutor> | null>(null);
        const isPageTransitioning = ref(false);

        // Page transition setup
        const transitionName = ref('page-transition-fade');

        router.beforeEach((to, from, next) => {
            isPageTransitioning.value = true;

            // Set transition type based on route
            if (to.meta.transition === 'slide') {
                transitionName.value = 'page-transition-slide';
            } else if (to.meta.transition === 'scale') {
                transitionName.value = 'page-transition-scale';
            } else if (to.meta.transition === 'none') {
                transitionName.value = '';
            } else {
                transitionName.value = 'page-transition-fade';
            }

            window.scrollTo(0, 0);
            console.info("[Router] Moving form '" + from.fullPath + "' to " + to.fullPath);
            next();
        });

        router.afterEach(() => {
            // Small delay to ensure transition completes
            setTimeout(() => {
                isPageTransitioning.value = false;
            }, 150);
        });

        return {
            debugPanel,
            kernXExecutor,
            isPageTransitioning,
            transitionName,
        };
    },
});
</script>
<template>
    <div class="app-container">
        <!-- Router view with smooth transitions -->
        <router-view v-slot="{ Component, route }">
            <div :key="route.fullPath" class="page-wrapper">
                <transition
                    v-if="transitionName"
                    :name="transitionName"
                    mode="out-in"
                    @enter="isPageTransitioning = false"
                    @leave="isPageTransitioning = true"
                >
                    <component :is="Component" class="page-component" />
                </transition>
                <component :is="Component" v-else class="page-component" />
            </div>
        </router-view>

        <!-- Debug Panel -->
        <DebugPanel ref="debugPanel" />

        <!-- KernX WebExecutor -->
        <KernXWebExecutor ref="kernXExecutor" />
    </div>
</template>

<style>
.app-container {
    position: relative;
    min-height: 100vh;
}

.page-wrapper {
    position: relative;
    width: 100%;
    min-height: 100vh;
}

.page-component {
    position: relative;
    width: 100%;
}

/* Fade transition */
.page-transition-fade-enter-active,
.page-transition-fade-leave-active {
    transition: all 0.2s ease-out;
}

.page-transition-fade-enter-from {
    opacity: 0;
    transform: translateY(5px);
}

.page-transition-fade-leave-to {
    opacity: 0;
    transform: translateY(-5px);
}

/* Slide transition */
.page-transition-slide-enter-active,
.page-transition-slide-leave-active {
    transition: all 0.25s ease-out;
}

.page-transition-slide-enter-from {
    opacity: 0;
    transform: translateX(20px);
}

.page-transition-slide-leave-to {
    opacity: 0;
    transform: translateX(-20px);
}

/* Scale transition */
.page-transition-scale-enter-active,
.page-transition-scale-leave-active {
    transition: all 0.2s ease-out;
}

.page-transition-scale-enter-from {
    opacity: 0;
    transform: scale(0.98);
}

.page-transition-scale-leave-to {
    opacity: 0;
    transform: scale(1.02);
}

/* Loading state */
.page-transitioning {
    pointer-events: none;
}

.page-transitioning * {
    transition: none !important;
}
</style>
