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

import DashboardLayout, { type BreadcrumbEntry } from '@/layouts/DashboardLayout.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    Mic,
    Server,
    Database,
    Users,
    BarChart3,
    Terminal,
    MessageSquare,
    Settings as SettingsIcon,
    Sparkles,
    ShieldCheck,
    Zap,
    Save,
    AlertCircle,
    ChevronDown,
    RefreshCw,
} from 'lucide-vue-next';
import { useAdminSettingsStore, type Setting } from '@/stores/adminSettings';
import { onMounted, ref } from 'vue';
import { useToast } from 'vue-toastification';
import axios from 'axios';

const adminSettingsStore = useAdminSettingsStore();
const toast = useToast();

const loading = ref(true);
const saving = ref(false);
const chatbotSettings = ref<Record<string, Setting> | null>(null);
const originalSettings = ref<Record<string, Setting> | null>(null);
const showSettings = ref(false);
const systemPrompt = ref<string>('');
const loadingSystemPrompt = ref(false);

const breadcrumbs: BreadcrumbEntry[] = [
    { text: 'Dashboard', href: '/admin' },
    {
        text: 'FeatherCloud AI Agent',
        href: '/admin/feathercloud-ai-agent',
        isCurrent: true,
    },
];

const heroContent = {
    badge: 'AI Operator Preview',
    title: 'FeatherCloud AI Agent',
    subtitle:
        'Give your panel a voice-enabled copilot that can launch servers, patch configs, build databases, and brief administrators on everything happening in the last 30 days.',
    primaryCta: 'Configure Settings',
    secondaryCta: 'Explore Capability Roadmap',
    highlights: [
        'Natural language playbooks for server control, file edits, and command execution.',
        'Secure task routing for both end users and administrators with audit trails.',
        'Voice-first assistant mode that understands context across realms and clients.',
    ],
};

const agentHighlights = [
    {
        id: 'cmd',
        icon: Terminal,
        text: '"Start realm 42\'s tournament servers and send status to Discord."',
    },
    {
        id: 'db',
        icon: Database,
        text: '"Create a MariaDB instance for ArcadeCraft with nightly retention."',
    },
    {
        id: 'admin',
        icon: Users,
        text: '"List suspended users and draft emails requesting compliance updates."',
    },
];

const capabilityCards = [
    {
        id: 'server-control',
        title: 'Server orchestration',
        description:
            'Start, stop, restart, and deploy servers or Wings nodes with guardrails that respect permissions and quotas.',
        icon: Server,
    },
    {
        id: 'file-automation',
        title: 'File & config automation',
        description:
            'Modify configuration files, upload templates, or restore previous versions while logging every change.',
        icon: SettingsIcon,
    },
    {
        id: 'database-ops',
        title: 'Database operations',
        description:
            'Provision databases, rotate credentials, seed data, and schedule exports without touching the CLI.',
        icon: Database,
    },
    {
        id: 'voice-assistant',
        title: 'Voice AI assistant',
        description:
            'Use hands-free commands with contextual follow-ups—perfect for on-call operators or control rooms.',
        icon: Mic,
    },
];

const interactionModes = [
    {
        id: 'users',
        title: 'User copilots',
        description:
            'Clients can ask for server restarts, console commands, backup restores, or file tweaks in plain English.',
        icon: MessageSquare,
        meta: 'Client experience',
    },
    {
        id: 'admins',
        title: 'Admin copilots',
        description:
            'Administrators delegate onboarding, user creation, KPI summaries, or compliance reports to the agent.',
        icon: ShieldCheck,
        meta: 'Operational control',
    },
    {
        id: 'analytics',
        title: 'Analytics copilots',
        description:
            'Surface usage trends, cost breakdowns, or anomaly spikes over the last 30 days with instant dashboards.',
        icon: BarChart3,
        meta: 'Insights & reporting',
    },
];

const actionLibrary = [
    {
        id: 'serverActions',
        title: 'Server actions',
        items: ['Start/stop/restart servers', 'Execute console commands', 'Adjust allocations', 'Trigger backups'],
    },
    {
        id: 'databaseActions',
        title: 'Database actions',
        items: ['Create/delete databases', 'Rotate credentials', 'Run migrations', 'Schedule exports'],
    },
    {
        id: 'fileActions',
        title: 'File actions',
        items: ['Edit configs', 'Upload/download assets', 'Rollback file versions', 'Apply templated changes'],
    },
    {
        id: 'adminActions',
        title: 'Admin actions',
        items: ['Create users & roles', 'Summarise KPIs', 'Surface audit logs', 'Generate compliance reports'],
    },
];

const timeline = [
    {
        id: 'understand',
        title: 'Understand intent',
        description: 'Voice or text commands are parsed with contextual awareness of realms, servers, and permissions.',
    },
    {
        id: 'plan',
        title: 'Plan workflow',
        description:
            'The agent builds an execution graph, checking guardrails, dependencies, and approval requirements before proceeding.',
    },
    {
        id: 'execute',
        title: 'Execute safely',
        description:
            'Tasks run through audited service connectors with live status updates, prompts for confirmation, and automatic rollback hooks.',
    },
    {
        id: 'brief',
        title: 'Brief stakeholders',
        description:
            'Users and admins receive summaries, dashboards, or transcripts detailing what changed and what to watch next.',
    },
];

