<template>
    <div v-if="versionInfo" class="p-6 space-y-4">
        <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold flex items-center gap-2">
                <Rocket :size="20" class="text-primary" />
                Version Information
            </h2>
            <div class="text-xs text-muted-foreground">Last checked {{ formatAgo(versionInfo.last_checked) }}</div>
        </div>

        <!-- Current Version Card -->
        <Card
            v-if="versionInfo.current"
            class="p-6 border-l-4 border-l-blue-500 bg-linear-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20"
        >
            <div class="flex items-start gap-4">
                <div
                    class="h-12 w-12 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shrink-0"
                >
                    <Sparkles :size="24" class="text-white" />
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex flex-wrap items-center gap-3 mb-2">
                        <h3 class="text-lg font-semibold text-blue-900 dark:text-blue-100">
                            {{ versionInfo.current.release_name }}
                        </h3>
                        <span
                            class="text-sm px-3 py-1 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 font-medium border border-blue-200 dark:border-blue-700"
                        >
                            {{ versionInfo.current.version }}
                        </span>
                        <span
                            class="text-xs px-2 py-1 rounded-full bg-gray-500/10 text-gray-600 dark:text-gray-400 capitalize border"
                        >
                            {{ versionInfo.current.type }}
                        </span>
                    </div>
                    <!-- eslint-disable vue/no-v-html -->
                    <div
                        class="text-muted-foreground mb-3 prose prose-sm dark:prose-invert max-w-none"
                        v-html="renderMarkdown(versionInfo.current.description)"
                    ></div>
                    <!-- eslint-enable vue/no-v-html -->
                    <div class="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span class="flex items-center gap-1">
                            <span class="w-2 h-2 rounded-full bg-green-500"></span>
                            PHP {{ versionInfo.current.min_supported_php }}-{{ versionInfo.current.max_supported_php }}
                        </span>
                        <span>•</span>
                        <span>Released {{ formatDate(versionInfo.current.created_at) }}</span>
                    </div>
                </div>
            </div>
        </Card>

        <!-- Current Version Changelog -->
        <Card
            v-if="versionInfo.current && hasCurrentVersionChangelog(versionInfo.current)"
            class="p-6 border-l-4 border-l-indigo-500"
        >
            <div
                class="flex items-center justify-between cursor-pointer mb-4 hover:bg-muted/50 rounded-md p-2 -m-2 transition-colors"
                @click="toggleCurrentVersionChangelog"
            >
                <h4 class="text-lg font-semibold flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
                    What's in {{ versionInfo.current.release_name }}
                </h4>
                <div class="flex items-center gap-2 text-muted-foreground">
                    <span class="text-sm">{{ currentVersionChangelogOpen ? 'Hide' : 'Show' }}</span>
                    <component :is="currentVersionChangelogOpen ? ChevronUp : ChevronDown" :size="20" />
                </div>
            </div>
            <div v-show="currentVersionChangelogOpen" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ChangelogSection
                    v-if="versionInfo.current.changelog_added?.length"
                    title="Added"
                    :items="versionInfo.current.changelog_added"
                    color="emerald"
                    icon="+"
                />
                <ChangelogSection
                    v-if="versionInfo.current.changelog_fixed?.length"
                    title="Fixed"
                    :items="versionInfo.current.changelog_fixed"
                    color="blue"
                    icon="🔧"
                />
                <ChangelogSection
                    v-if="versionInfo.current.changelog_improved?.length"
                    title="Improved"
                    :items="versionInfo.current.changelog_improved"
                    color="purple"
                    icon="⚡"
                />
                <ChangelogSection
                    v-if="versionInfo.current.changelog_updated?.length"
                    title="Updated"
                    :items="versionInfo.current.changelog_updated"
                    color="amber"
                    icon="🔄"
                />
                <ChangelogSection
                    v-if="versionInfo.current.changelog_removed?.length"
                    title="Removed"
                    :items="versionInfo.current.changelog_removed"
                    color="red"
                    icon="-"
                />
            </div>
        </Card>

        <!-- Update Available Notification -->
        <div v-if="versionInfo.update_available && versionInfo.latest" class="space-y-4">
            <Card
                class="p-6 border-l-4 border-l-emerald-500 bg-linear-to-r from-emerald-50/50 to-green-50/50 dark:from-emerald-950/20 dark:to-green-950/20 shadow-lg"
            >
                <div class="flex items-start gap-4">
                    <div
                        class="h-12 w-12 rounded-full bg-linear-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shrink-0"
                    >
                        <AlertTriangle :size="24" class="text-white" />
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex flex-wrap items-center gap-3 mb-2">
                            <h3 class="text-lg font-semibold text-emerald-800 dark:text-emerald-200">
                                🚀 Update Available!
                            </h3>
                            <span
                                class="text-sm px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-200 dark:border-emerald-700"
                            >
                                {{ versionInfo.latest.version }}
                            </span>
                        </div>
                        <div class="text-emerald-700 dark:text-emerald-300 mb-3">
                            <strong>{{ versionInfo.latest.release_name }}</strong> -
                            <!-- eslint-disable vue/no-v-html -->
                            <span
                                class="prose prose-sm dark:prose-invert max-w-none"
                                v-html="renderMarkdown(versionInfo.latest.description)"
                            ></span>
                            <!-- eslint-enable vue/no-v-html -->
                        </div>
                        <div class="flex flex-wrap items-center gap-4 text-sm text-emerald-600 dark:text-emerald-400">
                            <span class="flex items-center gap-1">
                                <span class="w-2 h-2 rounded-full bg-green-500"></span>
                                PHP {{ versionInfo.latest.min_supported_php }}-{{
                                    versionInfo.latest.max_supported_php
                                }}
                            </span>
                            <span>•</span>
                            <span>Released {{ formatDate(versionInfo.latest.created_at) }}</span>
                        </div>
                    </div>
                </div>
            </Card>

            <!-- Changelog -->
            <Card class="p-6">
                <div
                    class="flex items-center justify-between cursor-pointer mb-4 hover:bg-muted/50 rounded-md p-2 -m-2 transition-colors"
                    @click="toggleLatestVersionChangelog"
                >
                    <h4 class="text-lg font-semibold">What's New in {{ versionInfo.latest.release_name }}</h4>
                    <div class="flex items-center gap-2 text-muted-foreground">
                        <span class="text-sm">{{ latestVersionChangelogOpen ? 'Hide' : 'Show' }}</span>
                        <component :is="latestVersionChangelogOpen ? ChevronUp : ChevronDown" :size="20" />
                    </div>
                </div>
                <div v-show="latestVersionChangelogOpen" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ChangelogSection
                        v-if="versionInfo.latest.changelog_added?.length"
                        title="Added"
                        :items="versionInfo.latest.changelog_added"
                        color="emerald"
                        icon="+"
                    />
                    <ChangelogSection
                        v-if="versionInfo.latest.changelog_fixed?.length"
                        title="Fixed"
                        :items="versionInfo.latest.changelog_fixed"
                        color="blue"
                        icon="🔧"
                    />
                    <ChangelogSection
                        v-if="versionInfo.latest.changelog_improved?.length"
                        title="Improved"
                        :items="versionInfo.latest.changelog_improved"
                        color="purple"
                        icon="⚡"
                    />
                    <ChangelogSection
                        v-if="versionInfo.latest.changelog_updated?.length"
                        title="Updated"
                        :items="versionInfo.latest.changelog_updated"
                        color="amber"
                        icon="🔄"
                    />
                    <ChangelogSection
                        v-if="versionInfo.latest.changelog_removed?.length"
                        title="Removed"
                        :items="versionInfo.latest.changelog_removed"
                        color="red"
                        icon="-"
                    />
                </div>
            </Card>
        </div>

        <!-- No Update Available -->
        <div v-else-if="versionInfo.current" class="text-center pt-8">
            <Card
                class="p-8 bg-linear-to-r from-emerald-50/50 to-green-50/50 dark:from-emerald-950/20 dark:to-green-950/20 border-l-4 border-l-emerald-500"
            >
                <div
                    class="h-16 w-16 rounded-full bg-linear-to-br from-emerald-500 to-green-600 flex items-center justify-center mx-auto mb-4 shadow-lg"
                >
                    <CheckCircle2 :size="32" class="text-white" />
                </div>
                <h3 class="text-lg font-semibold text-emerald-800 dark:text-emerald-200 mb-2">🎉 You're up to date!</h3>
                <p class="text-muted-foreground">You're running the latest version of FeatherPanel.</p>
            </Card>
        </div>
    </div>
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

