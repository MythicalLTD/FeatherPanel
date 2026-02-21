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

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/featherui/PageHeader';
import {
    Save,
    Server,
    Cpu,
    Wand2,
    Shield,
    Terminal,
    Network,
    Settings,
    ArrowLeft,
    Loader2,
    Search as SearchIcon,
    Box,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetContent } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { HeadlessModal } from '@/components/ui/headless-modal';
import { toast } from 'sonner';

import { DetailsTab } from './DetailsTab';
import { ResourcesTab } from './ResourcesTab';
import { ApplicationTab } from './ApplicationTab';
import { LimitsTab } from './LimitsTab';
import { StartupTab } from './StartupTab';
import { AllocationsTab } from './AllocationsTab';
import { ActionsTab } from './ActionsTab';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

import {
    ServerFormData,
    SelectedEntities,
    User,
    Location,
    Node,
    Allocation,
    Realm,
    Spell,
    SpellVariable,
} from './types';

const initialFormData: ServerFormData = {
    name: '',
    description: '',
    owner_id: null,
    skip_scripts: false,
    skip_zerotrust: false,
    external_id: '',
    realms_id: null,
    spell_id: null,
    image: '',
    startup: '',
    memory: 1024,
    swap: 0,
    disk: 5120,
    cpu: 0,
    io: 500,
    oom_killer: true,
    threads: '',
    database_limit: 0,
    allocation_limit: 1,
    backup_limit: 0,
    allocation_id: null,
    variables: {},
};

const initialSelectedEntities: SelectedEntities = {
    owner: null,
    realm: null,
    spell: null,
    allocation: null,
};

interface ServerVariableResponse {
    variable_id: number;
    name: string;
    description: string;
    env_variable: string;
    default_value: string;
    user_viewable: number;
    user_editable: number;
    rules: string;
    field_type: string;
    variable_value?: string;
}