type RoadmapStatus = 'in-progress' | 'planned';

interface RoadmapStage {
    id: string;
    label: string;
    description: string;
    status: RoadmapStatus;
}

const roadmap: RoadmapStage[] = [
    {
        id: 'preview',
        label: 'Private preview',
        description: 'Voice & text command coverage for server and database operations with audit trails.',
        status: 'in-progress',
    },
    {
        id: 'beta',
        label: 'Closed beta',
        description: 'Admin copilots, KPI insights, and workflow chaining with policy enforcement.',
        status: 'planned',
    },
    {
        id: 'ga',
        label: 'General availability',
        description: 'Marketplace skill packs, custom embeddings, and cross-tenant orchestration support.',
        status: 'planned',
    },
] satisfies RoadmapStage[];

const roadmapBadges: Record<RoadmapStatus, { label: string; class: string }> = {
    'in-progress': {
        label: 'In Progress',
        class: 'border-emerald-400/40 bg-emerald-400/15 text-emerald-500',
    },
    planned: {
        label: 'Planned',
        class: 'border-border/60 text-muted-foreground',
    },
};

const assurance = [
    {
        id: 'safety',
        icon: ShieldCheck,
        title: 'Safety & approvals',
        description: 'Role-aware guardrails, approval prompts, and immutable logs ensure every action is reviewable.',
    },
    {
        id: 'speed',
        icon: Zap,
        title: 'Speed with context',
        description: 'Leverages panel telemetry, historical jobs, and configuration state to respond instantly.',
    },
    {
        id: 'evolution',
        icon: Sparkles,
        title: 'Evolving skillset',
        description:
            'New skills roll out weekly—covering provisioning, compliance, analytics, and marketplace add-ons.',
    },
];

const fetchChatbotSettings = async () => {
    loading.value = true;
    try {
        await adminSettingsStore.fetchSettings();
        const chatbotCategory = adminSettingsStore.getSettingsByCategory('chatbot');

        if (chatbotCategory && chatbotCategory.settings) {
            chatbotSettings.value = JSON.parse(JSON.stringify(chatbotCategory.settings));
            originalSettings.value = JSON.parse(JSON.stringify(chatbotCategory.settings));
        } else {
            toast.error('Chatbot settings not found');
        }
    } catch (error) {
        console.error('Error fetching chatbot settings:', error);
        toast.error('Failed to load chatbot settings');
    } finally {
        loading.value = false;
    }
};

