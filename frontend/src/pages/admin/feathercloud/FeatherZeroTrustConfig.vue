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

import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import axios from 'axios';
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'vue-toastification';

const toast = useToast();

const loading = ref(true);
const saving = ref(false);
const config = ref<Record<string, unknown>>({});

// Text areas for array fields
const ignoredExtensionsText = ref('');
const ignoredFilesText = ref('');
const ignoredPathsText = ref('');
const suspiciousExtensionsText = ref('');
const suspiciousNamesText = ref('');
const suspiciousPatternsText = ref('');
const maliciousProcessesText = ref('');
const whatsappIndicatorsText = ref('');
const minerIndicatorsText = ref('');
const suspiciousWordsText = ref('');
const suspiciousContentText = ref('');

const breadcrumbs = computed(() => [
    { text: 'FeatherZeroTrust', href: '/admin/feathercloud/featherzerotrust' },
    { text: 'Configuration', isCurrent: true, href: '/admin/feathercloud/featherzerotrust/config' },
]);

// Convert arrays to comma-separated text
function arraysToText(): void {
    ignoredExtensionsText.value = (config.value.ignored_extensions as string[])?.join(', ') || '';
    ignoredFilesText.value = (config.value.ignored_files as string[])?.join(', ') || '';
    ignoredPathsText.value = (config.value.ignored_paths as string[])?.join(', ') || '';
    suspiciousExtensionsText.value = (config.value.suspicious_extensions as string[])?.join(', ') || '';
    suspiciousNamesText.value = (config.value.suspicious_names as string[])?.join(', ') || '';
    suspiciousPatternsText.value = (config.value.suspicious_patterns as string[])?.join('\n') || '';
    maliciousProcessesText.value = (config.value.malicious_processes as string[])?.join(', ') || '';
    whatsappIndicatorsText.value = (config.value.whatsapp_indicators as string[])?.join(', ') || '';
    minerIndicatorsText.value = (config.value.miner_indicators as string[])?.join(', ') || '';
    suspiciousWordsText.value = (config.value.suspicious_words as string[])?.join(', ') || '';
    suspiciousContentText.value = (config.value.suspicious_content as string[])?.join(', ') || '';
}

