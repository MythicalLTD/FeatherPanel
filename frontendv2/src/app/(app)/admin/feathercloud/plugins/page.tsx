/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { useFeatherCloud, type CreditsData, type TeamData } from '@/hooks/useFeatherCloud';
import { useChromeLayout } from '@/hooks/useChromeLayout';
import axios from 'axios';
import { toast } from 'sonner';
import {
    Puzzle,
    CloudDownload,
    BadgeCheck,
    RefreshCw,
    AlertCircle,
    Info,
    Key,
    Coins,
    Users,
    ArrowLeft,
    Globe,
    X,
    BadgeCheck as CheckIcon,
    Search,
    Lock,
    Package,
    Crown,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Layers,
    ExternalLink,
    FlaskConical,
} from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { ResourceCard, type ResourceBadge } from '@/components/featherui/ResourceCard';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageCard } from '@/components/featherui/PageCard';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select-native';
import { cn } from '@/lib/utils';
import { collectOwnedCloudPackageIds, isCloudPackageOwned } from '@/lib/cloudPackageMatch';
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface OnlineAddon {
    identifier: string;
    name: string;
    description?: string;
    icon?: string | null;
    website?: string | null;
    author?: string | null;
    tags: string[];
    verified: boolean;
    downloads: number;
    premium: number;
    premium_price?: string;
    premium_link?: string;
    store_slug?: string | null;
    latest_version?: {
        version: string;
        download_url: string;
        file_size?: number;
        changelog?: string;
        dependencies?: string[];
        created_at?: string;
    };
}

interface OnlinePagination {
    current_page: number;
    total_pages: number;
    total_records: number;
    has_next?: boolean;
    has_prev?: boolean;
}

interface DependencyCheck {
    dependency: string;
    type: 'composer' | 'plugin' | 'php' | 'php-ext' | 'unknown';
    name: string;
    met: boolean;
    message: string;
}

interface RequirementsCheckResult {
    can_install: boolean;
    already_installed: boolean;
    update_available: boolean;
    installed_version: string | null;
    latest_version: string | null;
    package: {
        identifier: string;
        name: string;
        description: string | null;
        version: string | null;
        author: string | null;
        verified: boolean;
        premium: number;
    };
    dependencies: {
        checks: DependencyCheck[];
        all_met: boolean;
    };
    panel_version: {
        ok: boolean;
        message: string | null;
        min: string | null;
        max: string | null;
    };
}

const addonOwnershipOptions = (addon: Pick<OnlineAddon, 'identifier' | 'premium_link' | 'store_slug' | 'name'>) => ({
    premiumLink: addon.premium_link,
    storeSlug: addon.store_slug,
    displayName: addon.name,
});

/** Any of these in the search box + Enter toggles UI preview mode. */
const PLUGIN_UI_PREVIEW_SECRETS = ['testpluginuinow', 'testingpluginui'] as const;

function pluginSearchHasPreviewSecret(raw: string): boolean {
    return PLUGIN_UI_PREVIEW_SECRETS.some((s) => raw.includes(s));
}

function stripPluginPreviewSecrets(raw: string): string {
    let out = raw;
    for (const s of PLUGIN_UI_PREVIEW_SECRETS) {
        out = out.split(s).join('');
    }
    return out.replace(/\s{2,}/g, ' ').trim();
}

const PLUGIN_UI_PREVIEW_MOCK_ADDONS: OnlineAddon[] = [
    {
        identifier: 'billingcore',
        name: 'Billing Core (preview)',
        description:
            'Mock dependency base. Add this to your download list, then open Billing Resources to see the queue-aware requirement check.',
        icon: null,
        website: null,
        author: 'UI Preview',
        tags: ['billing', 'mock'],
        verified: true,
        downloads: 2400,
        premium: 0,
        latest_version: {
            version: '2.1.0',
            download_url: '/packages/billingcore/download/2.1.0',
            dependencies: [],
        },
    },
    {
        identifier: 'billingresources',
        name: 'Billing Resources (preview)',
        description:
            'Mock addon that depends on Billing Core. Used to exercise the requirements dialog and download list.',
        icon: null,
        website: null,
        author: 'UI Preview',
        tags: ['billing', 'mock'],
        verified: true,
        downloads: 980,
        premium: 0,
        latest_version: {
            version: '1.4.2',
            download_url: '/packages/billingresources/download/1.4.2',
            dependencies: ['plugin=billingcore'],
        },
    },
    {
        identifier: 'premiumstorepreview',
        name: 'Premium Store Card (preview)',
        description:
            'Premium mock: with FeatherCloud linked you can add to the list; without cloud, only the official store link is shown.',
        icon: null,
        website: 'https://example.com',
        author: 'UI Preview',
        tags: ['premium', 'mock'],
        verified: true,
        downloads: 3,
        premium: 1,
        premium_price: '5.00',
        premium_link: 'https://example.com/purchase/premiumstorepreview',
        latest_version: {
            version: '1.0.0',
            download_url: '/packages/premiumstorepreview/download/1.0.0',
            dependencies: [],
        },
    },
    {
        identifier: 'simplefreepreview',
        name: 'Simple Free Plugin (preview)',
        description: 'Plain list row with no premium link or extra dependencies.',
        icon: null,
        website: null,
        author: 'UI Preview',
        tags: ['free', 'mock'],
        verified: false,
        downloads: 42,
        premium: 0,
        latest_version: {
            version: '0.9.1',
            download_url: '/packages/simplefreepreview/download/0.9.1',
            dependencies: [],
        },
    },
];

function buildMockRequirementsSampleDialog(): RequirementsCheckResult {
    return {
        can_install: false,
        already_installed: false,
        update_available: false,
        installed_version: null,
        latest_version: '1.0.0',
        package: {
            identifier: 'billingreferrals',
            name: 'Billing Referrals (sample)',
            description: null,
            version: '1.0.0',
            author: 'UI Preview',
            verified: true,
            premium: 0,
        },
        dependencies: {
            checks: [
                {
                    dependency: 'plugin=billingcore',
                    type: 'plugin',
                    name: 'billingcore',
                    met: false,
                    message: 'Plugin required: billingcore',
                },
                {
                    dependency: 'php=8.1',
                    type: 'php',
                    name: '8.1',
                    met: true,
                    message: 'PHP version requirement met',
                },
            ],
            all_met: false,
        },
        panel_version: {
            ok: true,
            message: null,
            min: '1.0.0',
            max: '3.0.0',
        },
    };
}