const saveSettings = async () => {
    if (!chatbotSettings.value || !originalSettings.value) return;

    const settingsToUpdate: Record<string, string | number | boolean> = {};

    Object.entries(chatbotSettings.value).forEach(([key, setting]: [string, Setting]) => {
        const originalSetting = originalSettings.value?.[key];

        // Skip if value hasn't changed
        if (originalSetting && originalSetting.value === setting.value) {
            return;
        }

        // For sensitive settings (password type), only update if user actually entered something new
        if ('sensitive' in setting && setting.sensitive && setting.type === 'password') {
            // If the value is still masked (••••••••) or empty, don't update
            if (setting.value === '••••••••' || setting.value === '') {
                return;
            }
        }

        settingsToUpdate[key] = setting.value;
    });

    // If no settings changed, show message and return
    if (Object.keys(settingsToUpdate).length === 0) {
        toast.info('No changes detected');
        return;
    }

    saving.value = true;
    try {
        const result = await adminSettingsStore.saveSettings(settingsToUpdate);

        if (result.success) {
            // Update the original settings with the new values
            Object.entries(settingsToUpdate).forEach(([key, value]) => {
                if (originalSettings.value && originalSettings.value[key]) {
                    originalSettings.value[key].value = value;
                }
                if (chatbotSettings.value && chatbotSettings.value[key]) {
                    chatbotSettings.value[key].value = value;
                }
            });

            toast.success('Chatbot settings saved successfully');
            // Reload settings to get updated values
            await fetchChatbotSettings();
        } else {
            toast.error(result.message || 'Failed to save settings');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        toast.error('Failed to save settings');
    } finally {
        saving.value = false;
    }
};

const resetSettings = () => {
    if (!originalSettings.value) return;
    chatbotSettings.value = JSON.parse(JSON.stringify(originalSettings.value));
    toast.info('Settings reset to saved values');
};

const getSettingValue = (key: string): string | number | boolean => {
    if (!chatbotSettings.value || !chatbotSettings.value[key]) return '';
    return chatbotSettings.value[key].value;
};

const updateSettingValue = (key: string, value: string | number | boolean) => {
    if (!chatbotSettings.value || !chatbotSettings.value[key]) return;
    chatbotSettings.value[key].value = value;
};

const toggleSettings = () => {
    showSettings.value = !showSettings.value;
    if (showSettings.value && !systemPrompt.value) {
        void fetchSystemPrompt();
    }
};

const fetchSystemPrompt = async () => {
    loadingSystemPrompt.value = true;
    try {
        const response = await axios.get('/api/admin/settings/chatbot/system-prompt');
        if (response.data && response.data.success) {
            systemPrompt.value = response.data.data.system_prompt || '';
        } else {
            toast.error('Failed to load system prompt');
        }
    } catch (error) {
        console.error('Error fetching system prompt:', error);
        toast.error('Failed to load system prompt');
    } finally {
        loadingSystemPrompt.value = false;
    }
};

onMounted(() => {
    void fetchChatbotSettings();
});
</script>

<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="min-h-screen space-y-10 pb-12">
            <!-- Hero Section -->
            <section
                class="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-6 sm:p-10 shadow-xl shadow-primary/10"
            >
                <div class="absolute inset-0 pointer-events-none">
                    <span class="hero-blob hero-blob-one" aria-hidden="true"></span>
                    <span class="hero-blob hero-blob-two" aria-hidden="true"></span>
                    <span class="hero-grid" aria-hidden="true"></span>
                    <span class="hero-ring hero-ring-one" aria-hidden="true"></span>
                    <span class="hero-ring hero-ring-two" aria-hidden="true"></span>
                    <div class="hero-particles" aria-hidden="true">
                        <span class="particle particle-a"></span>
                        <span class="particle particle-b"></span>
                        <span class="particle particle-c"></span>
                        <span class="particle particle-d"></span>
                        <span class="particle particle-e"></span>
                    </div>
                    <div class="ai-network" aria-hidden="true">
                        <span class="ai-node node-one"></span>
                        <span class="ai-node node-two"></span>
                        <span class="ai-node node-three"></span>
                        <span class="ai-node node-four"></span>
                        <span class="ai-node node-five"></span>
                        <span class="ai-connection connection-a"></span>
                        <span class="ai-connection connection-b"></span>
                        <span class="ai-connection connection-c"></span>
                        <span class="ai-connection connection-d"></span>
                    </div>
                </div>
                <div class="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                    <div class="space-y-8">
                        <Badge variant="secondary" class="w-fit border-primary/30 bg-primary/10 text-primary">
                            {{ heroContent.badge }}
                        </Badge>
                        <div class="space-y-4">
                            <h1 class="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                                {{ heroContent.title }}
                            </h1>
                            <p class="max-w-2xl text-base text-muted-foreground sm:text-lg">
                                {{ heroContent.subtitle }}
                            </p>
                        </div>
                        <div class="flex flex-wrap gap-3">
                            <template v-if="getSettingValue('chatbot_enabled') === 'true'">
                                <Button size="lg" class="gap-2" @click="toggleSettings">
                                    <SettingsIcon class="h-4 w-4" />
                                    {{ heroContent.primaryCta }}
                                </Button>
                                <Button variant="secondary" size="lg" :disabled="true" class="gap-2">
                                    <BarChart3 class="h-4 w-4" />
                                    {{ heroContent.secondaryCta }}
                                </Button>
                            </template>
                            <template v-else>
                                <Button size="lg" class="gap-2" @click="toggleSettings">
                                    <Sparkles class="h-4 w-4" />
                                    Join Private Testing
                                </Button>
                            </template>
                        </div>
                        <div class="grid gap-3 sm:grid-cols-2">
                            <div
                                v-for="highlight in agentHighlights"
                                :key="highlight.id"
                                class="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/70 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
                            >
                                <component :is="highlight.icon" class="mt-0.5 h-4 w-4 text-primary" />
                                <p class="text-sm text-muted-foreground">{{ highlight.text }}</p>
                            </div>
                        </div>
                    </div>

                    <div class="relative">
                        <div
                            class="absolute -inset-8 bg-linear-to-br from-primary/25 via-transparent to-transparent blur-3xl"
                        />
                        <div
                            class="relative flex flex-col gap-5 rounded-3xl border border-border/60 bg-background/85 p-6 shadow-xl shadow-primary/10 backdrop-blur"
                        >
                            <div
                                class="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1"
                            >
                                <Sparkles class="h-4 w-4 text-primary" />
                                <span class="text-xs font-semibold uppercase tracking-widest text-primary">
                                    Voice & text copilots
                                </span>
                            </div>
                            <p class="text-lg font-semibold text-foreground">
                                Conversational control for everything your panel can do.
                            </p>
                            <p class="text-sm text-muted-foreground">
                                The agent understands context from server metadata, user permissions, and historical
                                activity—responding in chat or voice with the right action plan every time.
                            </p>

                            <div class="grid gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4 sm:grid-cols-3">
                                <div v-for="mode in interactionModes" :key="mode.id" class="space-y-1">
                                    <div class="flex items-center gap-2 text-sm font-semibold text-foreground">
                                        <component :is="mode.icon" class="h-4 w-4 text-primary" />
                                        <span>{{ mode.title }}</span>
                                    </div>
                                    <p class="text-xs text-muted-foreground">{{ mode.description }}</p>
                                    <p class="text-[11px] uppercase tracking-widest text-muted-foreground/80">
                                        {{ mode.meta }}
                                    </p>
                                </div>
                            </div>

                            <div class="rounded-2xl border border-border/60 bg-muted/30 p-4">
                                <p class="text-sm font-semibold text-foreground">Sample commands</p>
                                <ul class="mt-2 space-y-2 text-xs text-muted-foreground">
                                    <li>
                                        "Agent, create five event servers for Realm Echo and deploy the latest mod
                                        pack."
                                    </li>
                                    <li>"Voice mode: show me database growth and usage KPIs for the last 30 days."</li>
                                    <li>
                                        "Generate a compliance report and email it to the Mythical Systems audit list."
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Settings Configuration Section -->
            <section
                v-if="showSettings"
                class="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-6 sm:p-10 shadow-xl shadow-primary/10"
            >
                <div class="relative space-y-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <h2 class="text-2xl font-bold text-foreground">Chatbot Configuration</h2>
                            <p class="text-sm text-muted-foreground mt-1">
                                Configure and customize your AI chatbot assistant
                            </p>
                        </div>
                        <Button variant="ghost" size="sm" @click="toggleSettings">
                            <ChevronDown class="h-4 w-4" />
                        </Button>
                    </div>

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

                    <!-- Settings Form -->
                    <form v-else-if="chatbotSettings" class="space-y-8" @submit.prevent="saveSettings">
                        <!-- Enable/Disable Toggle -->
                        <div class="rounded-2xl border border-border/70 bg-muted/40 p-6">
                            <div class="flex items-center justify-between">
                                <div class="space-y-1 flex-1">
                                    <Label class="text-base font-semibold text-foreground">Enable Chatbot</Label>
                                    <p class="text-sm text-muted-foreground">
                                        Enable or disable the AI chatbot feature for all users
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    class="h-5 w-5 rounded border-border bg-background text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
                                    :checked="getSettingValue('chatbot_enabled') === 'true'"
                                    @change="
                                        updateSettingValue(
                                            'chatbot_enabled',
                                            ($event.target as HTMLInputElement).checked ? 'true' : 'false',
                                        )
                                    "
                                />
                            </div>
                        </div>

                        <!-- General Settings -->
                        <div class="space-y-6">
                            <div>
                                <h3 class="text-lg font-semibold text-foreground mb-4">General Settings</h3>
                                <div class="grid gap-6 md:grid-cols-2">
                                    <!-- AI Provider -->
                                    <div class="space-y-3">
                                        <Label for="chatbot_ai_provider" class="text-sm font-medium">
                                            AI Provider
                                        </Label>
                                        <p class="text-xs text-muted-foreground">
                                            Select the AI provider to use for chatbot responses
                                        </p>
                                        <Select
                                            :model-value="String(getSettingValue('chatbot_ai_provider'))"
                                            @update:model-value="
                                                (val) => {
                                                    const value =
                                                        typeof val === 'string' ? val : val?.toString() || 'basic';
                                                    updateSettingValue('chatbot_ai_provider', value);
                                                }
                                            "
                                        >
                                            <SelectTrigger class="w-full">
                                                <SelectValue placeholder="Select AI provider" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="basic">Basic (No AI)</SelectItem>
                                                <SelectItem value="google_gemini">Google Gemini</SelectItem>
                                                <SelectItem value="openai">OpenAI</SelectItem>
                                                <SelectItem value="openrouter">OpenRouter</SelectItem>
                                                <SelectItem value="ollama">Ollama (Self-hosted)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <!-- Temperature -->
                                    <div class="space-y-3">
                                        <Label for="chatbot_temperature" class="text-sm font-medium">Temperature</Label>
                                        <p class="text-xs text-muted-foreground">
                                            Controls randomness (0.0 = focused, 1.0 = creative)
                                        </p>
                                        <Input
                                            id="chatbot_temperature"
                                            type="number"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            placeholder="0.7"
                                            class="w-full"
                                            :model-value="Number(chatbotSettings.chatbot_temperature?.value ?? 0.7)"
                                            @update:model-value="
                                                (val: string | number) =>
                                                    updateSettingValue('chatbot_temperature', Number(val))
                                            "
                                        />
                                    </div>

                                    <!-- Max Tokens -->
                                    <div class="space-y-3">
                                        <Label for="chatbot_max_tokens" class="text-sm font-medium">Max Tokens</Label>
                                        <p class="text-xs text-muted-foreground">
                                            Maximum tokens in responses (1-8192)
                                        </p>
                                        <Input
                                            id="chatbot_max_tokens"
                                            type="number"
                                            min="1"
                                            max="8192"
                                            placeholder="2048"
                                            class="w-full"
                                            :model-value="Number(chatbotSettings.chatbot_max_tokens?.value ?? 2048)"
                                            @update:model-value="
                                                (val: string | number) =>
                                                    updateSettingValue('chatbot_max_tokens', Number(val))
                                            "
                                        />
                                    </div>

                                    <!-- Max History -->
                                    <div class="space-y-3">
                                        <Label for="chatbot_max_history" class="text-sm font-medium">Max History</Label>
                                        <p class="text-xs text-muted-foreground">Previous messages in context (1-50)</p>
                                        <Input
                                            id="chatbot_max_history"
                                            type="number"
                                            min="1"
                                            max="50"
                                            placeholder="10"
                                            class="w-full"
                                            :model-value="Number(chatbotSettings.chatbot_max_history?.value ?? 10)"
                                            @update:model-value="
                                                (val: string | number) =>
                                                    updateSettingValue('chatbot_max_history', Number(val))
                                            "
                                        />
                                    </div>
                                </div>
                            </div>

                            <!-- Provider-Specific Settings -->
                            <div
                                v-if="
                                    getSettingValue('chatbot_ai_provider') !== 'basic' &&
                                    getSettingValue('chatbot_ai_provider') !== ''
                                "
                                class="rounded-2xl border border-border/70 bg-muted/40 p-6 space-y-6"
                            >
                                <div class="flex items-center gap-2">
                                    <Badge variant="outline">
                                        {{
                                            getSettingValue('chatbot_ai_provider') === 'google_gemini'
                                                ? 'Google Gemini'
                                                : getSettingValue('chatbot_ai_provider') === 'openai'
                                                  ? 'OpenAI'
                                                  : getSettingValue('chatbot_ai_provider') === 'openrouter'
                                                    ? 'OpenRouter'
                                                    : 'Ollama'
                                        }}
                                    </Badge>
                                </div>

                                <!-- Google Gemini -->
                                <template v-if="getSettingValue('chatbot_ai_provider') === 'google_gemini'">
                                    <div class="grid gap-6 md:grid-cols-2">
                                        <div class="space-y-3">
                                            <Label for="chatbot_google_ai_api_key" class="text-sm font-medium">
                                                Google AI API Key
                                            </Label>
                                            <Input
                                                id="chatbot_google_ai_api_key"
                                                type="password"
                                                placeholder="Enter API key to change"
                                                class="w-full"
                                                :model-value="
                                                    String(chatbotSettings.chatbot_google_ai_api_key?.value ?? '')
                                                "
                                                @update:model-value="
                                                    (val: string | number) =>
                                                        updateSettingValue('chatbot_google_ai_api_key', String(val))
                                                "
                                            />
                                        </div>
                                        <div class="space-y-3">
                                            <Label for="chatbot_google_ai_model" class="text-sm font-medium">
                                                Gemini Model
                                            </Label>
                                            <Input
                                                id="chatbot_google_ai_model"
                                                type="text"
                                                placeholder="gemini-2.5-flash"
                                                class="w-full"
                                                :model-value="
                                                    String(chatbotSettings.chatbot_google_ai_model?.value ?? '')
                                                "
                                                @update:model-value="
                                                    (val: string | number) =>
                                                        updateSettingValue('chatbot_google_ai_model', String(val))
                                                "
                                            />
                                        </div>
                                    </div>
                                </template>

                                <!-- OpenAI -->
                                <template v-if="getSettingValue('chatbot_ai_provider') === 'openai'">
                                    <div class="grid gap-6 md:grid-cols-2">
                                        <div class="space-y-3">
                                            <Label for="chatbot_openai_api_key" class="text-sm font-medium">
                                                OpenAI API Key
                                            </Label>
                                            <Input
                                                id="chatbot_openai_api_key"
                                                type="password"
                                                placeholder="Enter API key to change"
                                                class="w-full"
                                                :model-value="
                                                    String(chatbotSettings.chatbot_openai_api_key?.value ?? '')
                                                "
                                                @update:model-value="
                                                    (val: string | number) =>
                                                        updateSettingValue('chatbot_openai_api_key', String(val))
                                                "
                                            />
                                        </div>
                                        <div class="space-y-3">
                                            <Label for="chatbot_openai_model" class="text-sm font-medium">
                                                OpenAI Model
                                            </Label>
                                            <Input
                                                id="chatbot_openai_model"
                                                type="text"
                                                placeholder="gpt-4o-mini"
                                                class="w-full"
                                                :model-value="String(chatbotSettings.chatbot_openai_model?.value ?? '')"
                                                @update:model-value="
                                                    (val: string | number) =>
                                                        updateSettingValue('chatbot_openai_model', String(val))
                                                "
                                            />
                                        </div>
                                    </div>
                                </template>

                                <!-- OpenRouter -->
                                <template v-if="getSettingValue('chatbot_ai_provider') === 'openrouter'">
                                    <div class="grid gap-6 md:grid-cols-2">
                                        <div class="space-y-3">
                                            <Label for="chatbot_openrouter_api_key" class="text-sm font-medium">
                                                OpenRouter API Key
                                            </Label>
                                            <Input
                                                id="chatbot_openrouter_api_key"
                                                type="password"
                                                placeholder="Enter API key to change"
                                                class="w-full"
                                                :model-value="
                                                    String(chatbotSettings.chatbot_openrouter_api_key?.value ?? '')
                                                "
                                                @update:model-value="
                                                    (val: string | number) =>
                                                        updateSettingValue('chatbot_openrouter_api_key', String(val))
                                                "
                                            />
                                        </div>
                                        <div class="space-y-3">
                                            <Label for="chatbot_openrouter_model" class="text-sm font-medium">
                                                OpenRouter Model
                                            </Label>
                                            <Input
                                                id="chatbot_openrouter_model"
                                                type="text"
                                                placeholder="openai/gpt-4o-mini"
                                                class="w-full"
                                                :model-value="
                                                    String(chatbotSettings.chatbot_openrouter_model?.value ?? '')
                                                "
                                                @update:model-value="
                                                    (val: string | number) =>
                                                        updateSettingValue('chatbot_openrouter_model', String(val))
                                                "
                                            />
                                        </div>
                                    </div>
                                </template>

                                <!-- Ollama -->
                                <template v-if="getSettingValue('chatbot_ai_provider') === 'ollama'">
                                    <div class="grid gap-6 md:grid-cols-2">
                                        <div class="space-y-3">
                                            <Label for="chatbot_ollama_base_url" class="text-sm font-medium">
                                                Ollama Base URL
                                            </Label>
                                            <Input
                                                id="chatbot_ollama_base_url"
                                                type="text"
                                                placeholder="http://localhost:11434"
                                                class="w-full"
                                                :model-value="
                                                    String(chatbotSettings.chatbot_ollama_base_url?.value ?? '')
                                                "
                                                @update:model-value="
                                                    (val: string | number) =>
                                                        updateSettingValue('chatbot_ollama_base_url', String(val))
                                                "
                                            />
                                        </div>
                                        <div class="space-y-3">
                                            <Label for="chatbot_ollama_model" class="text-sm font-medium">
                                                Ollama Model
                                            </Label>
                                            <Input
                                                id="chatbot_ollama_model"
                                                type="text"
                                                placeholder="llama3.2"
                                                class="w-full"
                                                :model-value="String(chatbotSettings.chatbot_ollama_model?.value ?? '')"
                                                @update:model-value="
                                                    (val: string | number) =>
                                                        updateSettingValue('chatbot_ollama_model', String(val))
                                                "
                                            />
                                        </div>
                                    </div>
                                </template>
                            </div>

                            <!-- AI Core System Prompt -->
                            <div class="space-y-6">
                                <div>
                                    <h3 class="text-lg font-semibold text-foreground mb-4">AI Core System Prompt</h3>
                                    <div class="space-y-3">
                                        <div class="flex items-center justify-between">
                                            <Label for="ai_core_system_prompt" class="text-sm font-medium">
                                                Core System Prompt (Read-Only)
                                            </Label>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                :disabled="loadingSystemPrompt"
                                                @click="fetchSystemPrompt"
                                            >
                                                <RefreshCw
                                                    :class="['h-4 w-4', loadingSystemPrompt && 'animate-spin']"
                                                />
                                            </Button>
                                        </div>
                                        <p class="text-xs text-muted-foreground">
                                            The core system prompt that defines the AI assistant's behavior and
                                            capabilities. This is read-only and loaded from the system configuration.
                                        </p>
                                        <div v-if="loadingSystemPrompt" class="flex items-center justify-center py-8">
                                            <div
                                                class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"
                                            ></div>
                                        </div>
                                        <Textarea
                                            v-else
                                            id="ai_core_system_prompt"
                                            :model-value="systemPrompt"
                                            rows="20"
                                            class="w-full font-mono text-xs bg-muted/50 border-border/70"
                                            readonly
                                            disabled
                                        />
                                    </div>
                                </div>
                            </div>

                            <!-- Custom Prompts -->
                            <div class="space-y-6">
                                <div>
                                    <h3 class="text-lg font-semibold text-foreground mb-4">Custom Prompts</h3>
                                    <div class="grid gap-6">
                                        <div class="space-y-3">
                                            <Label for="chatbot_system_prompt" class="text-sm font-medium">
                                                System Prompt (Optional)
                                            </Label>
                                            <p class="text-xs text-muted-foreground">
                                                Custom system prompt to prepend to all messages (max 1000 characters)
                                            </p>
                                            <Textarea
                                                id="chatbot_system_prompt"
                                                placeholder="You are a helpful assistant for FeatherPanel..."
                                                rows="4"
                                                class="w-full"
                                                :maxlength="1000"
                                                :model-value="
                                                    String(chatbotSettings.chatbot_system_prompt?.value ?? '')
                                                "
                                                @update:model-value="
                                                    (val: string | number) =>
                                                        updateSettingValue('chatbot_system_prompt', String(val))
                                                "
                                            />
                                        </div>
                                        <div class="space-y-3">
                                            <Label for="chatbot_user_prompt" class="text-sm font-medium">
                                                User Context Prompt (Optional)
                                            </Label>
                                            <p class="text-xs text-muted-foreground">
                                                User context prompt to append to all messages (max 1000 characters)
                                            </p>
                                            <Textarea
                                                id="chatbot_user_prompt"
                                                placeholder="User is an admin with full access..."
                                                rows="4"
                                                class="w-full"
                                                :maxlength="1000"
                                                :model-value="String(chatbotSettings.chatbot_user_prompt?.value ?? '')"
                                                @update:model-value="
                                                    (val: string | number) =>
                                                        updateSettingValue('chatbot_user_prompt', String(val))
                                                "
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Action Buttons -->
                            <div
                                class="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-6 border-t"
                            >
                                <Button type="button" variant="outline" class="w-full sm:w-auto" @click="resetSettings">
                                    Reset
                                </Button>
                                <Button type="submit" :disabled="saving" class="w-full sm:w-auto">
                                    <Save v-if="!saving" class="h-4 w-4 mr-2" />
                                    <div
                                        v-else
                                        class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
                                    ></div>
                                    {{ saving ? 'Saving...' : 'Save Changes' }}
                                </Button>
                            </div>
                        </div>
                    </form>

                    <!-- Error State -->
                    <div v-else class="flex flex-col items-center justify-center py-12 text-center">
                        <div class="text-red-500 mb-4">
                            <AlertCircle class="h-12 w-12 mx-auto" />
                        </div>
                        <h3 class="text-lg font-medium text-muted-foreground mb-2">Failed to load settings</h3>
                        <p class="text-sm text-muted-foreground max-w-sm">
                            Unable to load chatbot settings. Please try again later.
                        </p>
                        <Button class="mt-4" @click="fetchChatbotSettings">Try Again</Button>
                    </div>
                </div>
            </section>

            <!-- Capability Cards -->
            <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card
                    v-for="capability in capabilityCards"
                    :key="capability.id"
                    class="group relative overflow-hidden border border-border/70 bg-background/95 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
                >
                    <div
                        class="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary/60 via-primary/20 to-transparent"
                    />
                    <CardHeader class="space-y-4 pb-6">
                        <div
                            class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15"
                        >
                            <component :is="capability.icon" class="h-5 w-5" />
                        </div>
                        <CardTitle class="text-lg font-semibold text-foreground">{{ capability.title }}</CardTitle>
                        <CardDescription class="text-sm leading-relaxed text-muted-foreground">
                            {{ capability.description }}
                        </CardDescription>
                    </CardHeader>
                </Card>
            </section>

            <!-- Action Library & Workflow -->
            <section class="grid gap-6 lg:grid-cols-2">
                <Card class="border border-border/70 bg-background/95">
                    <CardHeader>
                        <CardTitle class="text-xl font-semibold text-foreground">Action library</CardTitle>
                        <CardDescription class="text-sm text-muted-foreground">
                            The agent executes playbooks spanning servers, databases, files, and administrative tasks.
                        </CardDescription>
                    </CardHeader>
                    <CardContent class="grid gap-4 sm:grid-cols-2">
                        <div
                            v-for="block in actionLibrary"
                            :key="block.id"
                            class="rounded-2xl border border-border/70 bg-muted/40 p-4"
                        >
                            <p class="text-sm font-semibold text-foreground">{{ block.title }}</p>
                            <ul class="mt-3 space-y-2 text-xs text-muted-foreground">
                                <li v-for="item in block.items" :key="item" class="flex items-start gap-2">
                                    <span class="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                                    <span>{{ item }}</span>
                                </li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>

                <Card class="border border-border/70 bg-background/95">
                    <CardHeader>
                        <CardTitle class="text-xl font-semibold text-foreground">Operational workflow</CardTitle>
                        <CardDescription class="text-sm text-muted-foreground">
                            Every request follows a safe, audited sequence from understanding to briefing.
                        </CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-5">
                        <div
                            v-for="(step, index) in timeline"
                            :key="step.id"
                            class="relative rounded-2xl border border-border/70 bg-muted/40 p-5"
                        >
                            <div
                                v-if="index !== timeline.length - 1"
                                class="absolute left-6 top-[calc(100%-0.25rem)] h-6 border-l border-dashed border-border/70"
                            />
                            <div class="flex items-start gap-3">
                                <div
                                    class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"
                                >
                                    {{ index + 1 }}
                                </div>
                                <div class="space-y-1.5">
                                    <p class="text-sm font-semibold text-foreground">{{ step.title }}</p>
                                    <p class="text-sm text-muted-foreground">{{ step.description }}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </section>

            <!-- Roadmap & Trust -->
            <section class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <Card class="border border-border/70 bg-background/95">
                    <CardHeader>
                        <CardTitle class="text-xl font-semibold text-foreground">Roadmap</CardTitle>
                        <CardDescription class="text-sm text-muted-foreground">
                            See what's live today and what's arriving next for the FeatherCloud AI Agent.
                        </CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-5">
                        <div
                            v-for="stage in roadmap"
                            :key="stage.id"
                            class="rounded-2xl border border-border/70 bg-muted/40 p-5"
                        >
                            <div class="flex items-center justify-between gap-4">
                                <p class="text-sm font-semibold text-foreground">{{ stage.label }}</p>
                                <Badge
                                    variant="outline"
                                    :class="[
                                        'text-xs font-semibold uppercase tracking-widest',
                                        roadmapBadges[stage.status].class,
                                    ]"
                                >
                                    {{ roadmapBadges[stage.status].label }}
                                </Badge>
                            </div>
                            <p class="mt-3 text-sm text-muted-foreground">{{ stage.description }}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card class="border border-border/70 bg-background/95">
                    <CardHeader>
                        <CardTitle class="text-xl font-semibold text-foreground"
                            >Why operators trust the agent</CardTitle
                        >
                        <CardDescription class="text-sm text-muted-foreground">
                            Designed for mission-critical workflows with the right blend of speed, safety, and
                            evolution.
                        </CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        <div
                            v-for="item in assurance"
                            :key="item.id"
                            class="flex gap-3 rounded-2xl border border-border/70 bg-muted/40 p-4"
                        >
                            <div
                                class="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"
                            >
                                <component :is="item.icon" class="h-5 w-5" />
                            </div>
                            <div class="space-y-1">
                                <p class="text-sm font-semibold text-foreground">{{ item.title }}</p>
                                <p class="text-sm text-muted-foreground">{{ item.description }}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    </DashboardLayout>
