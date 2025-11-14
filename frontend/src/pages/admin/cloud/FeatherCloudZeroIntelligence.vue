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
import { ShieldCheck, Radar, Bug, Cpu, SearchCheck, Sparkles, CalendarClock } from 'lucide-vue-next';
import type { LucideIcon } from 'lucide-vue-next';

interface FeatureDefinition {
    id: string;
    title: string;
    description: string;
    icon: LucideIcon;
    accent: string;
}

interface PreviewHighlight {
    id: string;
    title: string;
    description: string;
    icon: LucideIcon;
}

interface RoadmapPhaseDefinition {
    id: string;
    title: string;
    description: string;
    badges: string[];
}

interface StatusMetricDefinition {
    id: string;
    label: string;
    value: string;
    progress: string;
}

const featureDefinitions: FeatureDefinition[] = [
    {
        id: 'threat-detection',
        title: 'Threat Surface Scanning',
        description:
            'Continuously profiles nodes and servers to surface anomalous processes, lateral movement attempts, and suspicious command executions before they spread.',
        icon: ShieldCheck,
        accent: 'from-emerald-500/60 via-emerald-500/20 to-transparent',
    },
    {
        id: 'miner-detection',
        title: 'Crypto Miner Hunter',
        description:
            'Detects coin-mining workloads across containers and bare metal by correlating CPU spikes, pool beacons, and known miner fingerprints.',
        icon: Cpu,
        accent: 'from-orange-500/60 via-orange-500/20 to-transparent',
    },
    {
        id: 'abuse-prevention',
        title: 'Abuse Desk Automation',
        description:
            'Bundles evidence packets, screenshots, and remediation guidance that plug directly into compliance queues and customer communication workflows.',
        icon: Bug,
        accent: 'from-rose-500/60 via-rose-500/20 to-transparent',
    },
    {
        id: 'automated-intelligence',
        title: 'Autonomous Intelligence Stack',
        description:
            'Learns from every investigation, retraining detection policies across your fleet without manual rule writing or weekly tuning.',
        icon: Radar,
        accent: 'from-sky-500/60 via-sky-500/20 to-transparent',
    },
];

const highlightDefinitions: PreviewHighlight[] = [
    {
        id: 'network-telemetry',
        title: 'Network telemetry with adaptive baselines',
        description: 'Combines flow analysis with command signature matching to reduce noisy alerts.',
        icon: Radar,
    },
    {
        id: 'signature-updates',
        title: 'Signature updates every hour',
        description: 'Ships curated rulepacks and behaviour models without restarts or downtime.',
        icon: SearchCheck,
    },
    {
        id: 'auto-containment',
        title: 'Auto containment playbooks',
        description: 'Prepares takedown instructions and isolates affected workloads with a single approval.',
        icon: ShieldCheck,
    },
];

const roadmapDefinition: RoadmapPhaseDefinition[] = [
    {
        id: 'phase-alpha',
        title: 'Private Alpha',
        description: 'Internal telemetry rollout, foundational models, and targeted feedback with design partners.',
        badges: ['Internal telemetry', 'Foundational models'],
    },
    {
        id: 'phase-beta',
        title: 'Closed Beta',
        description: 'Behavioural engine v2, policy controls, and automated remediation pathways for early adopters.',
        badges: ['Behaviour engine v2', 'Policy controls'],
    },
    {
        id: 'phase-ga',
        title: 'General Availability',
        description: 'Scalable deployment patterns, compliance packs, and marketplace integrations for every panel.',
        badges: ['Compliance packs', 'Marketplace ready'],
    },
];

const statusMetricDefinitions: StatusMetricDefinition[] = [
    {
        id: 'detection-coverage',
        label: 'Detection Coverage',
        value: '62% of targeted workloads instrumented',
        progress: '62%',
    },
    {
        id: 'auto-remediation',
        label: 'Auto Remediation Playbooks',
        value: '48% of core playbooks complete',
        progress: '48%',
    },
    {
        id: 'partner-onboarding',
        label: 'Partner Onboarding',
        value: 'Three design partners active',
        progress: '35%',
    },
];

