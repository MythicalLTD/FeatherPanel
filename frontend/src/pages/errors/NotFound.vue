<template>
    <div v-if="checkingRedirect" class="min-h-screen bg-background flex items-center justify-center">
        <div class="text-center">
            <div
                class="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"
            ></div>
            <p class="text-muted-foreground">Checking for redirects...</p>
        </div>
    </div>
    <ErrorLayout
        v-else
        error-code="404"
        :title="$t('errors.notFound.title')"
        :message="$t('errors.notFound.message')"
    />
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ErrorLayout from '@/layouts/ErrorLayout.vue';
import axios from 'axios';

// Reactive state
const checkingRedirect = ref(true);

// Router
const route = useRoute();
const router = useRouter();

// Methods
async function checkForRedirect() {
    try {
        // Get the current path (remove leading slash)
        const currentPath = route.path.substring(1);
        console.log(
            '[REDIRECT DEBUG] NotFound: Checking for redirect, current path:',
            route.path,
            'slug:',
            currentPath,
        );

        if (currentPath) {
            console.log('[REDIRECT DEBUG] NotFound: Making API call to /api/redirect-links/' + currentPath);

            // Check if this path exists as a redirect link
            const { data } = await axios.get(`/api/redirect-links/${currentPath}`);
            console.log('[REDIRECT DEBUG] NotFound: Full API response:', data);

            if (data && data.success && data.data.redirect_link) {
                // Redirect found, navigate to redirect page
                console.log('[REDIRECT DEBUG] NotFound: Redirect found, navigating to /redirect/' + currentPath);

                router.push(`/redirect/${currentPath}`);
                return;
            } else {
                console.log('[REDIRECT DEBUG] NotFound: No redirect found in response. Data:', data);
            }
        } else {
            console.log('[REDIRECT DEBUG] NotFound: No current path');
        }
    } catch (error) {
        // No redirect found or error occurred, continue to 404
        console.log('[REDIRECT DEBUG] NotFound: Error occurred:', error);
        console.log('[REDIRECT DEBUG] NotFound: No redirect found for path:', route.path);
    } finally {
        checkingRedirect.value = false;
    }
}

onMounted(() => {
    checkForRedirect();
});
</script>