</template>

<style scoped>
/* Hero Animations */
.hero-blob {
    position: absolute;
    border-radius: 9999px;
    opacity: 0.65;
    animation: heroFloat 24s ease-in-out infinite;
    mix-blend-mode: screen;
}

.hero-blob-one {
    top: -25%;
    left: -18%;
    width: 440px;
    height: 440px;
    background: radial-gradient(circle, rgba(147, 197, 253, 0.5), rgba(168, 85, 247, 0.18));
    filter: blur(55px);
    animation-delay: 0s;
}

.hero-blob-two {
    bottom: -28%;
    right: -12%;
    width: 520px;
    height: 520px;
    background: radial-gradient(circle, rgba(192, 132, 252, 0.45), rgba(79, 70, 229, 0.18));
    filter: blur(60px);
    animation-delay: 8s;
}

.hero-grid {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.16) 1px, transparent 0);
    background-size: 44px 44px;
    opacity: 0.35;
    transform: translate3d(0, 0, 0);
    animation: gridDrift 32s linear infinite;
}

.hero-ring {
    position: absolute;
    border-radius: 9999px;
    border: 1px solid rgba(216, 180, 254, 0.3);
    box-shadow: 0 0 65px rgba(147, 197, 253, 0.28);
    backdrop-filter: blur(6px);
    animation: ringPulse 22s ease-in-out infinite;
}