const features = featureDefinitions;
const previewHighlights = highlightDefinitions;
const roadmap = roadmapDefinition;
const statusMetrics = statusMetricDefinitions;

const breadcrumbs: BreadcrumbEntry[] = [
    { text: 'Dashboard', href: '/admin' },
    {
        text: 'FeatherCloud Zero Trust',
        href: '/admin/feathercloud-zero-intelligence',
        isCurrent: true,
    },
];

const heroContent = {
    badge: 'Trust & Detection Preview',
    title: 'FeatherCloud Zero Trust',
    subtitle:
        'An upcoming security layer that helps administrators surface compromised nodes, crypto miners, and high-risk behaviour before it spreads.',
    primaryCta: 'Coming Soon',
    secondaryCta: 'Join the Waitlist',
    previewLabel: 'Preview Snapshot',
    previewTitle: 'Cloud-scale threat awareness',
    previewSubtitle:
        'Zero Trust continuously studies panel workloads to deliver high-confidence, explainable signals for your operations team.',
};

const heroHighlights = [
    {
        id: 'realtime',
        icon: Radar,
        text: 'Realtime telemetry and automated findings',
    },
    {
        id: 'crypto',
        icon: Cpu,
        text: 'Dedicated crypto miner fingerprint detection',
    },
    {
        id: 'abuse',
        icon: SearchCheck,
        text: 'Abuse desk ready reporting workflows',
    },
];

const statusNote = {
    title: 'What to expect next',
    body: 'We are calibrating detection fidelity with a handful of operators. Expect rapid iteration, weekly model refreshes, and ongoing invite waves.',
};

const roadmapContent = {
    title: 'Roadmap',
    description: 'Track how Zero Trust progresses toward general availability.',
    phaseLabel: 'Phase',
};

const statusContent = {
    title: 'Status',
    description: 'Snapshot of build readiness and rollout progress.',
    currentPhaseLabel: 'Current Phase',
    phaseValue: 'Private Alpha',
};

const intelMetrics = [
    {
        id: 'coverage',
        label: 'Fleet coverage',
        value: '72% of nodes streaming',
        detail: 'Telemetry updating every 5 minutes across pilot deployments.',
    },
    {
        id: 'detections',
        label: 'Signals analysed',
        value: '12k+ events daily',
        detail: 'Behavioural, signature, and anomaly pipelines fused for context.',
    },
    {
        id: 'playbooks',
        label: 'Automations live',
        value: '8 active playbooks',
        detail: 'Containment, evidence packaging, and abuse escalation flows.',
    },
];

const detectionPillars = [
    {
        id: 'node-intel',
        title: 'Node intelligence mesh',
        description:
            'Kernel, container, and network sensors tie telemetry back to nodes, locations, and tenants for rapid scoping.',
        icon: Radar,
        meta: 'Nodes & locations',
    },
    {
        id: 'runtime-analysis',
        title: 'Runtime analysis graph',
        description:
            'CPU, GPU, and process fingerprints capture miner workloads and suspicious runtime behaviours automatically.',
        icon: Cpu,
        meta: 'Process & resource usage',
    },
    {
        id: 'abuse-automation',
        title: 'Abuse automation layer',
        description:
            'Evidence bundles, policy escalations, and client-ready communications fire the moment threats are confirmed.',
        icon: Bug,
        meta: 'Compliance & support',
    },
];

