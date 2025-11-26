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
import { CalendarClock, Cloud, Database, HardDrive, Lock, Rocket, ShieldCheck, Sparkles } from 'lucide-vue-next';
import type { LucideIcon } from 'lucide-vue-next';

interface FeatureCard {
    id: string;
    title: string;
    description: string;
    icon: LucideIcon;
}

interface TrackItem {
    id: string;
    title: string;
    description: string;
    status: 'in-progress' | 'planned';
}

const breadcrumbs: BreadcrumbEntry[] = [
    { text: 'Dashboard', href: '/admin' },
    {
        text: 'FeatherPanel Cloud',
        href: '/admin/featherpanel-cloud',
        isCurrent: true,
    },
];

const heroContent = {
    badge: 'FeatherPanel Cloud',
    title: 'Backups that protect your whole panel ecosystem',
    subtitle:
        'Send Wings snapshots, panel databases, configuration archives, and custom payloads to FeatherPanel Cloud for resilient, policy-driven retention.',
    primaryCta: 'Join Snapshot Preview',
    secondaryCta: 'See Backup Roadmap',
    highlights: [
        'Streaming exports for Wings, panel databases, and realm assets.',
        'Central policy engine with per-tenant retention rules.',
        'Restore orchestration that rehydrates both infrastructure and data layers.',
    ],
};

const featureCards: FeatureCard[] = [
    {
        id: 'snapshot-offload',
        title: 'Unified Snapshot Offloading',
        description:
            'Schedule Wings backups, panel database dumps, and S3-compatible archives to flow into FeatherPanel Cloud automatically.',
        icon: Cloud,
    },
    {
        id: 'retention',
        title: 'Global Retention Policies',
        description:
            'Layer global defaults with client-specific rules so every realm, database, and file share follows the right retention window.',
        icon: CalendarClock,
    },
    {
        id: 'recovery',
        title: 'Rapid Restore Orchestration',
        description:
            'Initiate rollback playbooks that stream data directly into Wings nodes and panel services, keeping downtime razor-thin.',
        icon: Rocket,
    },
    {
        id: 'compliance',
        title: 'Audit-Ready Trails',
        description:
            'Immutable change logs, checksum validation, and export histories keep organisational and regulatory audits frictionless.',
        icon: ShieldCheck,
    },
];

const trackItems: TrackItem[] = [
    {
        id: 'snapshot-preview',
        title: 'Cross-surface snapshot pipelines',
        description:
            'Private preview linking Wings backup jobs, panel database exports, and object storage syncs into one delivery stream.',
        status: 'in-progress',
    },
    {
        id: 'retention-dashboard',
        title: 'Unified retention dashboard',
        description:
            'Visualise policy adherence, storage consumption, and failed exports across every client and deployment footprint.',
        status: 'planned',
    },
    {
        id: 'self-serve-restores',
        title: 'Self-service restoration tooling',
        description:
            'Empower panel administrators to rehydrate Wings nodes, databases, and file attachments without touching the CLI.',
        status: 'planned',
    },
];

const statusBadges = {
    inProgress: {
        label: 'In Progress',
        class: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    },
    planned: {
        label: 'Planned',
        class: 'bg-muted text-muted-foreground border-border/60',
    },
};

const spotlight = {
    title: 'Why consolidate backups inside FeatherPanel Cloud',
    description:
        'FeatherPanel Cloud ensures everything your panel depends on—Wings data, databases, file stores, and config bundles—lives in a governed, observable, and rapidly restorable space.',
    points: [
        {
            icon: Rocket,
            title: 'Recover faster',
            text: 'Coordinated restore pipelines rebuild Wings nodes, panel databases, and persistent volumes in a single workflow.',
        },
        {
            icon: Lock,
            title: 'Operate securely',
            text: 'Encryption, isolation, and tamper evidence protect every snapshot whether it originated from Wings or panel services.',
        },
        {
            icon: Sparkles,
            title: 'Automate lifecycle',
            text: 'Lifecycle policies, quota guardrails, and tiering automation stop storage sprawl before it starts.',
        },
    ],
};

