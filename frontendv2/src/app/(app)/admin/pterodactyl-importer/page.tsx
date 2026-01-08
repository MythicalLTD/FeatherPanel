/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select-native';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Database,
    AlertTriangle,
    CheckCircle,
    Loader2,
    XCircle,
    RefreshCw,
    Plus,
    Key,
    BookOpen,
    MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface ApiClient {
    id: number;
    user_uuid: string;
    name: string;
    public_key?: string;
    private_key?: string;
    created_at: string;
    updated_at: string;
}

interface PrerequisitesCheck {
    users_count: number;
    nodes_count: number;
    locations_count: number;
    realms_count: number;
    spells_count: number;
    servers_count: number;
    databases_count: number;
    allocations_count: number;
    panel_clean: boolean;
}

interface PrerequisitesResponse {
    success: boolean;
    data: PrerequisitesCheck;
    message?: string;
}

interface ApiClientsResponse {
    success: boolean;
    data: {
        api_clients: ApiClient[];
    };
    message?: string;
}

interface SingleApiClientResponse {
    success: boolean;
    data: ApiClient;
    message?: string;
}

export default function PterodactylImporterPage() {
    const { t, translations } = useTranslation();
    const router = useRouter();

    const getTranslationObject = (key: string): Record<string, string> => {
        const keys = key.split('.');
        let value: unknown = translations;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in (value as Record<string, unknown>)) {
                value = (value as Record<string, unknown>)[k];
            } else {
                return {};
            }
        }

        return (value as Record<string, string>) || {};
    };

    // State
    const [isCheckingPrerequisites, setIsCheckingPrerequisites] = useState(false);
    const [prerequisites, setPrerequisites] = useState<PrerequisitesCheck | null>(null);
    const [apiClients, setApiClients] = useState<ApiClient[]>([]);
    const [loadingApiKeys, setLoadingApiKeys] = useState(false);
    const [selectedApiKey, setSelectedApiKey] = useState<string | null>(null);
    const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
    const [bypassPrerequisites, setBypassPrerequisites] = useState(false);

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-pterodactyl-importer');
    const [showCreateApiKeyModal, setShowCreateApiKeyModal] = useState(false);
    const [newApiKeyName, setNewApiKeyName] = useState('');
    const [isCreatingApiKey, setIsCreatingApiKey] = useState(false);

    // Panel URL
    const panelUrl = typeof window !== 'undefined' ? window.location.origin : '';

    const prerequisitesPassed = useMemo(() => {
        if (bypassPrerequisites) return true;
        if (!prerequisites) return false;
        return (
            prerequisites.users_count <= 1 &&
            prerequisites.nodes_count === 0 &&
            prerequisites.locations_count === 0 &&
            prerequisites.realms_count === 0 &&
            prerequisites.spells_count === 0 &&
            prerequisites.servers_count === 0 &&
            prerequisites.databases_count === 0 &&
            prerequisites.allocations_count === 0 &&
            prerequisites.panel_clean
        );
    }, [prerequisites, bypassPrerequisites]);

    const fetchPrerequisites = useCallback(async () => {
        setIsCheckingPrerequisites(true);
        try {
            const response = await axios.get<PrerequisitesResponse>('/api/admin/pterodactyl-importer/prerequisites');
            if (response.data.success && response.data.data) {
                setPrerequisites(response.data.data);
            } else {
                toast.error(t('admin.pterodactyl_importer.prerequisites.failed'));
            }
        } catch {
            toast.error(t('admin.pterodactyl_importer.prerequisites.failed'));
        } finally {
            setIsCheckingPrerequisites(false);
        }
    }, [t]);

    const selectApiClient = useCallback(
        async (clientId: number) => {
            setSelectedClientId(clientId);
            try {
                const response = await axios.get<SingleApiClientResponse>(`/api/user/api-clients/${clientId}`);
                if (response.data.success && response.data.data) {
                    setSelectedApiKey(response.data.data.public_key || null);
                } else {
                    toast.error(t('admin.pterodactyl_importer.toasts.failed_load_key'));
                }
            } catch {
                toast.error(t('admin.pterodactyl_importer.toasts.failed_load_key'));
            }
        },
        [t],
    );

    const fetchApiClients = useCallback(async () => {
        setLoadingApiKeys(true);
        try {
            const response = await axios.get<ApiClientsResponse>('/api/user/api-clients');
            if (response.data.success && response.data.data) {
                const clients = response.data.data.api_clients || [];
                setApiClients(clients);

                // Auto-select first if available
                if (clients.length > 0 && !selectedApiKey) {
                    selectApiClient(clients[0].id);
                }
            } else {
                toast.error(t('admin.pterodactyl_importer.toasts.failed_fetch_keys'));
            }
        } catch {
            toast.error(t('admin.pterodactyl_importer.toasts.failed_fetch_keys'));
        } finally {
            setLoadingApiKeys(false);
        }
    }, [selectedApiKey, selectApiClient, t]);

    const createApiKey = async () => {
        if (!newApiKeyName.trim()) {
            toast.error(t('admin.pterodactyl_importer.create_key.name_label'));
            return;
        }

        setIsCreatingApiKey(true);
        try {
            const response = await axios.post<SingleApiClientResponse>('/api/user/api-clients', {
                name: newApiKeyName.trim(),
            });
            if (response.data.success && response.data.data) {
                const newClient = response.data.data;
                toast.success(t('admin.pterodactyl_importer.toasts.key_created'));
                await fetchApiClients();

                // Select new key
                await selectApiClient(newClient.id);

                setShowCreateApiKeyModal(false);
                setNewApiKeyName('');
            } else {
                toast.error(t('admin.pterodactyl_importer.toasts.key_create_failed'));
            }
        } catch {
            toast.error(t('admin.pterodactyl_importer.toasts.key_create_failed'));
        } finally {
            setIsCreatingApiKey(false);
        }
    };

    useEffect(() => {
        fetchWidgets();
        fetchPrerequisites();
        fetchApiClients();
    }, [fetchPrerequisites, fetchApiClients, fetchWidgets]);

    // Cheat code listener
    useEffect(() => {
        const cheatCode = 'iknowwhatimdoing';
        let buffer = '';

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore input in form fields
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement ||
                (e.target as HTMLElement).isContentEditable
            ) {
                return;
            }

            buffer += e.key;
            if (buffer.length > cheatCode.length) {
                buffer = buffer.slice(-cheatCode.length);
            }

            if (buffer === cheatCode) {
                setBypassPrerequisites(true);
                toast.success('Cheat code activated: Prerequisites bypassed!');
                buffer = '';
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-pterodactyl-importer', 'top-of-page')} />
            <PageHeader
                title={t('admin.pterodactyl_importer.title')}
                description={t('admin.pterodactyl_importer.description')}
                icon={Database}
            />

            <WidgetRenderer widgets={getWidgets('admin-pterodactyl-importer', 'after-header')} />

            {/* Prerequisites Section */}
            <div className='grid gap-6 md:grid-cols-3'>
                <div className='md:col-span-2 space-y-6'>
                    <WidgetRenderer widgets={getWidgets('admin-pterodactyl-importer', 'before-content')} />
                    {/* System Requirements */}
                    <PageCard
                        title={t('admin.pterodactyl_importer.prerequisites.title')}
                        description={t('admin.pterodactyl_importer.prerequisites.description')}
                        action={
                            <Button
                                variant='outline'
                                size='sm'
                                disabled={isCheckingPrerequisites}
                                onClick={fetchPrerequisites}
                                className='gap-2'
                            >
                                <RefreshCw className={`h-4 w-4 ${isCheckingPrerequisites ? 'animate-spin' : ''}`} />
                                {t('admin.rate_limits.actions.refresh')}
                            </Button>
                        }
                    >
                        {isCheckingPrerequisites ? (
                            <div className='flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground'>
                                <Loader2 className='h-8 w-8 animate-spin text-primary' />
                                <p>{t('admin.pterodactyl_importer.prerequisites.checking')}</p>
                            </div>
                        ) : prerequisites ? (
                            <div className='space-y-4'>
                                {/* Overall Status Banner */}
                                <div
                                    className={`rounded-xl border p-4 flex items-center gap-4 ${
                                        prerequisitesPassed
                                            ? 'border-green-500/20 bg-green-500/5'
                                            : 'border-destructive/20 bg-destructive/5'
                                    }`}
                                >
                                    <div
                                        className={`rounded-full p-2 ${
                                            prerequisitesPassed ? 'bg-green-500/10' : 'bg-destructive/10'
                                        }`}
                                    >
                                        {prerequisitesPassed ? (
                                            <CheckCircle className='h-6 w-6 text-green-500' />
                                        ) : (
                                            <XCircle className='h-6 w-6 text-destructive' />
                                        )}
                                    </div>
                                    <div>
                                        <h3
                                            className={`font-semibold ${
                                                prerequisitesPassed ? 'text-green-500' : 'text-destructive'
                                            }`}
                                        >
                                            {prerequisitesPassed
                                                ? t('admin.pterodactyl_importer.prerequisites.success')
                                                : t('admin.pterodactyl_importer.prerequisites.failed_title')}
                                        </h3>
                                        <p className='text-sm text-muted-foreground'>
                                            {prerequisitesPassed
                                                ? t('admin.pterodactyl_importer.prerequisites.success_desc')
                                                : t('admin.pterodactyl_importer.prerequisites.failed_desc')}
                                        </p>
                                    </div>
                                </div>

                                {/* Status Grid */}
                                <div className='grid gap-4 sm:grid-cols-2'>
                                    {[
                                        {
                                            key: 'users',
                                            count: prerequisites.users_count,
                                            passed: prerequisites.users_count <= 1,
                                            max: 1,
                                        },
                                        {
                                            key: 'nodes',
                                            count: prerequisites.nodes_count,
                                            passed: prerequisites.nodes_count === 0,
                                            max: 0,
                                        },
                                        {
                                            key: 'locations',
                                            count: prerequisites.locations_count,
                                            passed: prerequisites.locations_count === 0,
                                            max: 0,
                                        },
                                        {
                                            key: 'realms',
                                            count: prerequisites.realms_count,
                                            passed: prerequisites.realms_count === 0,
                                            max: 0,
                                        },
                                        {
                                            key: 'spells',
                                            count: prerequisites.spells_count,
                                            passed: prerequisites.spells_count === 0,
                                            max: 0,
                                        },
                                        {
                                            key: 'servers',
                                            count: prerequisites.servers_count,
                                            passed: prerequisites.servers_count === 0,
                                            max: 0,
                                        },
                                        {
                                            key: 'databases',
                                            count: prerequisites.databases_count,
                                            passed: prerequisites.databases_count === 0,
                                            max: 0,
                                        },
                                        {
                                            key: 'allocations',
                                            count: prerequisites.allocations_count,
                                            passed: prerequisites.allocations_count === 0,
                                            max: 0,
                                        },
                                    ].map((item) => (
                                        <div
                                            key={item.key}
                                            className='flex items-center justify-between rounded-lg border border-white/5 bg-card/50 p-3 box-decoration-clone transition-all hover:bg-card/80'
                                        >
                                            <span className='text-sm font-medium'>
                                                {t(`admin.pterodactyl_importer.prerequisites.items.${item.key}`)}
                                            </span>
                                            <div className='flex items-center gap-3'>
                                                <span className='text-xs text-muted-foreground font-mono bg-white/5 px-2 py-0.5 rounded'>
                                                    {item.count}
                                                </span>
                                                {item.passed ? (
                                                    <CheckCircle className='h-4 w-4 text-green-500' />
                                                ) : (
                                                    <XCircle className='h-4 w-4 text-destructive' />
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Panel Clean Check */}
                                    <div className='flex items-center justify-between rounded-lg border border-white/5 bg-card/50 p-3 box-decoration-clone transition-all hover:bg-card/80 sm:col-span-2'>
                                        <span className='text-sm font-medium'>
                                            {t('admin.pterodactyl_importer.prerequisites.items.panel_status')}
                                        </span>
                                        <div className='flex items-center gap-2'>
                                            <span
                                                className={`text-xs px-2 py-0.5 rounded font-medium ${
                                                    prerequisites.panel_clean
                                                        ? 'bg-green-500/10 text-green-500'
                                                        : 'bg-destructive/10 text-destructive'
                                                }`}
                                            >
                                                {prerequisites.panel_clean
                                                    ? t('admin.pterodactyl_importer.prerequisites.items.panel_clean')
                                                    : t('admin.pterodactyl_importer.prerequisites.items.panel_dirty')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className='py-8 text-center text-muted-foreground'>
                                {t('admin.pterodactyl_importer.prerequisites.failed')}
                            </div>
                        )}
                    </PageCard>

                    {/* CLI Instructions (Only if passed) */}
                    {prerequisitesPassed && (
                        <div className='space-y-6'>
                            <div className='flex items-center gap-2'>
                                <div className='h-px flex-1 bg-border/50' />
                                <span className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                                    {t('admin.pterodactyl_importer.cli.overview')}
                                </span>
                                <div className='h-px flex-1 bg-border/50' />
                            </div>

                            {/* Step 1: Install */}
                            <PageCard
                                title={t('admin.pterodactyl_importer.cli.step1.title')}
                                description={t('admin.pterodactyl_importer.cli.step1.description')}
                            >
                                <div className='rounded-xl border border-primary/20 bg-primary/5 p-4 backdrop-blur-sm'>
                                    <code className='block whitespace-pre-wrap font-mono text-sm text-primary-foreground'>
                                        curl -sSL https://get.featherpanel.com/stable.sh | bash
                                    </code>
                                </div>
                            </PageCard>

                            {/* Step 2: Auth */}
                            <PageCard
                                title={t('admin.pterodactyl_importer.cli.step2.title')}
                                description={t('admin.pterodactyl_importer.cli.step2.description')}
                            >
                                <div className='flex flex-col gap-4 sm:flex-row'>
                                    <div className='flex-1 space-y-2'>
                                        <Label className='text-xs font-medium uppercase text-muted-foreground'>
                                            {t('admin.pterodactyl_importer.cli.step2.select_label')}
                                        </Label>
                                        <Select
                                            value={selectedClientId?.toString() || ''}
                                            disabled={loadingApiKeys}
                                            onChange={(e) => selectApiClient(Number(e.target.value))}
                                            className='w-full'
                                        >
                                            <option value='' disabled>
                                                {loadingApiKeys
                                                    ? t('admin.pterodactyl_importer.cli.step2.loading')
                                                    : apiClients.length === 0
                                                      ? t('admin.pterodactyl_importer.cli.step2.none_found')
                                                      : t('admin.pterodactyl_importer.cli.step2.placeholder')}
                                            </option>
                                            {apiClients.map((client) => (
                                                <option key={client.id} value={client.id.toString()}>
                                                    {client.name}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>
                                    <div className='flex items-end'>
                                        <Button
                                            variant='outline'
                                            onClick={() => setShowCreateApiKeyModal(true)}
                                            className='w-full sm:w-auto'
                                        >
                                            <Plus className='mr-2 h-4 w-4' />
                                            {t('admin.pterodactyl_importer.cli.step2.create_new')}
                                        </Button>
                                    </div>
                                </div>
                            </PageCard>

                            {/* Step 3 & 4 (Combined for flow if key selected) */}
                            {selectedApiKey && (
                                <div className='animate-in fade-in slide-in-from-bottom-2'>
                                    <PageCard
                                        title={t('admin.pterodactyl_importer.cli.step3.title')}
                                        description={t('admin.pterodactyl_importer.cli.step3.description')}
                                        className='border-primary/20'
                                    >
                                        <div className='space-y-6'>
                                            <div className='rounded-xl bg-black/50 border border-white/10 p-4'>
                                                <code className='font-mono text-sm text-green-400'>
                                                    feathercli config setup
                                                </code>
                                            </div>

                                            <div className='grid gap-4 sm:grid-cols-2'>
                                                <div className='space-y-1 rounded-lg border border-white/5 bg-white/5 p-3'>
                                                    <span className='text-xs font-medium text-muted-foreground uppercase'>
                                                        {t('admin.pterodactyl_importer.cli.step2.panel_url')}
                                                    </span>
                                                    <div className='font-mono text-sm break-all'>{panelUrl}</div>
                                                </div>
                                                <div className='space-y-1 rounded-lg border border-white/5 bg-white/5 p-3'>
                                                    <span className='text-xs font-medium text-muted-foreground uppercase'>
                                                        {t('admin.pterodactyl_importer.cli.step2.api_key')}
                                                    </span>
                                                    <div className='font-mono text-sm break-all blur-[2px] hover:blur-none transition-all cursor-pointer'>
                                                        {selectedApiKey}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className='space-y-2'>
                                                <h4 className='font-medium'>
                                                    {t('admin.pterodactyl_importer.cli.step4.title')}
                                                </h4>
                                                <p className='text-sm text-muted-foreground'>
                                                    {t('admin.pterodactyl_importer.cli.step4.description')}
                                                </p>
                                                <div className='rounded-xl bg-black/50 border border-white/10 p-4'>
                                                    <code className='font-mono text-sm text-green-400'>
                                                        feathercli migrate
                                                    </code>
                                                </div>
                                            </div>
                                        </div>
                                    </PageCard>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className='space-y-6'>
                    {/* Help & Support */}
                    <PageCard
                        title={t('admin.pterodactyl_importer.help.title')}
                        description={t('admin.pterodactyl_importer.help.description')}
                        icon={MessageCircle}
                    >
                        <div className='space-y-3'>
                            <a
                                href='https://docs.mythical.systems/docs/featherpanel/migration'
                                target='_blank'
                                rel='noopener noreferrer'
                                className='flex items-center gap-3 rounded-lg border border-transparent p-3 transition-colors hover:bg-white/5 hover:border-white/10'
                            >
                                <div className='rounded-lg bg-primary/10 p-2 text-primary'>
                                    <BookOpen className='h-5 w-5' />
                                </div>
                                <div className='min-w-0 flex-1'>
                                    <div className='text-sm font-medium'>
                                        {t('admin.pterodactyl_importer.help.documentation.title')}
                                    </div>
                                    <div className='text-xs text-muted-foreground'>
                                        {t('admin.pterodactyl_importer.help.documentation.description')}
                                    </div>
                                </div>
                            </a>

                            <a
                                href='https://discord.mythical.systems'
                                target='_blank'
                                rel='noopener noreferrer'
                                className='flex items-center gap-3 rounded-lg border border-transparent p-3 transition-colors hover:bg-white/5 hover:border-white/10'
                            >
                                <div className='rounded-lg bg-[#5865F2]/10 p-2 text-[#5865F2]'>
                                    <MessageCircle className='h-5 w-5' />
                                </div>
                                <div className='min-w-0 flex-1'>
                                    <div className='text-sm font-medium'>
                                        {t('admin.pterodactyl_importer.help.discord.title')}
                                    </div>
                                    <div className='text-xs text-muted-foreground'>
                                        {t('admin.pterodactyl_importer.help.discord.description')}
                                    </div>
                                </div>
                            </a>
                        </div>
                    </PageCard>

                    {/* Excluded Data Info */}
                    <PageCard
                        title={t('admin.pterodactyl_importer.info.title')}
                        description={t('admin.pterodactyl_importer.info.description')}
                        icon={AlertTriangle}
                    >
                        <ul className='space-y-2'>
                            {Object.values(getTranslationObject('admin.pterodactyl_importer.info.items')).map(
                                (item, i) => (
                                    <li key={i} className='flex items-center gap-2 text-sm text-muted-foreground'>
                                        <span className='h-1.5 w-1.5 rounded-full bg-amber-500/50' />
                                        {item}
                                    </li>
                                ),
                            )}
                        </ul>
                        <div className='mt-4 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-500/90 border border-amber-500/20'>
                            {t('admin.pterodactyl_importer.info.footer')}
                        </div>
                    </PageCard>
                </div>
            </div>

            {/* Create API Key Modal */}
            <Dialog open={showCreateApiKeyModal} onOpenChange={setShowCreateApiKeyModal}>
                <DialogContent className='sm:max-w-[500px]'>
                    <DialogHeader>
                        <DialogTitle className='flex items-center gap-2'>
                            <Key className='h-5 w-5' />
                            {t('admin.pterodactyl_importer.create_key.title')}
                        </DialogTitle>
                        <DialogDescription>{t('admin.pterodactyl_importer.create_key.description')}</DialogDescription>
                    </DialogHeader>
                    <div className='space-y-4 py-4'>
                        <div className='space-y-2'>
                            <Label htmlFor='api-key-name'>
                                {t('admin.pterodactyl_importer.create_key.name_label')}
                            </Label>
                            <Input
                                id='api-key-name'
                                value={newApiKeyName}
                                onChange={(e) => setNewApiKeyName(e.target.value)}
                                placeholder={t('admin.pterodactyl_importer.create_key.placeholder')}
                                disabled={isCreatingApiKey}
                            />
                            <p className='text-xs text-muted-foreground'>
                                {t('admin.pterodactyl_importer.create_key.help_text')}
                            </p>
                        </div>
                        <div className='rounded-lg border border-amber-500/30 bg-amber-500/10 p-3'>
                            <div className='flex items-start gap-2'>
                                <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0 text-amber-500' />
                                <div className='text-xs text-amber-500/90'>
                                    <p className='mb-1 font-medium'>
                                        {t('admin.pterodactyl_importer.create_key.important')}
                                    </p>
                                    <p>{t('admin.pterodactyl_importer.create_key.warning')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className='flex gap-2'>
                        <Button
                            variant='outline'
                            disabled={isCreatingApiKey}
                            onClick={() => setShowCreateApiKeyModal(false)}
                        >
                            {t('admin.pterodactyl_importer.create_key.cancel')}
                        </Button>
                        <Button disabled={isCreatingApiKey || !newApiKeyName.trim()} onClick={createApiKey}>
                            {isCreatingApiKey ? (
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            ) : (
                                <Plus className='mr-2 h-4 w-4' />
                            )}
                            {isCreatingApiKey
                                ? t('admin.pterodactyl_importer.create_key.creating')
                                : t('admin.pterodactyl_importer.create_key.create')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <WidgetRenderer widgets={getWidgets('admin-pterodactyl-importer', 'bottom-of-page')} />
        </div>
    );
}
