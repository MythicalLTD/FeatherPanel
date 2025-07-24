<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useRouter } from 'vue-router';
// import DebugPanel from './components/DebugPanel.vue';

export default defineComponent({
    name: 'App',
    // components: {
    //     DebugPanel,
    // },
    setup() {
        const router = useRouter();
        // const debugPanel = ref<InstanceType<typeof DebugPanel> | null>(null);
        const isPageTransitioning = ref(false);

        // Only one transition type: 'fade'
        // const transitionName = 'page-transition-fade';

        // Debug mode setup (network only)
        // const setupDebugMode = () => { ... } // Remove or comment out

        // onMounted(() => {
        //     setupDebugMode();
        // });

        router.beforeEach((to, from, next) => {
            isPageTransitioning.value = true;
            window.scrollTo(0, 0);
            next();
        });

        return {
            // debugPanel,
            isPageTransitioning,
            // transitionName,
        };
    },
});
</script>

<template>
    <div class="app-container">
        <!-- Router view without fade transition or DebugPanel -->
        <router-view v-slot="{ Component }">
            <component :is="Component" :key="$route.fullPath" />
        </router-view>
    </div>
</template>

<style>
.app-container {
    position: relative;
    min-height: 100vh;
}

/* Fade transition (disabled)
.page-transition-fade-enter-active,
.page-transition-fade-leave-active {
    transition: opacity 0.3s ease;
}

.page-transition-fade-enter-from,
.page-transition-fade-leave-to {
    opacity: 0;
}
*/
</style>
