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
import { HeadlessModal } from '@/components/ui/headless-modal';
import { StepIndicator } from '@/components/ui/step-indicator';
import { toast } from 'sonner';
import { Server, X, ChevronRight, ChevronLeft, Plus, Search, Loader2 } from 'lucide-react';

// Types
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

// Step Components
import { Step1CoreDetails } from './Step1CoreDetails';
import { Step2Allocation } from './Step2Allocation';
import { Step3Application } from './Step3Application';
import { Step4Resources } from './Step4Resources';
import { Step5FeatureLimits } from './Step5FeatureLimits';
import { Step6Review } from './Step6Review';

// Initial Form Data
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

    // Wizard State
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 6;

    // Form State
    const [formData, setFormData] = useState<ServerFormData>(initialFormData);
    const [selectedEntities, setSelectedEntities] = useState<SelectedEntities>(initialSelectedEntities);

    // Spell Details
    const [spellDetails, setSpellDetails] = useState<Spell | null>(null);
    const [spellVariablesData, setSpellVariablesData] = useState<SpellVariable[]>([]);

    // Modal States
    const [ownerModalOpen, setOwnerModalOpen] = useState(false);
    const [locationModalOpen, setLocationModalOpen] = useState(false);
    const [nodeModalOpen, setNodeModalOpen] = useState(false);
    const [allocationModalOpen, setAllocationModalOpen] = useState(false);
    const [realmModalOpen, setRealmModalOpen] = useState(false);
    const [spellModalOpen, setSpellModalOpen] = useState(false);

    // Data Lists
    const [owners, setOwners] = useState<User[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [allocations, setAllocations] = useState<Allocation[]>([]);
    const [realms, setRealms] = useState<Realm[]>([]);
    const [spells, setSpells] = useState<Spell[]>([]);

    // Search States
    const [ownerSearch, setOwnerSearch] = useState('');
    const [locationSearch, setLocationSearch] = useState('');
    const [nodeSearch, setNodeSearch] = useState('');
    const [realmSearch, setRealmSearch] = useState('');
    const [spellSearch, setSpellSearch] = useState('');

    // Submission State
    const [submitting, setSubmitting] = useState(false);

    // Wizard Steps
    const wizardSteps: WizardStep[] = [
        { title: t('admin.servers.form.wizard.step1_title'), subtitle: t('admin.servers.form.wizard.step1_subtitle') },
        { title: t('admin.servers.form.wizard.step2_title'), subtitle: t('admin.servers.form.wizard.step2_subtitle') },
        { title: t('admin.servers.form.wizard.step3_title'), subtitle: t('admin.servers.form.wizard.step3_subtitle') },
        { title: t('admin.servers.form.wizard.step4_title'), subtitle: t('admin.servers.form.wizard.step4_subtitle') },
        { title: t('admin.servers.form.wizard.step5_title'), subtitle: t('admin.servers.form.wizard.step5_subtitle') },
        { title: t('admin.servers.form.wizard.step6_title'), subtitle: t('admin.servers.form.wizard.step6_subtitle') },
    ];

    // Fetch Spell Details when spell changes
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

                    // Parse docker images
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

    // Fetch Functions
    const fetchOwners = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/admin/users', { params: { search: ownerSearch, limit: 10 } });
            setOwners(data.data.users || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    }, [ownerSearch]);

    const fetchLocations = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/admin/locations', { params: { search: locationSearch, limit: 10 } });
            setLocations(data.data.locations || []);
        } catch (error) {
            console.error('Error fetching locations:', error);
        }
    }, [locationSearch]);

    const fetchNodes = useCallback(async () => {
        if (!formData.locationId) return;
        try {
            const { data } = await axios.get('/api/admin/nodes', {
                params: { location_id: formData.locationId, search: nodeSearch, limit: 10 },
            });
            setNodes(data.data.nodes || []);
        } catch (error) {
            console.error('Error fetching nodes:', error);
        }
    }, [formData.locationId, nodeSearch]);

    const fetchAllocations = useCallback(async () => {
        if (!formData.nodeId) return;
        try {
            const { data } = await axios.get('/api/admin/allocations', {
                params: { not_used: true },
            });
            const allAllocations: Allocation[] = data.data.allocations || [];
            setAllocations(allAllocations.filter((a) => a.node_id === formData.nodeId && !a.server_id));
        } catch (error) {
            console.error('Error fetching allocations:', error);
        }
    }, [formData.nodeId]);

    const fetchRealms = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/admin/realms', { params: { search: realmSearch, limit: 10 } });
            setRealms(data.data.realms || []);
        } catch (error) {
            console.error('Error fetching realms:', error);
        }
    }, [realmSearch]);

    const fetchSpells = useCallback(async () => {
        if (!formData.realmId) return;
        try {
            const { data } = await axios.get('/api/admin/spells', {
                params: { realm_id: formData.realmId, search: spellSearch, limit: 10 },
            });
            setSpells(data.data.spells || []);
        } catch (error) {
            console.error('Error fetching spells:', error);
        }
    }, [formData.realmId, spellSearch]);

    // Debounced search effects
    useEffect(() => {
        const timer = setTimeout(() => fetchOwners(), 300);
        return () => clearTimeout(timer);
    }, [ownerSearch, fetchOwners]);

    useEffect(() => {
        const timer = setTimeout(() => fetchLocations(), 300);
        return () => clearTimeout(timer);
    }, [locationSearch, fetchLocations]);

    useEffect(() => {
        const timer = setTimeout(() => fetchNodes(), 300);
        return () => clearTimeout(timer);
    }, [nodeSearch, fetchNodes]);

    useEffect(() => {
        const timer = setTimeout(() => fetchRealms(), 300);
        return () => clearTimeout(timer);
    }, [realmSearch, fetchRealms]);

    useEffect(() => {
        const timer = setTimeout(() => fetchSpells(), 300);
        return () => clearTimeout(timer);
    }, [spellSearch, fetchSpells]);

    // Step Validation
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

    // Navigation
    const handleNext = () => {
        if (validateCurrentStep()) {
            setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
        }
    };

    const handlePrevious = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 1));
    };

    // Submit
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

    // Selection Handlers
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

    // Common Step Props
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

            {/* Step Indicator */}
            <div className='mt-8 mb-12 p-6 bg-card rounded-2xl border border-border/50'>
                <StepIndicator steps={wizardSteps} currentStep={currentStep} />
            </div>

            {/* Step Content */}
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

            {/* Navigation */}
            <div className='flex items-center justify-between mt-8 p-6 bg-card rounded-2xl border border-border/50'>
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

            {/* Selection Modals */}
            <SelectionModal
                isOpen={ownerModalOpen}
                onClose={() => setOwnerModalOpen(false)}
                title={t('admin.servers.form.select_owner')}
                items={owners}
                onSelect={handleSelectOwner}
                search={ownerSearch}
                onSearchChange={setOwnerSearch}
                renderItem={(owner) => (
                    <div className='flex flex-col'>
                        <span className='font-semibold'>{owner.username}</span>
                        <span className='text-xs text-muted-foreground'>{owner.email}</span>
                    </div>
                )}
            />

            <SelectionModal
                isOpen={locationModalOpen}
                onClose={() => setLocationModalOpen(false)}
                title={t('admin.servers.form.select_location')}
                items={locations}
                onSelect={handleSelectLocation}
                search={locationSearch}
                onSearchChange={setLocationSearch}
                renderItem={(location) => <span className='font-semibold'>{location.name}</span>}
            />

            <SelectionModal
                isOpen={nodeModalOpen}
                onClose={() => setNodeModalOpen(false)}
                title={t('admin.servers.form.select_node')}
                items={nodes}
                onSelect={handleSelectNode}
                search={nodeSearch}
                onSearchChange={setNodeSearch}
                renderItem={(node) => (
                    <div className='flex flex-col'>
                        <span className='font-semibold'>{node.name}</span>
                        <span className='text-xs text-muted-foreground'>{node.fqdn}</span>
                    </div>
                )}
            />

            <SelectionModal
                isOpen={allocationModalOpen}
                onClose={() => setAllocationModalOpen(false)}
                title={t('admin.servers.form.select_allocation')}
                items={allocations}
                onSelect={handleSelectAllocation}
                search=''
                onSearchChange={() => {}}
                renderItem={(allocation) => (
                    <span className='font-semibold font-mono'>
                        {allocation.ip}:{allocation.port}
                    </span>
                )}
            />

            <SelectionModal
                isOpen={realmModalOpen}
                onClose={() => setRealmModalOpen(false)}
                title={t('admin.servers.form.select_realm')}
                items={realms}
                onSelect={handleSelectRealm}
                search={realmSearch}
                onSearchChange={setRealmSearch}
                renderItem={(realm) => <span className='font-semibold'>{realm.name}</span>}
            />

            <SelectionModal
                isOpen={spellModalOpen}
                onClose={() => setSpellModalOpen(false)}
                title={t('admin.servers.form.select_spell')}
                items={spells}
                onSelect={handleSelectSpell}
                search={spellSearch}
                onSearchChange={setSpellSearch}
                renderItem={(spell) => (
                    <div className='flex flex-col'>
                        <span className='font-semibold'>{spell.name}</span>
                        <span className='text-xs text-muted-foreground line-clamp-1'>{spell.description}</span>
                    </div>
                )}
            />
        </div>
    );
}

// Selection Modal Component
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
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
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
