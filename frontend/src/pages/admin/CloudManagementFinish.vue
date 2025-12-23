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

import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import { useToast } from 'vue-toastification';
import DashboardLayout, { type BreadcrumbEntry } from '@/layouts/DashboardLayout.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2, AlertCircle, ArrowRight } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const isLoading = ref<boolean>(true);
const isSaving = ref<boolean>(false);
const isSuccess = ref<boolean>(false);
const error = ref<string | null>(null);

const breadcrumbs: BreadcrumbEntry[] = [
    { text: 'Dashboard', href: '/admin' },
    { text: 'Cloud Management', href: '/admin/cloud-management' },
    { text: 'OAuth2 Success', isCurrent: true },
];

const saveCloudCredentials = async (): Promise<void> => {
    // Get and decode URL parameters
    const cloudApiKey = typeof route.query.cloud_api_key === 'string' 
        ? decodeURIComponent(route.query.cloud_api_key) 
        : '';
    const cloudApiSecret = typeof route.query.cloud_api_secret === 'string'
        ? decodeURIComponent(route.query.cloud_api_secret)
        : '';

    if (!cloudApiKey || !cloudApiSecret) {
        error.value = 'Missing required parameters: cloud_api_key and cloud_api_secret';
        isLoading.value = false;
        return;
    }

    isSaving.value = true;
    try {
        const response = await axios.post('/api/admin/cloud/oauth2/callback', {
            cloud_api_key: cloudApiKey,
            cloud_api_secret: cloudApiSecret,
        });

        if (response.data && response.data.success) {
            isSuccess.value = true;
            toast.success('Your panel has been successfully linked with FeatherCloud!');
            
            // Redirect to cloud management page after 3 seconds
            setTimeout(() => {
                router.push({ name: 'AdminCloudManagement' });
            }, 3000);
        } else {
            throw new Error(response.data.message || 'Failed to save credentials');
        }
    } catch (err) {
        console.error('Failed to save cloud credentials:', err);
        error.value = typeof err === 'object' && err !== null && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to save cloud credentials'
            : 'Failed to save cloud credentials';
        toast.error('Failed to save cloud credentials');
    } finally {
        isSaving.value = false;
        isLoading.value = false;
    }
};

onMounted(() => {
    saveCloudCredentials();
});
</script>

<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="min-h-screen flex items-center justify-center p-6">
            <Card class="w-full max-w-2xl border border-border/70 bg-background/95">
                <CardHeader class="text-center space-y-4">
                    <div v-if="isLoading || isSaving" class="flex justify-center">
                        <Loader2 class="h-16 w-16 text-primary animate-spin" />
                    </div>
                    <div v-else-if="isSuccess" class="flex justify-center">
                        <CheckCircle2 class="h-16 w-16 text-green-500" />
                    </div>
                    <div v-else-if="error" class="flex justify-center">
                        <AlertCircle class="h-16 w-16 text-red-500" />
                    </div>
                    
                    <CardTitle class="text-2xl font-bold text-foreground">
                        <span v-if="isLoading || isSaving">Processing OAuth2 Callback...</span>
                        <span v-else-if="isSuccess">OAuth2 Was a Success!</span>
                        <span v-else-if="error">OAuth2 Callback Failed</span>
                    </CardTitle>
                    
                    <CardDescription class="text-base">
                        <span v-if="isLoading || isSaving">
                            Please wait while we save your cloud credentials...
                        </span>
                        <span v-else-if="isSuccess">
                            Your panel is now linked with FeatherCloud. You can now access premium plugins, FeatherAI, and cloud intelligence services.
                        </span>
                        <span v-else-if="error">
                            {{ error }}
                        </span>
                    </CardDescription>
                </CardHeader>
                
                <CardContent class="space-y-6">
                    <div v-if="isSuccess" class="rounded-lg border border-green-500/30 bg-green-500/10 p-4 space-y-2">
                        <p class="text-sm font-semibold text-green-800 dark:text-green-300">What's Next?</p>
                        <ul class="list-disc list-inside space-y-1 text-sm text-green-700 dark:text-green-400 pl-2">
                            <li>Access premium plugins from the FeatherCloud marketplace</li>
                            <li>Use FeatherAI for intelligent automation and analysis</li>
                            <li>Benefit from cloud intelligence database for abuse prevention</li>
                        </ul>
                    </div>
                    
                    <div v-if="error" class="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                        <p class="text-sm text-red-700 dark:text-red-400">
                            Please try linking again from the Cloud Management page.
                        </p>
                    </div>
                    
                    <div class="flex justify-center gap-3">
                        <Button
                            v-if="isSuccess"
                            class="gap-2"
                            @click="router.push({ name: 'AdminCloudManagement' })"
                        >
                            Go to Cloud Management
                            <ArrowRight class="h-4 w-4" />
                        </Button>
                        <Button
                            v-else-if="error"
                            variant="outline"
                            @click="router.push({ name: 'AdminCloudManagement' })"
                        >
                            Return to Cloud Management
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    </DashboardLayout>
</template>