const readinessSteps = [
    {
        id: 'ingest',
        title: 'Ingest & enrich',
        description: 'Collect telemetry, normalise events, and label assets for cross-panel correlation.',
    },
    {
        id: 'detect',
        title: 'Detect & prioritise',
        description: 'Blend anomaly scores with signature hits to prioritise high-confidence incidents.',
    },
    {
        id: 'automate',
        title: 'Automate response',
        description: 'Trigger containment, throttling, or operator alerts while packaging supporting evidence.',
    },
    {
        id: 'learn',
        title: 'Learn & iterate',
        description: 'Every investigation feeds back into models and policies to cut noise and sharpen detection.',
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
                                <ShieldCheck class="h-4 w-4" />
                                {{ heroContent.primaryCta }}
                            </Button>
                            <Button variant="secondary" size="lg" :disabled="true" class="gap-2">
                                <CalendarClock class="h-4 w-4" />
                                {{ heroContent.secondaryCta }}
                            </Button>
                        </div>
                        <div class="grid gap-3 sm:grid-cols-2">
                            <div
                                v-for="highlight in heroHighlights"
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
                            <div class="globe-scene" aria-hidden="true">
                                <div class="globe">
                                    <span class="globe-core"></span>
                                    <span class="globe-lat globe-lat-one"></span>
                                    <span class="globe-lat globe-lat-two"></span>
                                    <span class="globe-lng globe-lng-one"></span>
                                    <span class="globe-lng globe-lng-two"></span>
                                </div>
                                <div class="globe-orbit orbit-one">
                                    <span class="orbit-dot"></span>
                                </div>
                                <div class="globe-orbit orbit-two">
                                    <span class="orbit-dot"></span>
                                </div>
                                <div class="globe-connector">
                                    <span class="connector connector-a"></span>
                                    <span class="connector connector-b"></span>
                                    <span class="connector connector-c"></span>
                                </div>
                            </div>
                            <div
                                class="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1"
                            >
                                <Sparkles class="h-4 w-4 text-primary" />
                                <span class="text-xs font-semibold uppercase tracking-widest text-primary">
                                    {{ heroContent.previewLabel }}
                                </span>
                            </div>
                            <p class="text-lg font-semibold text-foreground">
                                {{ heroContent.previewTitle }}
                            </p>
                            <p class="text-sm text-muted-foreground">
                                {{ heroContent.previewSubtitle }}
                            </p>

                            <div class="grid gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4 sm:grid-cols-3">
                                <div v-for="metric in intelMetrics" :key="metric.id" class="space-y-1">
                                    <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                        {{ metric.label }}
                                    </p>
                                    <p class="text-sm font-semibold text-foreground">{{ metric.value }}</p>
                                    <p class="text-xs text-muted-foreground">{{ metric.detail }}</p>
                                </div>
                            </div>

                            <div class="space-y-4">
                                <p class="text-sm font-semibold text-foreground">Preview insights</p>
                                <ul class="space-y-3">
                                    <li
                                        v-for="highlight in previewHighlights"
                                        :key="highlight.id"
                                        class="flex gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3"
                                    >
                                        <div
                                            class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"
                                        >
                                            <component :is="highlight.icon" class="h-5 w-5" />
                                        </div>
                                        <div class="space-y-1">
                                            <p class="text-sm font-semibold text-foreground">{{ highlight.title }}</p>
                                            <p class="text-xs text-muted-foreground">{{ highlight.description }}</p>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card
                    v-for="feature in features"
                    :key="feature.id"
                    class="group relative overflow-hidden border border-border/70 bg-background/95 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
                >
                    <div :class="['absolute inset-x-0 top-0 h-1 bg-linear-to-r', feature.accent]" />
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
                    v-for="pillar in detectionPillars"
                    :key="pillar.id"
                    class="relative overflow-hidden border border-border/70 bg-background/95"
                >
                    <div
                        class="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary/40 via-primary/15 to-transparent"
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
                        <CardTitle class="text-xl font-semibold text-foreground">Detection workflow</CardTitle>
                        <CardDescription class="text-sm text-muted-foreground">
                            How FeatherCloud Zero Trust processes, prioritises, and responds to signals.
                        </CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-5">
                        <div
                            v-for="(step, index) in readinessSteps"
                            :key="step.id"
                            class="relative rounded-2xl border border-border/70 bg-muted/40 p-5"
                        >
                            <div
                                v-if="index !== readinessSteps.length - 1"
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
                        <CardTitle class="text-xl font-semibold text-foreground">
                            {{ statusContent.title }}
                        </CardTitle>
                        <CardDescription class="text-sm text-muted-foreground">
                            {{ statusContent.description }}
                        </CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-6">
                        <div>
                            <p class="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                                {{ statusContent.currentPhaseLabel }}
                            </p>
                            <p class="mt-1 text-2xl font-semibold text-foreground">
                                {{ statusContent.phaseValue }}
                            </p>
                        </div>

                        <div class="space-y-4">
                            <div v-for="metric in statusMetrics" :key="metric.id" class="space-y-2">
                                <div
                                    class="flex items-center justify-between text-sm font-medium text-muted-foreground"
                                >
                                    <span>{{ metric.label }}</span>
                                    <span class="text-foreground">{{ metric.value }}</span>
                                </div>
                                <div class="h-2 w-full rounded-full bg-muted">
                                    <div
                                        class="h-2 rounded-full bg-primary transition-all duration-500 ease-out"
                                        :style="{ width: metric.progress }"
                                    />
                                </div>
                            </div>
                        </div>

                        <div class="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-sm">
                            <p class="font-semibold text-primary">
                                {{ statusNote.title }}
                            </p>
                            <p class="mt-1 text-muted-foreground">
                                {{ statusNote.body }}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </section>

            <section class="grid gap-6 lg:grid-cols-3">
                <Card class="border border-border/70 bg-background/95 backdrop-blur lg:col-span-2">
                    <CardHeader>
                        <CardTitle class="text-xl font-semibold text-foreground">
                            {{ roadmapContent.title }}
                        </CardTitle>
                        <CardDescription class="text-sm text-muted-foreground">
                            {{ roadmapContent.description }}
                        </CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-6">
                        <div
                            v-for="phase in roadmap"
                            :key="phase.id"
                            class="relative rounded-2xl border border-border/70 bg-muted/40 p-5 pl-6"
                        >
                            <div
                                class="absolute left-4 top-5 h-3 w-3 rounded-full border border-primary bg-background shadow-sm"
                            />
                            <div class="space-y-3 pl-6">
                                <p class="text-sm font-semibold uppercase tracking-widest text-primary">
                                    {{ roadmapContent.phaseLabel }}
                                </p>
                                <h3 class="text-lg font-semibold text-foreground">{{ phase.title }}</h3>
                                <p class="text-sm text-muted-foreground">{{ phase.description }}</p>
                                <div class="flex flex-wrap gap-2">
                                    <Badge
                                        v-for="badge in phase.badges"
                                        :key="badge"
                                        variant="outline"
                                        class="border-primary/30 bg-primary/10 text-primary"
                                    >
                                        {{ badge }}
                                    </Badge>
                                </div>
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
    filter: blur(0px);
    opacity: 0.65;
    animation: heroFloat 24s ease-in-out infinite;
    mix-blend-mode: screen;
}

.hero-blob-one {
    top: -25%;
    left: -18%;
    width: 420px;
    height: 420px;
    background: radial-gradient(circle, rgba(129, 140, 248, 0.55), rgba(99, 102, 241, 0.18));
    animation-delay: 0s;
}

.hero-blob-two {
    bottom: -28%;
    right: -12%;
    width: 520px;
    height: 520px;
    background: radial-gradient(circle, rgba(165, 180, 252, 0.5), rgba(129, 140, 248, 0.2));
    animation-delay: 7s;
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
    border: 1px solid rgba(191, 219, 254, 0.25);
    box-shadow: 0 0 60px rgba(99, 102, 241, 0.25);
    backdrop-filter: blur(6px);
    animation: ringPulse 18s ease-in-out infinite;
}

.hero-ring-one {
    top: 15%;
    right: 10%;
    width: 220px;
    height: 220px;
    animation-delay: 0s;
}

.hero-ring-two {
    bottom: 12%;
    left: 12%;
    width: 260px;
    height: 260px;
    animation-delay: 8s;
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
    animation: particleDrift 14s linear infinite;
}

.particle::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: inherit;
    background: rgba(59, 130, 246, 0.15);
}

