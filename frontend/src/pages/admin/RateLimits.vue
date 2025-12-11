<!--
MIT License

Copyright (c) 2025 MythicalSystems and Contributors
Copyright (c) 2025 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
-->

<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Rate Limits', isCurrent: true, href: '/admin/rate-limits' }]">
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="text-center">
                    <div
                        class="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"
                    ></div>
                    <h3 class="text-lg font-semibold mb-2">Loading Rate Limits</h3>
                    <p class="text-muted-foreground">Please wait while we fetch rate limit configurations...</p>
                </div>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="flex flex-col items-center justify-center py-12 text-center">
                <div class="text-red-500 mb-4">
                    <AlertCircle class="h-12 w-12 mx-auto" />
                </div>
                <h3 class="text-lg font-medium text-muted-foreground mb-2">Failed to load rate limits</h3>
                <p class="text-sm text-muted-foreground max-w-sm">{{ error }}</p>
                <Button class="mt-4" @click="fetchRateLimits">Try Again</Button>
            </div>

            <!-- Content -->
            <div v-else class="p-4 sm:p-6">
                <!-- Header -->
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div>
                        <h1 class="text-2xl sm:text-3xl font-bold text-foreground mb-1">Rate Limits</h1>
                        <p class="text-sm sm:text-base text-muted-foreground">Configure rate limits for API routes</p>
                    </div>
                    <div class="flex gap-2">
                        <Button variant="outline" :disabled="saving" @click="fetchRateLimits">
                            <RefreshCw :class="{ 'animate-spin': loading }" class="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                        <Button :disabled="saving || !hasChanges" @click="saveAll">
                            <Save class="h-4 w-4 mr-2" />
                            {{ saving ? 'Saving...' : 'Save All Changes' }}
                        </Button>
                    </div>
                </div>

                <!-- Global Toggle -->
                <Card class="mb-6">
                    <CardContent class="p-6">
                        <div class="flex items-center justify-between">
                            <div class="flex-1">
                                <h3 class="text-lg font-semibold mb-1">Global Rate Limiting</h3>
                                <p class="text-sm text-muted-foreground">
                                    {{
                                        globalEnabled
                                            ? 'Rate limiting is enabled globally. Individual routes can still be disabled.'
                                            : 'Rate limiting is disabled globally. No rate limits will be applied to any route.'
                                    }}
                                </p>
                            </div>
                            <Button
                                :variant="globalEnabled ? 'default' : 'destructive'"
                                :disabled="saving"
                                @click="toggleGlobal"
                            >
                                {{ globalEnabled ? 'Enabled' : 'Disabled' }}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <!-- Info Card -->
                <Card
                    class="mb-6 border-blue-200 dark:border-blue-800 bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950"
                >
                    <CardContent class="p-6">
                        <div class="flex items-start gap-3">
                            <div class="p-2 bg-blue-500/10 rounded-lg">
                                <AlertCircle class="h-5 w-5 text-blue-500" />
                            </div>
                            <div class="flex-1">
                                <h3 class="text-lg font-semibold mb-2">Rate Limits</h3>
                                <p class="text-sm text-muted-foreground mb-3">
                                    Rate limits control how many requests can be made to each API endpoint. Rate
                                    limiting is disabled by default and must be explicitly enabled per route.
                                </p>
                                <ul class="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                    <li>
                                        Click the <Badge variant="outline" class="mx-1">Enabled</Badge>/<Badge
                                            variant="outline"
                                            class="mx-1"
                                            >Disabled</Badge
                                        >
                                        button to toggle rate limiting
                                    </li>
                                    <li>When disabled, rate limits are not applied even if values are set</li>
                                    <li>When enabled, at least one rate limit value must be configured</li>
                                    <li>Rate limits are applied per IP address</li>
                                    <li>Exceeding limits returns a 429 Too Many Requests response</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <!-- Rate Limits Table -->
                <Card>
                    <CardContent class="p-0">
                        <div class="overflow-x-auto">
                            <table class="w-full">
                                <thead>
                                    <tr class="border-b bg-muted/50">
                                        <th class="text-left p-4 font-semibold">Route</th>
                                        <th class="text-left p-4 font-semibold">Enabled</th>
                                        <th class="text-left p-4 font-semibold">/s</th>
                                        <th class="text-left p-4 font-semibold">/m</th>
                                        <th class="text-left p-4 font-semibold">/h</th>
                                        <th class="text-left p-4 font-semibold">/d</th>
                                        <th class="text-left p-4 font-semibold">NS</th>
                                        <th class="text-right p-4 font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr
                                        v-for="(config, routeName) in rateLimits"
                                        :key="routeName"
                                        class="border-b hover:bg-muted/50 transition-colors"
                                    >
                                        <td class="p-4">
                                            <div class="font-medium">{{ routeName }}</div>
                                        </td>
                                        <td class="p-4">
                                            <Button
                                                :variant="config._enabled !== false ? 'default' : 'outline'"
                                                size="sm"
                                                @click="
                                                    () => {
                                                        config._enabled = config._enabled === false ? true : false;
                                                        markAsChanged(routeName);
                                                    }
                                                "
                                            >
                                                {{ config._enabled !== false ? 'Enabled' : 'Disabled' }}
                                            </Button>
                                        </td>
                                        <td class="p-4">
                                            <Input
                                                :model-value="config.per_second ?? undefined"
                                                type="number"
                                                min="0"
                                                placeholder="-"
                                                class="w-24"
                                                :disabled="config._enabled === false"
                                                @update:model-value="
                                                    (val: string | number | undefined) => {
                                                        config.per_second = val ? Number(val) : null;
                                                        markAsChanged(routeName);
                                                    }
                                                "
                                            />
                                        </td>
                                        <td class="p-4">
                                            <Input
                                                :model-value="config.per_minute ?? undefined"
                                                type="number"
                                                min="0"
                                                placeholder="-"
                                                class="w-24"
                                                :disabled="config._enabled === false"
                                                @update:model-value="
                                                    (val: string | number | undefined) => {
                                                        config.per_minute = val ? Number(val) : null;
                                                        markAsChanged(routeName);
                                                    }
                                                "
                                            />
                                        </td>
                                        <td class="p-4">
                                            <Input
                                                :model-value="config.per_hour ?? undefined"
                                                type="number"
                                                min="0"
                                                placeholder="-"
                                                class="w-24"
                                                :disabled="config._enabled === false"
                                                @update:model-value="
                                                    (val: string | number | undefined) => {
                                                        config.per_hour = val ? Number(val) : null;
                                                        markAsChanged(routeName);
                                                    }
                                                "
                                            />
                                        </td>
                                        <td class="p-4">
                                            <Input
                                                :model-value="config.per_day ?? undefined"
                                                type="number"
                                                min="0"
                                                placeholder="-"
                                                class="w-24"
                                                :disabled="config._enabled === false"
                                                @update:model-value="
                                                    (val: string | number | undefined) => {
                                                        config.per_day = val ? Number(val) : null;
                                                        markAsChanged(routeName);
                                                    }
                                                "
                                            />
                                        </td>
                                        <td class="p-4">
                                            <Input
                                                :model-value="config.namespace ?? undefined"
                                                type="text"
                                                placeholder="rate_limit"
                                                class="w-32"
                                                :disabled="config._enabled === false"
                                                @update:model-value="
                                                    (val: string | number | undefined) => {
                                                        config.namespace = val ? String(val) : null;
                                                        markAsChanged(routeName);
                                                    }
                                                "
                                            />
                                        </td>
                                        <td class="p-4">
                                            <div class="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    :disabled="saving || !isChanged(routeName)"
                                                    @click="saveRoute(routeName)"
                                                >
                                                    <Save class="h-3 w-3 mr-1" />
                                                    Save
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    :disabled="saving"
                                                    @click="resetRoute(routeName)"
                                                >
                                                    <RotateCcw class="h-3 w-3 mr-1" />
                                                    Reset
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr v-if="Object.keys(rateLimits).length === 0">
                                        <td colspan="8" class="p-8 text-center text-muted-foreground">
                                            No rate limits configured.
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </DashboardLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useToast } from 'vue-toastification';
import axios from 'axios';
import { AlertCircle, RefreshCw, RotateCcw, Save } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Badge } from '@/components/ui/badge';

