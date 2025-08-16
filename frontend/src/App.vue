<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useRouter } from 'vue-router';
// import DebugPanel from './components/DebugPanel.vue';

export default defineComponent({
    name: 'App',
    components: {
        // DebugPanel,
    },
    setup() {
        const router = useRouter();
        // const debugPanel = ref<InstanceType<typeof DebugPanel> | null>(null);
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
            } else {
                transitionName.value = 'page-transition-fade';
            }

            window.scrollTo(0, 0);
            next();
        });

        router.afterEach(() => {
            // Small delay to ensure transition completes
            setTimeout(() => {
                isPageTransitioning.value = false;
            }, 150);
        });

        return {
            // debugPanel,
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
            <transition
                :name="transitionName"
                mode="in-out"
                @enter="isPageTransitioning = false"
                @leave="isPageTransitioning = true"
            >
                <component :is="Component" :key="route.fullPath" class="page-component" />
            </transition>
        </router-view>
    </div>
</template>

<style>
.app-container {
    position: relative;
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
