<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Settings', isCurrent: true, href: '/admin/settings' }]">
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading settings...</span>
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
            <div v-else class="p-6">
                <!-- Header -->
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div>
                        <h1 class="text-3xl font-bold text-foreground mb-1">Settings</h1>
                        <p class="text-muted-foreground">Manage application settings and configuration</p>
                    </div>
                </div>

                <!-- Category Tabs -->
                <div class="border-b mb-6">
                    <nav class="-mb-px flex space-x-8">
                        <button
                            v-for="category in categories"
                            :key="category.id"
                            :class="[
                                'flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                                selectedCategory === category.id
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground',
                            ]"
                            @click="selectedCategory = category.id"
                        >
                            <component :is="getCategoryIcon(category.icon)" class="h-4 w-4" />
                            <span>{{ category.name }}</span>
                            <Badge v-if="category.settings_count > 0" variant="secondary" class="ml-2">
                                {{ category.settings_count }}
                            </Badge>
                        </button>
                    </nav>
                </div>

                <!-- Category Content -->
                <div v-if="currentCategorySettings" class="space-y-6">
                    <div class="bg-card rounded-lg border shadow-sm">
                        <div class="flex items-center space-x-3 p-6 border-b">
                            <component
                                :is="getCategoryIcon(currentCategorySettings.category.icon)"
                                class="h-6 w-6 text-primary"
                            />
                            <div>
                                <h2 class="text-xl font-semibold">{{ currentCategorySettings.category.name }}</h2>
                                <p class="text-muted-foreground">{{ currentCategorySettings.category.description }}</p>
                            </div>
                        </div>

                        <!-- Settings Form -->
                        <form class="p-6 space-y-6" @submit.prevent="saveSettings">
                            <div
                                v-for="(setting, key) in currentCategorySettings.settings"
                                :key="String(key)"
                                class="space-y-3"
                            >
                                <div class="flex items-start justify-between">
                                    <div class="space-y-1 flex-1">
                                        <Label :for="String(key)" class="text-sm font-medium">
                                            {{
                                                setting.name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                                            }}
                                        </Label>
                                        <p class="text-xs text-muted-foreground">{{ setting.description }}</p>
                                    </div>
                                    <Badge v-if="setting.required" variant="outline" class="text-xs ml-4">
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
                                    class="max-w-md"
                                />

                                <!-- Select Input -->
                                <Select v-else-if="setting.type === 'select'" v-model="setting.value">
                                    <SelectTrigger class="max-w-md">
                                        <SelectValue :placeholder="setting.placeholder" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem v-for="option in setting.options" :key="option" :value="option">
                                            {{ option }}
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
                                    class="max-w-md"
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
                            <div class="flex items-center justify-end space-x-2 pt-6 border-t">
                                <Button type="button" variant="outline" @click="resetSettings"> Reset </Button>
                                <Button type="submit" :disabled="saving">
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
                <div v-else class="bg-card rounded-lg border p-12 text-center shadow-sm">
                    <Settings class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 class="text-lg font-semibold mb-2">No Settings Available</h3>
                    <p class="text-muted-foreground">This category doesn't have any configurable settings yet.</p>
                </div>
            </div>
        </div>
    </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useSessionStore } from '@/stores/session';
import { useRouter } from 'vue-router';
import { useAdminSettingsStore, type Setting } from '@/stores/adminSettings';
import { Settings, Save, AlertCircle, Shield, Mail, Database, Globe, Lock, Bell, Palette } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import DashboardLayout from '@/layouts/DashboardLayout.vue';

const sessionStore = useSessionStore();
const router = useRouter();
const adminSettingsStore = useAdminSettingsStore();

// State
const selectedCategory = ref('app');
const originalSettings = ref<Record<string, Setting> | null>(null);

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
        console.log('Settings saved successfully');
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

// Lifecycle
onMounted(async () => {
    const ok = await sessionStore.checkSessionOrRedirect(router);
    if (!ok) return;

    await fetchSettings();
});
</script>