import { computed, ref } from 'vue';
import { Card } from '@/components/ui/card';
import { Sparkles, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Rocket } from 'lucide-vue-next';
import { useDashboardStore } from '@/stores/dashboard';
import ChangelogSection from './ChangelogSection.vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const dashboardStore = useDashboardStore();

const versionInfo = computed(() => dashboardStore.getVersionInfo);

const currentVersionChangelogOpen = ref(localStorage.getItem('currentVersionChangelogOpen') !== 'false');
const latestVersionChangelogOpen = ref(localStorage.getItem('latestVersionChangelogOpen') !== 'false');

const toggleCurrentVersionChangelog = () => {
    currentVersionChangelogOpen.value = !currentVersionChangelogOpen.value;
    localStorage.setItem('currentVersionChangelogOpen', currentVersionChangelogOpen.value.toString());
};

const toggleLatestVersionChangelog = () => {
    latestVersionChangelogOpen.value = !latestVersionChangelogOpen.value;
    localStorage.setItem('latestVersionChangelogOpen', latestVersionChangelogOpen.value.toString());
};

function formatAgo(dateStr: string | null): string {
    if (!dateStr) return 'never';
    const d = new Date(dateStr.replace(' ', 'T'));
    const diffMs = Date.now() - d.getTime();
    if (Number.isNaN(diffMs)) return dateStr;
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'Unknown';
    try {
        const d = new Date(dateStr.replace(' ', 'T'));
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return dateStr;
    }
}