.particle-a {
    top: 12%;
    left: 25%;
    animation-delay: 0s;
}

.particle-b {
    top: 45%;
    left: 70%;
    animation-delay: 3s;
}

.particle-c {
    top: 68%;
    left: 18%;
    animation-delay: 6s;
}

.particle-d {
    top: 30%;
    left: 85%;
    animation-delay: 9s;
}

.particle-e {
    top: 78%;
    left: 55%;
    animation-delay: 12s;
}

.globe-scene {
    position: absolute;
    top: -38px;
    right: -28px;
    width: 220px;
    height: 220px;
    pointer-events: none;
}

.globe {
    position: absolute;
    inset: 0;
    border-radius: 9999px;
    background: radial-gradient(circle at 30% 30%, rgba(180, 198, 255, 0.6), rgba(59, 130, 246, 0.25));
    box-shadow: 0 0 45px rgba(99, 102, 241, 0.25);
    animation: globeSpin 26s linear infinite;
    overflow: hidden;
}

.globe-core {
    position: absolute;
    inset: 12%;
    border-radius: inherit;
    background: radial-gradient(circle at 40% 40%, rgba(236, 254, 255, 0.4), rgba(59, 130, 246, 0.1));
    filter: blur(0px);
}

.globe-lat,
.globe-lng {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    border: 1px solid rgba(148, 163, 184, 0.2);
}