const toast = useToast();

// Types
interface RateLimitConfig {
    _enabled?: boolean;
    per_second?: number | null;
    per_minute?: number | null;
    per_hour?: number | null;
    per_day?: number | null;
    namespace?: string | null;
}

// State
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const globalEnabled = ref(false);
const rateLimits = ref<Record<string, RateLimitConfig>>({});
const originalRateLimits = ref<Record<string, RateLimitConfig>>({});
const changedRoutes = ref<Set<string>>(new Set());

// Computed
const hasChanges = computed(() => changedRoutes.value.size > 0);

const isChanged = (routeName: string): boolean => {
    return changedRoutes.value.has(routeName);
};

const markAsChanged = (routeName: string): void => {
    changedRoutes.value.add(routeName);
};

const fetchRateLimits = async (): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
        const response = await axios.get<{
            success: boolean;
            data?: {
                _enabled?: boolean;
                routes?: Record<string, RateLimitConfig>;
            };
            message?: string;
        }>('/api/admin/rate-limits');
        if (response.data.success) {
            globalEnabled.value = response.data.data?._enabled ?? false;
            rateLimits.value = response.data.data?.routes || {};
            originalRateLimits.value = JSON.parse(JSON.stringify(rateLimits.value)) as Record<string, RateLimitConfig>;
            changedRoutes.value.clear();
        } else {
            error.value = response.data.message || 'Failed to load rate limits';
        }
    } catch (err: unknown) {
        error.value =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to load rate limits';
        console.error('Error fetching rate limits:', err);
    } finally {
        loading.value = false;
    }
};

