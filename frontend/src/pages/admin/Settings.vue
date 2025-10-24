<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Settings', isCurrent: true, href: '/admin/settings' }]">
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="text-center">
                    <div
                        class="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4"
                    ></div>
                    <h3 class="text-lg font-semibold mb-2">Loading Settings</h3>
                    <p class="text-muted-foreground">Please wait while we fetch your configuration...</p>
                </div>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="flex flex-col items-center justify-center py-12 text-center">
                <div class="text-red-500 mb-4">
                    <AlertCircle class="h-12 w-12 mx-auto" />
                </div>
                <h3 class="text-lg font-medium text-muted-foreground mb-2">Failed to load settings</h3>
                <p class="text-sm text-muted-foreground max-w-sm">{{ error }}</p>
                <Button class="mt-4" @click="fetchSettings">Try Again</Button>
            </div>

            <!-- Settings Content -->
            <div v-else class="p-4 sm:p-6">
                <!-- Header -->
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div>
                        <h1 class="text-2xl sm:text-3xl font-bold text-foreground mb-1">Settings</h1>
                        <p class="text-sm sm:text-base text-muted-foreground">
                            Manage application settings and configuration
                        </p>
                    </div>
                </div>

                <!-- Upload Logs to Support -->
                <Card
                    class="mb-6 border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950"
                >
                    <CardContent class="p-6">
                        <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div class="flex-1">
                                <div class="flex items-center gap-3 mb-2">
                                    <div class="p-2 bg-blue-500/10 rounded-lg">
                                        <Upload class="h-5 w-5 text-blue-500" />
                                    </div>
                                    <h3 class="text-lg font-semibold">Upload Logs to Support</h3>
                                </div>
                                <p class="text-sm text-muted-foreground mb-4">
                                    Upload your web and application logs to mclo.gs for easy sharing with support. This
                                    will generate shareable links for both log files.
                                </p>

                                <!-- Upload Results -->
                                <div v-if="logUploadResults" class="space-y-3 mt-4">
                                    <!-- Web Logs -->
                                    <div v-if="logUploadResults.web" class="bg-background rounded-lg border p-4">
                                        <div class="flex items-center justify-between mb-2">
                                            <span class="font-medium flex items-center gap-2">
                                                <Badge variant="outline">Web Logs</Badge>
                                            </span>
                                            <CheckCircle2
                                                v-if="logUploadResults.web.success"
                                                class="h-4 w-4 text-green-500"
                                            />
                                            <AlertCircle v-else class="h-4 w-4 text-red-500" />
                                        </div>

                                        <div
                                            v-if="logUploadResults.web.success && logUploadResults.web.url"
                                            class="space-y-2"
                                        >
                                            <div class="flex items-center gap-2">
                                                <a
                                                    :href="logUploadResults.web.url"
                                                    target="_blank"
                                                    class="text-sm text-blue-500 hover:underline flex items-center gap-1"
                                                >
                                                    {{ logUploadResults.web.url }}
                                                    <ExternalLink class="h-3 w-3" />
                                                </a>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    class="h-6 px-2"
                                                    @click="copyToClipboard(logUploadResults.web.url!)"
                                                >
                                                    <Copy
                                                        v-if="copiedUrl !== logUploadResults.web.url"
                                                        class="h-3 w-3"
                                                    />
                                                    <CheckCircle2 v-else class="h-3 w-3 text-green-500" />
                                                </Button>
                                            </div>
                                            <a
                                                v-if="logUploadResults.web.raw"
                                                :href="logUploadResults.web.raw"
                                                target="_blank"
                                                class="text-xs text-muted-foreground hover:underline flex items-center gap-1"
                                            >
                                                Raw: {{ logUploadResults.web.raw }}
                                                <ExternalLink class="h-3 w-3" />
                                            </a>
                                        </div>
                                        <p v-else-if="logUploadResults.web.error" class="text-sm text-red-500">
                                            {{ logUploadResults.web.error }}
                                        </p>
                                    </div>

                                    <!-- App Logs -->
                                    <div v-if="logUploadResults.app" class="bg-background rounded-lg border p-4">
                                        <div class="flex items-center justify-between mb-2">
                                            <span class="font-medium flex items-center gap-2">
                                                <Badge variant="outline">App Logs</Badge>
                                            </span>
                                            <CheckCircle2
                                                v-if="logUploadResults.app.success"
                                                class="h-4 w-4 text-green-500"
                                            />
                                            <AlertCircle v-else class="h-4 w-4 text-red-500" />
                                        </div>

                                        <div
                                            v-if="logUploadResults.app.success && logUploadResults.app.url"
                                            class="space-y-2"
                                        >
                                            <div class="flex items-center gap-2">
                                                <a
                                                    :href="logUploadResults.app.url"
                                                    target="_blank"
                                                    class="text-sm text-blue-500 hover:underline flex items-center gap-1"
                                                >
                                                    {{ logUploadResults.app.url }}
                                                    <ExternalLink class="h-3 w-3" />
                                                </a>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    class="h-6 px-2"
                                                    @click="copyToClipboard(logUploadResults.app.url!)"
                                                >
                                                    <Copy
                                                        v-if="copiedUrl !== logUploadResults.app.url"
                                                        class="h-3 w-3"
                                                    />
                                                    <CheckCircle2 v-else class="h-3 w-3 text-green-500" />
                                                </Button>
                                            </div>
                                            <a
                                                v-if="logUploadResults.app.raw"
                                                :href="logUploadResults.app.raw"
                                                target="_blank"
                                                class="text-xs text-muted-foreground hover:underline flex items-center gap-1"
                                            >
                                                Raw: {{ logUploadResults.app.raw }}
                                                <ExternalLink class="h-3 w-3" />
                                            </a>
                                        </div>
                                        <p v-else-if="logUploadResults.app.error" class="text-sm text-red-500">
                                            {{ logUploadResults.app.error }}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Button :disabled="uploadingLogs" class="w-full md:w-auto" @click="uploadLogsToSupport">
                                <Upload v-if="!uploadingLogs" class="h-4 w-4 mr-2" />
                                <div
                                    v-else
                                    class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
                                ></div>
                                {{ uploadingLogs ? 'Uploading...' : 'Upload Logs' }}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <!-- Category Tabs -->
                <div class="mb-6">
                    <!-- Mobile: Grid Layout -->
                    <div class="grid grid-cols-2 sm:hidden gap-2 mb-4">
                        <button
                            v-for="category in categories"
                            :key="category.id"
                            :class="[
                                'flex flex-col items-center justify-center p-3 rounded-lg border-2 font-medium text-xs transition-all duration-200 min-h-[80px]',
                                selectedCategory === category.id
                                    ? 'border-primary bg-primary/5 text-primary'
                                    : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-primary',
                            ]"
                            @click="switchCategory(category.id)"
                        >
                            <component :is="getCategoryIcon(category.icon)" class="h-5 w-5 mb-1" />
                            <span class="text-center leading-tight">{{ category.name }}</span>
                            <Badge
                                v-if="category.settings_count > 0"
                                variant="secondary"
                                class="mt-1 text-xs px-1.5 py-0.5"
                            >
                                {{ category.settings_count }}
                            </Badge>
                        </button>
                    </div>

                    <!-- Desktop: Horizontal Tabs -->
                    <div class="hidden sm:block border-b">
                        <nav class="-mb-px flex space-x-8">
                            <button
                                v-for="category in categories"
                                :key="category.id"
                                :class="[
                                    'flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200',
                                    selectedCategory === category.id
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground',
                                ]"
                                @click="switchCategory(category.id)"
                            >
                                <component :is="getCategoryIcon(category.icon)" class="h-4 w-4" />
                                <span>{{ category.name }}</span>
                                <Badge v-if="category.settings_count > 0" variant="secondary" class="ml-2">
                                    {{ category.settings_count }}
                                </Badge>
                            </button>
                        </nav>
                    </div>
                </div>

                <!-- Category Loading State -->
                <div v-if="categoryLoading" class="flex items-center justify-center py-8">
                    <div class="flex items-center gap-3">
                        <div
                            class="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"
                        ></div>
                        <span class="text-muted-foreground">Loading category settings...</span>
                    </div>
                </div>

                <!-- Category Content -->
                <div v-else-if="currentCategorySettings" class="space-y-6 animate-in fade-in-50 duration-300">
                    <div class="bg-card rounded-lg border shadow-sm">
                        <div class="flex items-center space-x-3 p-4 sm:p-6 border-b">
                            <component
                                :is="getCategoryIcon(currentCategorySettings.category.icon)"
                                class="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0"
                            />
                            <div class="min-w-0 flex-1">
                                <h2 class="text-lg sm:text-xl font-semibold truncate">
                                    {{ currentCategorySettings.category.name }}
                                </h2>
                                <p class="text-sm text-muted-foreground">
                                    {{ currentCategorySettings.category.description }}
                                </p>
                            </div>
                        </div>

                        <!-- Settings Form -->
                        <form class="p-4 sm:p-6 space-y-6" @submit.prevent="saveSettings">
                            <div
                                v-for="(setting, key) in currentCategorySettings.settings"
                                :key="String(key)"
                                class="space-y-3 animate-in slide-in-from-left-2 duration-200"
                                :style="{
                                    animationDelay: `${Object.keys(currentCategorySettings.settings).indexOf(String(key)) * 50}ms`,
                                }"
                            >
                                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                    <div class="space-y-1 flex-1">
                                        <Label :for="String(key)" class="text-sm font-medium">
                                            {{
                                                setting.name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                                            }}
                                        </Label>
                                        <p class="text-xs text-muted-foreground">{{ setting.description }}</p>
                                    </div>
                                    <Badge v-if="setting.required" variant="outline" class="text-xs self-start sm:ml-4">
                                        Required
                                    </Badge>
                                </div>

                                <!-- Text Input -->
                                <Input
                                    v-if="setting.type === 'text'"
                                    :id="String(key)"
                                    v-model="setting.value"
                                    :placeholder="setting.placeholder"
                                    :required="setting.required"
                                    class="w-full max-w-md"
                                />

                                <!-- Number Input -->
                                <Input
                                    v-else-if="setting.type === 'number'"
                                    :id="String(key)"
                                    v-model.number="setting.value"
                                    type="number"
                                    :placeholder="setting.placeholder"
                                    :required="setting.required"
                                    class="w-full max-w-md"
                                />

                                <!-- Select Input -->
                                <Select v-else-if="setting.type === 'select'" v-model="setting.value">
                                    <SelectTrigger class="w-full max-w-md">
                                        <SelectValue :placeholder="setting.placeholder" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem v-for="option in setting.options" :key="option" :value="option">
                                            <template v-if="option === 'true' || option === 'false'">
                                                {{ option === 'true' ? 'Enabled' : 'Disabled' }}
                                            </template>
                                            <template v-else>
                                                {{ option }}
                                            </template>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                <!-- Textarea Input -->
                                <Textarea
                                    v-else-if="setting.type === 'textarea'"
                                    :id="String(key)"
                                    v-model="setting.value"
                                    :placeholder="setting.placeholder"
                                    :required="setting.required"
                                    class="w-full max-w-md"
                                    rows="3"
                                />

                                <!-- Toggle Input -->
                                <div v-else-if="setting.type === 'toggle'" class="flex items-center space-x-2">
                                    <Switch
                                        :id="String(key)"
                                        v-model:checked="setting.value"
                                        :disabled="setting.required && !setting.value"
                                    />
                                    <Label :for="String(key)" class="text-sm">
                                        {{ setting.value ? 'Enabled' : 'Disabled' }}
                                    </Label>
                                </div>
                            </div>

                            <!-- Save Button -->
                            <div
                                class="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-2 pt-6 border-t"
                            >
                                <Button type="button" variant="outline" class="w-full sm:w-auto" @click="resetSettings">
                                    Reset
                                </Button>
                                cd
                                <Button
                                    type="submit"
                                    :disabled="saving"
                                    class="w-full sm:w-auto"
                                    data-umami-event="Save settings"
                                    :data-umami-event-category="selectedCategory"
                                >
                                    <Save v-if="!saving" class="h-4 w-4 mr-2" />
                                    <div
                                        v-else
                                        class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
                                    ></div>
                                    {{ saving ? 'Saving...' : 'Save Changes' }}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Empty Category -->
                <div
                    v-else
                    class="bg-card rounded-lg border p-8 sm:p-12 text-center shadow-sm animate-in fade-in-50 duration-300"
                >
                    <Settings class="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 class="text-lg font-semibold mb-2">No Settings Available</h3>
                    <p class="text-sm sm:text-base text-muted-foreground">
                        This category doesn't have any configurable settings yet.
                    </p>
                </div>
            </div>
        </div>
        <!-- Settings help cards under the content -->
        <div class="p-4 sm:p-6">
            <div class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                    <CardContent>
                        <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                            <Settings class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <div class="font-semibold text-foreground mb-1">What are Settings?</div>
                                <p>
                                    Global configuration that controls how your panel behaves (branding, mail, security,
                                    integrations, and more). Changes apply system-wide.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                            <Globe class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <div class="font-semibold text-foreground mb-1">Categories & Scope</div>
                                <p>
                                    Settings are grouped by category (e.g., App, Mail, Security). Use the tabs to
                                    navigate. Some changes may require a service reload to take effect.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card class="md:col-span-2 lg:col-span-1">
                    <CardContent>
                        <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                            <Lock class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <div class="font-semibold text-foreground mb-1">Tips & Safety</div>
                                <ul class="list-disc list-inside space-y-1">
                                    <li>Change one category at a time and test critical features.</li>
                                    <li>Keep SMTP, domains, and security keys up to date.</li>
                                    <li>Back up settings before major changes or upgrades.</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card class="md:col-span-2 lg:col-span-3">
                    <CardContent>
                        <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                            <AlertCircle class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <div class="font-semibold text-foreground mb-1">Legal & Audit</div>
                                <p>
                                    Ensure your Terms and Privacy Policy reflect your configuration (e.g., email and
                                    analytics). FeatherPanel and its developers are not liable for your configuration
                                    choices. Keep an audit of who changed what and when.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </DashboardLayout>
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

