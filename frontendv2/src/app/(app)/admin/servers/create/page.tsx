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

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { StepIndicator } from '@/components/ui/step-indicator';
import { toast } from 'sonner';
import { Server, X, ChevronRight, ChevronLeft, Plus, Search as SearchIcon, Loader2 } from 'lucide-react';
import {
    ServerFormData,
    SelectedEntities,
    Spell,
    SpellVariable,
    User,
    Location,
    Node,
    Allocation,
    Realm,
    WizardStep,
} from './types';
import { Step1CoreDetails } from './Step1CoreDetails';
import { Step2Allocation } from './Step2Allocation';
import { Step3Application } from './Step3Application';
import { Step4Resources } from './Step4Resources';
import { Step5FeatureLimits } from './Step5FeatureLimits';
import { Step6Review } from './Step6Review';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

const initialFormData: ServerFormData = {
    name: '',
    description: '',
    ownerId: null,
    skipScripts: false,
    locationId: null,
    nodeId: null,
    allocationId: null,
    realmId: null,
    spellId: null,
    dockerImage: '',
    startup: '',
    memory: 1024,
    swap: 0,
    disk: 5120,
    cpu: 0,
    io: 500,
    oomKiller: true,
    threads: '',
    memoryUnlimited: false,
    swapType: 'disabled',
    diskUnlimited: false,
    cpuUnlimited: true,
    databaseLimit: 0,
    allocationLimit: 1,
    backupLimit: 0,
    spellVariables: {},
};

const initialSelectedEntities: SelectedEntities = {
    owner: null,
    location: null,
    node: null,
    allocation: null,
    realm: null,
    spell: null,
};