const toggleGlobal = async (): Promise<void> => {
    saving.value = true;

    try {
        const newState = !globalEnabled.value;
        const response = await axios.patch<{ success: boolean; message?: string }>('/api/admin/rate-limits/global', {
            _enabled: newState,
        });

        if (response.data.success) {
            globalEnabled.value = newState;
            toast.success(`Rate limiting ${newState ? 'enabled' : 'disabled'} globally`);
        } else {
            toast.error(response.data.message || 'Failed to update global rate limiting state');
        }
    } catch (err: unknown) {
        const errorMessage =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to update global rate limiting state';
        toast.error(errorMessage);
        console.error('Error updating global rate limiting:', err);
    } finally {
        saving.value = false;
    }
};

const saveRoute = async (routeName: string): Promise<void> => {
    saving.value = true;

    try {
        const config = rateLimits.value[routeName];
        if (!config) {
            toast.error('Route configuration not found');
            return;
        }

        // Remove null/undefined values and empty strings
        const cleanConfig: Record<string, unknown> = {};

        // Include _enabled flag
        if (config._enabled !== undefined) {
            cleanConfig._enabled = config._enabled;
        }

        if (typeof config.per_second === 'number' && config.per_second > 0) {
            cleanConfig.per_second = config.per_second;
        }
        if (typeof config.per_minute === 'number' && config.per_minute > 0) {
            cleanConfig.per_minute = config.per_minute;
        }
        if (typeof config.per_hour === 'number' && config.per_hour > 0) {
            cleanConfig.per_hour = config.per_hour;
        }
        if (typeof config.per_day === 'number' && config.per_day > 0) {
            cleanConfig.per_day = config.per_day;
        }
        if (config.namespace && config.namespace.trim() !== '') {
            cleanConfig.namespace = config.namespace.trim();
        }

        // If enabled, check if at least one rate limit is set
        if (cleanConfig._enabled !== false) {
            if (!cleanConfig.per_second && !cleanConfig.per_minute && !cleanConfig.per_hour && !cleanConfig.per_day) {
                toast.error('At least one rate limit must be set when enabled');
                return;
            }
        }

        const response = await axios.put<{ success: boolean; message?: string }>(
            `/api/admin/rate-limits/${routeName}`,
            cleanConfig,
        );

        if (response.data.success) {
            toast.success(`Rate limit for ${routeName} updated successfully`);
            originalRateLimits.value[routeName] = JSON.parse(JSON.stringify(config)) as RateLimitConfig;
            changedRoutes.value.delete(routeName);
        } else {
            toast.error(response.data.message || 'Failed to update rate limit');
        }
    } catch (err: unknown) {
        const errorMessage =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to update rate limit';
        toast.error(errorMessage);
        console.error('Error updating rate limit:', err);
    } finally {
        saving.value = false;
    }
};

