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

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { PageCard } from '@/components/featherui/PageCard';
import { Select } from '@/components/ui/select-native';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { StepIndicator } from '@/components/ui/step-indicator';
import { OwnerPickerSheet } from '@/components/admin/OwnerPickerSheet';
import { WebSpaceSslDnsGuide } from '@/components/webspace/WebSpaceSslDnsGuide';
import { WebSpaceDomainsManager, type DomainRoute } from '@/components/webspace/WebSpaceDomainsManager';
import type { InfrastructureCheck } from '@/hooks/useWebSpaceInfrastructure';
import type { User } from '@/app/(app)/admin/servers/create/types';
import { toast } from 'sonner';
import {
    AppWindow,
    LayoutTemplate,
    Search,
    UserCircle,
    X,
    ChevronLeft,
    ChevronRight,
    Plus,
    Loader2,
    CircleAlert,
    Settings,
    HardDrive,
    Globe,
} from 'lucide-react';

function BlockingChecksList({ checks, title }: { checks: InfrastructureCheck[]; title: string }) {
    if (checks.length === 0) return null;

    return (
        <div className='border-destructive/30 bg-destructive/5 mt-3 rounded-xl border p-4'>
            <p className='text-destructive mb-2 text-sm font-semibold'>{title}</p>
            <ul className='space-y-2 text-sm'>
                {checks.map((check) => (
                    <li key={check.id} className='flex gap-2'>
                        <CircleAlert className='text-destructive mt-0.5 h-4 w-4 shrink-0' />
                        <div>
                            <p className='font-medium'>{check.message}</p>
                            {check.detail ? <p className='text-muted-foreground text-xs'>{check.detail}</p> : null}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

interface WebNodeOption {
    id: number;
    name: string;
    fqdn?: string;
}

interface WebPlateOption {
    id: number;
    name: string;
    runtime: string;
    document_root?: string;
}

interface HostingPackageOption {
    id: number;
    name: string;
    disk: number;
    cpu_limit: number;
    memory_limit: number;
    bandwidth_limit_gb: number;
    database_limit: number;
    mailbox_limit: number;
    webplate_id?: number | null;
}

const totalSteps = 3;

export default function CreateWebSpacePage() {
    const { t } = useTranslation();
    const router = useRouter();

    const [currentStep, setCurrentStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [loadingOptions, setLoadingOptions] = useState(false);

    const [nodes, setNodes] = useState<WebNodeOption[]>([]);
    const [plates, setPlates] = useState<WebPlateOption[]>([]);
    const [hostingPackages, setHostingPackages] = useState<HostingPackageOption[]>([]);
    const [selectedOwner, setSelectedOwner] = useState<User | null>(null);
    const [ownerModalOpen, setOwnerModalOpen] = useState(false);
    const [owners, setOwners] = useState<User[]>([]);
    const [ownerSearch, setOwnerSearch] = useState('');
    const [debouncedOwnerSearch, setDebouncedOwnerSearch] = useState('');
    const [ownerPagination, setOwnerPagination] = useState({
        current_page: 1,
        per_page: 10,
        total_records: 0,
        total_pages: 0,
        has_next: false,
        has_prev: false,
    });
    const [domainRoutes, setDomainRoutes] = useState<DomainRoute[]>([]);
    const [createBlockingChecks, setCreateBlockingChecks] = useState<InfrastructureCheck[] | null>(null);
    const [form, setForm] = useState({
        name: '',
        description: '',
        web_node_id: '',
        webplate_id: '',
        hosting_package_id: '',
        owner_id: '',
        disk: '1024',
        cpu_limit: '0',
        memory_limit: '0',
        bandwidth_limit_gb: '',
        database_limit: '1',
        mailbox_limit: '0',
        ssl: false,
        document_root: '',
        skip_scripts: false,
        start_on_completion: false,
    });

    const wizardSteps = [
        {
            title: t('admin.webSpaces.wizard.step1_title'),
            subtitle: t('admin.webSpaces.wizard.step1_subtitle'),
        },
        {
            title: t('admin.webSpaces.wizard.step2_title'),
            subtitle: t('admin.webSpaces.wizard.step2_subtitle'),
        },
        {
            title: t('admin.webSpaces.wizard.step3_title'),
            subtitle: t('admin.webSpaces.wizard.step3_subtitle'),
        },
    ];

    const selectedPlate = plates.find((p) => String(p.id) === form.webplate_id);
    const canProceedStep1 = Boolean(form.web_node_id && form.webplate_id);
    const canCreate =
        currentStep === totalSteps &&
        form.name.trim().length > 0 &&
        form.web_node_id &&
        form.webplate_id &&
        form.owner_id;

    const loadOptions = useCallback(async () => {
        setLoadingOptions(true);
        try {
            const [nodesRes, platesRes, packagesRes] = await Promise.all([
                axios.get('/api/admin/web-nodes', { params: { page: 1, limit: 200 } }),
                axios.get('/api/admin/webplates', { params: { page: 1, limit: 200 } }),
                axios.get('/api/admin/hosting-packages').catch(() => ({ data: { data: { packages: [] } } })),
            ]);
            setNodes((nodesRes.data.data.web_nodes || []) as WebNodeOption[]);
            setPlates((platesRes.data.data.webplates || []) as WebPlateOption[]);
            setHostingPackages((packagesRes.data.data.packages || []) as HostingPackageOption[]);
        } catch (error) {
            console.error(error);
            toast.error(t('admin.webSpaces.messages.nodes_failed'));
        } finally {
            setLoadingOptions(false);
        }
    }, [t]);

    useEffect(() => {
        void loadOptions();
    }, [loadOptions]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedOwnerSearch(ownerSearch);
            setOwnerPagination((prev) => ({ ...prev, current_page: 1 }));
        }, 500);
        return () => clearTimeout(timer);
    }, [ownerSearch]);

    const fetchOwners = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/admin/users', {
                params: {
                    search: debouncedOwnerSearch,
                    page: ownerPagination.current_page,
                    limit: ownerPagination.per_page,
                },
            });
            setOwners(data.data.users || []);
            if (data.data.pagination) {
                setOwnerPagination((prev) => ({
                    ...prev,
                    ...data.data.pagination,
                }));
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    }, [debouncedOwnerSearch, ownerPagination.current_page, ownerPagination.per_page]);

    useEffect(() => {
        if (ownerModalOpen) {
            fetchOwners();
        }
    }, [ownerModalOpen, fetchOwners]);

    const openOwnerModal = () => {
        fetchOwners();
        setOwnerModalOpen(true);
    };

    const handleSelectOwner = (owner: User) => {
        setSelectedOwner(owner);
        setForm((prev) => ({ ...prev, owner_id: String(owner.id) }));
        setOwnerModalOpen(false);
    };

    const validateCurrentStep = () => {
        if (currentStep === 1) {
            if (!form.web_node_id) {
                toast.error(t('admin.webSpaces.messages.required'));
                return false;
            }
            if (!form.webplate_id) {
                toast.error(t('admin.webSpaces.messages.required'));
                return false;
            }
            return true;
        }
        if (currentStep === 3) {
            if (!form.name.trim()) {
                toast.error(t('admin.webSpaces.messages.required'));
                return false;
            }
            if (!form.owner_id) {
                toast.error(t('admin.webSpaces.form.owner_id_invalid'));
                return false;
            }
            return true;
        }
        return true;
    };

    const handlePrevious = () => setCurrentStep((s) => Math.max(1, s - 1));

    const handleNext = () => {
        if (validateCurrentStep()) {
            setCurrentStep((s) => Math.min(totalSteps, s + 1));
        }
    };

    const handleCreate = async () => {
        if (currentStep !== totalSteps) return;
        if (!validateCurrentStep()) return;

        const ownerId = Number(form.owner_id);
        if (!Number.isFinite(ownerId) || ownerId <= 0) {
            toast.error(t('admin.webSpaces.form.owner_id_invalid'));
            return;
        }

        const domains = domainRoutes.filter((r) => r.domain.trim()).map((r) => r.domain.trim().toLowerCase());

        setSaving(true);
        setCreateBlockingChecks(null);
        const toastId = toast.loading(t('admin.webSpaces.messages.creating'));
        try {
            const { data, status } = await axios.put('/api/admin/webspaces', {
                name: form.name.trim(),
                description: form.description,
                web_node_id: Number(form.web_node_id),
                webplate_id: Number(form.webplate_id),
                hosting_package_id: form.hosting_package_id ? Number(form.hosting_package_id) : undefined,
                owner_id: ownerId,
                disk: Math.max(1, Number(form.disk) || 1024),
                cpu_limit: Math.max(0, Number(form.cpu_limit) || 0),
                memory_limit: Math.max(0, Number(form.memory_limit) || 0),
                ...(form.bandwidth_limit_gb !== ''
                    ? { bandwidth_limit_gb: Math.max(0, Number(form.bandwidth_limit_gb) || 0) }
                    : {}),
                database_limit: Math.max(0, Number(form.database_limit) || 0),
                mailbox_limit: Math.max(0, Number(form.mailbox_limit) || 0),
                domains,
                ssl: form.ssl,
                document_root: form.document_root.trim() || undefined,
                skip_scripts: form.skip_scripts,
                start_on_completion: form.start_on_completion,
            });

            const createdUuid = data?.data?.webspace?.uuid as string | undefined;
            if (createdUuid && domainRoutes.some((r) => r.domain.trim())) {
                await axios.patch(`/api/admin/webspaces/${createdUuid}`, {
                    domain_routes: domainRoutes.filter((r) => r.domain.trim()),
                    domains,
                });
            }
            if (status === 202 || data?.data?.installing) {
                toast.success(t('admin.webSpaces.messages.install_started'), { id: toastId });
            } else {
                toast.success(t('admin.webSpaces.messages.created'), { id: toastId });
            }

            if (createdUuid) {
                router.push(`/admin/webspaces/${createdUuid}/install`);
            } else {
                router.push('/admin/webspaces');
            }
        } catch (error) {
            console.error(error);
            if (isAxiosError(error)) {
                const partialUuid = error.response?.data?.data?.webspace?.uuid as string | undefined;
                if (partialUuid) {
                    toast.warning(t('admin.webSpaces.messages.create_partial'), { id: toastId });
                    router.push(`/admin/webspaces/${partialUuid}`);
                    return;
                }
                if (error.response?.data?.error_code === 'HOSTING_NOT_READY') {
                    const checks = error.response?.data?.data?.blocking_checks as InfrastructureCheck[] | undefined;
                    if (checks?.length) {
                        setCreateBlockingChecks(checks);
                    }
                }
                const msg = error.response?.data?.message || t('admin.webSpaces.messages.create_failed');
                toast.error(msg, { id: toastId });
                return;
            }
            toast.error(t('admin.webSpaces.messages.create_failed'), { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className='mx-auto max-w-5xl pb-20'>
            <PageHeader
                title={t('admin.webSpaces.form.create_title')}
                description={t('admin.webSpaces.form.create_description')}
                icon={AppWindow}
                actions={
                    <Button variant='outline' onClick={() => router.push('/admin/webspaces')}>
                        <X className='mr-2 h-4 w-4' />
                        {t('admin.servers.form.cancel')}
                    </Button>
                }
            />

            {createBlockingChecks && createBlockingChecks.length > 0 && (
                <div className='mt-6'>
                    <BlockingChecksList
                        checks={createBlockingChecks}
                        title={t('admin.webSpaces.form.blocking_checks_title')}
                    />
                </div>
            )}

            <div className='bg-card/50 border-border/50 mt-8 mb-12 rounded-2xl border p-6 backdrop-blur-xl'>
                <StepIndicator steps={wizardSteps} currentStep={currentStep} />
                {loadingOptions && (
                    <p className='text-muted-foreground mt-4 flex items-center gap-2 text-sm'>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        {t('common.loading')}
                    </p>
                )}
            </div>

            <div className='min-h-[400px]'>
                {currentStep === 1 && (
                    <div className='space-y-8'>
                        <PageCard
                            title={t('admin.webSpaces.wizard.step1_title')}
                            icon={Settings}
                            className='animate-in fade-in-0 slide-in-from-right-4 duration-300'
                        >
                            <div className='space-y-6'>
                                <div className='space-y-3'>
                                    <Label className='flex items-center gap-1.5'>
                                        {t('admin.webSpaces.form.web_node')}
                                        <span className='font-bold text-red-500'>*</span>
                                    </Label>
                                    <Select
                                        value={form.web_node_id}
                                        onChange={(e) => setForm({ ...form, web_node_id: e.target.value })}
                                        className='bg-muted/30 h-11 rounded-xl'
                                    >
                                        <option value=''>{t('admin.webSpaces.form.web_node_placeholder')}</option>
                                        {nodes.map((node) => (
                                            <option key={node.id} value={String(node.id)}>
                                                {node.name}
                                                {node.fqdn ? ` (${node.fqdn})` : ''}
                                            </option>
                                        ))}
                                    </Select>
                                    <p className='text-muted-foreground text-xs'>{t('admin.webSpaces.node_help')}</p>
                                </div>

                                <div className='space-y-3'>
                                    <Label className='flex items-center gap-1.5'>
                                        <LayoutTemplate className='h-4 w-4' />
                                        {t('admin.webSpaces.form.webplate')}
                                        <span className='font-bold text-red-500'>*</span>
                                    </Label>
                                    <Select
                                        value={form.webplate_id}
                                        onChange={(e) => setForm({ ...form, webplate_id: e.target.value })}
                                        className='bg-muted/30 h-11 rounded-xl'
                                    >
                                        <option value=''>{t('admin.webSpaces.form.webplate_placeholder')}</option>
                                        {plates.map((plate) => (
                                            <option key={plate.id} value={String(plate.id)}>
                                                {plate.name} ({plate.runtime})
                                            </option>
                                        ))}
                                    </Select>
                                    <p className='text-muted-foreground text-xs'>
                                        {t('admin.webSpaces.webplate_help')}
                                    </p>
                                    {plates.length === 0 && !loadingOptions && (
                                        <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 p-4'>
                                            <p className='text-sm font-medium text-amber-700 dark:text-amber-300'>
                                                {t('admin.webSpaces.create_webplate_first')}
                                            </p>
                                            <Button
                                                type='button'
                                                variant='link'
                                                className='mt-1 h-auto p-0 text-amber-700 dark:text-amber-300'
                                                onClick={() => router.push('/admin/webplates/create')}
                                            >
                                                {t('admin.webPlates.create')}
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                <div className='space-y-3'>
                                    <Label>{t('admin.webSpaces.form.document_root')}</Label>
                                    <Input
                                        value={form.document_root}
                                        onChange={(e) => setForm({ ...form, document_root: e.target.value })}
                                        placeholder={selectedPlate?.document_root || 'public'}
                                        className='bg-muted/30 h-11'
                                    />
                                    <p className='text-muted-foreground text-xs'>
                                        {t('admin.webSpaces.form.document_root_help')}
                                    </p>
                                </div>
                            </div>
                        </PageCard>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className='space-y-8'>
                        <PageCard
                            title={t('admin.webSpaces.wizard.step2_title')}
                            icon={HardDrive}
                            className='animate-in fade-in-0 slide-in-from-right-4 duration-300'
                        >
                            <p className='text-muted-foreground mb-6 text-sm'>
                                {t('admin.webSpaces.wizard.step2_subtitle')}
                            </p>
                            {hostingPackages.length > 0 && (
                                <div className='mb-6 space-y-3'>
                                    <Label>{t('admin.webSpaces.form.hostingPackage')}</Label>
                                    <Select
                                        value={form.hosting_package_id}
                                        onChange={(e) => {
                                            const id = e.target.value;
                                            const pkg = hostingPackages.find((p) => String(p.id) === id);
                                            setForm((prev) => ({
                                                ...prev,
                                                hosting_package_id: id,
                                                ...(pkg
                                                    ? {
                                                          disk: String(pkg.disk),
                                                          cpu_limit: String(pkg.cpu_limit),
                                                          memory_limit: String(pkg.memory_limit),
                                                          bandwidth_limit_gb: String(pkg.bandwidth_limit_gb ?? 0),
                                                          database_limit: String(pkg.database_limit),
                                                          mailbox_limit: String(pkg.mailbox_limit),
                                                          webplate_id: pkg.webplate_id
                                                              ? String(pkg.webplate_id)
                                                              : prev.webplate_id,
                                                      }
                                                    : {}),
                                            }));
                                        }}
                                        className='bg-muted/30 h-11 rounded-xl'
                                    >
                                        <option value=''>{t('admin.webSpaces.form.hostingPackageNone')}</option>
                                        {hostingPackages.map((pkg) => (
                                            <option key={pkg.id} value={String(pkg.id)}>
                                                {pkg.name}
                                            </option>
                                        ))}
                                    </Select>
                                    <p className='text-muted-foreground text-xs'>
                                        {t('admin.webSpaces.form.hostingPackageHelp')}
                                    </p>
                                </div>
                            )}
                            <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
                                <div className='space-y-3'>
                                    <Label className='flex items-center gap-1.5'>
                                        <HardDrive className='h-4 w-4' />
                                        {t('admin.webSpaces.form.disk')}
                                    </Label>
                                    <Input
                                        type='number'
                                        min={1}
                                        value={form.disk}
                                        onChange={(e) => setForm({ ...form, disk: e.target.value })}
                                        className='bg-muted/30 h-11'
                                    />
                                </div>
                                <div className='space-y-3'>
                                    <Label>{t('admin.webSpaces.form.cpu_limit')}</Label>
                                    <Input
                                        type='number'
                                        min={0}
                                        step={0.1}
                                        value={form.cpu_limit}
                                        onChange={(e) => setForm({ ...form, cpu_limit: e.target.value })}
                                        className='bg-muted/30 h-11'
                                    />
                                    <p className='text-muted-foreground text-xs'>
                                        {t('admin.webSpaces.form.cpu_limit_help')}
                                    </p>
                                </div>
                                <div className='space-y-3'>
                                    <Label>{t('admin.webSpaces.form.memory_limit')}</Label>
                                    <Input
                                        type='number'
                                        min={0}
                                        value={form.memory_limit}
                                        onChange={(e) => setForm({ ...form, memory_limit: e.target.value })}
                                        className='bg-muted/30 h-11'
                                    />
                                    <p className='text-muted-foreground text-xs'>
                                        {t('admin.webSpaces.form.memory_limit_help')}
                                    </p>
                                </div>
                                <div className='space-y-3'>
                                    <Label>{t('admin.webSpaces.form.bandwidth_limit_gb')}</Label>
                                    <Input
                                        type='number'
                                        min={0}
                                        value={form.bandwidth_limit_gb}
                                        onChange={(e) => setForm({ ...form, bandwidth_limit_gb: e.target.value })}
                                        placeholder={t('admin.webSpaces.form.bandwidth_limit_gb_placeholder')}
                                        className='bg-muted/30 h-11'
                                    />
                                    <p className='text-muted-foreground text-xs'>
                                        {t('admin.webSpaces.form.bandwidth_limit_gb_help')}
                                    </p>
                                </div>
                                <div className='space-y-3'>
                                    <Label>{t('admin.webSpaces.database_limit')}</Label>
                                    <Input
                                        type='number'
                                        min={0}
                                        value={form.database_limit}
                                        onChange={(e) => setForm({ ...form, database_limit: e.target.value })}
                                        className='bg-muted/30 h-11'
                                    />
                                </div>
                                <div className='space-y-3 sm:col-span-2'>
                                    <Label>{t('admin.webSpaces.mailbox_limit')}</Label>
                                    <Input
                                        type='number'
                                        min={0}
                                        value={form.mailbox_limit}
                                        onChange={(e) => setForm({ ...form, mailbox_limit: e.target.value })}
                                        className='bg-muted/30 h-11'
                                    />
                                </div>
                            </div>
                        </PageCard>

                        <PageCard
                            title={t('admin.webSpaces.form.domains')}
                            icon={Globe}
                            className='animate-in fade-in-0 slide-in-from-right-4 duration-300'
                        >
                            <div className='space-y-3'>
                                <Label>{t('admin.webSpaces.form.domains')}</Label>
                                <WebSpaceDomainsManager value={domainRoutes} onChange={setDomainRoutes} />
                                <p className='text-muted-foreground text-xs'>
                                    {t('admin.webSpaces.form.domains_help')}
                                </p>
                                <WebSpaceSslDnsGuide
                                    ssl={form.ssl}
                                    nodeFqdn={nodes.find((n) => String(n.id) === form.web_node_id)?.fqdn}
                                    variant='compact'
                                />
                            </div>
                        </PageCard>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className='space-y-8'>
                        <PageCard
                            title={t('admin.webSpaces.wizard.step3_title')}
                            icon={AppWindow}
                            className='animate-in fade-in-0 slide-in-from-right-4 duration-300'
                        >
                            <div className='space-y-6'>
                                <div className='space-y-3'>
                                    <Label className='flex items-center gap-1.5'>
                                        {t('admin.webSpaces.form.name')}
                                        <span className='font-bold text-red-500'>*</span>
                                    </Label>
                                    <Input
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        placeholder={t('admin.webSpaces.form.name_placeholder')}
                                        className='bg-muted/30 h-11'
                                    />
                                </div>

                                <div className='space-y-3'>
                                    <Label>{t('admin.webSpaces.form.description')}</Label>
                                    <Textarea
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        rows={3}
                                        className='bg-muted/30'
                                    />
                                </div>

                                <div className='space-y-3'>
                                    <Label className='flex items-center gap-1.5'>
                                        {t('admin.webSpaces.form.owner_id')}
                                        <span className='font-bold text-red-500'>*</span>
                                    </Label>
                                    <div className='flex gap-2'>
                                        <div
                                            role='button'
                                            tabIndex={0}
                                            className='bg-muted/30 border-border/50 focus-visible:ring-ring flex h-11 flex-1 cursor-pointer items-center rounded-xl border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
                                            onClick={openOwnerModal}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    openOwnerModal();
                                                }
                                            }}
                                        >
                                            {selectedOwner ? (
                                                <div className='flex items-center gap-2'>
                                                    <UserCircle className='text-primary h-4 w-4' />
                                                    <span className='text-foreground font-medium'>
                                                        {selectedOwner.username}
                                                    </span>
                                                    <span className='text-muted-foreground'>
                                                        ({selectedOwner.email})
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className='text-muted-foreground'>
                                                    {t('admin.servers.form.select_owner')}
                                                </span>
                                            )}
                                        </div>
                                        <Button
                                            type='button'
                                            size='icon'
                                            onClick={openOwnerModal}
                                            className='h-11 w-11'
                                        >
                                            <Search className='h-4 w-4' />
                                        </Button>
                                        {selectedOwner && (
                                            <Button
                                                type='button'
                                                size='icon'
                                                variant='ghost'
                                                onClick={() => {
                                                    setSelectedOwner(null);
                                                    setForm((prev) => ({ ...prev, owner_id: '' }));
                                                }}
                                                className='h-11 w-11'
                                            >
                                                ×
                                            </Button>
                                        )}
                                    </div>
                                    <p className='text-muted-foreground text-xs'>
                                        {t('admin.webSpaces.form.owner_id_help')}
                                    </p>
                                </div>

                                <div className='bg-muted/20 border-border/50 flex items-center justify-between rounded-xl border p-4'>
                                    <div className='space-y-0.5'>
                                        <Label>{t('admin.webSpaces.form.ssl')}</Label>
                                        <p className='text-muted-foreground text-xs'>
                                            {t('admin.webSpaces.form.ssl_help')}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={form.ssl}
                                        onCheckedChange={(checked) => setForm({ ...form, ssl: checked })}
                                    />
                                </div>

                                <div className='bg-muted/20 border-border/50 flex items-center justify-between rounded-xl border p-4'>
                                    <div className='space-y-0.5'>
                                        <Label>{t('admin.webSpaces.form.skip_scripts')}</Label>
                                    </div>
                                    <Switch
                                        checked={form.skip_scripts}
                                        onCheckedChange={(checked) => setForm({ ...form, skip_scripts: checked })}
                                    />
                                </div>

                                <div className='bg-muted/20 border-border/50 flex items-center justify-between rounded-xl border p-4'>
                                    <div className='space-y-0.5'>
                                        <Label>{t('admin.webSpaces.form.start_on_completion')}</Label>
                                    </div>
                                    <Switch
                                        checked={form.start_on_completion}
                                        onCheckedChange={(checked) =>
                                            setForm({ ...form, start_on_completion: checked })
                                        }
                                    />
                                </div>
                            </div>
                        </PageCard>
                    </div>
                )}
            </div>

            <div className='bg-card/50 border-border/50 mt-8 flex items-center justify-between rounded-2xl border p-6 backdrop-blur-xl'>
                <Button
                    type='button'
                    variant='outline'
                    onClick={handlePrevious}
                    disabled={currentStep === 1}
                    className='gap-2'
                >
                    <ChevronLeft className='h-4 w-4' />
                    {t('admin.servers.form.wizard.previous')}
                </Button>

                <span className='text-muted-foreground text-sm'>
                    {t('admin.servers.form.wizard.step', {
                        current: String(currentStep),
                        total: String(totalSteps),
                    })}
                </span>

                {currentStep < totalSteps ? (
                    <Button
                        type='button'
                        onClick={handleNext}
                        disabled={currentStep === 1 && !canProceedStep1}
                        className='gap-2'
                    >
                        {t('admin.servers.form.wizard.next')}
                        <ChevronRight className='h-4 w-4' />
                    </Button>
                ) : (
                    <Button
                        type='button'
                        onClick={handleCreate}
                        disabled={!canCreate || saving}
                        loading={saving}
                        className='gap-2'
                    >
                        <Plus className='h-4 w-4' />
                        {t('admin.webSpaces.form.submit_create')}
                    </Button>
                )}
            </div>

            <OwnerPickerSheet
                open={ownerModalOpen}
                onOpenChange={setOwnerModalOpen}
                owners={owners}
                ownerSearch={ownerSearch}
                setOwnerSearch={setOwnerSearch}
                ownerPagination={ownerPagination}
                setOwnerPagination={setOwnerPagination}
                fetchOwners={fetchOwners}
                onSelectOwner={handleSelectOwner}
            />
        </div>
    );
}