.globe-lat-one {
    transform: rotateX(65deg);
}

.globe-lat-two {
    transform: rotateX(-65deg);
}

.globe-lng-one {
    transform: rotateY(45deg);
}

.globe-lng-two {
    transform: rotateY(-45deg);
}

.globe-orbit {
    position: absolute;
    inset: -18px;
    border-radius: 9999px;
    border: 1px dashed rgba(129, 140, 248, 0.35);
    animation: orbitSpin 18s linear infinite;
}

.orbit-one {
    animation-duration: 18s;
}

.orbit-two {
    animation-duration: 22s;
    transform: rotateX(25deg);
}

.orbit-dot {
    position: absolute;
    top: 50%;
    left: -6px;
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: rgba(165, 180, 252, 0.9);
    box-shadow: 0 0 12px rgba(99, 102, 241, 0.6);
}

.globe-connector .connector {
    position: absolute;
    width: 2px;
    height: 60px;
    background: linear-gradient(180deg, rgba(165, 180, 252, 0.3), rgba(99, 102, 241, 0.05));
    left: 50%;
    transform-origin: top;
    animation: connectorPulse 6s ease-in-out infinite;
}

.connector-a {
    top: 15%;
    transform: rotate(12deg);
    animation-delay: 0s;
}

.connector-b {
    top: 28%;
    transform: rotate(-24deg);
    animation-delay: 1.4s;
}

.connector-c {
    top: 42%;
    transform: rotate(32deg);
    animation-delay: 2.8s;
}

@keyframes heroFloat {
    0%,
    100% {
        transform: translate3d(0, 0, 0) scale(1);
        filter: blur(50px);
    }
    50% {
        transform: translate3d(0, -18px, 0) scale(1.08);
        filter: blur(60px);
    }
}

@keyframes gridDrift {
    0% {
        transform: translate3d(0, 0, 0);
    }
    50% {
        transform: translate3d(-32px, -18px, 0);
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
        opacity: 0.9;
    }
}

@keyframes particleDrift {
    0% {
        transform: translate3d(0, 0, 0) scale(1);
        opacity: 0.7;
    }
    50% {
        transform: translate3d(12px, -18px, 0) scale(1.15);
        opacity: 1;
    }
    100% {
        transform: translate3d(0, 0, 0) scale(1);
        opacity: 0.65;
    }
}

@keyframes globeSpin {
    0% {
        transform: rotateY(0deg);
    }
    100% {
        transform: rotateY(360deg);
    }
}

@keyframes orbitSpin {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}

@keyframes connectorPulse {
    0%,
    100% {
        opacity: 0.35;
        transform: scaleY(0.8);
    }
    50% {
        opacity: 0.9;
        transform: scaleY(1.05);
    }
}
</style>