export default function CreateServerPage() {
    const { t } = useTranslation();
    const router = useRouter();

    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 6;

    const [formData, setFormData] = useState<ServerFormData>(initialFormData);
    const [selectedEntities, setSelectedEntities] = useState<SelectedEntities>(initialSelectedEntities);

    const [spellDetails, setSpellDetails] = useState<Spell | null>(null);
    const [spellVariablesData, setSpellVariablesData] = useState<SpellVariable[]>([]);

    const [ownerModalOpen, setOwnerModalOpen] = useState(false);
    const [locationModalOpen, setLocationModalOpen] = useState(false);
    const [nodeModalOpen, setNodeModalOpen] = useState(false);
    const [allocationModalOpen, setAllocationModalOpen] = useState(false);
    const [realmModalOpen, setRealmModalOpen] = useState(false);
    const [spellModalOpen, setSpellModalOpen] = useState(false);

    const [owners, setOwners] = useState<User[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [allocations, setAllocations] = useState<Allocation[]>([]);
    const [realms, setRealms] = useState<Realm[]>([]);
    const [spells, setSpells] = useState<Spell[]>([]);

    const [ownerSearch, setOwnerSearch] = useState('');
    const [locationSearch, setLocationSearch] = useState('');
    const [nodeSearch, setNodeSearch] = useState('');
    const [allocationSearch, setAllocationSearch] = useState('');
    const [realmSearch, setRealmSearch] = useState('');
    const [spellSearch, setSpellSearch] = useState('');

    const [debouncedOwnerSearch, setDebouncedOwnerSearch] = useState('');
    const [debouncedLocationSearch, setDebouncedLocationSearch] = useState('');
    const [debouncedNodeSearch, setDebouncedNodeSearch] = useState('');
    const [debouncedAllocationSearch, setDebouncedAllocationSearch] = useState('');
    const [debouncedRealmSearch, setDebouncedRealmSearch] = useState('');
    const [debouncedSpellSearch, setDebouncedSpellSearch] = useState('');

    const [ownerPagination, setOwnerPagination] = useState({
        current_page: 1,
        per_page: 10,
        total_records: 0,
        total_pages: 0,
        has_next: false,
        has_prev: false,
    });
    const [locationPagination, setLocationPagination] = useState({
        current_page: 1,
        per_page: 10,
        total_records: 0,
        total_pages: 0,
        has_next: false,
        has_prev: false,
    });
    const [nodePagination, setNodePagination] = useState({
        current_page: 1,
        per_page: 10,
        total_records: 0,
        total_pages: 0,
        has_next: false,
        has_prev: false,
    });
    const [allocationPagination, setAllocationPagination] = useState({
        current_page: 1,
        per_page: 20,
        total_records: 0,
        total_pages: 0,
        has_next: false,
        has_prev: false,
    });
    const [realmPagination, setRealmPagination] = useState({
        current_page: 1,
        per_page: 10,
        total_records: 0,
        total_pages: 0,
        has_next: false,
        has_prev: false,
    });
    const [spellPagination, setSpellPagination] = useState({
        current_page: 1,
        per_page: 10,
        total_records: 0,
        total_pages: 0,
        has_next: false,
        has_prev: false,
    });

    const [submitting, setSubmitting] = useState(false);

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-servers-create');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const wizardSteps: WizardStep[] = [
        { title: t('admin.servers.form.wizard.step1_title'), subtitle: t('admin.servers.form.wizard.step1_subtitle') },
        { title: t('admin.servers.form.wizard.step2_title'), subtitle: t('admin.servers.form.wizard.step2_subtitle') },
        { title: t('admin.servers.form.wizard.step3_title'), subtitle: t('admin.servers.form.wizard.step3_subtitle') },
        { title: t('admin.servers.form.wizard.step4_title'), subtitle: t('admin.servers.form.wizard.step4_subtitle') },
        { title: t('admin.servers.form.wizard.step5_title'), subtitle: t('admin.servers.form.wizard.step5_subtitle') },
        { title: t('admin.servers.form.wizard.step6_title'), subtitle: t('admin.servers.form.wizard.step6_subtitle') },
    ];

    useEffect(() => {
        if (!formData.spellId) {
            setSpellDetails(null);
            setSpellVariablesData([]);
            setFormData((prev) => ({ ...prev, startup: '', dockerImage: '', spellVariables: {} }));
            return;
        }

        const fetchSpellDetails = async () => {
            try {
                const [spellRes, variablesRes] = await Promise.all([
                    axios.get(`/api/admin/spells/${formData.spellId}`),
                    axios.get(`/api/admin/spells/${formData.spellId}/variables`),
                ]);

                if (spellRes.data?.success) {
                    const spell: Spell = spellRes.data.data.spell;
                    setSpellDetails(spell);

                    if (spell.docker_images) {
                        try {
                            const dockerImagesObj = JSON.parse(spell.docker_images);
                            const imagesArray = Object.values(dockerImagesObj) as string[];
                            if (imagesArray.length > 0) {
                                setFormData((prev) => ({ ...prev, dockerImage: imagesArray[0] }));
                            }
                        } catch {
                            console.error('Failed to parse docker images');
                        }
                    }

                    if (spell.startup) {
                        setFormData((prev) => ({ ...prev, startup: spell.startup }));
                    }
                }

                if (variablesRes.data?.success) {
                    const variables: SpellVariable[] = variablesRes.data.data.variables || [];
                    setSpellVariablesData(variables);
                    const initialVars: Record<string, string> = {};
                    variables.forEach((v) => {
                        initialVars[v.env_variable] = v.default_value ?? '';
                    });
                    setFormData((prev) => ({ ...prev, spellVariables: initialVars }));
                }
            } catch (error) {
                console.error('Error fetching spell details:', error);
                toast.error('Failed to fetch spell details');
            }
        };

        fetchSpellDetails();
    }, [formData.spellId]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedOwnerSearch(ownerSearch);
            setOwnerPagination((prev) => ({ ...prev, current_page: 1 }));
        }, 500);
        return () => clearTimeout(timer);
    }, [ownerSearch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedLocationSearch(locationSearch);
            setLocationPagination((prev) => ({ ...prev, current_page: 1 }));
        }, 500);
        return () => clearTimeout(timer);
    }, [locationSearch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedNodeSearch(nodeSearch);
            setNodePagination((prev) => ({ ...prev, current_page: 1 }));
        }, 500);
        return () => clearTimeout(timer);
    }, [nodeSearch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedAllocationSearch(allocationSearch);
            setAllocationPagination((prev) => ({ ...prev, current_page: 1 }));
        }, 500);
        return () => clearTimeout(timer);
    }, [allocationSearch]);

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

    const fetchLocations = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/admin/locations', {
                params: {
                    search: debouncedLocationSearch,
                    page: locationPagination.current_page,
                    limit: locationPagination.per_page,
                },
            });
            setLocations(data.data.locations || []);
            if (data.data.pagination) {
                setLocationPagination((prev) => ({
                    ...prev,
                    ...data.data.pagination,
                }));
            }
        } catch (error) {
            console.error('Error fetching locations:', error);
        }
    }, [debouncedLocationSearch, locationPagination.current_page, locationPagination.per_page]);

    const fetchNodes = useCallback(async () => {
        if (!formData.locationId) return;
        try {
            const { data } = await axios.get('/api/admin/nodes', {
                params: {
                    location_id: formData.locationId,
                    search: debouncedNodeSearch,
                    page: nodePagination.current_page,
                    limit: nodePagination.per_page,
                },
            });
            setNodes(data.data.nodes || []);
            if (data.data.pagination) {
                setNodePagination((prev) => ({
                    ...prev,
                    ...data.data.pagination,
                }));
            }
        } catch (error) {
            console.error('Error fetching nodes:', error);
        }
    }, [formData.locationId, debouncedNodeSearch, nodePagination.current_page, nodePagination.per_page]);

    const fetchAllocations = useCallback(async () => {
        if (!formData.nodeId) return;
        try {
            const { data } = await axios.get('/api/admin/allocations', {
                params: {
                    node_id: formData.nodeId,
                    not_used: true,
                    search: debouncedAllocationSearch || undefined,
                    page: allocationPagination.current_page,
                    limit: allocationPagination.per_page,
                },
            });
            setAllocations(data.data.allocations || []);
            if (data.data.pagination) {
                setAllocationPagination((prev) => ({
                    ...prev,
                    ...data.data.pagination,
                }));
            }
        } catch (error) {
            console.error('Error fetching allocations:', error);
        }
    }, [formData.nodeId, debouncedAllocationSearch, allocationPagination.current_page, allocationPagination.per_page]);

    const fetchRealms = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/admin/realms', {
                params: {
                    search: debouncedRealmSearch,
                    page: realmPagination.current_page,
                    limit: realmPagination.per_page,
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
    }, [debouncedRealmSearch, realmPagination.current_page, realmPagination.per_page]);

    const fetchSpells = useCallback(async () => {
        if (!formData.realmId) return;
        try {
            const { data } = await axios.get('/api/admin/spells', {
                params: {
                    realm_id: formData.realmId,
                    search: debouncedSpellSearch,
                    page: spellPagination.current_page,
                    limit: spellPagination.per_page,
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
    }, [formData.realmId, debouncedSpellSearch, spellPagination.current_page, spellPagination.per_page]);

    useEffect(() => {
        if (ownerModalOpen) {
            fetchOwners();
        }
    }, [ownerModalOpen, fetchOwners]);

    useEffect(() => {
        if (locationModalOpen) {
            fetchLocations();
        }
    }, [locationModalOpen, fetchLocations]);

    useEffect(() => {
        if (nodeModalOpen) {
            fetchNodes();
        }
    }, [nodeModalOpen, fetchNodes]);

    useEffect(() => {
        if (allocationModalOpen && formData.nodeId) {
            fetchAllocations();
        }
    }, [allocationModalOpen, formData.nodeId, fetchAllocations]);

    useEffect(() => {
        if (realmModalOpen) {
            fetchRealms();
        }
    }, [realmModalOpen, fetchRealms]);

    useEffect(() => {
        if (spellModalOpen) {
            fetchSpells();
        }
    }, [spellModalOpen, fetchSpells]);

    const validateCurrentStep = () => {
        switch (currentStep) {
            case 1:
                if (!formData.name.trim()) {
                    toast.error(t('admin.servers.form.wizard.validation.name_required'));
                    return false;
                }
                if (!formData.ownerId) {
                    toast.error(t('admin.servers.form.wizard.validation.owner_required'));
                    return false;
                }
                return true;
            case 2:
                if (!formData.locationId) {
                    toast.error(t('admin.servers.form.wizard.validation.location_required'));
                    return false;
                }
                if (!formData.nodeId) {
                    toast.error(t('admin.servers.form.wizard.validation.node_required'));
                    return false;
                }
                if (!formData.allocationId) {
                    toast.error(t('admin.servers.form.wizard.validation.allocation_required'));
                    return false;
                }
                return true;
            case 3:
                if (!formData.realmId) {
                    toast.error(t('admin.servers.form.wizard.validation.realm_required'));
                    return false;
                }
                if (!formData.spellId) {
                    toast.error(t('admin.servers.form.wizard.validation.spell_required'));
                    return false;
                }
                if (!formData.dockerImage) {
                    toast.error(t('admin.servers.form.wizard.validation.docker_image_required'));
                    return false;
                }
                return true;
            default:
                return true;
        }
    };

    const handleNext = () => {
        if (validateCurrentStep()) {
            setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
        }
    };

    const handlePrevious = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 1));
    };

    const handleSubmit = async () => {
        if (!validateCurrentStep()) return;
        setSubmitting(true);

        try {
            const payload = {
                node_id: formData.nodeId,
                name: formData.name,
                description: formData.description?.trim() || null,
                owner_id: formData.ownerId,
                memory: formData.memoryUnlimited ? 0 : formData.memory,
                swap: formData.swapType === 'disabled' ? 0 : formData.swapType === 'unlimited' ? -1 : formData.swap,
                disk: formData.diskUnlimited ? 0 : formData.disk,
                io: formData.io,
                cpu: formData.cpuUnlimited ? 0 : formData.cpu,
                allocation_id: formData.allocationId,
                realms_id: formData.realmId,
                spell_id: formData.spellId,
                startup: formData.startup,
                image: formData.dockerImage,
                database_limit: formData.databaseLimit,
                allocation_limit: formData.allocationLimit,
                backup_limit: formData.backupLimit,
                skip_scripts: formData.skipScripts,
                variables: formData.spellVariables,
                oom_killer: formData.oomKiller,
                threads: formData.threads?.trim() || null,
            };

            const { data } = await axios.put('/api/admin/servers', payload);

            if (data.success) {
                toast.success('Server created successfully!');
                router.push('/admin/servers');
            } else {
                toast.error(data.message || 'Failed to create server');
            }
        } catch (error) {
            if (isAxiosError(error)) {
                toast.error(error.response?.data?.message || 'Failed to create server');
            } else {
                toast.error('An unexpected error occurred');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleSelectOwner = (owner: User) => {
        setSelectedEntities((prev) => ({ ...prev, owner }));
        setFormData((prev) => ({ ...prev, ownerId: owner.id }));
        setOwnerModalOpen(false);
    };

    const handleSelectLocation = (location: Location) => {
        setSelectedEntities((prev) => ({ ...prev, location, node: null, allocation: null }));
        setFormData((prev) => ({ ...prev, locationId: location.id, nodeId: null, allocationId: null }));
        setLocationModalOpen(false);
    };

    const handleSelectNode = (node: Node) => {
        setSelectedEntities((prev) => ({ ...prev, node, allocation: null }));
        setFormData((prev) => ({ ...prev, nodeId: node.id, allocationId: null }));
        setNodeModalOpen(false);
    };

    const handleSelectAllocation = (allocation: Allocation) => {
        setSelectedEntities((prev) => ({ ...prev, allocation }));
        setFormData((prev) => ({ ...prev, allocationId: allocation.id }));
        setAllocationModalOpen(false);
    };

    const handleSelectRealm = (realm: Realm) => {
        setSelectedEntities((prev) => ({ ...prev, realm, spell: null }));
        setFormData((prev) => ({ ...prev, realmId: realm.id, spellId: null, dockerImage: '', startup: '' }));
        setRealmModalOpen(false);
    };

    const handleSelectSpell = (spell: Spell) => {
        setSelectedEntities((prev) => ({ ...prev, spell }));
        setFormData((prev) => ({ ...prev, spellId: spell.id }));
        setSpellModalOpen(false);
    };

    const stepProps = {
        formData,
        setFormData,
        selectedEntities,
        setSelectedEntities,
        spellDetails,
        spellVariablesData,
    };

    return (
        <div className='max-w-5xl mx-auto pb-20'>
            <WidgetRenderer widgets={getWidgets('admin-servers-create', 'top-of-page')} />

            <PageHeader
                title={t('admin.servers.form.create_title')}
                description={t('admin.servers.form.create_subtitle')}
                icon={Server}
                actions={
                    <Button variant='outline' onClick={() => router.push('/admin/servers')}>
                        <X className='h-4 w-4 mr-2' />
                        {t('admin.servers.form.cancel')}
                    </Button>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-servers-create', 'after-header')} />

            <div className='mt-8 mb-12 p-6 bg-card/50 backdrop-blur-xl rounded-2xl border border-border/50'>
                <StepIndicator steps={wizardSteps} currentStep={currentStep} />
            </div>

            <div className='min-h-[400px]'>
                {currentStep === 1 && (
                    <Step1CoreDetails
                        {...stepProps}
                        owners={owners}
                        ownerSearch={ownerSearch}
                        setOwnerSearch={setOwnerSearch}
                        ownerModalOpen={ownerModalOpen}
                        setOwnerModalOpen={setOwnerModalOpen}
                        fetchOwners={fetchOwners}
                    />
                )}
                {currentStep === 2 && (
                    <Step2Allocation
                        {...stepProps}
                        locations={locations}
                        nodes={nodes}
                        allocations={allocations}
                        locationModalOpen={locationModalOpen}
                        setLocationModalOpen={setLocationModalOpen}
                        nodeModalOpen={nodeModalOpen}
                        setNodeModalOpen={setNodeModalOpen}
                        allocationModalOpen={allocationModalOpen}
                        setAllocationModalOpen={setAllocationModalOpen}
                        fetchLocations={fetchLocations}
                        fetchNodes={fetchNodes}
                        fetchAllocations={fetchAllocations}
                    />
                )}
                {currentStep === 3 && (
                    <Step3Application
                        {...stepProps}
                        realms={realms}
                        spells={spells}
                        realmModalOpen={realmModalOpen}
                        setRealmModalOpen={setRealmModalOpen}
                        spellModalOpen={spellModalOpen}
                        setSpellModalOpen={setSpellModalOpen}
                        fetchRealms={fetchRealms}
                        fetchSpells={fetchSpells}
                    />
                )}
                {currentStep === 4 && <Step4Resources {...stepProps} />}
                {currentStep === 5 && <Step5FeatureLimits {...stepProps} />}
                {currentStep === 6 && <Step6Review {...stepProps} />}
            </div>

            <div className='flex items-center justify-between mt-8 p-6 bg-card/50 backdrop-blur-xl rounded-2xl border border-border/50'>
                <Button variant='outline' onClick={handlePrevious} disabled={currentStep === 1} className='gap-2'>
                    <ChevronLeft className='h-4 w-4' />
                    {t('admin.servers.form.wizard.previous')}
                </Button>

                <span className='text-sm text-muted-foreground'>
                    {t('admin.servers.form.wizard.step', { current: String(currentStep), total: String(totalSteps) })}
                </span>

                {currentStep < totalSteps ? (
                    <Button onClick={handleNext} className='gap-2'>
                        {t('admin.servers.form.wizard.next')}
                        <ChevronRight className='h-4 w-4' />
                    </Button>
                ) : (
                    <Button onClick={handleSubmit} disabled={submitting} className='gap-2'>
                        {submitting ? (
                            <>
                                <Loader2 className='h-4 w-4 animate-spin' />
                                {t('admin.servers.form.wizard.submitting')}
                            </>
                        ) : (
                            <>
                                <Plus className='h-4 w-4' />
                                {t('admin.servers.form.create_server')}
                            </>
                        )}
                    </Button>
                )}
            </div>

            <SelectionSheet
                open={ownerModalOpen}
                onOpenChange={setOwnerModalOpen}
                title={t('admin.servers.form.select_owner')}
                items={owners}
                onSelect={handleSelectOwner}
                search={ownerSearch}
                onSearchChange={setOwnerSearch}
                pagination={ownerPagination}
                onPaginationChange={setOwnerPagination}
                renderItem={(owner) => (
                    <div className='flex flex-col'>
                        <span className='font-semibold'>{owner.username}</span>
                        <span className='text-xs text-muted-foreground'>{owner.email}</span>
                    </div>
                )}
            />

            <SelectionSheet
                open={locationModalOpen}
                onOpenChange={setLocationModalOpen}
                title={t('admin.servers.form.select_location')}
                items={locations}
                onSelect={handleSelectLocation}
                search={locationSearch}
                onSearchChange={setLocationSearch}
                pagination={locationPagination}
                onPaginationChange={setLocationPagination}
                renderItem={(location) => <span className='font-semibold'>{location.name}</span>}
            />

            <SelectionSheet
                open={nodeModalOpen}
                onOpenChange={setNodeModalOpen}
                title={t('admin.servers.form.select_node')}
                items={nodes}
                onSelect={handleSelectNode}
                search={nodeSearch}
                onSearchChange={setNodeSearch}
                pagination={nodePagination}
                onPaginationChange={setNodePagination}
                renderItem={(node) => (
                    <div className='flex flex-col'>
                        <span className='font-semibold'>{node.name}</span>
                        <span className='text-xs text-muted-foreground'>{node.fqdn}</span>
                    </div>
                )}
            />

            <SelectionSheet
                open={allocationModalOpen}
                onOpenChange={setAllocationModalOpen}
                title={t('admin.servers.form.select_allocation')}
                items={allocations}
                onSelect={handleSelectAllocation}
                search={allocationSearch}
                onSearchChange={setAllocationSearch}
                pagination={allocationPagination}
                onPaginationChange={setAllocationPagination}
                renderItem={(allocation) => (
                    <span className='font-semibold font-mono'>
                        {allocation.ip}:{allocation.port}
                    </span>
                )}
            />

            <SelectionSheet
                open={realmModalOpen}
                onOpenChange={setRealmModalOpen}
                title={t('admin.servers.form.select_realm')}
                items={realms}
                onSelect={handleSelectRealm}
                search={realmSearch}
                onSearchChange={setRealmSearch}
                pagination={realmPagination}
                onPaginationChange={setRealmPagination}
                renderItem={(realm) => <span className='font-semibold'>{realm.name}</span>}
            />

            <SelectionSheet
                open={spellModalOpen}
                onOpenChange={setSpellModalOpen}
                title={t('admin.servers.form.select_spell')}
                items={spells}
                onSelect={handleSelectSpell}
                search={spellSearch}
                onSearchChange={setSpellSearch}
                pagination={spellPagination}
                onPaginationChange={setSpellPagination}
                renderItem={(spell) => (
                    <div className='flex flex-col'>
                        <span className='font-semibold'>{spell.name}</span>
                        <span className='text-xs text-muted-foreground line-clamp-1'>{spell.description}</span>
                    </div>
                )}
            />

            <WidgetRenderer widgets={getWidgets('admin-servers-create', 'bottom-of-page')} />
        </div>
    );
}

interface PaginationState {
    current_page: number;
    per_page: number;
    total_records: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
}

interface SelectionSheetProps<T> {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    items: T[];
    onSelect: (item: T) => void;
    search: string;
    onSearchChange: (val: string) => void;
    pagination: PaginationState | null;
    onPaginationChange: (pagination: PaginationState) => void;
    renderItem: (item: T) => React.ReactNode;
}

function SelectionSheet<T extends { id: number | string }>({
    open,
    onOpenChange,
    title,
    items,
    onSelect,
    search,
    onSearchChange,
    pagination,
    onPaginationChange,
    renderItem,
}: SelectionSheetProps<T>) {
    const { t } = useTranslation();
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className='sm:max-w-2xl'>
                <SheetHeader>
                    <SheetTitle>{title}</SheetTitle>
                    <SheetDescription>
                        {pagination
                            ? t('common.showing', {
                                  from: String((pagination.current_page - 1) * pagination.per_page + 1),
                                  to: String(
                                      Math.min(pagination.current_page * pagination.per_page, pagination.total_records),
                                  ),
                                  total: String(pagination.total_records),
                              })
                            : t('common.select_an_option')}
                    </SheetDescription>
                </SheetHeader>

                <div className='mt-6 space-y-4'>
                    <div className='relative group'>
                        <SearchIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                        <Input
                            placeholder={t('common.search')}
                            value={search}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className='pl-10'
                        />
                    </div>

                    {pagination && pagination.total_pages > 1 && (
                        <div className='flex items-center justify-between gap-2 py-2 px-3 rounded-lg border border-border bg-muted/30'>
                            <Button
                                variant='outline'
                                size='sm'
                                disabled={!pagination.has_prev}
                                onClick={() =>
                                    onPaginationChange({ ...pagination, current_page: pagination.current_page - 1 })
                                }
                                className='gap-1 h-8'
                            >
                                <ChevronLeft className='h-3 w-3' />
                                {t('common.previous')}
                            </Button>
                            <span className='text-xs font-medium'>
                                {pagination.current_page} / {pagination.total_pages}
                            </span>
                            <Button
                                variant='outline'
                                size='sm'
                                disabled={!pagination.has_next}
                                onClick={() =>
                                    onPaginationChange({ ...pagination, current_page: pagination.current_page + 1 })
                                }
                                className='gap-1 h-8'
                            >
                                {t('common.next')}
                                <ChevronRight className='h-3 w-3' />
                            </Button>
                        </div>
                    )}

                    <div className='space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar'>
                        {items.length === 0 ? (
                            <div className='text-center py-8 text-muted-foreground'>{t('common.no_results')}</div>
                        ) : (
                            items.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => onSelect(item)}
                                    className='w-full p-3 rounded-xl border border-border/50 hover:border-primary hover:bg-primary/5 cursor-pointer transition-all text-left'
                                >
                                    {renderItem(item)}
                                </button>
                            ))
                        )}
                    </div>

                    {pagination && pagination.total_pages > 1 && (
                        <div className='flex items-center justify-between pt-4 border-t border-border/50'>
                            <div className='text-sm text-muted-foreground'>
                                {t('common.showing', {
                                    from: String((pagination.current_page - 1) * pagination.per_page + 1),
                                    to: String(
                                        Math.min(
                                            pagination.current_page * pagination.per_page,
                                            pagination.total_records,
                                        ),
                                    ),
                                    total: String(pagination.total_records),
                                })}
                            </div>
                            <div className='flex gap-2'>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    onClick={() =>
                                        onPaginationChange({
                                            ...pagination,
                                            current_page: pagination.current_page - 1,
                                        })
                                    }
                                    disabled={!pagination.has_prev}
                                >
                                    <ChevronLeft className='h-4 w-4 mr-2' />
                                    {t('common.previous')}
                                </Button>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    onClick={() =>
                                        onPaginationChange({
                                            ...pagination,
                                            current_page: pagination.current_page + 1,
                                        })
                                    }
                                    disabled={!pagination.has_next}
                                >
                                    {t('common.next')}
                                    <ChevronRight className='h-4 w-4 ml-2' />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