.hero-ring-one {
    top: 18%;
    right: 12%;
    width: 260px;
    height: 260px;
    animation-delay: 0s;
}

.hero-ring-two {
    bottom: 14%;
    left: 14%;
    width: 300px;
    height: 300px;
    animation-delay: 10s;
}

.hero-particles {
    position: absolute;
    inset: 0;
    overflow: hidden;
}

.particle {
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: rgba(196, 181, 253, 0.85);
    box-shadow: 0 0 14px rgba(129, 140, 248, 0.65);
    animation: particleDrift 15s linear infinite;
}

.particle::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: inherit;
    background: rgba(129, 140, 248, 0.18);
}

.particle-a {
    top: 14%;
    left: 32%;
    animation-delay: 0s;
}

.particle-b {
    top: 46%;
    left: 68%;
    animation-delay: 3s;
}

.particle-c {
    top: 70%;
    left: 24%;
    animation-delay: 6s;
}

.particle-d {
    top: 32%;
    left: 84%;
    animation-delay: 9s;
}

.particle-e {
    top: 78%;
    left: 52%;
    animation-delay: 12s;
}

.ai-network {
    position: absolute;
    inset: 0;
}

.ai-node {
    position: absolute;
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: rgba(196, 181, 253, 0.85);
    box-shadow: 0 0 18px rgba(167, 139, 250, 0.65);
    animation: nodePulse 4s ease-in-out infinite;
}

