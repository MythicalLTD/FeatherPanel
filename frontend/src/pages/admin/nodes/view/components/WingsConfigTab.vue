<template>
    <Card>
        <CardHeader>
            <CardTitle class="text-lg flex items-center gap-2">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                </svg>
                Wings Configuration
            </CardTitle>
            <CardDescription>View and edit the Wings daemon configuration file directly</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
            <div v-if="loading" class="flex items-center justify-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>

            <div v-else-if="error" class="space-y-4">
                <Alert variant="destructive">
                    <div class="space-y-3">
                        <div class="font-medium">Failed to load Wings configuration</div>
                        <div class="text-sm">{{ error }}</div>
                    </div>
                </Alert>
                <Button size="sm" variant="outline" :loading="loading" @click="$emit('reload')">Retry</Button>
            </div>

            <div v-else-if="content !== null" class="space-y-4">
                <div class="flex items-center justify-between">
                    <div class="text-sm text-muted-foreground">Configuration file from Wings daemon</div>
                    <div class="flex gap-2">
                        <Button size="sm" variant="outline" :disabled="saving" @click="$emit('reload')">
                            <RefreshCw :size="16" class="mr-2" />
                            Reload
                        </Button>
                        <Button size="sm" variant="outline" :disabled="saving || !dirty" @click="$emit('reset')">
                            Reset
                        </Button>
                    </div>
                </div>

                <div class="space-y-2">
                    <Label class="text-sm font-medium">Configuration (YAML)</Label>
                    <textarea
                        :value="content"
                        class="w-full h-96 p-3 text-xs font-mono bg-muted border rounded-md resize-none"
                        :disabled="saving"
                        @input="$emit('update:content', ($event.target as HTMLTextAreaElement).value)"
                    ></textarea>
                    <p class="text-xs text-muted-foreground">
                        Edit the YAML configuration directly. Changes will be saved to Wings.
                    </p>
                </div>

                <div
                    class="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                >
                    <svg
                        class="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                    <div class="flex-1">
                        <div class="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                            Configuration Warning
                        </div>
                        <p class="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
                            Invalid configuration may cause Wings to fail to start. Always review changes carefully.
                            Consider backing up the configuration before making changes.
                        </p>
                    </div>
                </div>

                <div class="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div class="flex items-center gap-4">
                        <div class="flex items-center gap-2">
                            <input
                                id="wings-config-restart"
                                :checked="restart"
                                type="checkbox"
                                :disabled="saving"
                                class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-700"
                                @change="$emit('update:restart', ($event.target as HTMLInputElement).checked)"
                            />
                            <Label class="text-sm font-medium" for="wings-config-restart"
                                >Restart Wings after save</Label
                            >
                        </div>
                    </div>
                    <Button size="sm" :loading="saving" :disabled="!dirty || saving" @click="$emit('save')">
                        <svg v-if="!saving" class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        Save Configuration
                    </Button>
                </div>
            </div>
        </CardContent>
    </Card>
</template>

<script setup lang="ts">
// MIT License
//
// Copyright (c) 2025 MythicalSystems and Contributors
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

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { RefreshCw } from 'lucide-vue-next';

defineProps<{
    loading: boolean;
    error: string | null;
    content: string | null;
    dirty: boolean;
    saving: boolean;
    restart: boolean;
}>();

defineEmits<{
    'update:content': [value: string];
    'update:restart': [value: boolean];
    reload: [];
    reset: [];
    save: [];
}>();
</script>
