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
import {
    Bot,
    Mic,
    Server,
    Database,
    Users,
    BarChart3,
    Terminal,
    MessageSquare,
    Settings,
    Sparkles,
    ShieldCheck,
    Zap,
} from 'lucide-vue-next';

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
    primaryCta: 'Request Pilot Access',
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
        text: '“Start realm 42’s tournament servers and send status to Discord.”',
    },
    {
        id: 'db',
        icon: Database,
        text: '“Create a MariaDB instance for ArcadeCraft with nightly retention.”',
    },
    {
        id: 'admin',
        icon: Users,
        text: '“List suspended users and draft emails requesting compliance updates.”',
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
        icon: Settings,
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
</script>

<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="min-h-screen space-y-10 pb-12">
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
                            <Button size="lg" :disabled="true" class="gap-2">
                                <Bot class="h-4 w-4" />
                                {{ heroContent.primaryCta }}
                            </Button>
                            <Button variant="secondary" size="lg" :disabled="true" class="gap-2">
                                <BarChart3 class="h-4 w-4" />
                                {{ heroContent.secondaryCta }}
                            </Button>
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
                                        “Agent, create five event servers for Realm Echo and deploy the latest mod
                                        pack.”
                                    </li>
                                    <li>“Voice mode: show me database growth and usage KPIs for the last 30 days.”</li>
                                    <li>
                                        “Generate a compliance report and email it to the Mythical Systems audit list.”
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

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

            <section class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <Card class="border border-border/70 bg-background/95">
                    <CardHeader>
                        <CardTitle class="text-xl font-semibold text-foreground">Roadmap</CardTitle>
                        <CardDescription class="text-sm text-muted-foreground">
                            See what’s live today and what’s arriving next for the FeatherCloud AI Agent.
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