.node-one {
    top: 18%;
    left: 32%;
    animation-delay: 0s;
}

.node-two {
    top: 38%;
    left: 68%;
    animation-delay: 0.6s;
}

.node-three {
    top: 62%;
    left: 26%;
    animation-delay: 1.2s;
}

.node-four {
    top: 72%;
    left: 58%;
    animation-delay: 1.8s;
}

.node-five {
    top: 42%;
    left: 50%;
    animation-delay: 2.4s;
}

.ai-connection {
    position: absolute;
    height: 1px;
    background: linear-gradient(90deg, rgba(167, 139, 250, 0), rgba(167, 139, 250, 0.45), rgba(167, 139, 250, 0));
    animation: connectionSweep 8s ease-in-out infinite;
}

.connection-a {
    top: 28%;
    left: 34%;
    width: 38%;
    transform: rotate(12deg);
    animation-delay: 0s;
}

.connection-b {
    top: 50%;
    left: 24%;
    width: 52%;
    transform: rotate(-8deg);
    animation-delay: 1.6s;
}

.connection-c {
    top: 66%;
    left: 40%;
    width: 30%;
    transform: rotate(18deg);
    animation-delay: 3.2s;
}

.connection-d {
    top: 44%;
    left: 48%;
    width: 18%;
    transform: rotate(72deg);
    animation-delay: 4.8s;
}