export default function EditServerPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const params = useParams();
    const serverId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('details');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [form, setForm] = useState<ServerFormData>(initialFormData);
    const [selectedEntities, setSelectedEntities] = useState<SelectedEntities>(initialSelectedEntities);
    const [isSuspended, setIsSuspended] = useState(false);

    const [location, setLocation] = useState<Location | null>(null);
    const [node, setNode] = useState<Node | null>(null);

    const [spellDetails, setSpellDetails] = useState<Spell | null>(null);
    const [spellVariables, setSpellVariables] = useState<SpellVariable[]>([]);
    const [dockerImages, setDockerImages] = useState<string[]>([]);

    const [ownerModalOpen, setOwnerModalOpen] = useState(false);
    const [realmModalOpen, setRealmModalOpen] = useState(false);
    const [spellModalOpen, setSpellModalOpen] = useState(false);
    const [allocationModalOpen, setAllocationModalOpen] = useState(false);

    const [owners, setOwners] = useState<User[]>([]);
    const [realms, setRealms] = useState<Realm[]>([]);
    const [spells, setSpells] = useState<Spell[]>([]);
    const [allocations, setAllocations] = useState<Allocation[]>([]);

    const [ownerPagination, setOwnerPagination] = useState({
        current_page: 1,
        per_page: 10,
        total_records: 0,
        total_pages: 1,
        has_next: false,
        has_prev: false,
    });
    const [ownerSearch, setOwnerSearch] = useState('');
    const [debouncedOwnerSearch, setDebouncedOwnerSearch] = useState('');

    const [realmPagination, setRealmPagination] = useState({
        current_page: 1,
        per_page: 10,
        total_records: 0,
        total_pages: 1,
        has_next: false,
        has_prev: false,
    });
    const [realmSearch, setRealmSearch] = useState('');
    const [debouncedRealmSearch, setDebouncedRealmSearch] = useState('');

    const [spellPagination, setSpellPagination] = useState({
        current_page: 1,
        per_page: 10,
        total_records: 0,
        total_pages: 1,
        has_next: false,
        has_prev: false,
    });
    const [spellSearch, setSpellSearch] = useState('');
    const [debouncedSpellSearch, setDebouncedSpellSearch] = useState('');

    const [allocationSearch, setAllocationSearch] = useState('');

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-servers-edit');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const filteredAllocations = useMemo(() => {
        if (!allocationSearch) return allocations;
        const lowerSearch = allocationSearch.toLowerCase();
        return allocations.filter((a) => {
            return (
                a.ip.toLowerCase().includes(lowerSearch) ||
                String(a.port).includes(lowerSearch) ||
                (a.ip_alias && a.ip_alias.toLowerCase().includes(lowerSearch))
            );
        });
    }, [allocations, allocationSearch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedOwnerSearch(ownerSearch);
            setOwnerPagination((prev) => ({ ...prev, current_page: 1 }));
        }, 500);
        return () => clearTimeout(timer);
    }, [ownerSearch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedRealmSearch(realmSearch);
            setRealmPagination((prev) => ({ ...prev, current_page: 1 }));
        }, 500);
        return () => clearTimeout(timer);
    }, [realmSearch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSpellSearch(spellSearch);
            setSpellPagination((prev) => ({ ...prev, current_page: 1 }));
        }, 500);
        return () => clearTimeout(timer);
    }, [spellSearch]);

    const originalSpellId = useRef<number | null>(null);
    const originalVariables = useRef<Record<string, string>>({});
    const hasInitialLoaded = useRef(false);

    const fetchServerData = useCallback(async () => {
        setLoading(true);
        hasInitialLoaded.current = false;
        try {
            const [serverRes, locationsRes] = await Promise.all([
                axios.get(`/api/admin/servers/${serverId}`),
                axios.get('/api/admin/locations'),
            ]);

            const data = serverRes.data;
            const locationsData = locationsRes.data;

            if (data.success && data.data) {
                const server = data.data;
                const serverNode = server.node;
                const serverOwner = server.owner;
                const serverRealm = server.realm;
                const serverSpell = server.spell;
                const serverAllocation = server.allocation;

                let serverLocation: Location | null = null;
                if (locationsData.success && locationsData.data?.locations && serverNode?.location_id) {
                    serverLocation =
                        locationsData.data.locations.find((loc: Location) => loc.id === serverNode.location_id) || null;
                }

                const variablesList = (server.variables || []) as ServerVariableResponse[];
                const mappedVariables: SpellVariable[] = variablesList.map((v) => ({
                    id: v.variable_id,
                    name: v.name,
                    description: v.description,
                    env_variable: v.env_variable,
                    default_value: v.default_value,
                    user_viewable: v.user_viewable,
                    user_editable: v.user_editable,
                    rules: v.rules,
                    field_type: v.field_type,
                }));

                setSpellVariables(mappedVariables);

                const variablesMap: Record<string, string> = {};
                variablesList.forEach((v) => {
                    if (v.env_variable) {
                        variablesMap[v.env_variable] =
                            v.variable_value !== undefined && v.variable_value !== null
                                ? v.variable_value
                                : v.default_value;
                    }
                });

                if (server.spell_id) {
                    originalSpellId.current = server.spell_id;
                    originalVariables.current = variablesMap;
                }

                setForm({
                    name: server.name || '',
                    description: server.description || '',
                    owner_id: server.owner_id,
                    skip_scripts: Boolean(server.skip_scripts),
                    skip_zerotrust: Boolean(server.skip_zerotrust),
                    external_id: server.external_id || '',
                    realms_id: server.realms_id,
                    spell_id: server.spell_id,
                    image: server.image || '',
                    startup: server.startup || '',
                    memory: server.memory,
                    swap: server.swap,
                    disk: server.disk,
                    cpu: server.cpu,
                    io: server.io,
                    oom_killer: !Boolean(server.oom_disabled),
                    threads: server.threads || '',
                    database_limit: server.database_limit,
                    allocation_limit: server.allocation_limit,
                    backup_limit: server.backup_limit,
                    allocation_id: server.allocation_id,
                    variables: variablesMap,
                });

                setIsSuspended(Boolean(server.suspended));
                setNode(serverNode || null);
                setLocation(serverLocation);

                setSelectedEntities({
                    owner: serverOwner || null,
                    realm: serverRealm || null,
                    spell: serverSpell || null,
                    allocation: serverAllocation || null,
                });

                if (serverSpell) {
                    setSpellDetails(serverSpell);
                    try {
                        const images = JSON.parse(serverSpell.docker_images);
                        setDockerImages(Object.values(images));
                    } catch {
                        setDockerImages([]);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching server:', error);
            toast.error(t('admin.servers.edit.fetch_failed'));
            router.push('/admin/servers');
        } finally {
            setLoading(false);
        }
    }, [serverId, router, t]);

    useEffect(() => {
        fetchServerData();
    }, [fetchServerData]);

    useEffect(() => {
        if (!form.spell_id) {
            setSpellDetails(null);
            setSpellVariables([]);
            setDockerImages([]);
            return;
        }

        const fetchSpellDetails = async () => {
            const isOriginal = originalSpellId.current && form.spell_id == originalSpellId.current;

            try {
                const [spellRes, variablesRes] = await Promise.all([
                    axios.get(`/api/admin/spells/${form.spell_id}`),
                    axios.get(`/api/admin/spells/${form.spell_id}/variables`),
                ]);

                if (spellRes.data.success) {
                    const spell = spellRes.data.data.spell;
                    setSpellDetails(spell);

                    try {
                        const images = JSON.parse(spell.docker_images);
                        const imageList = Object.values(images) as string[];
                        setDockerImages(imageList);

                        setForm((prev) => {
                            if (!imageList.includes(prev.image)) {
                                return { ...prev, image: imageList[0] || '' };
                            }
                            return prev;
                        });
                    } catch {
                        setDockerImages([]);
                    }

                    if (variablesRes.data.success) {
                        const newVariables = variablesRes.data.data.variables;

                        if (Array.isArray(newVariables)) {
                            setSpellVariables(newVariables);

                            if (isOriginal && !hasInitialLoaded.current) {
                                hasInitialLoaded.current = true;
                            } else {
                                const newVariablesMap: Record<string, string> = {};
                                newVariables.forEach((v: SpellVariable) => {
                                    newVariablesMap[v.env_variable] = v.default_value;
                                });
                                setForm((prev) => ({ ...prev, variables: newVariablesMap }));
                            }
                        } else {
                            setSpellVariables([]);
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching spell details:', error);
            }
        };

        fetchSpellDetails();
    }, [form.spell_id]);

    const fetchOwners = useCallback(async () => {
        try {
            const currentPage = ownerPagination.current_page;
            const perPage = ownerPagination.per_page;

            const { data } = await axios.get('/api/admin/users', {
                params: {
                    page: currentPage,
                    per_page: perPage,
                    search: debouncedOwnerSearch,
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
            console.error('Error fetching owners:', error);
        }
    }, [ownerPagination.current_page, ownerPagination.per_page, debouncedOwnerSearch]);

    useEffect(() => {
        if (ownerModalOpen) {
            fetchOwners();
        }
    }, [ownerModalOpen, ownerPagination.current_page, debouncedOwnerSearch, fetchOwners]);

    const fetchRealms = useCallback(async () => {
        try {
            const currentPage = realmPagination.current_page;
            const perPage = realmPagination.per_page;

            const { data } = await axios.get('/api/admin/realms', {
                params: {
                    page: currentPage,
                    limit: perPage,
                    search: debouncedRealmSearch,
                },
            });
            setRealms(data.data.realms || []);
            if (data.data.pagination) {
                setRealmPagination((prev) => ({
                    ...prev,
                    ...data.data.pagination,
                }));
            }
        } catch (error) {
            console.error('Error fetching realms:', error);
        }
    }, [realmPagination.current_page, realmPagination.per_page, debouncedRealmSearch]);

    useEffect(() => {
        if (realmModalOpen) {
            fetchRealms();
        }
    }, [realmModalOpen, realmPagination.current_page, debouncedRealmSearch, fetchRealms]);

    const fetchSpells = useCallback(async () => {
        if (!form.realms_id) return;
        try {
            const currentPage = spellPagination.current_page;
            const perPage = spellPagination.per_page;

            const { data } = await axios.get('/api/admin/spells', {
                params: {
                    page: currentPage,
                    limit: perPage,
                    search: debouncedSpellSearch,
                    realm_id: form.realms_id,
                },
            });
            setSpells(data.data.spells || []);
            if (data.data.pagination) {
                setSpellPagination((prev) => ({
                    ...prev,
                    ...data.data.pagination,
                }));
            }
        } catch (error) {
            console.error('Error fetching spells:', error);
        }
    }, [form.realms_id, spellPagination.current_page, spellPagination.per_page, debouncedSpellSearch]);

    useEffect(() => {
        if (spellModalOpen && form.realms_id) {
            fetchSpells();
        }
    }, [spellModalOpen, form.realms_id, spellPagination.current_page, debouncedSpellSearch, fetchSpells]);

    const fetchAllocations = async () => {
        if (!node?.id) return;
        try {
            const { data } = await axios.get('/api/admin/allocations', { params: { not_used: true } });
            const allAllocations = data.data.allocations || [];

            const filtered = allAllocations.filter((a: Allocation) => a.node_id === node.id);

            if (form.allocation_id && selectedEntities.allocation) {
                if (!filtered.find((a: Allocation) => a.id === form.allocation_id)) {
                    filtered.push(selectedEntities.allocation);
                }
            }

            setAllocations(filtered);
        } catch (error) {
            console.error('Error fetching allocations:', error);
        }
    };

    const [allocationsRefreshTrigger, setAllocationsRefreshTrigger] = useState(0);

    const handleSelectOwner = (owner: User) => {
        setSelectedEntities((prev) => ({ ...prev, owner }));
        setForm((prev) => ({ ...prev, owner_id: owner.id }));
        setOwnerModalOpen(false);
    };

    const handleSelectRealm = (realm: Realm) => {
        setSelectedEntities((prev) => ({ ...prev, realm, spell: null }));
        setForm((prev) => ({ ...prev, realms_id: realm.id, spell_id: null }));
        setRealmModalOpen(false);
    };

    const handleSelectSpell = (spell: Spell) => {
        setSelectedEntities((prev) => ({ ...prev, spell }));
        setForm((prev) => ({ ...prev, spell_id: spell.id }));
        setSpellModalOpen(false);
    };

    const handleSelectAllocation = async (allocation: Allocation) => {
        if (activeTab === 'allocations') {
            try {
                const { data } = await axios.post(`/api/admin/servers/${serverId}/allocations`, {
                    allocation_id: allocation.id,
                });

                if (data.success) {
                    toast.success(t('admin.servers.edit.allocations.assign_success'));
                    setAllocationsRefreshTrigger((prev) => prev + 1);
                } else {
                    toast.error(data.message || t('admin.servers.edit.allocations.assign_failed'));
                }
            } catch (error) {
                console.error('Error assigning allocation:', error);
                toast.error(t('admin.servers.edit.allocations.assign_failed'));
            }
        } else {
            setSelectedEntities((prev) => ({ ...prev, allocation }));
            setForm((prev) => ({ ...prev, allocation_id: allocation.id }));
        }
        setAllocationModalOpen(false);
    };

    const validate = useCallback(() => {
        const newErrors: Record<string, string> = {};
        if (!form.name) newErrors.name = t('admin.servers.form.wizard.validation.name_required');
        if (!form.owner_id) newErrors.owner_id = t('admin.servers.form.wizard.validation.owner_required');
        if (!form.realms_id) newErrors.realms_id = t('admin.servers.form.wizard.validation.realm_required');
        if (!form.spell_id) newErrors.spell_id = t('admin.servers.form.wizard.validation.spell_required');
        if (!form.startup) newErrors.startup = t('admin.servers.form.wizard.validation.startup_required');

        spellVariables.forEach((variable) => {
            const value = form.variables[variable.env_variable];

            if (variable.rules.includes('required')) {
                const effectiveValue = value ?? variable.default_value ?? '';
                if (!effectiveValue || (typeof effectiveValue === 'string' && effectiveValue.trim() === '')) {
                    newErrors[variable.env_variable] = `${variable.name} is required`;
                    return;
                }
            }

            if (!value || (typeof value === 'string' && value.trim() === '')) {
                return;
            }

            switch (variable.field_type) {
                case 'numeric': {
                    if (!/^[0-9]+$/.test(value)) {
                        newErrors[variable.env_variable] = `${variable.name} must be numeric`;
                    }
                    break;
                }
                case 'email': {
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                        newErrors[variable.env_variable] = `${variable.name} must be a valid email`;
                    }
                    break;
                }
                case 'url': {
                    if (!/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(value)) {
                        newErrors[variable.env_variable] = `${variable.name} must be a valid URL`;
                    }
                    break;
                }
                case 'port': {
                    const port = parseInt(value);
                    if (isNaN(port) || port < 1 || port > 65535) {
                        newErrors[variable.env_variable] = `${variable.name} must be a valid port (1-65535)`;
                    }
                    break;
                }
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [form, t, spellVariables]);

    const handleSubmit = async () => {
        if (!validate()) {
            toast.error(t('admin.servers.form.wizard.validation_error'));
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name: form.name,
                description: form.description?.trim() || null,
                owner_id: form.owner_id,
                skip_scripts: form.skip_scripts,
                skip_zerotrust: form.skip_zerotrust,
                external_id: form.external_id?.trim() || null,
                realms_id: form.realms_id,
                spell_id: form.spell_id,
                image: form.image,
                startup: form.startup,
                memory: form.memory,
                swap: form.swap,
                disk: form.disk,
                cpu: form.cpu,
                io: form.io,
                oom_killer: form.oom_killer,
                threads: form.threads?.trim() || null,
                database_limit: form.database_limit,
                allocation_limit: form.allocation_limit,
                backup_limit: form.backup_limit,
                allocation_id: form.allocation_id,
                variables: Object.entries(form.variables)
                    .map(([key, value]) => {
                        const sv = spellVariables.find((v) => v.env_variable === key);
                        if (!sv) return null;
                        return { variable_id: sv.id, variable_value: String(value ?? '') };
                    })
                    .filter((v) => v !== null),
            };

            const { data } = await axios.patch(`/api/admin/servers/${serverId}`, payload);

            if (data.success) {
                toast.success(t('admin.servers.edit.update_success'));
                fetchServerData();
            } else {
                toast.error(data.message || t('admin.servers.edit.update_failed'));
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.message || t('admin.servers.edit.update_failed'));
            } else {
                toast.error(t('admin.servers.edit.update_failed'));
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className='flex items-center justify-center p-12'>
                <Loader2 className='w-8 h-8 animate-spin text-primary' />
            </div>
        );
    }

    const tabs = [
        { id: 'details', label: t('admin.servers.edit.tabs.details'), icon: Server },
        { id: 'resources', label: t('admin.servers.edit.tabs.resources'), icon: Cpu },
        { id: 'application', label: t('admin.servers.edit.tabs.application'), icon: Wand2 },
        { id: 'limits', label: t('admin.servers.edit.tabs.limits'), icon: Shield },
        { id: 'startup', label: t('admin.servers.edit.tabs.startup'), icon: Terminal },
        { id: 'allocations', label: t('admin.servers.edit.tabs.allocations'), icon: Network },
        { id: 'actions', label: t('admin.servers.edit.tabs.actions'), icon: Settings },
    ];

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-servers-edit', 'top-of-page')} context={{ id: serverId }} />

            <PageHeader
                title={t('admin.servers.edit.title')}
                description={t('admin.servers.edit.description', { name: form.name })}
                icon={Server}
                actions={
                    <div className='flex gap-2'>
                        <Button variant='outline' onClick={() => router.back()}>
                            <ArrowLeft className='h-4 w-4 mr-2' />
                            {t('common.back')}
                        </Button>
                        <Button onClick={handleSubmit} loading={saving}>
                            <Save className='h-4 w-4 mr-2' />
                            {t('admin.servers.edit.save')}
                        </Button>
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-servers-edit', 'after-header')} context={{ id: serverId }} />

            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                orientation='vertical'
                className='w-full flex flex-col md:flex-row gap-6'
            >
                <aside className='w-full md:w-64 shrink-0 overflow-x-auto md:overflow-visible pb-2 md:pb-0'>
                    <TabsList className='flex flex-row md:flex-col h-auto w-max md:w-full bg-card/30 border border-border/50 p-2 rounded-2xl gap-2 md:gap-1'>
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <TabsTrigger
                                    key={tab.id}
                                    value={tab.id}
                                    className='w-auto md:w-full justify-start px-4 py-3 h-auto text-sm md:text-base font-normal data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-medium transition-all rounded-xl border border-transparent data-[state=active]:border-primary/10 whitespace-nowrap'
                                >
                                    <Icon className='w-4 h-4 mr-3' />
                                    {tab.label}
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>
                </aside>

                <div className='flex-1 space-y-6 min-w-0'>
                    <TabsContent value='details' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                        <DetailsTab
                            form={form}
                            setForm={setForm}
                            errors={errors}
                            selectedEntities={selectedEntities}
                            location={location}
                            node={node}
                            setOwnerModalOpen={setOwnerModalOpen}
                            fetchOwners={fetchOwners}
                        />
                    </TabsContent>

                    <TabsContent value='resources' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                        <ResourcesTab form={form} setForm={setForm} errors={errors} />
                    </TabsContent>

                    <TabsContent value='application' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                        <ApplicationTab
                            form={form}
                            setForm={setForm}
                            errors={errors}
                            selectedEntities={selectedEntities}
                            spellDetails={spellDetails}
                            spellVariables={spellVariables}
                            dockerImages={dockerImages}
                            setRealmModalOpen={setRealmModalOpen}
                            setSpellModalOpen={setSpellModalOpen}
                            fetchRealms={fetchRealms}
                            fetchSpells={fetchSpells}
                        />
                    </TabsContent>

                    <TabsContent value='limits' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                        <LimitsTab form={form} setForm={setForm} errors={errors} />
                    </TabsContent>

                    <TabsContent value='startup' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                        <StartupTab form={form} setForm={setForm} errors={errors} />
                    </TabsContent>

                    <TabsContent value='allocations' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                        <AllocationsTab
                            serverId={serverId}
                            selectedEntities={selectedEntities}
                            setAllocationModalOpen={setAllocationModalOpen}
                            fetchAllocations={fetchAllocations}
                            refreshTrigger={allocationsRefreshTrigger}
                        />
                    </TabsContent>

                    <TabsContent value='actions' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                        <ActionsTab
                            serverId={serverId}
                            serverName={form.name}
                            isSuspended={isSuspended}
                            onRefresh={fetchServerData}
                        />
                    </TabsContent>

                    {!['actions'].includes(activeTab) && (
                        <div className='flex justify-end'>
                            <Button onClick={handleSubmit} loading={saving}>
                                <Save className='h-4 w-4 mr-2' />
                                {t('admin.servers.edit.save')}
                            </Button>
                        </div>
                    )}
                </div>
            </Tabs>

            <Sheet open={ownerModalOpen} onOpenChange={setOwnerModalOpen}>
                <SheetContent className='sm:max-w-2xl'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.servers.form.select_owner')}</SheetTitle>
                        <SheetDescription>
                            {t('admin.servers.form.select_owner_description', {
                                total: String(ownerPagination.total_records),
                            })}
                        </SheetDescription>
                    </SheetHeader>

                    <div className='mt-6 space-y-4'>
                        <div className='relative'>
                            <SearchIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                            <Input
                                placeholder={t('admin.servers.form.search_users')}
                                value={ownerSearch}
                                onChange={(e) => setOwnerSearch(e.target.value)}
                                className='pl-10'
                            />
                        </div>

                        {ownerPagination.total_pages > 1 && (
                            <div className='flex items-center justify-between gap-2 py-2 px-3 rounded-lg border border-border bg-muted/30'>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    disabled={!ownerPagination.has_prev}
                                    onClick={() =>
                                        setOwnerPagination((prev) => ({ ...prev, current_page: prev.current_page - 1 }))
                                    }
                                    className='gap-1 h-8'
                                >
                                    <ChevronLeft className='h-3 w-3' />
                                    {t('common.previous')}
                                </Button>
                                <span className='text-xs font-medium'>
                                    {ownerPagination.current_page} / {ownerPagination.total_pages}
                                </span>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    disabled={!ownerPagination.has_next}
                                    onClick={() =>
                                        setOwnerPagination((prev) => ({ ...prev, current_page: prev.current_page + 1 }))
                                    }
                                    className='gap-1 h-8'
                                >
                                    {t('common.next')}
                                    <ChevronRight className='h-3 w-3' />
                                </Button>
                            </div>
                        )}

                        <div className='space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto'>
                            {owners.length === 0 ? (
                                <div className='text-center py-8 text-muted-foreground'>
                                    {t('admin.servers.form.no_users_found')}
                                </div>
                            ) : (
                                owners.map((user) => (
                                    <button
                                        key={user.id}
                                        onClick={() => handleSelectOwner(user)}
                                        className='w-full p-3 rounded-lg border border-border/50 hover:bg-muted/50 hover:border-primary/50 transition-colors text-left'
                                    >
                                        <div className='flex items-center gap-3'>
                                            <Avatar className='h-10 w-10'>
                                                <AvatarImage src={user.avatar} alt={user.username} />
                                            </Avatar>
                                            <div className='flex-1 min-w-0'>
                                                <div className='flex items-center gap-2'>
                                                    <span className='font-medium truncate'>{user.username}</span>
                                                    {user.role && (
                                                        <Badge
                                                            style={{
                                                                backgroundColor: `${user.role.color}20`,
                                                                color: user.role.color,
                                                                borderColor: `${user.role.color}40`,
                                                            }}
                                                            className='text-xs'
                                                        >
                                                            {user.role.display_name}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className='text-sm text-muted-foreground truncate'>
                                                    {user.email}
                                                </div>
                                                {user.last_seen && (
                                                    <div className='text-xs text-muted-foreground mt-1'>
                                                        {t('admin.users.last_seen')}:{' '}
                                                        {new Date(user.last_seen).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        {ownerPagination.total_pages > 1 && (
                            <div className='flex items-center justify-between pt-4 border-t'>
                                <div className='text-sm text-muted-foreground'>
                                    {t('common.showing', {
                                        from: String(
                                            ownerPagination.current_page * ownerPagination.per_page -
                                                ownerPagination.per_page +
                                                1,
                                        ),
                                        to: String(
                                            Math.min(
                                                ownerPagination.current_page * ownerPagination.per_page,
                                                ownerPagination.total_records,
                                            ),
                                        ),
                                        total: String(ownerPagination.total_records),
                                    })}
                                </div>
                                <div className='flex gap-2'>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={() =>
                                            setOwnerPagination((prev) => ({
                                                ...prev,
                                                current_page: prev.current_page - 1,
                                            }))
                                        }
                                        disabled={!ownerPagination.has_prev}
                                    >
                                        {t('common.previous')}
                                    </Button>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={() =>
                                            setOwnerPagination((prev) => ({
                                                ...prev,
                                                current_page: prev.current_page + 1,
                                            }))
                                        }
                                        disabled={!ownerPagination.has_next}
                                    >
                                        {t('common.next')}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            <Sheet open={realmModalOpen} onOpenChange={setRealmModalOpen}>
                <SheetContent className='sm:max-w-2xl'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.servers.form.select_realm')}</SheetTitle>
                        <SheetDescription>
                            {t('admin.servers.form.select_realm_description', {
                                total: String(realmPagination.total_records || 0),
                            })}
                        </SheetDescription>
                    </SheetHeader>

                    <div className='mt-6 space-y-4'>
                        <div className='relative'>
                            <SearchIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                            <Input
                                placeholder={t('admin.servers.form.search_realms')}
                                value={realmSearch}
                                onChange={(e) => setRealmSearch(e.target.value)}
                                className='pl-10'
                            />
                        </div>

                        {realmPagination.total_pages > 1 && (
                            <div className='flex items-center justify-between gap-2 py-2 px-3 rounded-lg border border-border bg-muted/30'>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    disabled={!realmPagination.has_prev}
                                    onClick={() =>
                                        setRealmPagination((prev) => ({
                                            ...prev,
                                            current_page: prev.current_page - 1,
                                        }))
                                    }
                                    className='gap-1 h-8'
                                >
                                    <ChevronLeft className='h-3 w-3' />
                                    {t('common.previous')}
                                </Button>
                                <span className='text-xs font-medium'>
                                    {realmPagination.current_page} / {realmPagination.total_pages}
                                </span>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    disabled={!realmPagination.has_next}
                                    onClick={() =>
                                        setRealmPagination((prev) => ({
                                            ...prev,
                                            current_page: prev.current_page + 1,
                                        }))
                                    }
                                    className='gap-1 h-8'
                                >
                                    {t('common.next')}
                                    <ChevronRight className='h-3 w-3' />
                                </Button>
                            </div>
                        )}

                        <div className='space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto'>
                            {realms.length === 0 ? (
                                <div className='text-center py-8 text-muted-foreground'>
                                    {t('admin.servers.form.no_realms_found')}
                                </div>
                            ) : (
                                realms.map((realm) => (
                                    <button
                                        key={realm.id}
                                        onClick={() => handleSelectRealm(realm)}
                                        className='w-full p-3 rounded-lg border border-border/50 hover:bg-muted/50 hover:border-primary/50 transition-colors text-left'
                                    >
                                        <div className='flex items-start gap-3'>
                                            <div className='p-2 bg-primary/10 rounded-lg mt-0.5'>
                                                <Box className='h-5 w-5 text-primary' />
                                            </div>
                                            <div className='flex-1 min-w-0'>
                                                <div className='font-medium'>{realm.name}</div>
                                                {realm.description && (
                                                    <div className='text-sm text-muted-foreground mt-1'>
                                                        {realm.description}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        {realmPagination.total_pages > 1 && (
                            <div className='flex items-center justify-between pt-4 border-t'>
                                <div className='text-sm text-muted-foreground'>
                                    {t('common.showing', {
                                        from: String(
                                            realmPagination.current_page * realmPagination.per_page -
                                                realmPagination.per_page +
                                                1,
                                        ),
                                        to: String(
                                            Math.min(
                                                realmPagination.current_page * realmPagination.per_page,
                                                realmPagination.total_records,
                                            ),
                                        ),
                                        total: String(realmPagination.total_records),
                                    })}
                                </div>
                                <div className='flex gap-2'>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={() =>
                                            setRealmPagination((prev) => ({
                                                ...prev,
                                                current_page: prev.current_page - 1,
                                            }))
                                        }
                                        disabled={!realmPagination.has_prev}
                                    >
                                        {t('common.previous')}
                                    </Button>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={() =>
                                            setRealmPagination((prev) => ({
                                                ...prev,
                                                current_page: prev.current_page + 1,
                                            }))
                                        }
                                        disabled={!realmPagination.has_next}
                                    >
                                        {t('common.next')}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            <Sheet open={spellModalOpen} onOpenChange={setSpellModalOpen}>
                <SheetContent className='sm:max-w-2xl'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.servers.form.select_spell')}</SheetTitle>
                        <SheetDescription>
                            {t('admin.servers.form.select_spell_description', {
                                total: String(spellPagination.total_records || 0),
                            })}
                        </SheetDescription>
                    </SheetHeader>

                    <div className='mt-6 space-y-4'>
                        <div className='relative'>
                            <SearchIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                            <Input
                                placeholder={t('admin.servers.form.search_spells')}
                                value={spellSearch}
                                onChange={(e) => setSpellSearch(e.target.value)}
                                className='pl-10'
                            />
                        </div>

                        {spellPagination.total_pages > 1 && (
                            <div className='flex items-center justify-between gap-2 py-2 px-3 rounded-lg border border-border bg-muted/30'>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    disabled={!spellPagination.has_prev}
                                    onClick={() =>
                                        setSpellPagination((prev) => ({
                                            ...prev,
                                            current_page: prev.current_page - 1,
                                        }))
                                    }
                                    className='gap-1 h-8'
                                >
                                    <ChevronLeft className='h-3 w-3' />
                                    {t('common.previous')}
                                </Button>
                                <span className='text-xs font-medium'>
                                    {spellPagination.current_page} / {spellPagination.total_pages}
                                </span>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    disabled={!spellPagination.has_next}
                                    onClick={() =>
                                        setSpellPagination((prev) => ({
                                            ...prev,
                                            current_page: prev.current_page + 1,
                                        }))
                                    }
                                    className='gap-1 h-8'
                                >
                                    {t('common.next')}
                                    <ChevronRight className='h-3 w-3' />
                                </Button>
                            </div>
                        )}

                        <div className='space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto'>
                            {spells.length === 0 ? (
                                <div className='text-center py-8 text-muted-foreground'>
                                    {t('admin.servers.form.no_spells_found')}
                                </div>
                            ) : (
                                spells.map((spell) => (
                                    <button
                                        key={spell.id}
                                        onClick={() => handleSelectSpell(spell)}
                                        className='w-full p-3 rounded-lg border border-border/50 hover:bg-muted/50 hover:border-primary/50 transition-colors text-left'
                                    >
                                        <div className='flex items-start gap-3'>
                                            <div className='p-2 bg-primary/10 rounded-lg mt-0.5'>
                                                <Wand2 className='h-5 w-5 text-primary' />
                                            </div>
                                            <div className='flex-1 min-w-0'>
                                                <div className='font-medium'>{spell.name}</div>
                                                {spell.description && (
                                                    <div className='text-sm text-muted-foreground mt-1'>
                                                        {spell.description}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        {spellPagination.total_pages > 1 && (
                            <div className='flex items-center justify-between pt-4 border-t'>
                                <div className='text-sm text-muted-foreground'>
                                    {t('common.showing', {
                                        from: String(
                                            spellPagination.current_page * spellPagination.per_page -
                                                spellPagination.per_page +
                                                1,
                                        ),
                                        to: String(
                                            Math.min(
                                                spellPagination.current_page * spellPagination.per_page,
                                                spellPagination.total_records,
                                            ),
                                        ),
                                        total: String(spellPagination.total_records),
                                    })}
                                </div>
                                <div className='flex gap-2'>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={() =>
                                            setSpellPagination((prev) => ({
                                                ...prev,
                                                current_page: prev.current_page - 1,
                                            }))
                                        }
                                        disabled={!spellPagination.has_prev}
                                    >
                                        {t('common.previous')}
                                    </Button>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={() =>
                                            setSpellPagination((prev) => ({
                                                ...prev,
                                                current_page: prev.current_page + 1,
                                            }))
                                        }
                                        disabled={!spellPagination.has_next}
                                    >
                                        {t('common.next')}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            <SelectionModal
                isOpen={allocationModalOpen}
                onClose={() => setAllocationModalOpen(false)}
                title={t('admin.servers.form.select_allocation')}
                items={filteredAllocations}
                onSelect={handleSelectAllocation}
                search={allocationSearch}
                onSearchChange={setAllocationSearch}
                renderItem={(item: Allocation) => (
                    <div>
                        <div className='font-medium font-mono'>
                            {item.ip}:{item.port}
                        </div>
                        {item.ip_alias && <div className='text-xs text-muted-foreground'>{item.ip_alias}</div>}
                    </div>
                )}
            />

            <WidgetRenderer widgets={getWidgets('admin-servers-edit', 'bottom-of-page')} context={{ id: serverId }} />
        </div>
    );
}

interface SelectionModalProps<T> {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    items: T[];
    onSelect: (item: T) => void;
    search: string;
    onSearchChange: (val: string) => void;
    renderItem: (item: T) => React.ReactNode;
}

function SelectionModal<T extends { id: number | string }>({
    isOpen,
    onClose,
    title,
    items,
    onSelect,
    search,
    onSearchChange,
    renderItem,
}: SelectionModalProps<T>) {
    const { t } = useTranslation();
    return (
        <HeadlessModal isOpen={isOpen} onClose={onClose} title={title} className='max-w-xl'>
            <div className='space-y-4'>
                <div className='relative group'>
                    <SearchIcon className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                    <Input
                        placeholder={t('common.search')}
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className='pl-10 h-10'
                    />
                </div>

                <div className='max-h-[400px] overflow-y-auto space-y-2 pr-1 custom-scrollbar'>
                    {items.length === 0 ? (
                        <div className='text-center py-8 text-muted-foreground'>{t('common.no_results')}</div>
                    ) : (
                        items.map((item) => (
                            <div
                                key={item.id}
                                className='p-3 rounded-xl border border-border/50 hover:border-primary hover:bg-primary/5 cursor-pointer transition-all'
                                onClick={() => onSelect(item)}
                            >
                                {renderItem(item)}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </HeadlessModal>
    );
}
