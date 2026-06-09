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

import { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
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
    HardDrive,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetContent } from '@/components/ui/sheet';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { formatDateTimeInTz, formatRelativeTime } from '@/lib/dateUtils';
import { RoleBadge } from '@/components/RoleBadge';
import { validateServerResourceLimits } from '@/lib/server-utils';

import { DetailsTab } from './DetailsTab';
import { ResourcesTab } from './ResourcesTab';
import { ApplicationTab } from './ApplicationTab';
import { LimitsTab } from './LimitsTab';
import { StartupTab } from './StartupTab';
import { AllocationsTab } from './AllocationsTab';
import { MountsTab } from './MountsTab';
import type { AssignableMountRow } from './MountsTab';
import { ActionsTab } from './ActionsTab';
import { AllocationPickerSheet } from '@/components/admin/AllocationPickerSheet';
import { resolveSpellDefaultDockerImage, buildSpellDockerImageOptions } from '@/lib/spellDockerImages';
import type { DockerImageOption } from '@/components/admin/DockerImageField';
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
    CustomVariable,
} from './types';

const initialFormData: ServerFormData = {
    name: '',
    description: '',
    owner_id: null,
    skip_scripts: false,
    skip_zerotrust: false,
    external_id: '',
    expires_at: null,
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
    backup_retention_mode: 'inherit',
    allocation_id: null,
    variables: {},
    mount_ids: [],
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
    const dateOpts = useDateFormatOptions();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const params = useParams();
    const serverId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('details');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [form, setForm] = useState<ServerFormData>(initialFormData);
    const [selectedEntities, setSelectedEntities] = useState<SelectedEntities>(initialSelectedEntities);
    const [isSuspended, setIsSuspended] = useState(false);
    const [suspensionReason, setSuspensionReason] = useState<string | null>(null);
    const [suspendedAt, setSuspendedAt] = useState<string | null>(null);
    const [suspendedBy, setSuspendedBy] = useState<{ uuid?: string | null; username?: string | null } | null>(null);

    const [location, setLocation] = useState<Location | null>(null);
    const [node, setNode] = useState<Node | null>(null);

    const [, setSpellDetails] = useState<Spell | null>(null);
    const [spellVariables, setSpellVariables] = useState<SpellVariable[]>([]);
    const [customVariables, setCustomVariables] = useState<CustomVariable[]>([]);
    const [customVariableSaving, setCustomVariableSaving] = useState(false);
    const [customVariableForm, setCustomVariableForm] = useState({
        name: '',
        env_variable: '',
        variable_value: '',
        is_encrypted: false,
    });
    const [dockerImages, setDockerImages] = useState<DockerImageOption[]>([]);
    const [spellDefaultDockerImage, setSpellDefaultDockerImage] = useState('');

    const [ownerModalOpen, setOwnerModalOpen] = useState(false);
    const [realmModalOpen, setRealmModalOpen] = useState(false);
    const [spellModalOpen, setSpellModalOpen] = useState(false);
    const [allocationModalOpen, setAllocationModalOpen] = useState(false);
    const [allocationModalMode, setAllocationModalMode] = useState<'form' | 'primary' | 'assign'>('form');

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
    const [debouncedAllocationSearch, setDebouncedAllocationSearch] = useState('');
    const [allocationPagination, setAllocationPagination] = useState({
        current_page: 1,
        per_page: 20,
        total_records: 0,
        total_pages: 0,
        has_next: false,
        has_prev: false,
    });

    const tabStorageKey = `featherpanel_admin_server_edit_tab_${serverId}`;
    const isAllowedTab = useCallback(
        (tab: string) =>
            ['details', 'resources', 'application', 'limits', 'startup', 'mounts', 'allocations', 'actions'].includes(
                tab,
            ),
        [],
    );

    useEffect(() => {
        const tabFromUrl = searchParams.get('tab');
        if (tabFromUrl && isAllowedTab(tabFromUrl)) {
            setActiveTab(tabFromUrl);
            return;
        }

        if (typeof window === 'undefined') return;
        try {
            const saved = window.localStorage.getItem(tabStorageKey);
            if (saved && isAllowedTab(saved)) {
                setActiveTab(saved);
            }
        } catch {
            // ignore storage read failures
        }
    }, [searchParams, tabStorageKey, isAllowedTab]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(tabStorageKey, activeTab);
        } catch {
            // ignore storage write failures
        }
    }, [tabStorageKey, activeTab]);

    const handleTabChange = useCallback(
        (tab: string) => {
            setActiveTab(tab);
            const params = new URLSearchParams(searchParams.toString());
            params.set('tab', tab);
            const query = params.toString();
            router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
        },
        [pathname, router, searchParams],
    );

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-servers-edit');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedAllocationSearch(allocationSearch);
            setAllocationPagination((prev) => ({ ...prev, current_page: 1 }));
        }, 500);
        return () => clearTimeout(timer);
    }, [allocationSearch]);

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
    const spellBaselineForMounts = useRef<number | null>(null);

    const [assignableMounts, setAssignableMounts] = useState<AssignableMountRow[]>([]);
    const [assignableLoading, setAssignableLoading] = useState(false);

    const fetchServerData = useCallback(async () => {
        setLoading(true);
        hasInitialLoaded.current = false;
        try {
            const [serverRes, locationsRes] = await Promise.all([
                axios.get(`/api/admin/servers/${serverId}`),
                axios.get('/api/admin/locations', { params: { limit: 500, type: 'game' } }),
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
                if (!serverLocation && serverNode?.location_id) {
                    try {
                        const locRes = await axios.get(`/api/admin/locations/${serverNode.location_id}`);
                        if (locRes.data?.success && locRes.data?.data?.location) {
                            serverLocation = locRes.data.data.location as Location;
                        }
                    } catch {
                        /* ignore — legacy or missing location */
                    }
                }

                const variablesList = (server.variables || []) as ServerVariableResponse[];
                setCustomVariables((server.custom_variables || []) as CustomVariable[]);
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

                let mountIds: number[] = Array.isArray(server.mount_ids)
                    ? server.mount_ids.map((id: number) => Number(id))
                    : [];
                try {
                    const assignRes = await axios.get(`/api/admin/servers/${serverId}/mounts/assignable`, {
                        params: server.spell_id ? { spell_id: server.spell_id } : undefined,
                    });
                    if (assignRes.data.success && assignRes.data.data?.mounts) {
                        const assignList = assignRes.data.data.mounts as AssignableMountRow[];
                        setAssignableMounts(assignList);
                        const allowed = new Set(assignList.map((m) => m.id));
                        mountIds = mountIds.filter((id) => allowed.has(id));
                    } else {
                        setAssignableMounts([]);
                        mountIds = [];
                        toast.error(t('admin.servers.edit.mounts.assignable_load_failed'));
                    }
                } catch (assignErr) {
                    console.error('Error loading assignable mounts:', assignErr);
                    setAssignableMounts([]);
                    mountIds = [];
                    toast.error(t('admin.servers.edit.mounts.assignable_load_failed'));
                }
                spellBaselineForMounts.current = server.spell_id ?? null;

                setForm({
                    name: server.name || '',
                    description: server.description || '',
                    owner_id: server.owner_id,
                    skip_scripts: Boolean(server.skip_scripts),
                    skip_zerotrust: Boolean(server.skip_zerotrust),
                    external_id: server.external_id || '',
                    expires_at: server.expires_at ? server.expires_at.slice(0, 16) : null,
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
                    backup_retention_mode:
                        server.backup_retention_mode === 'fifo_rolling'
                            ? 'fifo_rolling'
                            : server.backup_retention_mode === 'hard_limit'
                              ? 'hard_limit'
                              : 'inherit',
                    allocation_id: server.allocation_id,
                    variables: variablesMap,
                    mount_ids: mountIds,
                });

                setIsSuspended(Boolean(server.suspended));
                setSuspensionReason(server.suspension_reason ?? null);
                setSuspendedAt(server.suspended_at ?? null);
                setSuspendedBy(server.suspended_by ?? null);
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
                    const imageOptions = buildSpellDockerImageOptions(serverSpell, server.image || '');
                    setDockerImages(imageOptions);
                    setSpellDefaultDockerImage(resolveSpellDefaultDockerImage(serverSpell));
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

    const reloadAssignableMounts = useCallback(async () => {
        setAssignableLoading(true);
        const spellForRequest = form.spell_id;
        try {
            const { data } = await axios.get(`/api/admin/servers/${serverId}/mounts/assignable`, {
                params: spellForRequest != null && spellForRequest > 0 ? { spell_id: spellForRequest } : undefined,
            });
            if (data.success && data.data?.mounts) {
                const list = data.data.mounts as AssignableMountRow[];
                setAssignableMounts(list);
                const allowed = new Set(list.map((m) => m.id));
                setForm((prev) => ({
                    ...prev,
                    mount_ids: prev.mount_ids.filter((id) => allowed.has(id)),
                }));
                spellBaselineForMounts.current = spellForRequest;
            } else {
                setAssignableMounts([]);
                setForm((prev) => ({ ...prev, mount_ids: [] }));
                spellBaselineForMounts.current = spellForRequest;
                toast.error(t('admin.servers.edit.mounts.assignable_load_failed'));
            }
        } catch (e) {
            console.error('Error refreshing assignable mounts:', e);
            setAssignableMounts([]);
            setForm((prev) => ({ ...prev, mount_ids: [] }));
            spellBaselineForMounts.current = spellForRequest;
            toast.error(t('admin.servers.edit.mounts.assignable_load_failed'));
        } finally {
            setAssignableLoading(false);
        }
    }, [serverId, form.spell_id, t]);

    useEffect(() => {
        if (loading) return;
        if (form.spell_id === spellBaselineForMounts.current) return;
        void reloadAssignableMounts();
    }, [form.spell_id, loading, reloadAssignableMounts]);

    useEffect(() => {
        fetchServerData();
    }, [fetchServerData]);

    const handleAddCustomVariable = useCallback(async () => {
        const name = customVariableForm.name.trim();
        const envVariable = customVariableForm.env_variable.trim().toUpperCase();

        if (!name || !envVariable) {
            toast.error('Name and environment variable are required');
            return;
        }

        if (!/^[A-Z_][A-Z0-9_]*$/.test(envVariable)) {
            toast.error(
                'Env variable must use uppercase letters, numbers, and underscores, and cannot start with a number',
            );
            return;
        }

        setCustomVariableSaving(true);
        try {
            const { data } = await axios.post<{ success: boolean; message?: string }>(
                `/api/admin/servers/${serverId}/custom-variables`,
                {
                    name,
                    env_variable: envVariable,
                    variable_value: customVariableForm.variable_value,
                    is_encrypted: customVariableForm.is_encrypted,
                },
            );

            if (data.success) {
                toast.success('Custom variable added');
                setCustomVariableForm({ name: '', env_variable: '', variable_value: '', is_encrypted: false });
                await fetchServerData();
            } else {
                toast.error(data.message || 'Failed to add custom variable');
            }
        } catch (error) {
            toast.error(
                axios.isAxiosError(error)
                    ? error.response?.data?.message || 'Failed to add custom variable'
                    : 'Failed to add custom variable',
            );
        } finally {
            setCustomVariableSaving(false);
        }
    }, [customVariableForm, fetchServerData, serverId]);

    const handleDeleteCustomVariable = useCallback(
        async (variable: CustomVariable) => {
            setCustomVariableSaving(true);
            try {
                const { data } = await axios.delete<{ success: boolean; message?: string }>(
                    `/api/admin/servers/${serverId}/custom-variables/${variable.id}`,
                );

                if (data.success) {
                    toast.success('Custom variable deleted');
                    await fetchServerData();
                } else {
                    toast.error(data.message || 'Failed to delete custom variable');
                }
            } catch (error) {
                toast.error(
                    axios.isAxiosError(error)
                        ? error.response?.data?.message || 'Failed to delete custom variable'
                        : 'Failed to delete custom variable',
                );
            } finally {
                setCustomVariableSaving(false);
            }
        },
        [fetchServerData, serverId],
    );

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

                    const imageOptions = buildSpellDockerImageOptions(spell, form.image);
                    setDockerImages(imageOptions);
                    setSpellDefaultDockerImage(resolveSpellDefaultDockerImage(spell));

                    setForm((prev) => {
                        const allowedValues = imageOptions.map((img) => img.value);
                        if (prev.image && allowedValues.includes(prev.image)) {
                            return prev;
                        }
                        const defaultImage = resolveSpellDefaultDockerImage(spell);
                        return { ...prev, image: defaultImage || allowedValues[0] || '' };
                    });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const matchesAllocationSearch = useCallback((allocation: Allocation, search: string) => {
        if (!search) return true;
        const lowerSearch = search.toLowerCase();
        return (
            allocation.ip.toLowerCase().includes(lowerSearch) ||
            String(allocation.port).includes(lowerSearch) ||
            (allocation.ip_alias && allocation.ip_alias.toLowerCase().includes(lowerSearch))
        );
    }, []);

    const fetchAllocations = useCallback(async () => {
        if (!node?.id) return;
        try {
            const listParams = {
                node_id: node.id,
                not_used: true,
                search: debouncedAllocationSearch || undefined,
                page: allocationPagination.current_page,
                limit: allocationPagination.per_page,
            };

            if (allocationModalMode === 'primary') {
                const [availableRes, assignedRes] = await Promise.all([
                    axios.get('/api/admin/allocations', { params: listParams }),
                    axios.get(`/api/admin/servers/${serverId}/allocations`),
                ]);

                const available = (availableRes.data?.data?.allocations || []) as Allocation[];
                const assigned = ((assignedRes.data?.data?.allocations || []) as Allocation[]).filter(
                    (allocation) =>
                        allocation.node_id === node.id &&
                        matchesAllocationSearch(allocation, debouncedAllocationSearch),
                );

                const merged = new Map<number, Allocation>();
                [...available, ...assigned].forEach((allocation) => {
                    merged.set(allocation.id, allocation);
                });

                setAllocations(Array.from(merged.values()));
                if (availableRes.data?.data?.pagination) {
                    setAllocationPagination((prev) => ({
                        ...prev,
                        ...availableRes.data.data.pagination,
                    }));
                }
                return;
            }

            const { data } = await axios.get('/api/admin/allocations', { params: listParams });
            let nextAllocations = (data.data.allocations || []) as Allocation[];

            if (form.allocation_id && selectedEntities.allocation) {
                if (!nextAllocations.find((allocation) => allocation.id === form.allocation_id)) {
                    nextAllocations = [...nextAllocations, selectedEntities.allocation];
                }
            }

            setAllocations(nextAllocations);
            if (data.data.pagination) {
                setAllocationPagination((prev) => ({
                    ...prev,
                    ...data.data.pagination,
                }));
            }
        } catch (error) {
            console.error('Error fetching allocations:', error);
        }
    }, [
        node?.id,
        allocationModalMode,
        debouncedAllocationSearch,
        allocationPagination.current_page,
        allocationPagination.per_page,
        serverId,
        form.allocation_id,
        selectedEntities.allocation,
        matchesAllocationSearch,
    ]);

    useEffect(() => {
        if (allocationModalOpen && node?.id) {
            fetchAllocations();
        }
    }, [allocationModalOpen, node?.id, fetchAllocations]);

    const openAllocationModal = (mode: 'form' | 'primary' | 'assign') => {
        setAllocationModalMode(mode);
        setAllocationSearch('');
        setDebouncedAllocationSearch('');
        setAllocationPagination((prev) => ({ ...prev, current_page: 1 }));
        setAllocationModalOpen(true);
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
                const isPrimarySelection = allocationModalMode === 'primary';
                const { data } = isPrimarySelection
                    ? await axios.post(`/api/admin/servers/${serverId}/allocations/${allocation.id}/primary`)
                    : await axios.post(`/api/admin/servers/${serverId}/allocations`, {
                          allocation_id: allocation.id,
                      });

                if (data.success) {
                    toast.success(
                        isPrimarySelection
                            ? t('admin.servers.edit.allocations.primary_success')
                            : t('admin.servers.edit.allocations.assign_success'),
                    );
                    setAllocationsRefreshTrigger((prev) => prev + 1);
                    if (isPrimarySelection) {
                        setSelectedEntities((prev) => ({ ...prev, allocation }));
                        setForm((prev) => ({ ...prev, allocation_id: allocation.id }));
                    }
                } else {
                    toast.error(
                        data.message ||
                            (isPrimarySelection
                                ? t('admin.servers.edit.allocations.primary_failed')
                                : t('admin.servers.edit.allocations.assign_failed')),
                    );
                }
            } catch (error) {
                console.error('Error updating allocation:', error);
                toast.error(
                    allocationModalMode === 'primary'
                        ? t('admin.servers.edit.allocations.primary_failed')
                        : t('admin.servers.edit.allocations.assign_failed'),
                );
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
        if (!form.image?.trim()) newErrors.image = t('admin.servers.form.wizard.validation.docker_image_required');

        Object.assign(
            newErrors,
            validateServerResourceLimits(
                {
                    memory: form.memory,
                    swap: form.swap,
                    disk: form.disk,
                    cpu: form.cpu,
                    io: form.io,
                },
                {
                    memory: t('admin.servers.form.wizard.validation.memory_limit'),
                    swap: t('admin.servers.form.wizard.validation.swap_limit'),
                    disk: t('admin.servers.form.wizard.validation.disk_limit'),
                    cpu: t('admin.servers.form.wizard.validation.cpu_limit'),
                    io: t('admin.servers.form.wizard.validation.io_limit'),
                },
            ),
        );

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
                expires_at: form.expires_at || null,
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
                backup_retention_mode: form.backup_retention_mode === 'inherit' ? null : form.backup_retention_mode,
                allocation_id: form.allocation_id,
                variables: Object.entries(form.variables)
                    .map(([key, value]) => {
                        const sv = spellVariables.find((v) => v.env_variable === key);
                        if (!sv) return null;
                        return { variable_id: sv.id, variable_value: String(value ?? '') };
                    })
                    .filter((v) => v !== null),
                mount_ids: form.mount_ids,
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
                <Loader2 className='text-primary h-8 w-8 animate-spin' />
            </div>
        );
    }

    const tabs = [
        { id: 'details', label: t('admin.servers.edit.tabs.details'), icon: Server },
        { id: 'resources', label: t('admin.servers.edit.tabs.resources'), icon: Cpu },
        { id: 'application', label: t('admin.servers.edit.tabs.application'), icon: Wand2 },
        { id: 'limits', label: t('admin.servers.edit.tabs.limits'), icon: Shield },
        { id: 'startup', label: t('admin.servers.edit.tabs.startup'), icon: Terminal },
        { id: 'mounts', label: t('admin.servers.edit.tabs.mounts'), icon: HardDrive },
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
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            {t('common.back')}
                        </Button>
                        <Button onClick={handleSubmit} loading={saving}>
                            <Save className='mr-2 h-4 w-4' />
                            {t('admin.servers.edit.save')}
                        </Button>
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-servers-edit', 'after-header')} context={{ id: serverId }} />

            <Tabs
                value={activeTab}
                onValueChange={handleTabChange}
                orientation='vertical'
                className='flex w-full flex-col gap-6 md:flex-row'
            >
                <aside className='w-full shrink-0 overflow-x-auto pb-2 md:w-64 md:overflow-visible md:pb-0'>
                    <TabsList className='bg-card/30 border-border/50 flex h-auto w-max flex-row gap-2 rounded-2xl border p-2 md:w-full md:flex-col md:gap-1'>
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <TabsTrigger
                                    key={tab.id}
                                    value={tab.id}
                                    className='data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/10 h-auto w-auto justify-start rounded-xl border border-transparent px-4 py-3 text-sm font-normal whitespace-nowrap transition-all data-[state=active]:font-medium md:w-full md:text-base'
                                >
                                    <Icon className='mr-3 h-4 w-4' />
                                    {tab.label}
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>
                </aside>

                <div className='min-w-0 flex-1 space-y-6'>
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
                            spellVariables={spellVariables}
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
                        <StartupTab
                            form={form}
                            setForm={setForm}
                            errors={errors}
                            dockerImages={dockerImages}
                            spellDefaultDockerImage={spellDefaultDockerImage}
                            customVariables={customVariables}
                            customVariableForm={customVariableForm}
                            customVariableSaving={customVariableSaving}
                            setCustomVariableForm={setCustomVariableForm}
                            onAddCustomVariable={handleAddCustomVariable}
                            onDeleteCustomVariable={handleDeleteCustomVariable}
                        />
                    </TabsContent>

                    <TabsContent value='mounts' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                        <MountsTab
                            form={form}
                            setForm={setForm}
                            assignableMounts={assignableMounts}
                            loading={assignableLoading}
                        />
                    </TabsContent>

                    <TabsContent value='allocations' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                        <AllocationsTab
                            serverId={serverId}
                            selectedEntities={selectedEntities}
                            openAllocationModal={(mode) => void openAllocationModal(mode)}
                            refreshTrigger={allocationsRefreshTrigger}
                        />
                    </TabsContent>

                    <TabsContent value='actions' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                        <ActionsTab
                            serverId={serverId}
                            serverName={form.name}
                            isSuspended={isSuspended}
                            suspensionReason={suspensionReason}
                            suspendedAt={suspendedAt}
                            suspendedBy={suspendedBy}
                            currentNodeId={node?.id}
                            onRefresh={fetchServerData}
                        />
                    </TabsContent>

                    {!['actions'].includes(activeTab) && (
                        <div className='flex justify-end'>
                            <Button onClick={handleSubmit} loading={saving}>
                                <Save className='mr-2 h-4 w-4' />
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
                            <SearchIcon className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform' />
                            <Input
                                placeholder={t('admin.servers.form.search_users')}
                                value={ownerSearch}
                                onChange={(e) => setOwnerSearch(e.target.value)}
                                className='pl-10'
                            />
                        </div>

                        {ownerPagination.total_pages > 1 && (
                            <div className='border-border bg-muted/30 flex items-center justify-between gap-2 rounded-lg border px-3 py-2'>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    disabled={!ownerPagination.has_prev}
                                    onClick={() =>
                                        setOwnerPagination((prev) => ({ ...prev, current_page: prev.current_page - 1 }))
                                    }
                                    className='h-8 gap-1'
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
                                    className='h-8 gap-1'
                                >
                                    {t('common.next')}
                                    <ChevronRight className='h-3 w-3' />
                                </Button>
                            </div>
                        )}

                        <div className='max-h-[calc(100vh-300px)] space-y-2 overflow-y-auto'>
                            {owners.length === 0 ? (
                                <div className='text-muted-foreground py-8 text-center'>
                                    {t('admin.servers.form.no_users_found')}
                                </div>
                            ) : (
                                owners.map((user) => (
                                    <button
                                        key={user.id}
                                        onClick={() => handleSelectOwner(user)}
                                        className='border-border/50 hover:bg-muted/50 hover:border-primary/50 w-full rounded-lg border p-3 text-left transition-colors'
                                    >
                                        <div className='flex items-center gap-3'>
                                            <Avatar className='h-10 w-10'>
                                                <AvatarImage src={user.avatar} alt={user.username} />
                                            </Avatar>
                                            <div className='min-w-0 flex-1'>
                                                <div className='flex items-center gap-2'>
                                                    <span className='truncate font-medium'>{user.username}</span>
                                                    {user.role && <RoleBadge role={user.role} size='sm' />}
                                                </div>
                                                <div className='text-muted-foreground truncate text-sm'>
                                                    {user.email}
                                                </div>
                                                {user.last_seen && (
                                                    <div className='text-muted-foreground mt-1 text-xs'>
                                                        {t('admin.users.last_seen')}:{' '}
                                                        <span title={formatDateTimeInTz(user.last_seen, dateOpts)}>
                                                            {formatRelativeTime(user.last_seen, dateOpts)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        {ownerPagination.total_pages > 1 && (
                            <div className='flex items-center justify-between border-t pt-4'>
                                <div className='text-muted-foreground text-sm'>
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
                            <SearchIcon className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform' />
                            <Input
                                placeholder={t('admin.servers.form.search_realms')}
                                value={realmSearch}
                                onChange={(e) => setRealmSearch(e.target.value)}
                                className='pl-10'
                            />
                        </div>

                        {realmPagination.total_pages > 1 && (
                            <div className='border-border bg-muted/30 flex items-center justify-between gap-2 rounded-lg border px-3 py-2'>
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
                                    className='h-8 gap-1'
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
                                    className='h-8 gap-1'
                                >
                                    {t('common.next')}
                                    <ChevronRight className='h-3 w-3' />
                                </Button>
                            </div>
                        )}

                        <div className='max-h-[calc(100vh-300px)] space-y-2 overflow-y-auto'>
                            {realms.length === 0 ? (
                                <div className='text-muted-foreground py-8 text-center'>
                                    {t('admin.servers.form.no_realms_found')}
                                </div>
                            ) : (
                                realms.map((realm) => (
                                    <button
                                        key={realm.id}
                                        onClick={() => handleSelectRealm(realm)}
                                        className='border-border/50 hover:bg-muted/50 hover:border-primary/50 w-full rounded-lg border p-3 text-left transition-colors'
                                    >
                                        <div className='flex items-start gap-3'>
                                            <div className='bg-primary/10 mt-0.5 rounded-lg p-2'>
                                                <Box className='text-primary h-5 w-5' />
                                            </div>
                                            <div className='min-w-0 flex-1'>
                                                <div className='font-medium'>{realm.name}</div>
                                                {realm.description && (
                                                    <div className='text-muted-foreground mt-1 text-sm'>
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
                            <div className='flex items-center justify-between border-t pt-4'>
                                <div className='text-muted-foreground text-sm'>
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
                            <SearchIcon className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform' />
                            <Input
                                placeholder={t('admin.servers.form.search_spells')}
                                value={spellSearch}
                                onChange={(e) => setSpellSearch(e.target.value)}
                                className='pl-10'
                            />
                        </div>

                        {spellPagination.total_pages > 1 && (
                            <div className='border-border bg-muted/30 flex items-center justify-between gap-2 rounded-lg border px-3 py-2'>
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
                                    className='h-8 gap-1'
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
                                    className='h-8 gap-1'
                                >
                                    {t('common.next')}
                                    <ChevronRight className='h-3 w-3' />
                                </Button>
                            </div>
                        )}

                        <div className='max-h-[calc(100vh-300px)] space-y-2 overflow-y-auto'>
                            {spells.length === 0 ? (
                                <div className='text-muted-foreground py-8 text-center'>
                                    {t('admin.servers.form.no_spells_found')}
                                </div>
                            ) : (
                                spells.map((spell) => (
                                    <button
                                        key={spell.id}
                                        onClick={() => handleSelectSpell(spell)}
                                        className='border-border/50 hover:bg-muted/50 hover:border-primary/50 w-full rounded-lg border p-3 text-left transition-colors'
                                    >
                                        <div className='flex items-start gap-3'>
                                            <div className='bg-primary/10 mt-0.5 rounded-lg p-2'>
                                                <Wand2 className='text-primary h-5 w-5' />
                                            </div>
                                            <div className='min-w-0 flex-1'>
                                                <div className='font-medium'>{spell.name}</div>
                                                {spell.description && (
                                                    <div className='text-muted-foreground mt-1 text-sm'>
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
                            <div className='flex items-center justify-between border-t pt-4'>
                                <div className='text-muted-foreground text-sm'>
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

            {node?.id != null && (
                <AllocationPickerSheet
                    open={allocationModalOpen}
                    onOpenChange={setAllocationModalOpen}
                    nodeId={node.id}
                    allocations={allocations}
                    allocationSearch={allocationSearch}
                    setAllocationSearch={setAllocationSearch}
                    allocationPagination={allocationPagination}
                    setAllocationPagination={setAllocationPagination}
                    fetchAllocations={fetchAllocations}
                    onSelectAllocation={handleSelectAllocation}
                />
            )}

            <WidgetRenderer widgets={getWidgets('admin-servers-edit', 'bottom-of-page')} context={{ id: serverId }} />
        </div>
    );
}