@keyframes heroFloat {
    0%,
    100% {
        transform: translate3d(0, 0, 0) scale(1);
    }
    50% {
        transform: translate3d(0, -16px, 0) scale(1.07);
    }
}

@keyframes gridDrift {
    0% {
        transform: translate3d(0, 0, 0);
    }
    50% {
        transform: translate3d(-28px, -20px, 0);
    }
    100% {
        transform: translate3d(0, 0, 0);
    }
}

@keyframes ringPulse {
    0%,
    100% {
        transform: scale(1);
        opacity: 0.55;
    }
    50% {
        transform: scale(1.08);
        opacity: 0.92;
    }
}

@keyframes particleDrift {
    0% {
        transform: translate3d(0, 0, 0) scale(1);
        opacity: 0.7;
    }
    50% {
        transform: translate3d(16px, -22px, 0) scale(1.18);
        opacity: 1;
    }
    100% {
        transform: translate3d(0, 0, 0) scale(1);
        opacity: 0.65;
    }
}

@keyframes nodePulse {
    0%,
    100% {
        transform: scale(1);
        opacity: 0.6;
    }
    50% {
        transform: scale(1.3);
        opacity: 1;
    }
}

@keyframes connectionSweep {
    0%,
    100% {
        opacity: 0.25;
    }
    50% {
        opacity: 0.8;
    }
}
</style>