const backupStats = [
    {
        id: 'coverage',
        label: 'Surfaces covered',
        value: '4 core data paths',
        detail: 'Wings, panel databases, configuration vaults, asset archives',
    },
    {
        id: 'retention',
        label: 'Retention engine',
        value: 'Per-tenant policies',
        detail: 'Defaults plus client overrides with automated pruning',
    },
    {
        id: 'restore',
        label: 'Restore readiness',
        value: '< 5 min RTO',
        detail: 'Streamed rehydration back into Wings & panel services',
    },
];

const coveragePillars = [
    {
        id: 'wings',
        title: 'Wings Snapshots',
        description: 'Capture game data, volumes, and runtime state without touching local storage quotas.',
        meta: 'Game servers & volumes',
        icon: Cloud,
    },
    {
        id: 'panel-db',
        title: 'Panel Databases',
        description: 'Automated SQL dumps and verification keep user data, permissions, and settings safe.',
        meta: 'MySQL / MariaDB exports',
        icon: Database,
    },
    {
        id: 'configs',
        title: 'Configuration Vault',
        description: 'Persist environment files, startup parameters, S3 credentials, and realm assets.',
        meta: 'Configs & binaries',
        icon: HardDrive,
    },
];

const workflowSteps = [
    {
        id: 'collect',
        title: 'Collect & package',
        description: 'Wings tasks, database exporters, and asset sync jobs push fresh payloads into the pipeline.',
    },
    {
        id: 'verify',
        title: 'Verify & encrypt',
        description: 'Checksums, manifest validation, and envelope encryption ensure data integrity in transit.',
    },
    {
        id: 'retain',
        title: 'Apply retention rules',
        description:
            'Global defaults and tenant overrides place snapshots on hot, warm, or archive tiers with automated pruning.',
    },
    {
        id: 'rehydrate',
        title: 'Rehydrate on demand',
        description: 'Streaming restores feed Wings nodes, panel databases, and configuration bundles simultaneously.',
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
                    <div class="cloud-stream" aria-hidden="true">
                        <span class="cloud-wave wave-one"></span>
                        <span class="cloud-wave wave-two"></span>
                        <span class="cloud-wave wave-three"></span>
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
                                <Rocket class="h-4 w-4" />
                                {{ heroContent.primaryCta }}
                            </Button>
                            <Button variant="secondary" size="lg" :disabled="true" class="gap-2">
                                <CalendarClock class="h-4 w-4" />
                                {{ heroContent.secondaryCta }}
                            </Button>
                        </div>
                        <div class="grid gap-3 sm:grid-cols-2">
                            <div
                                v-for="highlight in heroContent.highlights"
                                :key="highlight"
                                class="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/70 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
                            >
                                <Sparkles class="mt-0.5 h-4 w-4 text-primary" />
                                <p class="text-sm text-muted-foreground">{{ highlight }}</p>
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
                            <div class="flex items-start justify-between gap-3">
                                <div>
                                    <p class="text-sm font-semibold text-foreground">Backup control plane</p>
                                    <p class="text-xs text-muted-foreground">Private preview with select operators</p>
                                </div>
                                <Badge variant="secondary" class="border-amber-400/40 bg-amber-400/15 text-amber-500">
                                    Preview
                                </Badge>
                            </div>

                            <div class="grid gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4 sm:grid-cols-3">
                                <div v-for="stat in backupStats" :key="stat.id" class="space-y-1">
                                    <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                        {{ stat.label }}
                                    </p>
                                    <p class="text-sm font-semibold text-foreground">{{ stat.value }}</p>
                                    <p class="text-xs text-muted-foreground">{{ stat.detail }}</p>
                                </div>
                            </div>

                            <div class="rounded-2xl border border-border/60 bg-muted/30 p-4">
                                <p class="text-sm font-semibold text-foreground">Built-in integrations</p>
                                <div class="mt-2 flex flex-wrap gap-2">
                                    <span
                                        class="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs text-muted-foreground"
                                    >
                                        Wings nodes
                                    </span>
                                    <span
                                        class="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs text-muted-foreground"
                                    >
                                        Panel databases
                                    </span>
                                    <span
                                        class="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs text-muted-foreground"
                                    >
                                        Configuration vaults
                                    </span>
                                    <span
                                        class="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs text-muted-foreground"
                                    >
                                        Realm assets & media
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card
                    v-for="feature in featureCards"
                    :key="feature.id"
                    class="group relative h-full overflow-hidden border border-border/70 bg-background/95 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
                >
                    <div
                        class="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary/60 via-primary/20 to-transparent"
                    />
                    <CardHeader class="space-y-4 pb-6">
                        <div
                            class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15"
                        >
                            <component :is="feature.icon" class="h-5 w-5" />
                        </div>
                        <CardTitle class="text-lg font-semibold text-foreground">{{ feature.title }}</CardTitle>
                        <CardDescription class="text-sm leading-relaxed text-muted-foreground">
                            {{ feature.description }}
                        </CardDescription>
                    </CardHeader>
                </Card>
            </section>

            <section class="grid gap-4 lg:grid-cols-3">
                <Card
                    v-for="pillar in coveragePillars"
                    :key="pillar.id"
                    class="relative overflow-hidden border border-border/70 bg-background/95"
                >
                    <div
                        class="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary/30 via-primary/10 to-transparent"
                    />
                    <CardHeader class="space-y-4 pb-6">
                        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <component :is="pillar.icon" class="h-5 w-5" />
                        </div>
                        <CardTitle class="text-lg font-semibold text-foreground">{{ pillar.title }}</CardTitle>
                        <CardDescription class="text-sm leading-relaxed text-muted-foreground">
                            {{ pillar.description }}
                        </CardDescription>
                        <span
                            class="inline-flex w-fit rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground"
                        >
                            {{ pillar.meta }}
                        </span>
                    </CardHeader>
                </Card>
            </section>

            <section class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <Card class="border border-border/70 bg-background/95">
                    <CardHeader>
                        <CardTitle class="text-xl font-semibold text-foreground">Backup workflow</CardTitle>
                        <CardDescription class="text-sm text-muted-foreground">
                            From the first scheduled task to full restoration, every step stays observable.
                        </CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-5">
                        <div
                            v-for="(step, index) in workflowSteps"
                            :key="step.id"
                            class="relative rounded-2xl border border-border/70 bg-muted/40 p-5"
                        >
                            <div
                                v-if="index !== workflowSteps.length - 1"
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

                <Card class="border border-border/70 bg-background/95">
                    <CardHeader>
                        <CardTitle class="text-xl font-semibold text-foreground">Cloud trajectory</CardTitle>
                        <CardDescription class="text-sm text-muted-foreground">
                            Follow the core investments that shape FeatherPanel Cloud.
                        </CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-5">
                        <div
                            v-for="item in trackItems"
                            :key="item.id"
                            class="rounded-2xl border border-border/70 bg-muted/40 p-5 transition-colors"
                        >
                            <div class="flex items-center justify-between gap-4">
                                <p class="text-base font-semibold text-foreground">{{ item.title }}</p>
                                <Badge
                                    variant="outline"
                                    :class="[
                                        'text-xs font-semibold uppercase tracking-widest',
                                        item.status === 'in-progress'
                                            ? statusBadges.inProgress.class
                                            : statusBadges.planned.class,
                                    ]"
                                >
                                    {{
                                        item.status === 'in-progress'
                                            ? statusBadges.inProgress.label
                                            : statusBadges.planned.label
                                    }}
                                </Badge>
                            </div>
                            <p class="mt-3 text-sm text-muted-foreground">{{ item.description }}</p>
                        </div>
                    </CardContent>
                </Card>
            </section>

            <Card class="border border-border/70 bg-background/95">
                <CardHeader>
                    <CardTitle class="text-xl font-semibold text-foreground">{{ spotlight.title }}</CardTitle>
                    <CardDescription class="text-sm text-muted-foreground">{{ spotlight.description }}</CardDescription>
                </CardHeader>
                <CardContent class="grid gap-4 sm:grid-cols-3">
                    <div
                        v-for="point in spotlight.points"
                        :key="point.title"
                        class="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/40 p-4"
                    >
                        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <component :is="point.icon" class="h-5 w-5" />
                        </div>
                        <div class="space-y-1">
                            <p class="text-sm font-semibold text-foreground">{{ point.title }}</p>
                            <p class="text-sm text-muted-foreground">{{ point.text }}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    </DashboardLayout>
</template>

<style scoped>
.hero-blob {
    position: absolute;
    border-radius: 9999px;
    filter: blur(0px);
    opacity: 0.6;
    animation: heroFloat 22s ease-in-out infinite;
    mix-blend-mode: screen;
}

.hero-blob-one {
    top: -20%;
    left: -15%;
    width: 420px;
    height: 420px;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.55), rgba(56, 189, 248, 0.15));
    animation-delay: 0s;
}