import { ref, computed, onMounted } from 'vue';
import { useSessionStore } from '@/stores/session';
import { useRouter } from 'vue-router';
import { useAdminSettingsStore, type Setting } from '@/stores/adminSettings';
import {
    Settings,
    Save,
    AlertCircle,
    Shield,
    Mail,
    Database,
    Globe,
    Lock,
    Bell,
    Palette,
    Upload,
    ExternalLink,
    Copy,
    CheckCircle2,
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { useToast } from 'vue-toastification';
import { Card, CardContent } from '@/components/ui/card';
import axios from 'axios';

const toast = useToast();

const sessionStore = useSessionStore();
const router = useRouter();
const adminSettingsStore = useAdminSettingsStore();

// State
const selectedCategory = ref('app');
const originalSettings = ref<Record<string, Setting> | null>(null);
const categoryLoading = ref(false);

// Log upload state
const uploadingLogs = ref(false);
const logUploadResults = ref<{
    web?: { success: boolean; url?: string; raw?: string; error?: string };
    app?: { success: boolean; url?: string; raw?: string; error?: string };
} | null>(null);
const copiedUrl = ref<string | null>(null);

// Computed
const loading = computed(() => adminSettingsStore.loading);
const saving = computed(() => adminSettingsStore.saving);
const error = computed(() => adminSettingsStore.error);
const categories = computed(() => adminSettingsStore.categories);
const organizedSettings = computed(() => adminSettingsStore.organizedSettings);

const currentCategorySettings = computed(() => {
    if (!organizedSettings.value || !selectedCategory.value) return null;
    return organizedSettings.value[selectedCategory.value];
});

// Methods
const getCategoryIcon = (iconName: string) => {
    const icons: Record<string, typeof Settings> = {
        settings: Settings,
        shield: Shield,
        mail: Mail,
        database: Database,
        globe: Globe,
        lock: Lock,
        bell: Bell,
        palette: Palette,
    };
    return icons[iconName] || Settings;
};

const switchCategory = async (categoryId: string) => {
    if (selectedCategory.value === categoryId) return;

    categoryLoading.value = true;

    // Small delay to show loading state and make transition feel smoother
    await new Promise((resolve) => setTimeout(resolve, 150));

    selectedCategory.value = categoryId;
    categoryLoading.value = false;
};

const fetchSettings = async () => {
    await adminSettingsStore.fetchSettings();
    if (adminSettingsStore.settings) {
        originalSettings.value = JSON.parse(JSON.stringify(adminSettingsStore.settings));
    }
};

const saveSettings = async () => {
    if (!currentCategorySettings.value) return;

    const settingsToUpdate: Record<string, string | number | boolean> = {};
    Object.entries(currentCategorySettings.value.settings).forEach(([key, setting]: [string, Setting]) => {
        if (setting.type === 'toggle') {
            settingsToUpdate[key] = setting.value;
        } else {
            settingsToUpdate[key] = setting.value;
        }
    });

    const result = await adminSettingsStore.saveSettings(settingsToUpdate);

    if (result.success) {
        // Update the original settings
        if (originalSettings.value) {
            Object.assign(originalSettings.value, settingsToUpdate);
        }
        // Show success message (you can add a toast notification here)
        toast.success('Settings saved successfully');
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    }
};

const resetSettings = () => {
    if (!originalSettings.value || !currentCategorySettings.value) return;

    Object.entries(currentCategorySettings.value.settings).forEach(([key, setting]: [string, Setting]) => {
        const originalSetting = originalSettings.value?.[key];
        if (originalSetting) {
            setting.value = originalSetting.value;
        }
    });
};

// Log upload functions
const uploadLogsToSupport = async () => {
    uploadingLogs.value = true;
    logUploadResults.value = null;

    try {
        const response = await axios.post('/api/admin/log-viewer/upload');

        if (response.data.success) {
            logUploadResults.value = response.data.data;
            toast.success('Logs uploaded successfully to mclo.gs!');
        } else {
            toast.error(response.data.message || 'Failed to upload logs');
        }
    } catch (error) {
        console.error('Error uploading logs:', error);
        toast.error('Failed to upload logs. Please try again.');
    } finally {
        uploadingLogs.value = false;
    }
};

const copyToClipboard = async (url: string) => {
    try {
        await navigator.clipboard.writeText(url);
        copiedUrl.value = url;
        toast.success('URL copied to clipboard!');

        setTimeout(() => {
            copiedUrl.value = null;
        }, 2000);
    } catch {
        toast.error('Failed to copy URL');
    }
};

// Lifecycle
onMounted(async () => {
    const ok = await sessionStore.checkSessionOrRedirect(router);
    if (!ok) return;

    await fetchSettings();
});
</script>