const resetRoute = async (routeName: string): Promise<void> => {
    if (
        !confirm(
            `Are you sure you want to reset rate limits for ${routeName}? This will delete the custom configuration and revert to developer defaults.`,
        )
    ) {
        return;
    }

    saving.value = true;

    try {
        const response = await axios.delete<{ success: boolean; message?: string }>(
            `/api/admin/rate-limits/${routeName}`,
        );

        if (response.data.success) {
            toast.success(`Rate limit for ${routeName} reset to default`);
            delete rateLimits.value[routeName];
            delete originalRateLimits.value[routeName];
            changedRoutes.value.delete(routeName);
        } else {
            toast.error(response.data.message || 'Failed to reset rate limit');
        }
    } catch (err: unknown) {
        const errorMessage =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to reset rate limit';
        toast.error(errorMessage);
        console.error('Error resetting rate limit:', err);
    } finally {
        saving.value = false;
    }
};

const saveAll = async (): Promise<void> => {
    if (changedRoutes.value.size === 0) {
        toast.info('No changes to save');
        return;
    }

    saving.value = true;

    try {
        const routesToUpdate: Record<string, Record<string, unknown>> = {};

        for (const routeName of changedRoutes.value) {
            const config = rateLimits.value[routeName];
            if (!config) {
                continue;
            }
            const cleanConfig: Record<string, unknown> = {};

            if (typeof config.per_second === 'number' && config.per_second > 0) {
                cleanConfig.per_second = config.per_second;
            }
            if (typeof config.per_minute === 'number' && config.per_minute > 0) {
                cleanConfig.per_minute = config.per_minute;
            }
            if (typeof config.per_hour === 'number' && config.per_hour > 0) {
                cleanConfig.per_hour = config.per_hour;
            }
            if (typeof config.per_day === 'number' && config.per_day > 0) {
                cleanConfig.per_day = config.per_day;
            }
            if (config.namespace && config.namespace.trim() !== '') {
                cleanConfig.namespace = config.namespace.trim();
            }

            // Include _enabled flag
            if (config._enabled !== undefined) {
                cleanConfig._enabled = config._enabled;
            }

            // Include route if it has any configuration
            if (
                cleanConfig._enabled !== undefined ||
                cleanConfig.per_second ||
                cleanConfig.per_minute ||
                cleanConfig.per_hour ||
                cleanConfig.per_day ||
                cleanConfig.namespace
            ) {
                routesToUpdate[routeName] = cleanConfig;
            }
        }

        if (Object.keys(routesToUpdate).length === 0) {
            toast.error('No valid rate limits to save');
            return;
        }

        const response = await axios.patch<{ success: boolean; data?: { total_updated?: number }; message?: string }>(
            '/api/admin/rate-limits/bulk',
            { routes: routesToUpdate },
        );

        if (response.data.success) {
            const updatedCount = response.data.data?.total_updated || 0;
            toast.success(`Successfully updated ${updatedCount} rate limit(s)`);

            // Update original values
            for (const routeName of Object.keys(routesToUpdate)) {
                const config = rateLimits.value[routeName];
                if (config) {
                    originalRateLimits.value[routeName] = JSON.parse(JSON.stringify(config)) as RateLimitConfig;
                }
            }

            changedRoutes.value.clear();
        } else {
            toast.error(response.data.message || 'Failed to update rate limits');
        }
    } catch (err: unknown) {
        const errorMessage =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to update rate limits';
        toast.error(errorMessage);
        console.error('Error updating rate limits:', err);
    } finally {
        saving.value = false;
    }
};

onMounted(() => {
    fetchRateLimits();
});
</script>
