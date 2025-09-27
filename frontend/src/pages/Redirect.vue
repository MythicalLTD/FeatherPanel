<template>
    <div class="min-h-screen bg-background flex items-center justify-center">
        <div class="max-w-md w-full mx-auto p-6">
            <div class="text-center">
                <!-- Loading State -->
                <div v-if="loading" class="space-y-4">
                    <div
                        class="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent mx-auto"
                    ></div>
                    <h1 class="text-2xl font-bold text-foreground">Redirecting...</h1>
                    <p class="text-muted-foreground">Please wait while we redirect you to your destination.</p>
                </div>

                <!-- Error State -->
                <div v-else-if="error" class="space-y-4">
                    <div class="text-red-500">
                        <svg class="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                            />
                        </svg>
                    </div>
                    <h1 class="text-2xl font-bold text-foreground">Redirect Not Found</h1>
                    <p class="text-muted-foreground">The redirect link you're looking for doesn't exist.</p>
                    <Button class="mt-4" @click="goHome"> Go Home </Button>
                </div>

                <!-- Success State -->
                <div v-else-if="redirectLink" class="space-y-4">
                    <div class="text-green-500">
                        <svg class="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                        </svg>
                    </div>
                    <h1 class="text-2xl font-bold text-foreground">Redirecting to {{ redirectLink.name }}</h1>
                    <p class="text-muted-foreground">You will be redirected to:</p>
                    <div class="bg-muted p-3 rounded-lg">
                        <p class="text-sm font-mono break-all">{{ redirectLink.url }}</p>
                    </div>
                    <div class="space-y-2">
                        <Button class="w-full" @click="redirectNow"> Continue to {{ redirectLink.name }} </Button>
                        <Button variant="outline" class="w-full" @click="goHome"> Go Home Instead </Button>
                    </div>
                    <p class="text-xs text-muted-foreground">
                        If you are not redirected automatically, click the button above.
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import axios from 'axios';

// Types
interface RedirectLink {
    slug: string;
    url: string;
    name: string;
}

// Reactive state
const loading = ref(true);
const error = ref(false);
const redirectLink = ref<RedirectLink | null>(null);
const countdown = ref(5);

// Router
const route = useRoute();
const router = useRouter();

// Methods
async function checkRedirect() {
    try {
        const slug = route.params.slug as string;
        const { data } = await axios.get(`/api/redirect-links/${slug}`);

        if (data && data.success && data.data.redirect_link) {
            redirectLink.value = data.data.redirect_link;

            startCountdown();
        } else {
            error.value = true;
        }
    } catch (err) {
        console.error('[REDIRECT DEBUG] Redirect page: Error checking redirect:', err);
        error.value = true;
    } finally {
        loading.value = false;
    }
}

function startCountdown() {
    const timer = setInterval(() => {
        countdown.value--;
        if (countdown.value <= 0) {
            clearInterval(timer);
            redirectNow();
        }
    }, 1000);
}

function redirectNow() {
    if (redirectLink.value) {
        window.location.href = redirectLink.value.url;
    }
}

function goHome() {
    router.push('/');
}

onMounted(() => {
    checkRedirect();
});
</script>