// Convert text to arrays
function textToArrays(): void {
    config.value.ignored_extensions = ignoredExtensionsText.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    config.value.ignored_files = ignoredFilesText.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    config.value.ignored_paths = ignoredPathsText.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    config.value.suspicious_extensions = suspiciousExtensionsText.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    config.value.suspicious_names = suspiciousNamesText.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    config.value.suspicious_patterns = suspiciousPatternsText.value
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
    config.value.malicious_processes = maliciousProcessesText.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    config.value.whatsapp_indicators = whatsappIndicatorsText.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    config.value.miner_indicators = minerIndicatorsText.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    config.value.suspicious_words = suspiciousWordsText.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    config.value.suspicious_content = suspiciousContentText.value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

async function fetchConfig(): Promise<void> {
    loading.value = true;
    try {
        const { data } = await axios.get('/api/admin/featherzerotrust/config');
        config.value = data.data || {};
        arraysToText();
    } catch (error: unknown) {
        toast.error(
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to load configuration',
        );
    } finally {
        loading.value = false;
    }
}

async function saveConfig(): Promise<void> {
    saving.value = true;
    try {
        textToArrays();
        await axios.put('/api/admin/featherzerotrust/config', config.value);
        toast.success('Configuration saved successfully');
        await fetchConfig();
    } catch (error: unknown) {
        toast.error(
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to save configuration',
        );
    } finally {
        saving.value = false;
    }
}

async function resetConfig(): Promise<void> {
    if (!confirm('Are you sure you want to reset all configuration to defaults? This cannot be undone.')) {
        return;
    }

    saving.value = true;
    try {
        // Fetch defaults by creating a new config instance
        await axios.put('/api/admin/featherzerotrust/config', {});
        toast.success('Configuration reset to defaults');
        await fetchConfig();
    } catch (error: unknown) {
        toast.error(
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to reset configuration',
        );
    } finally {
        saving.value = false;
    }
}

onMounted(() => {
    void fetchConfig();
});
</script>

<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading configuration...</span>
                </div>
            </div>

            <!-- Configuration Form -->
            <div v-else class="p-6 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>FeatherZeroTrust Configuration</CardTitle>
                        <CardDescription>Configure scanning behavior, patterns, and detection rules</CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-6">
                        <!-- Basic Settings -->
                        <div class="space-y-4">
                            <h3 class="text-lg font-semibold">Basic Settings</h3>

                            <div class="flex items-center justify-between p-4 border rounded-lg">
                                <div class="flex-1">
                                    <label class="text-sm font-medium cursor-pointer" for="enabled">Enabled</label>
                                    <p class="text-xs text-muted-foreground mt-1">
                                        Enable or disable FeatherZeroTrust scanning
                                    </p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer" for="enabled">
                                    <input id="enabled" v-model="config.enabled" type="checkbox" class="sr-only peer" />
                                    <div
                                        class="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"
                                    ></div>
                                </label>
                            </div>

                            <div>
                                <label class="block text-sm font-medium mb-2">Scan Interval (minutes)</label>
                                <Input
                                    type="number"
                                    min="1"
                                    :model-value="String(config.scan_interval ?? '')"
                                    @update:model-value="config.scan_interval = Number($event) || 15"
                                />
                                <p class="text-xs text-muted-foreground mt-1">
                                    How often to automatically scan servers
                                </p>
                            </div>

                            <div>
                                <label class="block text-sm font-medium mb-2">Max File Size (bytes)</label>
                                <Input
                                    type="number"
                                    min="0"
                                    :model-value="String(config.max_file_size ?? '')"
                                    @update:model-value="config.max_file_size = Number($event) || 0"
                                />
                                <p class="text-xs text-muted-foreground mt-1">
                                    Maximum file size to scan (0 = unlimited)
                                </p>
                            </div>

                            <div>
                                <label class="block text-sm font-medium mb-2">Max Directory Depth</label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="20"
                                    :model-value="String(config.max_depth ?? '')"
                                    @update:model-value="config.max_depth = Number($event) || 10"
                                />
                                <p class="text-xs text-muted-foreground mt-1">
                                    Maximum directory depth to scan recursively
                                </p>
                            </div>

                            <div class="flex items-center justify-between p-4 border rounded-lg">
                                <div class="flex-1">
                                    <label class="text-sm font-medium cursor-pointer" for="auto_suspend"
                                        >Auto Suspend</label
                                    >
                                    <p class="text-xs text-muted-foreground mt-1">
                                        Automatically suspend servers with detections
                                    </p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer" for="auto_suspend">
                                    <input
                                        id="auto_suspend"
                                        v-model="config.auto_suspend"
                                        type="checkbox"
                                        class="sr-only peer"
                                    />
                                    <div
                                        class="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"
                                    ></div>
                                </label>
                            </div>
                        </div>

                        <!-- Webhook Settings -->
                        <div class="space-y-4 border-t pt-4">
                            <h3 class="text-lg font-semibold">Webhook Settings</h3>

                            <div class="flex items-center justify-between p-4 border rounded-lg">
                                <div class="flex-1">
                                    <label class="text-sm font-medium cursor-pointer" for="webhook_enabled"
                                        >Webhook Enabled</label
                                    >
                                    <p class="text-xs text-muted-foreground mt-1">Send notifications via webhook</p>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer" for="webhook_enabled">
                                    <input
                                        id="webhook_enabled"
                                        v-model="config.webhook_enabled"
                                        type="checkbox"
                                        class="sr-only peer"
                                    />
                                    <div
                                        class="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"
                                    ></div>
                                </label>
                            </div>

                            <div v-if="config.webhook_enabled">
                                <label class="block text-sm font-medium mb-2">Webhook URL</label>
                                <Input
                                    placeholder="https://discord.com/api/webhooks/..."
                                    :model-value="String(config.webhook_url ?? '')"
                                    @update:model-value="config.webhook_url = $event"
                                />
                            </div>
                        </div>

                        <!-- File Patterns -->
                        <div class="space-y-4 border-t pt-4">
                            <h3 class="text-lg font-semibold">File Patterns</h3>

                            <div>
                                <label class="block text-sm font-medium mb-2">Ignored Extensions</label>
                                <Textarea
                                    v-model="ignoredExtensionsText"
                                    placeholder=".jar, .log, .txt"
                                    class="font-mono text-sm"
                                    rows="3"
                                />
                                <p class="text-xs text-muted-foreground mt-1">
                                    Comma-separated list of file extensions to ignore
                                </p>
                            </div>

                            <div>
                                <label class="block text-sm font-medium mb-2">Ignored Files</label>
                                <Textarea
                                    v-model="ignoredFilesText"
                                    placeholder="server.jar.old, latest.log"
                                    class="font-mono text-sm"
                                    rows="3"
                                />
                                <p class="text-xs text-muted-foreground mt-1">
                                    Comma-separated list of file names to ignore
                                </p>
                            </div>

                            <div>
                                <label class="block text-sm font-medium mb-2">Ignored Paths</label>
                                <Textarea
                                    v-model="ignoredPathsText"
                                    placeholder="logs/, cache/, world/playerdata/"
                                    class="font-mono text-sm"
                                    rows="3"
                                />
                                <p class="text-xs text-muted-foreground mt-1">
                                    Comma-separated list of directory paths to ignore
                                </p>
                            </div>

                            <div>
                                <label class="block text-sm font-medium mb-2">Suspicious Extensions</label>
                                <Textarea
                                    v-model="suspiciousExtensionsText"
                                    placeholder=".sh, .bat, .exe"
                                    class="font-mono text-sm"
                                    rows="2"
                                />
                                <p class="text-xs text-muted-foreground mt-1">File extensions that trigger suspicion</p>
                            </div>

                            <div>
                                <label class="block text-sm font-medium mb-2">Suspicious File Names</label>
                                <Textarea
                                    v-model="suspiciousNamesText"
                                    placeholder="mine.sh, proxies.txt, whatsapp.js"
                                    class="font-mono text-sm"
                                    rows="3"
                                />
                                <p class="text-xs text-muted-foreground mt-1">File names that trigger suspicion</p>
                            </div>

                            <div>
                                <label class="block text-sm font-medium mb-2">Max JAR Size (bytes)</label>
                                <Input
                                    type="number"
                                    min="0"
                                    :model-value="String(config.max_jar_size ?? '')"
                                    @update:model-value="config.max_jar_size = Number($event) || 0"
                                />
                                <p class="text-xs text-muted-foreground mt-1">
                                    JAR files smaller than this are considered suspicious
                                </p>
                            </div>
                        </div>

                        <!-- Detection Patterns -->
                        <div class="space-y-4 border-t pt-4">
                            <h3 class="text-lg font-semibold">Detection Patterns</h3>

                            <div>
                                <label class="block text-sm font-medium mb-2">Suspicious Content Patterns</label>
                                <Textarea
                                    v-model="suspiciousPatternsText"
                                    placeholder="stratum+tcp://, pool., miningpool"
                                    class="font-mono text-sm"
                                    rows="4"
                                />
                                <p class="text-xs text-muted-foreground mt-1">
                                    Patterns in file content that trigger detection (one per line)
                                </p>
                            </div>

                            <div>
                                <label class="block text-sm font-medium mb-2">Malicious Processes</label>
                                <Textarea
                                    v-model="maliciousProcessesText"
                                    placeholder="xmrig, earnfm, mcstorm.jar"
                                    class="font-mono text-sm"
                                    rows="3"
                                />
                                <p class="text-xs text-muted-foreground mt-1">
                                    Process names that indicate malicious activity
                                </p>
                            </div>

                            <div>
                                <label class="block text-sm font-medium mb-2">WhatsApp Bot Indicators</label>
                                <Textarea
                                    v-model="whatsappIndicatorsText"
                                    placeholder="whatsapp-web.js, baileys, wa-automate"
                                    class="font-mono text-sm"
                                    rows="2"
                                />
                                <p class="text-xs text-muted-foreground mt-1">
                                    Indicators of WhatsApp bot dependencies
                                </p>
                            </div>

                            <div>
                                <label class="block text-sm font-medium mb-2">Miner Indicators</label>
                                <Textarea
                                    v-model="minerIndicatorsText"
                                    placeholder="xmrig, ethminer, stratum+tcp"
                                    class="font-mono text-sm"
                                    rows="3"
                                />
                                <p class="text-xs text-muted-foreground mt-1">Indicators of cryptocurrency mining</p>
                            </div>

                            <div>
                                <label class="block text-sm font-medium mb-2">Suspicious Words</label>
                                <Textarea
                                    v-model="suspiciousWordsText"
                                    placeholder="new job from, Stratum - Connected"
                                    class="font-mono text-sm"
                                    rows="3"
                                />
                                <p class="text-xs text-muted-foreground mt-1">
                                    Words in logs/content that trigger suspicion
                                </p>
                            </div>

                            <div>
                                <label class="block text-sm font-medium mb-2">Suspicious Content Strings</label>
                                <Textarea
                                    v-model="suspiciousContentText"
                                    placeholder="stratum, cryptonight, proxies..."
                                    class="font-mono text-sm"
                                    rows="3"
                                />
                                <p class="text-xs text-muted-foreground mt-1">Content strings that trigger detection</p>
                            </div>
                        </div>

                        <!-- Thresholds -->
                        <div class="space-y-4 border-t pt-4">
                            <h3 class="text-lg font-semibold">Detection Thresholds</h3>

                            <div>
                                <label class="block text-sm font-medium mb-2">High CPU Threshold (0-1)</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="1"
                                    :model-value="String(config.high_cpu_threshold ?? '')"
                                    @update:model-value="config.high_cpu_threshold = Number($event) || 0"
                                />
                                <p class="text-xs text-muted-foreground mt-1">
                                    CPU usage threshold for suspicious activity
                                </p>
                            </div>

                            <div>
                                <label class="block text-sm font-medium mb-2">High Network Usage (bytes)</label>
                                <Input
                                    type="number"
                                    min="0"
                                    :model-value="String(config.high_network_usage ?? '')"
                                    @update:model-value="config.high_network_usage = Number($event) || 0"
                                />
                                <p class="text-xs text-muted-foreground mt-1">Network usage threshold in bytes</p>
                            </div>

                            <div>
                                <label class="block text-sm font-medium mb-2">Small Volume Size (MB)</label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    :model-value="String(config.small_volume_size ?? '')"
                                    @update:model-value="config.small_volume_size = Number($event) || 0"
                                />
                                <p class="text-xs text-muted-foreground mt-1">
                                    Volume size threshold for suspicious small volumes
                                </p>
                            </div>
                        </div>

                        <!-- Actions -->
                        <div class="flex gap-4 pt-4 border-t">
                            <Button :loading="saving" @click="saveConfig">Save Configuration</Button>
                            <Button variant="outline" :disabled="saving" @click="resetConfig">Reset to Defaults</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </DashboardLayout>
</template>