export default function PluginsPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const { fetchCredits, fetchTeam } = useFeatherCloud();

    const [cloudAccountConfigured, setCloudAccountConfigured] = useState(false);
    const [cloudCredits, setCloudCredits] = useState<CreditsData | null>(null);
    const [cloudTeam, setCloudTeam] = useState<TeamData | null>(null);

    const [onlineAddons, setOnlineAddons] = useState<OnlineAddon[]>([]);
    const [onlineLoading, setOnlineLoading] = useState(false);
    const [onlineError, setOnlineError] = useState<string | null>(null);
    const [onlinePagination, setOnlinePagination] = useState<OnlinePagination | null>(null);
    const [currentOnlinePage, setCurrentOnlinePage] = useState(1);
    const [onlineSearch, setOnlineSearch] = useState('');
    const [verifiedOnly, setVerifiedOnly] = useState(false);
    const [sortBy, setSortBy] = useState('newest');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    const [packageDetailsOpen, setPackageDetailsOpen] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState<OnlineAddon | null>(null);
    const [packageDetailsLoading, setPackageDetailsLoading] = useState(false);
    const [popularAddons, setPopularAddons] = useState<OnlineAddon[]>([]);

    const [installedPluginIds, setInstalledPluginIds] = useState<string[]>([]);
    const [installingOnlineId, setInstallingOnlineId] = useState<string | null>(null);
    const [selectedPluginIds, setSelectedPluginIds] = useState<string[]>([]);
    const [queuedPlugins, setQueuedPlugins] = useState<Record<string, string>>({});
    const [bulkInstalling, setBulkInstalling] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    // Dependency check state
    const [requirementsDialogOpen, setRequirementsDialogOpen] = useState(false);
    const [requirementsCheck, setRequirementsCheck] = useState<RequirementsCheckResult | null>(null);
    const [, setCheckingRequirements] = useState(false);
    const [pendingInstallId, setPendingInstallId] = useState<string | null>(null);
    const [uiPreviewMode, setUiPreviewMode] = useState(false);
    const [ownedCloudPackageIds, setOwnedCloudPackageIds] = useState<string[]>([]);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [portalReady, setPortalReady] = useState(false);

    const onlineAddonsRef = useRef(onlineAddons);
    const popularAddonsRef = useRef(popularAddons);
    const ownedCloudPackageIdsRef = useRef(ownedCloudPackageIds);
    onlineAddonsRef.current = onlineAddons;
    popularAddonsRef.current = popularAddons;
    ownedCloudPackageIdsRef.current = ownedCloudPackageIds;

    const { chromeLayout } = useChromeLayout();

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-feathercloud-plugins');

    const fetchOwnedCloudPackageIds = useCallback(async () => {
        const ids = new Set<string>();
        let page = 1;
        const limit = 100;
        try {
            for (;;) {
                const res = await axios.get('/api/admin/cloud/data/products', { params: { page, limit } });
                const data = res.data?.data;
                const purchases = Array.isArray(data?.purchases) ? data.purchases : [];
                for (const p of purchases) {
                    collectOwnedCloudPackageIds(p).forEach((id) => ids.add(id));
                }
                if (purchases.length < limit) {
                    break;
                }
                const total = typeof data?.pagination?.total === 'number' ? data.pagination.total : 0;
                if (total > 0 && page * limit >= total) {
                    break;
                }
                page += 1;
                if (page > 100) {
                    break;
                }
            }
            setOwnedCloudPackageIds([...ids]);
        } catch {
            setOwnedCloudPackageIds([]);
        }
    }, []);

    const fetchCloudData = useCallback(async () => {
        try {
            const credsResponse = await axios.get('/api/admin/cloud/credentials');
            const hasKeys = !!credsResponse.data?.data?.cloud_credentials?.public_key;
            setCloudAccountConfigured(hasKeys);

            if (hasKeys) {
                const credits = await fetchCredits();
                const team = await fetchTeam();
                setCloudCredits(credits);
                setCloudTeam(team);
                await fetchOwnedCloudPackageIds();
            } else {
                setCloudCredits(null);
                setCloudTeam(null);
                setOwnedCloudPackageIds([]);
            }
        } catch (error) {
            console.error('Failed to fetch cloud credentials:', error);
        }
    }, [fetchCredits, fetchTeam, fetchOwnedCloudPackageIds]);

    useEffect(() => {
        setPortalReady(true);
    }, []);

    useEffect(() => {
        const read = () => {
            try {
                setSidebarCollapsed(localStorage.getItem('featherpanel_sidebar_collapsed') === 'true');
            } catch {
                setSidebarCollapsed(false);
            }
        };
        read();
        window.addEventListener('toggle-sidebar', read as EventListener);
        const onStorage = (e: StorageEvent) => {
            if (e.key === 'featherpanel_sidebar_collapsed') {
                read();
            }
        };
        window.addEventListener('storage', onStorage);
        return () => {
            window.removeEventListener('toggle-sidebar', read as EventListener);
            window.removeEventListener('storage', onStorage);
        };
    }, []);

    const fetchInstalledPlugins = useCallback(async () => {
        try {
            const response = await axios.get('/api/admin/plugins');
            const plugins = response.data?.data?.plugins || {};
            setInstalledPluginIds(Object.keys(plugins));
        } catch (error) {
            console.error('Failed to fetch installed plugins:', error);
        }
    }, []);

    const fetchPopularAddons = useCallback(async () => {
        try {
            const response = await axios.get('/api/admin/plugins/online/popular');
            setPopularAddons(response.data?.data?.addons || []);
        } catch (error) {
            console.error('Failed to fetch popular addons:', error);
        }
    }, []);

    const fetchOnlineAddons = useCallback(
        async (page: number, mode: 'replace' | 'append' = 'replace') => {
            if (uiPreviewMode) {
                return;
            }
            if (mode === 'append') {
                setLoadingMore(true);
            } else {
                setOnlineLoading(true);
            }
            setOnlineError(null);

            const params = new URLSearchParams({
                page: String(page),
                per_page: '21',
                sort_by: sortBy,
                sort_order: 'DESC',
            });

            if (onlineSearch) {
                const safeQuery = stripPluginPreviewSecrets(onlineSearch);
                if (safeQuery) {
                    params.set('q', safeQuery);
                }
            }
            if (verifiedOnly) params.set('verified', '1');
            if (selectedTag) params.set('tag', selectedTag);

            try {
                const response = await axios.get(`/api/admin/plugins/online/list?${params.toString()}`);
                const addons: OnlineAddon[] = response.data?.data?.addons || [];
                const pagination = response.data?.data?.pagination || null;

                if (mode === 'append') {
                    setOnlineAddons((prev) => {
                        const seen = new Set(prev.map((a) => a.identifier));
                        const merged = [...prev];
                        for (const a of addons) {
                            if (!seen.has(a.identifier)) {
                                seen.add(a.identifier);
                                merged.push(a);
                            }
                        }
                        return merged;
                    });
                } else {
                    setOnlineAddons(addons);
                }
                setOnlinePagination(pagination);
                setCurrentOnlinePage(page);
            } catch (err: unknown) {
                const e = err as { response?: { data?: { message?: string } } };
                setOnlineError(e?.response?.data?.message || t('admin.marketplace.plugins.loading_error'));
            } finally {
                if (mode === 'append') {
                    setLoadingMore(false);
                } else {
                    setOnlineLoading(false);
                }
            }
        },
        [onlineSearch, verifiedOnly, sortBy, selectedTag, t, uiPreviewMode],
    );

    const buildPreviewRequirementsCheck = useCallback(
        (identifier: string): RequirementsCheckResult => {
            const pending = selectedPluginIds;
            const installed = installedPluginIds;
            const coreMet = installed.includes('billingcore') || pending.includes('billingcore');

            if (identifier === 'billingresources') {
                const checks: DependencyCheck[] = [
                    {
                        dependency: 'plugin=billingcore',
                        type: 'plugin',
                        name: 'billingcore',
                        met: coreMet,
                        message: coreMet
                            ? pending.includes('billingcore') && !installed.includes('billingcore')
                                ? 'Queued in your download list (will be installed in the same session)'
                                : 'Plugin installed'
                            : 'Plugin required: billingcore',
                    },
                ];
                const allMet = checks.every((c) => c.met);
                return {
                    can_install: allMet,
                    already_installed: installed.includes(identifier),
                    update_available: false,
                    installed_version: installed.includes(identifier) ? '1.0.0' : null,
                    latest_version: '1.4.2',
                    package: {
                        identifier,
                        name: 'Billing Resources (preview)',
                        description: null,
                        version: '1.4.2',
                        author: 'UI Preview',
                        verified: true,
                        premium: 0,
                    },
                    dependencies: { checks, all_met: allMet },
                    panel_version: {
                        ok: true,
                        message: null,
                        min: '1.0.0',
                        max: '3.0.0',
                    },
                };
            }

            return {
                can_install: !installed.includes(identifier),
                already_installed: installed.includes(identifier),
                update_available: false,
                installed_version: installed.includes(identifier) ? '1.0.0' : null,
                latest_version: '1.0.0',
                package: {
                    identifier,
                    name: PLUGIN_UI_PREVIEW_MOCK_ADDONS.find((a) => a.identifier === identifier)?.name ?? identifier,
                    description: null,
                    version: '1.0.0',
                    author: 'UI Preview',
                    verified: true,
                    premium: 0,
                },
                dependencies: {
                    checks: [
                        {
                            dependency: 'php=8.1',
                            type: 'php',
                            name: '8.1',
                            met: true,
                            message: 'PHP version requirement met',
                        },
                    ],
                    all_met: true,
                },
                panel_version: { ok: true, message: null, min: null, max: null },
            };
        },
        [selectedPluginIds, installedPluginIds],
    );

    const tryToggleUiPreviewFromSearch = useCallback((): boolean => {
        if (!pluginSearchHasPreviewSecret(onlineSearch)) {
            return false;
        }
        const next = !uiPreviewMode;
        setUiPreviewMode(next);
        setOnlineSearch((s) => stripPluginPreviewSecrets(s));
        toast.message(
            next
                ? t('admin.marketplace.plugins.ui_preview.preview_on')
                : t('admin.marketplace.plugins.ui_preview.preview_off'),
        );
        if (!next) {
            void fetchInstalledPlugins();
        }
        return true;
    }, [onlineSearch, uiPreviewMode, t, fetchInstalledPlugins]);

    const runSearchOrPreviewToggle = useCallback(() => {
        if (tryToggleUiPreviewFromSearch()) {
            return;
        }
        void fetchOnlineAddons(1, 'replace');
    }, [tryToggleUiPreviewFromSearch, fetchOnlineAddons]);

    useEffect(() => {
        fetchWidgets();
        fetchCloudData();
        fetchPopularAddons();
        fetchInstalledPlugins();
    }, [fetchCloudData, fetchPopularAddons, fetchInstalledPlugins, fetchWidgets]);

    useEffect(() => {
        if (!uiPreviewMode) {
            return;
        }
        setOnlineLoading(false);
        setOnlineError(null);
        setOnlineAddons(PLUGIN_UI_PREVIEW_MOCK_ADDONS);
        setOnlinePagination({
            current_page: 1,
            total_pages: 1,
            total_records: PLUGIN_UI_PREVIEW_MOCK_ADDONS.length,
            has_next: false,
            has_prev: false,
        });
        setPopularAddons(PLUGIN_UI_PREVIEW_MOCK_ADDONS.slice(0, 2));
        setInstalledPluginIds([]);
        setSelectedPluginIds([]);
        setQueuedPlugins({});
    }, [uiPreviewMode]);

    useEffect(() => {
        if (uiPreviewMode) {
            return;
        }
        fetchOnlineAddons(1, 'replace');
    }, [fetchOnlineAddons, uiPreviewMode]);

    const viewPackageDetails = async (addon: OnlineAddon) => {
        if (uiPreviewMode) {
            const found = PLUGIN_UI_PREVIEW_MOCK_ADDONS.find((a) => a.identifier === addon.identifier) || addon;
            setSelectedPackage(found);
            setPackageDetailsOpen(true);
            setPackageDetailsLoading(false);
            return;
        }
        setSelectedPackage(addon);
        setPackageDetailsOpen(true);
        setPackageDetailsLoading(true);
        try {
            await axios.get(`/api/admin/plugins/online/${addon.identifier}`);
        } catch {
            toast.error(t('admin.marketplace.plugins.details.error'));
        } finally {
            setPackageDetailsLoading(false);
        }
    };

    const checkRequirements = async (identifier: string): Promise<RequirementsCheckResult | null> => {
        if (uiPreviewMode) {
            return buildPreviewRequirementsCheck(identifier);
        }
        try {
            const params = new URLSearchParams();
            if (selectedPluginIds.length > 0) {
                params.set('pending_plugins', selectedPluginIds.join(','));
            }
            const qs = params.toString();
            const url = qs
                ? `/api/admin/plugins/online/${encodeURIComponent(identifier)}/check?${qs}`
                : `/api/admin/plugins/online/${encodeURIComponent(identifier)}/check`;
            const response = await axios.get(url);
            return response.data?.data || null;
        } catch (err) {
            console.error('Failed to check requirements:', err);
            return null;
        }
    };

    const handleInstall = async (identifier: string) => {
        // First check requirements
        setCheckingRequirements(true);
        const requirements = await checkRequirements(identifier);
        setCheckingRequirements(false);

        if (!requirements) {
            toast.error(t('admin.marketplace.plugins.requirements_check_failed'));
            return;
        }

        // If dependencies not met or panel version incompatible, show dialog
        if (!requirements.can_install) {
            setRequirementsCheck(requirements);
            setPendingInstallId(identifier);
            setRequirementsDialogOpen(true);
            return;
        }

        // Proceed with installation
        await performInstall(identifier);
    };

    const performInstall = async (identifier: string) => {
        setInstallingOnlineId(identifier);
        setRequirementsDialogOpen(false);
        if (uiPreviewMode) {
            try {
                await new Promise((r) => setTimeout(r, 450));
                toast.success(
                    t('admin.marketplace.plugins.ui_preview.install_simulated', {
                        identifier,
                    }),
                );
            } finally {
                setInstallingOnlineId(null);
                setPendingInstallId(null);
            }
            return;
        }
        try {
            await axios.post('/api/admin/plugins/online/install', {
                identifier,
                queued_identifiers: selectedPluginIds,
            });
            toast.success(
                t('admin.marketplace.plugins.install_success', {
                    identifier,
                }),
            );
            fetchInstalledPlugins();
            setTimeout(() => window.location.reload(), 1500);
        } catch (err: unknown) {
            const e = err as {
                response?: {
                    data?: {
                        message?: string;
                        missing_dependencies?: string[];
                        dependency_details?: DependencyCheck[];
                    };
                    status?: number;
                };
            };

            // Handle 412 Precondition Failed - missing dependencies
            if (e?.response?.status === 412 && e?.response?.data?.missing_dependencies) {
                toast.error(t('admin.marketplace.plugins.missing_dependencies'));
                // Show requirements dialog with missing dependencies
                if (requirementsCheck) {
                    setRequirementsCheck({
                        ...requirementsCheck,
                        can_install: false,
                        dependencies: {
                            checks: e.response.data.dependency_details || [],
                            all_met: false,
                        },
                    });
                    setRequirementsDialogOpen(true);
                }
            } else {
                toast.error(e?.response?.data?.message || t('admin.marketplace.plugins.install_failed'));
            }
        } finally {
            setInstallingOnlineId(null);
            setPendingInstallId(null);
        }
    };

    const handleBulkInstall = async () => {
        if (selectedPluginIds.length === 0) return;

        setBulkInstalling(true);

        // Check requirements for all plugins first
        const pluginsWithIssues: { identifier: string; requirements: RequirementsCheckResult }[] = [];
        const pluginsReady: string[] = [];

        for (const identifier of selectedPluginIds) {
            const requirements = await checkRequirements(identifier);
            if (requirements && !requirements.can_install) {
                pluginsWithIssues.push({ identifier, requirements });
            } else if (requirements && requirements.can_install) {
                pluginsReady.push(identifier);
            }
        }

        // If any plugins have issues, show the first one
        if (pluginsWithIssues.length > 0) {
            setRequirementsCheck(pluginsWithIssues[0].requirements);
            setPendingInstallId(pluginsWithIssues[0].identifier);
            setRequirementsDialogOpen(true);
            setBulkInstalling(false);

            // Show warning about skipped plugins
            if (pluginsWithIssues.length > 1) {
                toast(
                    t('admin.marketplace.plugins.queue.multiple_requirements_issues', {
                        count: String(pluginsWithIssues.length),
                    }),
                    {
                        className:
                            'border border-amber-500/25 bg-card text-foreground shadow-lg [&_[data-description]]:text-muted-foreground',
                    },
                );
            }
            return;
        }

        // Drop premium rows the linked FeatherCloud account does not own (defense in depth)
        const toInstall = pluginsReady.filter((identifier) => {
            const row =
                onlineAddonsRef.current.find((a) => a.identifier === identifier) ??
                popularAddonsRef.current.find((a) => a.identifier === identifier) ??
                (uiPreviewMode ? PLUGIN_UI_PREVIEW_MOCK_ADDONS.find((a) => a.identifier === identifier) : undefined);
            if (!row || row.premium !== 1) {
                return true;
            }
            if (uiPreviewMode && identifier.toLowerCase() === 'premiumstorepreview') {
                return true;
            }
            return isCloudPackageOwned(ownedCloudPackageIdsRef.current, identifier, addonOwnershipOptions(row));
        });
        if (toInstall.length < pluginsReady.length) {
            toast.message(t('admin.marketplace.plugins.queue.premium_skipped_not_owned'));
        }

        // Install all ready plugins
        let successCount = 0;

        if (uiPreviewMode) {
            successCount = toInstall.length;
        } else {
            for (const identifier of toInstall) {
                try {
                    await axios.post('/api/admin/plugins/online/install', {
                        identifier,
                        queued_identifiers: selectedPluginIds,
                    });
                    successCount++;
                } catch (err: unknown) {
                    const e = err as { response?: { data?: { message?: string } } };
                    toast.error(
                        e?.response?.data?.message ||
                            t('admin.marketplace.plugins.queue.install_failed_single', {
                                identifier,
                            }),
                    );
                }
            }
        }

        if (successCount > 0) {
            if (uiPreviewMode) {
                toast.success(
                    t('admin.marketplace.plugins.ui_preview.bulk_simulated', {
                        count: String(successCount),
                    }),
                );
            } else {
                toast.success(
                    successCount === 1
                        ? t('admin.marketplace.plugins.queue.install_success_single')
                        : t('admin.marketplace.plugins.queue.install_success_multiple', {
                              count: String(successCount),
                          }),
                );
                await fetchInstalledPlugins();
                setTimeout(() => window.location.reload(), 1500);
            }
            setSelectedPluginIds([]);
            setQueuedPlugins({});
        } else {
            toast.error(t('admin.marketplace.plugins.queue.install_failed'));
        }

        setBulkInstalling(false);
    };

    const isPremiumOwnedForQueue = useCallback(
        (addon: Pick<OnlineAddon, 'identifier' | 'premium_link' | 'store_slug' | 'name'>) => {
            const id = addon.identifier.toLowerCase();
            if (uiPreviewMode && id === 'premiumstorepreview') {
                return true;
            }
            return isCloudPackageOwned(ownedCloudPackageIdsRef.current, addon.identifier, addonOwnershipOptions(addon));
        },
        [uiPreviewMode],
    );

    const lookupAddonRow = useCallback(
        (identifier: string): OnlineAddon | undefined =>
            onlineAddonsRef.current.find((a) => a.identifier === identifier) ??
            popularAddonsRef.current.find((a) => a.identifier === identifier) ??
            (uiPreviewMode ? PLUGIN_UI_PREVIEW_MOCK_ADDONS.find((a) => a.identifier === identifier) : undefined),
        [uiPreviewMode],
    );

    useEffect(() => {
        if (uiPreviewMode) {
            return;
        }
        const oa = onlineAddonsRef.current;
        const pa = popularAddonsRef.current;
        setSelectedPluginIds((prev) => {
            const next = prev.filter((id) => {
                const row = oa.find((a) => a.identifier === id) ?? pa.find((a) => a.identifier === id);
                if (!row || row.premium !== 1) {
                    return true;
                }
                return isCloudPackageOwned(ownedCloudPackageIds, id, addonOwnershipOptions(row));
            });
            return next.length === prev.length ? prev : next;
        });
    }, [ownedCloudPackageIds, uiPreviewMode]);

    useEffect(() => {
        setQueuedPlugins((q) => {
            const toRemove = Object.keys(q).filter((k) => !selectedPluginIds.includes(k));
            if (toRemove.length === 0) {
                return q;
            }
            const n = { ...q };
            for (const k of toRemove) {
                delete n[k];
            }
            return n;
        });
    }, [selectedPluginIds]);

    const clearTagFilter = () => {
        setSelectedTag(null);
    };

    const toggleSelectPlugin = (identifier: string, name?: string) => {
        setSelectedPluginIds((prev) => {
            if (prev.includes(identifier)) {
                setQueuedPlugins((prevQueue) => {
                    const next = { ...prevQueue };
                    delete next[identifier];
                    return next;
                });
                return prev.filter((id) => id !== identifier);
            }

            const row = lookupAddonRow(identifier);
            if (row?.premium === 1 && !isPremiumOwnedForQueue(row)) {
                toast.error(t('admin.marketplace.plugins.queue.premium_not_owned'));
                return prev;
            }

            setQueuedPlugins((prevQueue) => ({
                ...prevQueue,
                [identifier]: name || identifier,
            }));

            return [...prev, identifier];
        });
    };

    const loadMoreOnlineAddons = useCallback(() => {
        if (uiPreviewMode || loadingMore || onlineLoading) return;
        if (!onlinePagination) return;
        const cur = onlinePagination.current_page ?? currentOnlinePage;
        const totalPages = onlinePagination.total_pages ?? 1;
        const hasMore = onlinePagination.has_next === true || (typeof cur === 'number' && cur < totalPages);
        if (!hasMore) return;
        void fetchOnlineAddons(cur + 1, 'append');
    }, [uiPreviewMode, loadingMore, onlineLoading, onlinePagination, currentOnlinePage, fetchOnlineAddons]);

    const hasMoreToLoad =
        !uiPreviewMode &&
        onlinePagination != null &&
        onlineAddons.length > 0 &&
        (onlinePagination.has_next === true ||
            (onlinePagination.current_page ?? currentOnlinePage) < (onlinePagination.total_pages ?? 1));

    const dockLgLeftClass =
        chromeLayout === 'classic'
            ? sidebarCollapsed
                ? 'lg:left-16'
                : 'lg:left-64'
            : sidebarCollapsed
              ? 'lg:left-14'
              : 'lg:left-56';

    return (
        <div className={cn('space-y-6', selectedPluginIds.length > 0 && 'pb-24 sm:pb-28')}>
            <WidgetRenderer widgets={getWidgets('admin-feathercloud-plugins', 'top-of-page')} />

            <PageHeader
                title={t('admin.marketplace.plugins.title')}
                description={t('admin.marketplace.plugins.subtitle')}
                icon={Puzzle}
                actions={
                    <Button variant='outline' onClick={() => router.push('/admin/feathercloud/marketplace')}>
                        <ArrowLeft className='mr-2 h-4 w-4' />
                        {t('admin.marketplace.plugins.back')}
                    </Button>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-feathercloud-plugins', 'after-header')} />

            {uiPreviewMode && (
                <div className='border-primary/35 from-primary/15 bg-card/95 flex flex-col gap-3 rounded-2xl border-2 bg-linear-to-br to-transparent p-4 shadow-md sm:flex-row sm:items-center sm:justify-between'>
                    <div className='flex gap-3'>
                        <div className='bg-primary/15 border-primary/25 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border'>
                            <FlaskConical className='text-primary h-5 w-5' />
                        </div>
                        <div className='min-w-0 space-y-1'>
                            <p className='text-foreground text-sm font-bold'>
                                {t('admin.marketplace.plugins.ui_preview.banner_title')}
                            </p>
                            <p className='text-muted-foreground text-xs leading-relaxed'>
                                {t('admin.marketplace.plugins.ui_preview.banner_body')}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant='outline'
                        size='sm'
                        className='border-primary/30 shrink-0 self-start sm:self-center'
                        onClick={() => {
                            setRequirementsCheck(buildMockRequirementsSampleDialog());
                            setPendingInstallId('billingreferrals');
                            setRequirementsDialogOpen(true);
                        }}
                    >
                        <AlertTriangle className='mr-2 h-4 w-4' />
                        {t('admin.marketplace.plugins.ui_preview.open_sample_dialog')}
                    </Button>
                </div>
            )}

            {!cloudAccountConfigured && (
                <PageCard
                    title={t('admin.marketplace.plugins.cloud_missing.title')}
                    icon={AlertCircle}
                    variant='danger'
                >
                    <div className='space-y-4'>
                        <p className='text-destructive/80 text-sm'>
                            {t('admin.marketplace.plugins.cloud_missing.description')}
                        </p>
                        <Button variant='destructive' size='sm' onClick={() => router.push('/admin/cloud-management')}>
                            <Key className='mr-2 h-4 w-4' />
                            {t('admin.marketplace.plugins.cloud_missing.action')}
                        </Button>
                    </div>
                </PageCard>
            )}

            {cloudAccountConfigured && (cloudCredits || cloudTeam) && (
                <PageCard title={t('admin.marketplace.plugins.cloud_connected.title')} icon={Info}>
                    <div className='flex flex-wrap gap-6'>
                        {cloudCredits && (
                            <div className='bg-primary/10 border-primary/20 flex items-center gap-3 rounded-2xl border px-4 py-2'>
                                <div className='bg-primary/20 rounded-xl p-2'>
                                    <Coins className='text-primary h-5 w-5' />
                                </div>
                                <div>
                                    <div className='text-primary/70 text-[10px] font-bold tracking-wider uppercase'>
                                        {t('admin.marketplace.plugins.cloud_connected.credits')}
                                    </div>
                                    <div className='text-primary text-lg leading-tight font-black'>
                                        {cloudCredits.total_credits.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        )}
                        {cloudTeam?.team && (
                            <div className='bg-primary/10 border-primary/20 flex items-center gap-3 rounded-2xl border px-4 py-2'>
                                <div className='bg-primary/20 rounded-xl p-2'>
                                    <Users className='text-primary h-5 w-5' />
                                </div>
                                <div>
                                    <div className='text-primary/70 text-[10px] font-bold tracking-wider uppercase'>
                                        {t('admin.marketplace.plugins.cloud_connected.team')}
                                    </div>
                                    <div className='text-primary text-lg leading-tight font-black'>
                                        {cloudTeam.team.name}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className='flex justify-end'>
                        <Button variant='outline' onClick={() => router.push('/admin/cloud-management')}>
                            <Key className='mr-2 h-4 w-4' />
                            {t('admin.marketplace.plugins.cloud_connected.action')}
                        </Button>
                    </div>
                </PageCard>
            )}

            {!onlineSearch && popularAddons.length > 0 && (
                <div className='space-y-6'>
                    <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                            <Crown className='h-5 w-5 text-amber-500' />
                            <h2 className='text-xl font-bold tracking-tight'>
                                {t('admin.marketplace.plugins.popular')}
                            </h2>
                        </div>
                    </div>
                    <div className='grid grid-cols-1 gap-6'>
                        {popularAddons.slice(0, 3).map((addon) => {
                            const IconComponent = ({ className }: { className?: string }) =>
                                addon.icon ? (
                                    <div className={cn('relative', className)}>
                                        <Image
                                            src={addon.icon}
                                            alt={addon.name}
                                            fill
                                            className='rounded-lg object-cover'
                                            unoptimized
                                        />
                                    </div>
                                ) : (
                                    <Puzzle className={className} />
                                );

                            return (
                                <ResourceCard
                                    key={`popular-${addon.identifier}`}
                                    icon={IconComponent}
                                    title={addon.name}
                                    subtitle={
                                        addon.author
                                            ? t('admin.marketplace.common.by_author', { author: addon.author })
                                            : undefined
                                    }
                                    badges={
                                        [
                                            installedPluginIds.includes(addon.identifier)
                                                ? {
                                                      label: t('admin.marketplace.plugins.installed'),
                                                      className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                                                  }
                                                : null,
                                            addon.verified
                                                ? {
                                                      label: t('admin.marketplace.plugins.verified'),
                                                      className: 'bg-green-500/10 text-green-600 border-green-500/20',
                                                  }
                                                : null,
                                            {
                                                label: t('admin.marketplace.plugins.featured'),
                                                className:
                                                    'border-amber-500/30 bg-amber-500/10 px-3 font-semibold text-amber-200',
                                            },
                                        ].filter(Boolean) as ResourceBadge[]
                                    }
                                    onClick={() => viewPackageDetails(addon)}
                                    className='border-blue-500/20 hover:border-blue-500/40'
                                    highlightClassName='bg-linear-to-br from-blue-500/10 via-transparent to-transparent'
                                    iconClassName='text-blue-500'
                                    iconWrapperClassName='bg-blue-500/10 border-blue-500/20'
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            <WidgetRenderer widgets={getWidgets('admin-feathercloud-plugins', 'before-content')} />

            <PageCard title={t('admin.marketplace.plugins.search_section_title')} icon={Search}>
                <div className='space-y-4'>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.marketplace.plugins.search_helper')}
                    </p>
                    <div className='flex flex-col gap-3 sm:flex-row sm:items-stretch'>
                        <div className='group relative min-w-0 flex-1'>
                            <Search className='text-muted-foreground group-focus-within:text-primary pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors' />
                            <Input
                                id='feathercloud-plugins-search'
                                placeholder={t('admin.marketplace.plugins.search_placeholder')}
                                className='h-11 pl-10'
                                value={onlineSearch}
                                onChange={(e) => setOnlineSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        runSearchOrPreviewToggle();
                                    }
                                }}
                                autoComplete='off'
                                spellCheck={false}
                                aria-describedby='feathercloud-plugins-search-hint'
                            />
                        </div>
                        <Button
                            type='button'
                            variant='default'
                            className='h-11 shrink-0 px-6 sm:min-w-[120px]'
                            onClick={() => runSearchOrPreviewToggle()}
                        >
                            <Search className='mr-2 h-4 w-4' />
                            {t('admin.marketplace.plugins.search_button')}
                        </Button>
                    </div>
                    <p id='feathercloud-plugins-search-hint' className='text-muted-foreground text-xs leading-snug'>
                        {t('admin.marketplace.plugins.ui_preview.secret_hint')}
                    </p>
                    <div className='border-border flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between'>
                        <Button
                            variant={verifiedOnly ? 'default' : 'outline'}
                            size='sm'
                            className='h-10 px-4 whitespace-nowrap'
                            disabled={uiPreviewMode}
                            onClick={() => setVerifiedOnly(!verifiedOnly)}
                        >
                            <BadgeCheck className='mr-2 h-4 w-4' />
                            {t('admin.marketplace.plugins.verified_only')}
                        </Button>
                        <Select
                            value={sortBy}
                            onChange={(e) => {
                                setSortBy(e.target.value);
                            }}
                            className='border-border bg-background h-10 min-w-0 text-sm font-medium sm:min-w-[200px]'
                            aria-label={t('admin.marketplace.plugins.sort_label')}
                            disabled={uiPreviewMode}
                        >
                            <option value='downloads'>{t('admin.marketplace.plugins.sort.downloads')}</option>
                            <option value='created_at'>{t('admin.marketplace.plugins.sort.newest')}</option>
                            <option value='updated_at'>{t('admin.marketplace.plugins.sort.recently_updated')}</option>
                        </Select>
                    </div>
                </div>
            </PageCard>

            {selectedTag && (
                <div className='flex items-center gap-2'>
                    <Badge
                        variant='secondary'
                        className='bg-primary/10 text-primary border-primary/20 h-8 gap-2 rounded-full py-1 pr-1 pl-3'
                    >
                        {t('admin.marketplace.plugins.tag_label')} {selectedTag}
                        <button
                            onClick={clearTagFilter}
                            className='hover:bg-primary/20 rounded-full p-0.5 transition-colors'
                        >
                            <X className='h-3 w-3' />
                        </button>
                    </Badge>
                </div>
            )}

            {onlineLoading ? (
                <EmptyState
                    title={t('admin.marketplace.plugins.loading')}
                    description={t('admin.marketplace.plugins.loading')}
                    icon={RefreshCw}
                />
            ) : onlineError ? (
                <EmptyState
                    title={t('admin.marketplace.plugins.loading_error')}
                    description={onlineError}
                    icon={AlertCircle}
                    action={
                        <Button variant='outline' onClick={() => void fetchOnlineAddons(1, 'replace')}>
                            <RefreshCw className='mr-2 h-4 w-4' />
                            {t('admin.marketplace.plugins.try_again')}
                        </Button>
                    }
                />
            ) : onlineAddons.length === 0 ? (
                <EmptyState
                    title={t('admin.marketplace.plugins.no_results')}
                    description={t('admin.marketplace.plugins.search_placeholder')}
                    icon={Package}
                    action={
                        <Button
                            variant='outline'
                            onClick={() => {
                                setOnlineSearch('');
                                fetchOnlineAddons(1, 'replace');
                            }}
                        >
                            {t('admin.marketplace.plugins.clear_search')}
                        </Button>
                    }
                />
            ) : (
                <PageCard
                    id='plugins-online-list'
                    title={t('admin.marketplace.plugins.online_list_heading')}
                    icon={Package}
                    action={
                        onlinePagination && onlinePagination.total_records > 0 ? (
                            <p className='text-muted-foreground max-w-40 truncate text-right text-[10px] font-semibold tracking-wide sm:max-w-none sm:text-xs'>
                                {t('admin.marketplace.plugins.online_list_count', {
                                    shown: String(onlineAddons.length),
                                    total: String(onlinePagination.total_records),
                                })}
                            </p>
                        ) : undefined
                    }
                >
                    <div className='grid grid-cols-1 gap-6'>
                        {onlineAddons.map((addon) => {
                            const IconComponent = ({ className }: { className?: string }) =>
                                addon.icon ? (
                                    <div className={cn('relative', className)}>
                                        <Image
                                            src={addon.icon}
                                            alt={addon.name}
                                            fill
                                            className='rounded-lg object-cover'
                                            unoptimized
                                        />
                                    </div>
                                ) : (
                                    <Puzzle className={className} />
                                );

                            const isInstalled = installedPluginIds.includes(addon.identifier);
                            const isSelected = selectedPluginIds.includes(addon.identifier);
                            const isPremium = addon.premium === 1;
                            const storeUrl = addon.premium_link?.trim() ?? '';
                            const hasStore = Boolean(storeUrl);
                            const premiumOwned = !isPremium || isPremiumOwnedForQueue(addon);
                            const requiresCloudBlock = isPremium && !hasStore && !cloudAccountConfigured;
                            const premiumNotLicensed = isPremium && cloudAccountConfigured && !premiumOwned;
                            const storePrimary =
                                (isPremium && hasStore && !cloudAccountConfigured) || (premiumNotLicensed && hasStore);
                            const queueDisabled = bulkInstalling || isInstalled;

                            return (
                                <ResourceCard
                                    key={addon.identifier}
                                    icon={IconComponent}
                                    title={addon.name}
                                    subtitle={
                                        addon.author
                                            ? t('admin.marketplace.common.by_author', { author: addon.author })
                                            : undefined
                                    }
                                    badges={
                                        [
                                            installedPluginIds.includes(addon.identifier)
                                                ? {
                                                      label: t('admin.marketplace.plugins.installed'),
                                                      className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                                                  }
                                                : null,
                                            addon.verified
                                                ? {
                                                      label: t('admin.marketplace.plugins.verified'),
                                                      className: 'bg-green-500/10 text-green-600 border-green-500/20',
                                                  }
                                                : null,
                                            addon.premium === 1
                                                ? {
                                                      label: t('admin.marketplace.plugins.premium'),
                                                      className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                                                  }
                                                : null,
                                            addon.latest_version?.dependencies &&
                                            addon.latest_version.dependencies.length > 0 &&
                                            !installedPluginIds.includes(addon.identifier)
                                                ? {
                                                      label: t('admin.marketplace.plugins.has_dependencies'),
                                                      className:
                                                          'bg-purple-500/10 text-purple-600 border-purple-500/20',
                                                  }
                                                : null,
                                        ].filter(Boolean) as ResourceBadge[]
                                    }
                                    description={
                                        <div className='space-y-4'>
                                            <p className='text-foreground/80 line-clamp-2 text-sm leading-relaxed'>
                                                {addon.description ||
                                                    t('admin.marketplace.plugins.details.no_description')}
                                            </p>
                                            <div className='text-muted-foreground flex flex-wrap items-center gap-4 text-xs font-medium'>
                                                <div className='flex items-center gap-1.5'>
                                                    <CloudDownload className='h-3.5 w-3.5' />
                                                    {addon.downloads.toLocaleString()}
                                                </div>
                                                {addon.premium === 1 && addon.premium_price && (
                                                    <div className='flex items-center gap-1.5 font-bold text-amber-600'>
                                                        <Coins className='h-3.5 w-3.5' />€{addon.premium_price}
                                                    </div>
                                                )}
                                            </div>
                                            {addon.tags.length > 0 && (
                                                <div className='flex flex-wrap gap-1.5'>
                                                    {addon.tags.slice(0, 3).map((tag) => (
                                                        <Badge
                                                            key={tag}
                                                            variant='secondary'
                                                            className='bg-muted/50 hover:bg-primary/10 hover:text-primary hover:border-primary/20 h-6 cursor-pointer rounded-lg border-transparent px-2 py-0 text-[10px] transition-all'
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedTag(tag);
                                                            }}
                                                        >
                                                            #{tag}
                                                        </Badge>
                                                    ))}
                                                    {addon.tags.length > 3 && (
                                                        <span className='text-muted-foreground flex h-6 items-center text-[10px] font-medium'>
                                                            +{addon.tags.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    }
                                    actions={
                                        <div className='flex flex-wrap items-center justify-end gap-2'>
                                            <Button
                                                variant='outline'
                                                size='sm'
                                                onClick={() => viewPackageDetails(addon)}
                                            >
                                                <Info className='h-4 w-4' />
                                            </Button>
                                            {isInstalled ? (
                                                <Button variant='default' size='sm' disabled className='min-w-[100px]'>
                                                    <BadgeCheck className='mr-2 h-4 w-4' />
                                                    {t('admin.marketplace.plugins.installed')}
                                                </Button>
                                            ) : storePrimary ? (
                                                <Button variant='default' size='sm' asChild className='min-w-[100px]'>
                                                    <a href={storeUrl} target='_blank' rel='noopener noreferrer'>
                                                        <ExternalLink className='mr-2 h-4 w-4' />
                                                        {t('admin.marketplace.plugins.purchase_at_store')}
                                                    </a>
                                                </Button>
                                            ) : requiresCloudBlock ? (
                                                <Button
                                                    variant='outline'
                                                    size='sm'
                                                    disabled
                                                    className='border-amber-500/20 bg-amber-500/5 text-amber-600'
                                                >
                                                    <Lock className='mr-2 h-4 w-4' />
                                                    {t('admin.marketplace.plugins.requires_cloud')}
                                                </Button>
                                            ) : premiumNotLicensed ? (
                                                <Button
                                                    variant='outline'
                                                    size='sm'
                                                    disabled
                                                    className='border-amber-500/20 bg-amber-500/5 text-amber-600'
                                                >
                                                    <Lock className='mr-2 h-4 w-4' />
                                                    {t('admin.marketplace.plugins.premium_not_licensed')}
                                                </Button>
                                            ) : (
                                                <>
                                                    {isPremium && hasStore && cloudAccountConfigured && (
                                                        <Button variant='outline' size='sm' asChild>
                                                            <a
                                                                href={storeUrl}
                                                                target='_blank'
                                                                rel='noopener noreferrer'
                                                            >
                                                                <ExternalLink className='mr-2 h-4 w-4' />
                                                                {t('admin.marketplace.plugins.purchase_official_store')}
                                                            </a>
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant='default'
                                                        size='sm'
                                                        disabled={queueDisabled}
                                                        onClick={() => toggleSelectPlugin(addon.identifier, addon.name)}
                                                        className='min-w-[100px]'
                                                    >
                                                        {isSelected ? (
                                                            <>
                                                                <CheckIcon className='mr-2 h-4 w-4' />
                                                                {t('admin.marketplace.plugins.queue.in_list')}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CloudDownload className='mr-2 h-4 w-4' />
                                                                {t('admin.marketplace.plugins.queue.add_to_list')}
                                                            </>
                                                        )}
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    }
                                />
                            );
                        })}
                    </div>
                    {hasMoreToLoad && (
                        <div className='border-border flex flex-col items-center gap-2 border-t pt-4'>
                            <Button
                                type='button'
                                variant='outline'
                                className='h-11 min-w-[220px] px-6'
                                loading={loadingMore}
                                disabled={onlineLoading || loadingMore}
                                onClick={loadMoreOnlineAddons}
                            >
                                <CloudDownload className='mr-2 h-4 w-4' />
                                {t('admin.marketplace.plugins.load_more')}
                            </Button>
                            {onlinePagination && (
                                <p className='text-muted-foreground text-center text-xs'>
                                    {t('admin.marketplace.plugins.load_more_hint', {
                                        page: String(onlinePagination.current_page ?? currentOnlinePage),
                                        pages: String(onlinePagination.total_pages ?? 1),
                                    })}
                                </p>
                            )}
                        </div>
                    )}
                </PageCard>
            )}

            <PageCard title={t('admin.marketplace.plugins.repo.title')} icon={Globe}>
                <div className='space-y-4'>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.marketplace.plugins.repo.description')}
                    </p>
                    <div className='border-border bg-muted/40 mt-2 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center'>
                        <div className='min-w-0 flex-1'>
                            <div className='flex items-center gap-2'>
                                <span className='truncate text-sm font-semibold'>
                                    {t('admin.marketplace.plugins.repo.official_name')}
                                </span>
                                <Badge
                                    variant='secondary'
                                    className='h-6 border-emerald-500/30 bg-emerald-500/10 px-2 py-0 text-[10px] tracking-wide text-emerald-600 uppercase'
                                >
                                    <BadgeCheck className='mr-1 h-3 w-3' />
                                    {t('admin.marketplace.plugins.repo.official_badge')}
                                </Badge>
                            </div>
                            <p className='text-muted-foreground mt-1 truncate text-xs'>repo.featherpanel.com</p>
                        </div>
                        <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                            <Lock className='h-4 w-4' />
                            <span className='font-medium'>{t('admin.marketplace.plugins.repo.locked_notice')}</span>
                        </div>
                    </div>
                </div>
            </PageCard>

            <Sheet open={packageDetailsOpen} onOpenChange={setPackageDetailsOpen}>
                <div className='flex h-full flex-col'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.marketplace.plugins.details.title')}</SheetTitle>
                        <SheetDescription>{t('admin.marketplace.plugins.subtitle')}</SheetDescription>
                    </SheetHeader>

                    <div className='-mr-2 flex-1 space-y-8 overflow-y-auto pr-2'>
                        {packageDetailsLoading ? (
                            <div className='flex flex-col items-center justify-center gap-4 py-20'>
                                <RefreshCw className='text-primary h-10 w-10 animate-spin' />
                                <p className='text-muted-foreground'>
                                    {t('admin.marketplace.plugins.details.loading')}
                                </p>
                            </div>
                        ) : (
                            selectedPackage && (
                                <div className='space-y-8 pb-4'>
                                    <div className='flex items-start gap-6'>
                                        <div className='from-primary/10 to-primary/5 border-primary/20 relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border-2 bg-linear-to-br'>
                                            {selectedPackage.icon ? (
                                                <Image
                                                    src={selectedPackage.icon}
                                                    alt={selectedPackage.name}
                                                    fill
                                                    className='object-cover'
                                                    unoptimized
                                                />
                                            ) : (
                                                <Puzzle className='text-primary/60 h-12 w-12' />
                                            )}
                                        </div>
                                        <div className='flex-1 space-y-2'>
                                            <h3 className='text-3xl font-bold tracking-tight'>
                                                {selectedPackage.name}
                                            </h3>
                                            <div className='flex flex-wrap gap-2'>
                                                <Badge
                                                    variant='outline'
                                                    className='border-primary/20 bg-primary/5 text-primary px-3 py-1 text-xs'
                                                >
                                                    {selectedPackage.identifier}
                                                </Badge>
                                                {selectedPackage.verified && (
                                                    <Badge className='border-green-500/20 bg-green-500/10 px-3 py-1 text-xs text-green-600'>
                                                        <CheckIcon className='mr-1 h-3 w-3' />
                                                        {t('admin.marketplace.plugins.verified')}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className='space-y-4'>
                                        <h4 className='flex items-center gap-2 text-lg font-bold'>
                                            <Info className='text-primary h-5 w-5' />
                                            {t('admin.marketplace.plugins.details.title')}
                                        </h4>
                                        <p className='text-muted-foreground bg-muted/30 border-border/50 rounded-2xl border p-5 text-sm leading-relaxed whitespace-pre-wrap'>
                                            {selectedPackage.description ||
                                                t('admin.marketplace.plugins.details.no_description')}
                                        </p>
                                    </div>

                                    <div className='grid grid-cols-2 gap-4'>
                                        <div className='bg-muted/30 border-border/50 space-y-1 rounded-2xl border p-5'>
                                            <p className='text-muted-foreground text-[10px] font-bold tracking-wider uppercase'>
                                                Version
                                            </p>
                                            <p className='font-semibold'>
                                                {selectedPackage.latest_version?.version || 'N/A'}
                                            </p>
                                        </div>

                                        <div className='bg-muted/30 border-border/50 space-y-1 rounded-2xl border p-5'>
                                            <p className='text-muted-foreground text-[10px] font-bold tracking-wider uppercase'>
                                                {t('admin.marketplace.plugins.downloads')}
                                            </p>
                                            <p className='font-semibold'>
                                                {selectedPackage.downloads.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className='bg-muted/30 border-border/50 space-y-1 rounded-2xl border p-5'>
                                            <p className='text-muted-foreground text-[10px] font-bold tracking-wider uppercase'>
                                                Status
                                            </p>
                                            <p
                                                className={cn(
                                                    'font-bold',
                                                    installedPluginIds.includes(selectedPackage.identifier)
                                                        ? 'text-green-600'
                                                        : 'text-primary',
                                                )}
                                            >
                                                {installedPluginIds.includes(selectedPackage.identifier)
                                                    ? t('admin.marketplace.plugins.installed')
                                                    : t('admin.marketplace.plugins.available')}
                                            </p>
                                        </div>
                                    </div>

                                    {selectedPackage.latest_version?.changelog && (
                                        <div className='space-y-4'>
                                            <h4 className='text-lg font-bold'>
                                                {t('admin.marketplace.plugins.details.changelog')}
                                            </h4>
                                            <div className='bg-muted/30 border-border/50 text-muted-foreground rounded-2xl border p-5 text-sm leading-relaxed'>
                                                {selectedPackage.latest_version.changelog}
                                            </div>
                                        </div>
                                    )}

                                    {selectedPackage.website && (
                                        <div className='pt-2'>
                                            <a
                                                href={selectedPackage.website}
                                                target='_blank'
                                                rel='noopener noreferrer'
                                                className='text-primary bg-primary/5 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors hover:underline'
                                            >
                                                <Globe className='h-4 w-4' />
                                                {t('admin.marketplace.plugins.website')}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )
                        )}
                    </div>

                    <SheetFooter className='mt-8 flex flex-col gap-2 sm:flex-row sm:flex-wrap'>
                        <Button
                            variant='outline'
                            className='h-14 flex-1 rounded-xl text-sm font-bold'
                            onClick={() => setPackageDetailsOpen(false)}
                        >
                            {t('common.close')}
                        </Button>
                        {selectedPackage &&
                            (() => {
                                const sp = selectedPackage;
                                const store = sp.premium_link?.trim();
                                const isPrem = sp.premium === 1;
                                const installed = installedPluginIds.includes(sp.identifier);
                                const premiumOwned = !isPrem || isPremiumOwnedForQueue(sp);
                                const premiumNotLicensed = isPrem && cloudAccountConfigured && !premiumOwned;
                                const storePrimary =
                                    (isPrem && Boolean(store) && !cloudAccountConfigured) ||
                                    (premiumNotLicensed && Boolean(store));
                                const requiresCloudBlock = isPrem && !store && !cloudAccountConfigured;
                                const showOfficialStoreOutline =
                                    isPrem && Boolean(store) && cloudAccountConfigured && !installed && premiumOwned;

                                return (
                                    <>
                                        {showOfficialStoreOutline && (
                                            <Button
                                                variant='outline'
                                                className='h-14 flex-1 rounded-xl text-sm font-bold'
                                                asChild
                                            >
                                                <a href={store} target='_blank' rel='noopener noreferrer'>
                                                    <ExternalLink className='mr-2 h-4 w-4' />
                                                    {t('admin.marketplace.plugins.purchase_official_store')}
                                                </a>
                                            </Button>
                                        )}
                                        <Button
                                            className='h-14 min-w-40 flex-2 rounded-xl text-sm font-bold'
                                            disabled={
                                                installingOnlineId === sp.identifier ||
                                                installed ||
                                                requiresCloudBlock ||
                                                (premiumNotLicensed && !store)
                                            }
                                            onClick={() => {
                                                if (storePrimary) {
                                                    window.open(store, '_blank', 'noopener,noreferrer');
                                                    return;
                                                }
                                                handleInstall(sp.identifier);
                                            }}
                                        >
                                            {installingOnlineId === sp.identifier ? (
                                                <>
                                                    <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                                                    {t('admin.marketplace.plugins.installing')}
                                                </>
                                            ) : installed ? (
                                                <>
                                                    <BadgeCheck className='mr-2 h-4 w-4' />
                                                    {t('admin.marketplace.plugins.installed')}
                                                </>
                                            ) : requiresCloudBlock ? (
                                                <>
                                                    <Lock className='mr-2 h-4 w-4' />
                                                    {t('admin.marketplace.plugins.requires_cloud')}
                                                </>
                                            ) : premiumNotLicensed && !store ? (
                                                <>
                                                    <Lock className='mr-2 h-4 w-4' />
                                                    {t('admin.marketplace.plugins.premium_not_licensed')}
                                                </>
                                            ) : storePrimary ? (
                                                <>
                                                    <ExternalLink className='mr-2 h-4 w-4' />
                                                    {t('admin.marketplace.plugins.purchase_at_store')}
                                                </>
                                            ) : (
                                                <>
                                                    <CloudDownload className='mr-2 h-4 w-4' />
                                                    {t('admin.marketplace.plugins.install')}
                                                </>
                                            )}
                                        </Button>
                                    </>
                                );
                            })()}
                    </SheetFooter>
                </div>
            </Sheet>

            {/* Portal: PageTransition uses transform+overflow; fixed inside it is viewport-wrong. Body = true viewport bottom. */}
            {portalReady &&
                selectedPluginIds.length > 0 &&
                createPortal(
                    <div
                        className={cn(
                            'border-border bg-card/98 fixed right-0 bottom-0 left-0 z-46 border-t shadow-[0_-6px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-6px_24px_rgba(0,0,0,0.22)]',
                            dockLgLeftClass,
                        )}
                        role='region'
                        aria-label={t('admin.marketplace.plugins.queue.title')}
                        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
                    >
                        <div className='mx-auto max-w-7xl px-3 pt-3 sm:px-6 sm:pt-4 lg:px-8'>
                            <p className='text-muted-foreground mb-2 hidden text-xs leading-snug sm:block'>
                                {t('admin.marketplace.plugins.queue.subtitle')}
                            </p>
                            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                                <div className='flex min-w-0 flex-1 items-center gap-2'>
                                    <CloudDownload className='text-primary h-4 w-4 shrink-0' />
                                    <span className='text-foreground truncate text-sm font-semibold'>
                                        {t('admin.marketplace.plugins.queue.title')}
                                    </span>
                                    <Badge
                                        variant='secondary'
                                        className='bg-primary/10 text-primary border-primary/20 shrink-0'
                                    >
                                        {selectedPluginIds.length}
                                    </Badge>
                                </div>
                                <div className='flex w-full shrink-0 gap-2 sm:w-auto'>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        className='h-10 flex-1 sm:flex-initial'
                                        onClick={() => {
                                            setSelectedPluginIds([]);
                                            setQueuedPlugins({});
                                        }}
                                        disabled={bulkInstalling}
                                    >
                                        {t('admin.marketplace.plugins.queue.clear')}
                                    </Button>
                                    <Button
                                        size='sm'
                                        className='h-10 flex-1 sm:min-w-[140px]'
                                        onClick={handleBulkInstall}
                                        disabled={bulkInstalling}
                                    >
                                        {bulkInstalling ? (
                                            <>
                                                <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                                                {t('admin.marketplace.plugins.queue.downloading')}
                                            </>
                                        ) : (
                                            <>
                                                <CloudDownload className='mr-2 h-4 w-4' />
                                                {t('admin.marketplace.plugins.queue.download_now')}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                            <div className='mt-3 flex max-h-20 flex-wrap gap-2 overflow-y-auto pb-1'>
                                {selectedPluginIds.map((id) => (
                                    <div
                                        key={id}
                                        className='bg-muted/80 border-border inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium'
                                    >
                                        <span className='max-w-[200px] truncate' title={queuedPlugins[id] ?? id}>
                                            {queuedPlugins[id] ?? id}
                                        </span>
                                        <button
                                            type='button'
                                            className='text-muted-foreground hover:text-destructive rounded-full p-0.5 transition-colors'
                                            onClick={() => toggleSelectPlugin(id)}
                                            disabled={bulkInstalling}
                                            aria-label={t('admin.marketplace.plugins.queue.remove')}
                                        >
                                            <X className='h-3.5 w-3.5' />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}

            <WidgetRenderer widgets={getWidgets('admin-feathercloud-plugins', 'bottom-of-page')} />

            {/* Requirements Check Dialog */}
            <Dialog open={requirementsDialogOpen} onOpenChange={setRequirementsDialogOpen}>
                <DialogContent className='border-border bg-card text-foreground max-w-lg'>
                    <DialogHeader>
                        <DialogTitle className='flex items-center gap-2'>
                            {requirementsCheck?.can_install ? (
                                <>
                                    <CheckCircle2 className='h-5 w-5 text-green-500' />
                                    {t('admin.marketplace.plugins.requirements.title_ready')}
                                </>
                            ) : (
                                <>
                                    <AlertTriangle className='h-5 w-5 text-amber-500' />
                                    {t('admin.marketplace.plugins.requirements.title_missing')}
                                </>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            {requirementsCheck?.package.name && (
                                <span className='font-medium'>{requirementsCheck.package.name}</span>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className='space-y-4 py-4'>
                        {/* Panel Version Status */}
                        {requirementsCheck?.panel_version.min || requirementsCheck?.panel_version.max ? (
                            <div
                                className={cn(
                                    'flex items-start gap-3 rounded-lg border p-3',
                                    requirementsCheck.panel_version.ok
                                        ? 'border-emerald-500/25 bg-emerald-500/10'
                                        : 'border-destructive/30 bg-destructive/10',
                                )}
                            >
                                {requirementsCheck.panel_version.ok ? (
                                    <CheckCircle2 className='mt-0.5 h-5 w-5 shrink-0 text-emerald-500' />
                                ) : (
                                    <XCircle className='text-destructive mt-0.5 h-5 w-5 shrink-0' />
                                )}
                                <div>
                                    <p className='font-medium'>
                                        {t('admin.marketplace.plugins.requirements.panel_version')}
                                    </p>
                                    <p className='text-muted-foreground text-sm'>
                                        {requirementsCheck.panel_version.ok
                                            ? t('admin.marketplace.plugins.requirements.panel_compatible')
                                            : requirementsCheck.panel_version.message}
                                    </p>
                                </div>
                            </div>
                        ) : null}

                        {/* Dependencies List */}
                        {requirementsCheck &&
                            requirementsCheck.dependencies?.checks &&
                            requirementsCheck.dependencies.checks.length > 0 && (
                                <div className='space-y-2'>
                                    <h4 className='flex items-center gap-2 text-sm font-semibold'>
                                        <Layers className='h-4 w-4' />
                                        {t('admin.marketplace.plugins.requirements.dependencies')}
                                    </h4>
                                    <div className='space-y-2'>
                                        {requirementsCheck.dependencies.checks.map((dep, index) => (
                                            <div
                                                key={index}
                                                className={cn(
                                                    'flex items-start gap-2 rounded-md border p-2 text-sm',
                                                    dep.met
                                                        ? 'border-emerald-500/20 bg-emerald-500/5'
                                                        : 'border-destructive/25 bg-destructive/10',
                                                )}
                                            >
                                                {dep.met ? (
                                                    <CheckCircle2 className='mt-0.5 h-4 w-4 shrink-0 text-emerald-500' />
                                                ) : (
                                                    <XCircle className='text-destructive mt-0.5 h-4 w-4 shrink-0' />
                                                )}
                                                <div className='flex-1'>
                                                    <div className='flex items-center gap-2'>
                                                        <Badge
                                                            variant='outline'
                                                            className={cn(
                                                                'h-5 text-[10px]',
                                                                dep.met
                                                                    ? 'border-emerald-500/40 text-emerald-200'
                                                                    : 'border-destructive/40 text-destructive-foreground',
                                                            )}
                                                        >
                                                            {dep.type}
                                                        </Badge>
                                                        <span className='font-medium'>{dep.name}</span>
                                                    </div>
                                                    {!dep.met && (
                                                        <p className='text-muted-foreground mt-1 text-xs'>
                                                            {dep.message}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        {/* Missing dependencies warning */}
                        {!requirementsCheck?.dependencies.all_met && (
                            <div className='rounded-lg border border-amber-500/25 bg-amber-500/10 p-3'>
                                <p className='flex items-center gap-2 text-sm font-medium text-amber-100'>
                                    <AlertTriangle className='h-4 w-4 shrink-0 text-amber-400' />
                                    {t('admin.marketplace.plugins.requirements.please_install_deps')}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className='flex justify-end gap-2'>
                        <Button variant='outline' onClick={() => setRequirementsDialogOpen(false)}>
                            {requirementsCheck?.can_install ? t('common.cancel') : t('common.close')}
                        </Button>
                        {requirementsCheck?.can_install && pendingInstallId && (
                            <Button
                                onClick={() => performInstall(pendingInstallId)}
                                disabled={installingOnlineId === pendingInstallId}
                            >
                                {installingOnlineId === pendingInstallId ? (
                                    <>
                                        <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                                        {t('admin.marketplace.plugins.installing')}
                                    </>
                                ) : (
                                    <>
                                        <CloudDownload className='mr-2 h-4 w-4' />
                                        {t('admin.marketplace.plugins.install')}
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