interface VersionData {
    changelog_added?: string[];
    changelog_fixed?: string[];
    changelog_improved?: string[];
    changelog_updated?: string[];
    changelog_removed?: string[];
}

function hasCurrentVersionChangelog(version: VersionData | null): boolean {
    if (!version) return false;
    return Boolean(
        (Array.isArray(version.changelog_added) && version.changelog_added.length > 0) ||
            (Array.isArray(version.changelog_fixed) && version.changelog_fixed.length > 0) ||
            (Array.isArray(version.changelog_improved) && version.changelog_improved.length > 0) ||
            (Array.isArray(version.changelog_updated) && version.changelog_updated.length > 0) ||
            (Array.isArray(version.changelog_removed) && version.changelog_removed.length > 0),
    );
}

const renderMarkdown = (markdown: string | null | undefined): string => {
    if (!markdown) return '';
    try {
        marked.setOptions({
            breaks: true,
            gfm: true,
        });
        const html = marked.parse(markdown) as string;
        return DOMPurify.sanitize(html, {
            ALLOWED_TAGS: [
                'p',
                'br',
                'strong',
                'em',
                'u',
                's',
                'code',
                'pre',
                'a',
                'ul',
                'ol',
                'li',
                'h1',
                'h2',
                'h3',
                'h4',
                'h5',
                'h6',
                'blockquote',
            ],
            ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
            ALLOW_DATA_ATTR: false,
        });
    } catch (error) {
        console.error('Markdown parsing error:', error);
        return markdown || '';
    }
};
</script>
