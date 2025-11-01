<template>
    <!-- Plugin Widgets: Top of Page -->
    <WidgetRenderer v-if="!checkingRedirect && widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

    <div v-if="checkingRedirect" class="min-h-screen bg-background flex items-center justify-center">
        <div class="text-center">
            <div
                class="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"
            ></div>
            <p class="text-muted-foreground">Checking for redirects...</p>
        </div>
    </div>
    <ErrorLayout v-else error-code="404" :title="$t('errors.notFound.title')" :message="$t('errors.notFound.message')">
        <template #footer>
            <!-- Plugin Widgets: Bottom of Page -->
            <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />
        </template>
    </ErrorLayout>
</template>
<script setup lang="ts">
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

import { computed, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ErrorLayout from '@/layouts/ErrorLayout.vue';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
import axios from 'axios';

// Reactive state
const checkingRedirect = ref(true);

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('error-404');
const widgetsTopOfPage = computed(() => getWidgets('error-404', 'top-of-page'));
const widgetsBottomOfPage = computed(() => getWidgets('error-404', 'bottom-of-page'));

// Router
const route = useRoute();
const router = useRouter();

// Methods
async function checkForRedirect() {
    try {
        // Get the current path (remove leading slash)
        const currentPath = route.path.substring(1);

        if (currentPath) {
            // Check if this path exists as a redirect link
            const { data } = await axios.get(`/api/redirect-links/${currentPath}`);

            if (data && data.success && data.data.redirect_link) {
                // Redirect found, navigate to redirect page
                router.push(`/redirect/${currentPath}`);
                return;
            }
        }
    } catch (error) {
        console.error(error);
    } finally {
        checkingRedirect.value = false;
    }
}

onMounted(async () => {
    // Fetch plugin widgets
    await fetchPluginWidgets();

    await checkForRedirect();
});
</script>