.hero-blob-two {
    bottom: -25%;
    right: -10%;
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.4), rgba(14, 165, 233, 0.2));
    animation-delay: 6s;
}

.hero-grid {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.18) 1px, transparent 0);
    background-size: 42px 42px;
    opacity: 0.35;
    transform: translate3d(0, 0, 0);
    animation: gridDrift 30s linear infinite;
}

.hero-ring {
    position: absolute;
    border-radius: 9999px;
    border: 1px solid rgba(96, 165, 250, 0.28);
    box-shadow: 0 0 60px rgba(56, 189, 248, 0.25);
    backdrop-filter: blur(6px);
    animation: ringPulse 20s ease-in-out infinite;
}

.hero-ring-one {
    top: 18%;
    right: 12%;
    width: 240px;
    height: 240px;
    animation-delay: 0s;
}

.hero-ring-two {
    bottom: 14%;
    left: 14%;
    width: 280px;
    height: 280px;
    animation-delay: 9s;
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
    background: rgba(191, 219, 254, 0.8);
    box-shadow: 0 0 12px rgba(59, 130, 246, 0.6);
    animation: particleDrift 16s linear infinite;
}

.particle::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: inherit;
    background: rgba(59, 130, 246, 0.15);
}

.particle-a {
    top: 15%;
    left: 28%;
    animation-delay: 0s;
}

