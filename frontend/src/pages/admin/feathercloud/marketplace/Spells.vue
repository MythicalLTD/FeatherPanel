<template>
    <DashboardLayout
        :breadcrumbs="[
            { text: 'Marketplace', href: '/admin/feathercloud/marketplace' },
            { text: 'Spells', isCurrent: true, href: '/admin/feathercloud/spells' },
        ]"
    >
        <div class="min-h-screen bg-background">
            <div class="p-4 sm:p-6">
                <!-- Header -->
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div>
                        <h1 class="text-2xl sm:text-3xl font-bold text-foreground mb-1">Spells Marketplace</h1>
                        <p class="text-sm sm:text-base text-muted-foreground">
                            Browse and install spells from the online repository
                        </p>
                    </div>
                    <div class="flex items-center gap-2">
                        <Button variant="outline" size="sm" @click="router.push('/admin/feathercloud/marketplace')">
                            <ArrowLeft class="h-4 w-4 mr-2" />
                            Back to Marketplace
                        </Button>
                    </div>
                </div>

                <!-- Banner -->
                <div v-if="banner" class="mb-4">
                    <div
                        class="rounded-md border p-3 flex items-start gap-2"
                        :class="{
                            'border-green-500/30 bg-green-500/10 text-green-700': banner.type === 'success',
                            'border-yellow-500/30 bg-yellow-500/10 text-yellow-700': banner.type === 'warning',
                            'border-red-500/30 bg-red-500/10 text-red-700': banner.type === 'error',
                            'border-blue-500/30 bg-blue-500/10 text-blue-700': banner.type === 'info',
                        }"
                    >
                        <span class="text-sm">{{ banner.text }}</span>
                        <button class="ml-auto text-xs underline" @click="banner = null">Dismiss</button>
                    </div>
                </div>

                <!-- Publish Banner -->
                <div v-if="showOnlinePublishBanner" class="mb-4">
                    <div
                        class="rounded-xl p-5 bg-linear-to-r from-indigo-600 via-purple-600 to-fuchsia-600 text-white shadow relative"
                    >
                        <button
                            class="absolute top-3 right-3 text-white/80 hover:text-white text-xs underline"
                            @click="dismissSpellsOnlineBanner"
                        >
                            Dismiss
                        </button>
                        <div class="flex flex-col gap-4">
                            <div class="flex items-start gap-3">
                                <div class="mt-0.5">
                                    <Sparkles class="h-6 w-6" />
                                </div>
                                <div>
                                    <div class="text-lg font-semibold leading-snug">Have some spells to share?</div>
                                    <p class="text-white/90 text-sm mt-1">
                                        Publish your creations to the community. Download your spell and head over to
                                        our cloud platform. Our team aims to review and publish within 48 hours.
                                    </p>
                                    <div class="flex flex-wrap items-center gap-2 mt-3">
                                        <span
                                            class="text-[11px] uppercase tracking-wide bg-white/15 text-white rounded px-2 py-1"
                                            >48h review</span
                                        >
                                        <span
                                            class="text-[11px] uppercase tracking-wide bg-white/15 text-white rounded px-2 py-1"
                                            >Community powered</span
                                        >
                                        <span
                                            class="text-[11px] uppercase tracking-wide bg-white/15 text-white rounded px-2 py-1"
                                            >Safety checks</span
                                        >
                                    </div>
                                </div>
                            </div>
                            <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                                <div class="text-xs text-white/80">
                                    Tip: Include description, tags, and a banner for better visibility.
                                </div>
                                <div class="flex items-center gap-2">
                                    <Button
                                        as="a"
                                        href="https://cloud.mythical.systems"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        size="sm"
                                        class="bg-white text-indigo-700 hover:bg-white/90"
                                    >
                                        Publish New Spell
                                        <ArrowRight class="h-4 w-4 ml-2" />
                                    </Button>
                                    <Button
                                        as="a"
                                        href="https://cloud.mythical.systems"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        size="sm"
                                        variant="secondary"
                                        class="bg-white/15 hover:bg-white/20 text-white"
                                    >
                                        Learn more
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Search and Filters -->
                <div class="mb-4 space-y-3">
                    <div class="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div class="relative flex-1 sm:flex-none">
                            <Input
                                v-model="onlineSearch"
                                placeholder="Search online spells..."
                                class="pr-10 w-full sm:w-64"
                                @keyup.enter="submitOnlineSearch"
                            />
                            <button
                                class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                                @click="submitOnlineSearch"
                            >
                                <CloudDownload class="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    <div v-if="onlinePagination" class="text-xs text-muted-foreground">
                        Page {{ currentOnlinePage }} / {{ onlinePagination.total_pages }} •
                        {{ onlinePagination.total_records }} results
                    </div>
                </div>

                <!-- Loading State -->
                <div v-if="onlineLoading" class="flex items-center justify-center py-8">
                    <div class="flex items-center gap-3">
                        <div
                            class="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"
                        ></div>
                        <span class="text-muted-foreground">Loading online spells...</span>
                    </div>
                </div>

                <!-- Error State -->
                <div v-else-if="onlineError" class="text-center py-8">
                    <AlertCircle class="h-8 w-8 mx-auto mb-2 text-destructive" />
                    <p class="text-destructive">{{ onlineError }}</p>
                    <Button size="sm" variant="outline" class="mt-2" @click="fetchOnlineSpells()">Try Again</Button>
                </div>

                <!-- Spells Grid -->
                <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card v-for="spell in onlineSpells" :key="spell.identifier" class="hover:shadow-lg transition-all">
                        <CardContent>
                            <div class="p-4">
                                <div class="flex items-start justify-between gap-3 mb-3">
                                    <div class="flex items-center gap-3">
                                        <div
                                            class="h-12 w-12 rounded-lg bg-linear-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden shrink-0 border border-primary/10"
                                        >
                                            <img
                                                v-if="spell.icon"
                                                :src="spell.icon"
                                                :alt="spell.name"
                                                class="h-8 w-8 object-contain"
                                            />
                                            <Settings v-else class="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <div class="min-w-0 flex-1">
                                            <h3 class="font-semibold text-base truncate mb-0.5">{{ spell.name }}</h3>
                                            <p class="text-xs text-muted-foreground truncate mb-1">
                                                {{ spell.identifier }}
                                            </p>
                                            <div class="flex items-center gap-1.5 flex-wrap">
                                                <Badge
                                                    v-if="spell.latest_version?.version"
                                                    variant="secondary"
                                                    class="text-xs"
                                                >
                                                    v{{ spell.latest_version.version }}
                                                </Badge>
                                                <Badge
                                                    v-if="spell.verified"
                                                    variant="secondary"
                                                    class="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700"
                                                >
                                                    ✓ Verified
                                                </Badge>
                                                <Badge
                                                    v-else
                                                    variant="outline"
                                                    class="text-xs border-yellow-500/50 text-yellow-700 dark:text-yellow-500"
                                                >
                                                    Unverified
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Description -->
                                <p class="text-sm text-muted-foreground mb-3 line-clamp-3">
                                    {{ spell.description || 'No description available' }}
                                </p>

                                <!-- Warning for unverified -->
                                <div
                                    v-if="!spell.verified"
                                    class="mb-3 text-xs text-yellow-700 dark:text-yellow-600 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 rounded-md p-2"
                                >
                                    ⚠️ Unverified spell - review source before installing
                                </div>

                                <!-- Metadata -->
                                <div class="space-y-2 mb-3">
                                    <div v-if="spell.author" class="flex items-center gap-2 text-sm">
                                        <User class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <span class="truncate text-muted-foreground">{{ spell.author }}</span>
                                    </div>

                                    <!-- Tags -->
                                    <div v-if="spell.tags && spell.tags.length > 0" class="flex flex-wrap gap-1">
                                        <Badge
                                            v-for="tag in spell.tags.slice(0, 3)"
                                            :key="tag"
                                            variant="outline"
                                            class="text-xs"
                                        >
                                            #{{ tag }}
                                        </Badge>
                                        <Badge v-if="spell.tags.length > 3" variant="outline" class="text-xs">
                                            +{{ spell.tags.length - 3 }}
                                        </Badge>
                                    </div>

                                    <!-- Stats -->
                                    <div class="flex items-center justify-between text-xs text-muted-foreground">
                                        <span v-if="spell.downloads">
                                            <CloudDownload class="h-3 w-3 inline mr-1" />{{ spell.downloads }} downloads
                                        </span>
                                        <a
                                            v-if="spell.website"
                                            :href="spell.website"
                                            target="_blank"
                                            class="text-primary hover:underline flex items-center gap-1"
                                        >
                                            <Globe class="h-3 w-3" />
                                            Website
                                        </a>
                                    </div>
                                </div>

                                <!-- Actions -->
                                <div class="mt-auto pt-3 border-t border-border/50">
                                    <div class="flex gap-2">
                                        <template v-if="installedSpellIds.has(spell.identifier)">
                                            <Button size="sm" variant="outline" class="flex-1" disabled>
                                                Installed
                                            </Button>
                                        </template>
                                        <template v-else>
                                            <Button
                                                size="sm"
                                                class="flex-1 hover:scale-105 hover:shadow-md transition-all duration-200"
                                                :disabled="installingOnlineId === spell.identifier"
                                                :title="
                                                    installingOnlineId === spell.identifier
                                                        ? 'Installing...'
                                                        : 'Install spell'
                                                "
                                                @click="openOnlineInstallDialog(spell)"
                                            >
                                                <div
                                                    v-if="installingOnlineId === spell.identifier"
                                                    class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
                                                ></div>
                                                {{
                                                    installingOnlineId === spell.identifier
                                                        ? 'Installing...'
                                                        : 'Install'
                                                }}
                                            </Button>
                                        </template>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Pagination -->
                <div
                    v-if="onlinePagination && onlinePagination.total_pages > 1 && onlineSpells.length > 0"
                    class="mt-6 flex justify-center"
                >
                    <div class="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            :disabled="currentOnlinePage === 1 || onlineLoading"
                            @click="changeOnlinePage(currentOnlinePage - 1)"
                        >
                            <ChevronLeft class="h-4 w-4 mr-1" />
                            Previous
                        </Button>
                        <template
                            v-for="(page, index) in getVisibleOnlinePages()"
                            :key="`online-page-${page}-${index}`"
                        >
                            <span
                                v-if="typeof page === 'string'"
                                class="px-2 text-sm text-muted-foreground select-none"
                            >
                                &hellip;
                            </span>
                            <Button
                                v-else
                                size="sm"
                                :variant="page === currentOnlinePage ? 'default' : 'outline'"
                                :disabled="page === currentOnlinePage"
                                @click="changeOnlinePage(page)"
                            >
                                {{ page }}
                            </Button>
                        </template>
                        <Button
                            variant="outline"
                            size="sm"
                            :disabled="
                                !onlinePagination || currentOnlinePage === onlinePagination.total_pages || onlineLoading
                            "
                            @click="changeOnlinePage(currentOnlinePage + 1)"
                        >
                            Next
                            <ChevronRight class="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>

                <!-- Help Cards -->
                <div class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                        <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                            <Globe class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <div class="font-semibold text-foreground mb-1">Online Repository</div>
                                <p>
                                    Browse community-created spells from our online repository. Install directly from
                                    this page with a single click.
                                </p>
                            </div>
                        </div>
                    </Card>
                    <Card>
                        <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                            <CloudDownload class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <div class="font-semibold text-foreground mb-1">Install Spells</div>
                                <p>
                                    Select a realm and install spells with one click. Verified spells are marked with a
                                    checkmark for your safety.
                                </p>
                            </div>
                        </div>
                    </Card>
                    <Card class="md:col-span-2 lg:col-span-1">
                        <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                            <AlertCircle class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                                <div class="font-semibold text-foreground mb-1">Security & Liability</div>
                                <p>
                                    Installing third‑party spells can be risky. FeatherPanel and its team are not liable
                                    for what you install.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>

        <!-- Confirm Online Install Dialog -->
        <Dialog v-model:open="confirmOnlineOpen">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Install Spell</DialogTitle>
                    <DialogDescription>
                        {{ selectedSpellForInstall?.name }} ({{ selectedSpellForInstall?.identifier }})
                    </DialogDescription>
                </DialogHeader>
                <div class="space-y-4">
                    <div v-if="selectedSpellForInstall && !selectedSpellForInstall.verified" class="text-sm">
                        <div
                            class="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-yellow-700 dark:text-yellow-600"
                        >
                            <div class="flex items-start gap-2">
                                <AlertCircle class="h-5 w-5 shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold mb-1">Unverified Spell</div>
                                    <p>
                                        This spell is not verified. Installing unverified spells can be unsafe. Please
                                        review the source code before installing.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label for="install-realm" class="block mb-2 text-sm font-medium">Select Realm *</label>
                        <Select
                            v-model="selectedRealmForInstall"
                            :disabled="installingOnlineId === selectedSpellForInstall?.identifier"
                        >
                            <SelectTrigger id="install-realm">
                                <SelectValue placeholder="Choose a realm..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem v-for="realm in realms" :key="realm.id" :value="String(realm.id)">
                                    {{ realm.name }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p class="text-xs text-muted-foreground mt-1">
                            Select the realm where this spell will be installed.
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose as-child>
                        <Button
                            variant="outline"
                            :disabled="installingOnlineId === selectedSpellForInstall?.identifier"
                        >
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        :disabled="
                            installingOnlineId === selectedSpellForInstall?.identifier ||
                            !selectedRealmForInstall ||
                            realms.length === 0
                        "
                        @click="proceedOnlineInstall"
                    >
                        <div
                            v-if="installingOnlineId === selectedSpellForInstall?.identifier"
                            class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
                        ></div>
                        Install
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
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
import { useRoute, useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import {
    CloudDownload,
    Settings,
    AlertCircle,
    Sparkles,
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    User,
    Globe,
    ArrowLeft,
} from 'lucide-vue-next';
import axios from 'axios';
import { useToast } from 'vue-toastification';

const toast = useToast();
const route = useRoute();
const router = useRouter();

type OnlineSpell = {
    id: number;
    identifier: string;
    name: string;
    description?: string;
    icon?: string | null;
    website?: string | null;
    author?: string | null;
    tags: string[];
    verified: boolean;
    downloads: number;
    latest_version: {
        version?: string | null;
        download_url?: string | null;
        file_size?: number | null;
        created_at?: string | null;
    };
};

type OnlinePagination = {
    current_page: number;
    total_pages: number;
    total_records: number;
};

type OnlinePaginationItem = number | 'ellipsis-left' | 'ellipsis-right';

type Realm = {
    id: number;
    name: string;
    description?: string;
};

type Spell = {
    id: number;
    name: string;
    identifier?: string;
};

const banner = ref<{ type: 'success' | 'warning' | 'error' | 'info'; text: string } | null>(null);
const showOnlinePublishBanner = ref(true);
const onlineSpells = ref<OnlineSpell[]>([]);
const onlineLoading = ref(false);
const onlineError = ref<string | null>(null);
const installingOnlineId = ref<string | null>(null);
const onlinePagination = ref<OnlinePagination | null>(null);
const currentOnlinePage = ref(1);
const ONLINE_SPELLS_PER_PAGE = 20;
const onlineSearch = ref('');
const confirmOnlineOpen = ref(false);
const selectedSpellForInstall = ref<OnlineSpell | null>(null);
const selectedRealmForInstall = ref<string>('');
const realms = ref<Realm[]>([]);
const currentRealm = ref<Realm | null>(null);
const spells = ref<Spell[]>([]);

const installedSpellIds = computed<Set<string>>(() => {
    // Check by identifier first, then fallback to name
    const ids = new Set<string>();
    spells.value.forEach((s) => {
        if (s.identifier) {
            ids.add(s.identifier);
        } else if (s.name) {
            ids.add(s.name);
        }
    });
    return ids;
});

function isOnlinePagination(value: unknown): value is OnlinePagination {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const record = value as Record<string, unknown>;

    return (
        typeof record.current_page === 'number' &&
        typeof record.total_pages === 'number' &&
        typeof record.total_records === 'number'
    );
}

async function fetchOnlineSpells(page = currentOnlinePage.value) {
    onlineLoading.value = true;
    onlineError.value = null;

    const params = new URLSearchParams({
        page: String(page),
        per_page: String(ONLINE_SPELLS_PER_PAGE),
    });

    if (onlineSearch.value) {
        params.set('q', onlineSearch.value);
    }

    try {
        const { data } = await axios.get(`/api/admin/spells/online/list?${params.toString()}`);
        onlineSpells.value = Array.isArray(data.data?.spells) ? (data.data.spells as OnlineSpell[]) : [];
        const paginationData = data.data?.pagination;

        if (isOnlinePagination(paginationData)) {
            onlinePagination.value = paginationData;
            currentOnlinePage.value = paginationData.current_page;
        } else {
            onlinePagination.value = null;
            currentOnlinePage.value = page;
        }
    } catch (e) {
        onlineError.value = e instanceof Error ? e.message : 'Failed to load online spells';
    } finally {
        onlineLoading.value = false;
    }
}

function getVisibleOnlinePages(): OnlinePaginationItem[] {
    const paginationState = onlinePagination.value;

    if (!paginationState) {
        return [];
    }

    const totalPages = paginationState.total_pages;
    const currentPage = currentOnlinePage.value;

    if (totalPages <= 5) {
        return Array.from({ length: totalPages }, (_, index) => (index + 1) as OnlinePaginationItem);
    }

    const pages = new Set<number>();
    pages.add(1);
    pages.add(totalPages);
    pages.add(currentPage);

    if (currentPage > 1) {
        pages.add(currentPage - 1);
    }

    if (currentPage < totalPages) {
        pages.add(currentPage + 1);
    }

    if (currentPage <= 3) {
        for (let pageNumber = 2; pageNumber <= Math.min(4, totalPages - 1); pageNumber += 1) {
            pages.add(pageNumber);
        }
    } else if (currentPage >= totalPages - 2) {
        for (let pageNumber = Math.max(totalPages - 3, 2); pageNumber <= totalPages - 1; pageNumber += 1) {
            pages.add(pageNumber);
        }
    }

    const sortedPages = Array.from(pages)
        .filter((pageNumber) => pageNumber >= 1 && pageNumber <= totalPages)
        .sort((a, b) => a - b);

    const visible: OnlinePaginationItem[] = [];
    let hasLeftEllipsis = false;
    let hasRightEllipsis = false;
    let previousNumber: number | null = null;

    for (const pageNumber of sortedPages) {
        if (previousNumber !== null && pageNumber - previousNumber > 1) {
            if (pageNumber > currentPage) {
                if (!hasRightEllipsis) {
                    visible.push('ellipsis-right');
                    hasRightEllipsis = true;
                }
            } else if (!hasLeftEllipsis) {
                visible.push('ellipsis-left');
                hasLeftEllipsis = true;
            }
        }

        visible.push(pageNumber as OnlinePaginationItem);
        previousNumber = pageNumber;
    }

    return visible;
}

function changeOnlinePage(page: number) {
    if (onlineLoading.value) {
        return;
    }

    const paginationState = onlinePagination.value;
    const totalPages = paginationState?.total_pages ?? page;

    if (page < 1 || page > totalPages || page === currentOnlinePage.value) {
        return;
    }

    fetchOnlineSpells(page);
}

const submitOnlineSearch = () => {
    currentOnlinePage.value = 1;
    fetchOnlineSpells(1);
};

const dismissSpellsOnlineBanner = () => {
    showOnlinePublishBanner.value = false;
    localStorage.setItem('featherpanel_spells_online_banner_dismissed', 'true');
};

async function fetchRealms() {
    try {
        const { data } = await axios.get('/api/admin/realms');
        realms.value = data.data.realms || [];
    } catch (e: unknown) {
        console.error('Failed to fetch realms:', e);
    }
}

async function fetchCurrentRealm() {
    const realmId = route.query.realm_id;
    if (realmId) {
        try {
            const { data } = await axios.get(`/api/admin/realms/${realmId}`);
            currentRealm.value = data.data.realm;
        } catch (e: unknown) {
            console.error('Failed to fetch current realm:', e);
        }
    }
}

async function fetchSpells() {
    try {
        const { data } = await axios.get('/api/admin/spells', {
            params: {
                limit: 1000, // Get all for checking installed status
            },
        });
        spells.value = data.data.spells || [];
    } catch (e: unknown) {
        console.error('Failed to fetch spells:', e);
    }
}

const openOnlineInstallDialog = (spell: OnlineSpell) => {
    selectedSpellForInstall.value = spell;
    // Pre-select current realm if available, otherwise clear selection
    selectedRealmForInstall.value = currentRealm.value ? String(currentRealm.value.id) : '';
    confirmOnlineOpen.value = true;
};

const proceedOnlineInstall = async () => {
    if (!selectedSpellForInstall.value || !selectedRealmForInstall.value) {
        toast.error('Please select a realm before installing');
        return;
    }

    const realmId = parseInt(selectedRealmForInstall.value, 10);
    if (isNaN(realmId)) {
        toast.error('Invalid realm selected');
        return;
    }

    await onlineInstall(selectedSpellForInstall.value.identifier, realmId);
    confirmOnlineOpen.value = false;
    selectedSpellForInstall.value = null;
    selectedRealmForInstall.value = '';
};

const onlineInstall = async (identifier: string, realmId: number) => {
    installingOnlineId.value = identifier;
    try {
        await axios.post('/api/admin/spells/online/install', {
            identifier,
            realm_id: realmId,
        });
        await fetchSpells();
        toast.success(`Installed ${identifier}`);
        banner.value = { type: 'success', text: `Spell ${identifier} installed successfully` };
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Install failed';
        toast.error(errorMessage);
        banner.value = { type: 'error', text: errorMessage };
    } finally {
        installingOnlineId.value = null;
    }
};

onMounted(async () => {
    const dismissed = localStorage.getItem('featherpanel_spells_online_banner_dismissed');
    showOnlinePublishBanner.value = dismissed !== 'true';
    await fetchRealms();
    await fetchCurrentRealm();
    await fetchSpells();
    await fetchOnlineSpells();
});
</script>

<style scoped>
.line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>