.particle-b {
    top: 42%;
    left: 72%;
    animation-delay: 3s;
}

.particle-c {
    top: 68%;
    left: 22%;
    animation-delay: 6s;
}

.particle-d {
    top: 30%;
    left: 86%;
    animation-delay: 9s;
}

.particle-e {
    top: 78%;
    left: 52%;
    animation-delay: 12s;
}

.cloud-stream {
    position: absolute;
    inset: 0;
    overflow: hidden;
}

.cloud-wave {
    position: absolute;
    left: -20%;
    width: 140%;
    height: 140px;
    background: linear-gradient(90deg, rgba(59, 130, 246, 0.08), rgba(56, 189, 248, 0.2), rgba(59, 130, 246, 0.08));
    filter: blur(20px);
    opacity: 0.45;
    transform: translate3d(0, 0, 0);
    animation: waveDrift 26s linear infinite;
}

.wave-one {
    top: 25%;
    animation-duration: 24s;
}

.wave-two {
    top: 55%;
    animation-duration: 30s;
    animation-delay: 5s;
    opacity: 0.35;
}

.wave-three {
    top: 80%;
    animation-duration: 36s;
    animation-delay: 10s;
    opacity: 0.25;
}

@keyframes heroFloat {
    0%,
    100% {
        transform: translate3d(0, 0, 0) scale(1);
        filter: blur(45px);
    }
    50% {
        transform: translate3d(0, -20px, 0) scale(1.08);
        filter: blur(55px);
    }
}

@keyframes gridDrift {
    0% {
        transform: translate3d(0, 0, 0);
    }
    50% {
        transform: translate3d(-30px, -20px, 0);
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
        transform: scale(1.07);
        opacity: 0.9;
    }
}

@keyframes particleDrift {
    0% {
        transform: translate3d(0, 0, 0) scale(1);
        opacity: 0.7;
    }
    50% {
        transform: translate3d(14px, -20px, 0) scale(1.16);
        opacity: 1;
    }
    100% {
        transform: translate3d(0, 0, 0) scale(1);
        opacity: 0.65;
    }
}

@keyframes waveDrift {
    0% {
        transform: translate3d(-10%, 0, 0);
    }
    50% {
        transform: translate3d(5%, 0, 0);
    }
    100% {
        transform: translate3d(-10%, 0, 0);
    }
}
</style>
