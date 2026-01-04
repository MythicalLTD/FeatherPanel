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

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageCard } from '@/components/featherui/PageCard';
import { HeadlessModal } from '@/components/ui/headless-modal';
import { HeadlessSelect } from '@/components/ui/headless-select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
    Server,
    User,
    Network,
    Plus,
    X,
    Sparkles,
    Settings,
    Shield,
    Terminal,
    Cpu,
    Binary,
    Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpellVariable {
    id: number;
    name: string;
    description: string;
    env_variable: string;
    default_value: string;
    user_viewable: number;
    user_editable: number;
    rules: string;
    field_type: string;
}

interface Spell {
    id: number;
    name: string;
    description?: string;
    startup: string;
    docker_images: string; // JSON string that needs to be parsed
}

interface User {
    id: number;
    uuid: string;
    username: string;
    email: string;
}

interface Location {
    id: number;
    name: string;
}

interface Node {
    id: number;
    name: string;
    fqdn: string;
}

interface Allocation {
    id: number;
    ip: string;
    port: number;
    ip_alias?: string;
    server_id: number | null;
    node_id: number;
}

interface Realm {
    id: number;
    name: string;
}

export default function CreateServerPage() {
    const { t } = useTranslation();
    const router = useRouter();

    // Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [ownerId, setOwnerId] = useState<number | null>(null);
    const [skipScripts, setSkipScripts] = useState(false);
    const [locationId, setLocationId] = useState<number | null>(null);
    const [nodeId, setNodeId] = useState<number | null>(null);
    const [allocationId, setAllocationId] = useState<number | null>(null);
    const [realmId, setRealmId] = useState<number | null>(null);
    const [spellId, setSpellId] = useState<number | null>(null);
    const [dockerImage, setDockerImage] = useState('');
    const [startup, setStartup] = useState('');
    const [memory, setMemory] = useState(1024);
    const [swap, setSwap] = useState(0);
    const [disk, setDisk] = useState(5120);
    const [cpu, setCpu] = useState(0);
    const [io, setIo] = useState(500);
    const [oomKiller, setOomKiller] = useState(true);
    const [threads, setThreads] = useState('');
    const [databaseLimit, setDatabaseLimit] = useState(0);
    const [allocationLimit, setAllocationLimit] = useState(0);
    const [backupLimit, setBackupLimit] = useState(0);

    // Resource Toggle States
    const [memoryUnlimited, setMemoryUnlimited] = useState(false);
    const [swapType, setSwapType] = useState<'disabled' | 'unlimited' | 'limited'>('disabled');
    const [diskUnlimited, setDiskUnlimited] = useState(false);
    const [cpuUnlimited, setCpuUnlimited] = useState(true);

    // Spell-Specific State
    const [spellDetails, setSpellDetails] = useState<Spell | null>(null);
    const [spellVariablesData, setSpellVariablesData] = useState<SpellVariable[]>([]);
    const [spellVariables, setSpellVariables] = useState<Record<string, string>>({});

    // Modal States
    const [ownerModalOpen, setOwnerModalOpen] = useState(false);
    const [locationModalOpen, setLocationModalOpen] = useState(false);
    const [nodeModalOpen, setNodeModalOpen] = useState(false);
    const [allocationModalOpen, setAllocationModalOpen] = useState(false);
    const [realmModalOpen, setRealmModalOpen] = useState(false);
    const [spellModalOpen, setSpellModalOpen] = useState(false);

    // List States for Modals
    const [owners, setOwners] = useState<User[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [allocations, setAllocations] = useState<Allocation[]>([]);
    const [realms, setRealms] = useState<Realm[]>([]);
    const [spells, setSpells] = useState<Spell[]>([]);

    // Selection UI Data
    const [selectedOwner, setSelectedOwner] = useState<User | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [selectedAllocation, setSelectedAllocation] = useState<Allocation | null>(null);
    const [selectedRealm, setSelectedRealm] = useState<Realm | null>(null);
    const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);

    // Submission State
    const [submitting, setSubmitting] = useState(false);

    // Search States for Modals
    const [ownerSearch, setOwnerSearch] = useState('');
    const [locationSearch, setLocationSearch] = useState('');
    const [nodeSearch, setNodeSearch] = useState('');
    const [allocationSearch, setAllocationSearch] = useState('');
    const [realmSearch, setRealmSearch] = useState('');
    const [spellSearch, setSpellSearch] = useState('');

    // Fetch spell details when spell changes
    useEffect(() => {
        if (!spellId) {
            setSpellDetails(null);
            setSpellVariablesData([]);
            setStartup('');
            setDockerImage('');
            setSpellVariables({});
            return;
        }

        const fetchSpellDetails = async () => {
            try {
                // Fetch both spell details and variables in parallel
                const [spellRes, variablesRes] = await Promise.all([
                    axios.get(`/api/admin/spells/${spellId}`),
                    axios.get(`/api/admin/spells/${spellId}/variables`),
                ]);

                if (spellRes.data?.success) {
                    const spell: Spell = spellRes.data.data.spell;
                    setSpellDetails(spell);

                    // Parse docker images from JSON string
                    if (spell.docker_images) {
                        try {
                            const dockerImagesObj = JSON.parse(spell.docker_images);
                            const imagesArray = Object.values(dockerImagesObj) as string[];
                            if (imagesArray.length > 0) {
                                setDockerImage(imagesArray[0]);
                            }
                        } catch (e) {
                            console.error('Failed to parse docker images:', e);
                            setDockerImage('');
                        }
                    }

                    // Update startup command if available
                    if (spell.startup) {
                        setStartup(spell.startup);
                    }
                }

                // Process variables from separate endpoint
                if (variablesRes.data?.success) {
                    const variables: SpellVariable[] = variablesRes.data.data.variables || [];
                    setSpellVariablesData(variables);
                    const initialVars: Record<string, string> = {};
                    variables.forEach((v) => {
                        initialVars[v.env_variable] = v.default_value ?? '';
                    });
                    setSpellVariables(initialVars);
                }
            } catch (error) {
                console.error('Error fetching spell details:', error);
                toast.error('Failed to fetch spell details');
            }
        };

        fetchSpellDetails();
    }, [spellId]);

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
        if (!locationId) return;
        try {
            const { data } = await axios.get('/api/admin/nodes', {
                params: { location_id: locationId, search: nodeSearch, limit: 10 },
            });
            setNodes(data.data.nodes || []);
        } catch (error) {
            console.error('Error fetching nodes:', error);
        }
    }, [locationId, nodeSearch]);

    const fetchAllocations = useCallback(async () => {
        if (!nodeId) return;
        try {
            const { data } = await axios.get('/api/admin/allocations', {
                params: { not_used: true },
            });
            const allAllocations: Allocation[] = data.data.allocations || [];
            // Filter allocations by the selected node
            setAllocations(allAllocations.filter((a) => a.node_id === nodeId && !a.server_id));
        } catch (error) {
            console.error('Error fetching allocations:', error);
        }
    }, [nodeId]);

    const fetchRealms = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/admin/realms', { params: { search: realmSearch, limit: 10 } });
            setRealms(data.data.realms || []);
        } catch (error) {
            console.error('Error fetching realms:', error);
        }
    }, [realmSearch]);

    const fetchSpells = useCallback(async () => {
        if (!realmId) return;
        try {
            const { data } = await axios.get('/api/admin/spells', {
                params: { realm_id: realmId, search: spellSearch, limit: 10 },
            });
            setSpells(data.data.spells || []);
        } catch (error) {
            console.error('Error fetching spells:', error);
        }
    }, [realmId, spellSearch]);

    // Selection Handlers
    const handleLocationSelect = (loc: Location) => {
        setLocationId(loc.id);
        setSelectedLocation(loc);
        setNodeId(null);
        setSelectedNode(null);
        setAllocationId(null);
        setSelectedAllocation(null);
        setLocationModalOpen(false);
    };

    const handleNodeSelect = (node: Node) => {
        setNodeId(node.id);
        setSelectedNode(node);
        setAllocationId(null);
        setSelectedAllocation(null);
        setNodeModalOpen(false);
    };

    const handleRealmSelect = (realm: Realm) => {
        setRealmId(realm.id);
        setSelectedRealm(realm);
        setSpellId(null);
        setSelectedSpell(null);
        setRealmModalOpen(false);
    };

    // Debounced Search Fetchers
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchOwners();
        }, 500);
        return () => clearTimeout(timer);
    }, [fetchOwners, ownerSearch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLocations();
        }, 500);
        return () => clearTimeout(timer);
    }, [fetchLocations, locationSearch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchNodes();
        }, 500);
        return () => clearTimeout(timer);
    }, [fetchNodes, nodeSearch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchAllocations();
        }, 500);
        return () => clearTimeout(timer);
    }, [fetchAllocations, allocationSearch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchRealms();
        }, 500);
        return () => clearTimeout(timer);
    }, [fetchRealms, realmSearch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchSpells();
        }, 500);
        return () => clearTimeout(timer);
    }, [fetchSpells, spellSearch]);

    // Handle Submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ownerId || !nodeId || !allocationId || !realmId || !spellId || !dockerImage) {
            toast.error('Please fill in all required fields');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                name,
                description,
                owner_id: ownerId,
                skip_scripts: skipScripts ? 1 : 0,
                node_id: nodeId,
                allocation_id: allocationId,
                realms_id: realmId,
                spell_id: spellId,
                image: dockerImage,
                startup,
                memory: memoryUnlimited ? 0 : memory,
                swap: swapType === 'disabled' ? 0 : swapType === 'unlimited' ? -1 : swap,
                disk: diskUnlimited ? 0 : disk,
                cpu: cpuUnlimited ? 0 : cpu,
                io,
                oom_disabled: oomKiller ? 0 : 1,
                threads,
                database_limit: databaseLimit,
                allocation_limit: allocationLimit,
                backup_limit: backupLimit,
                environment: spellVariables,
            };

            await axios.put('/api/admin/servers', payload);
            toast.success('Server created successfully');
            router.push('/admin/servers');
        } catch (error) {
            console.error('Error creating server:', error);
            if (isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error('Failed to create server');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className='max-w-7xl mx-auto pb-20'>
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

            <form onSubmit={handleSubmit} className='mt-8 space-y-8'>
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
                    {/* Core Details */}
                    <div className='space-y-8'>
                        <PageCard title={t('admin.servers.form.core_details')} icon={Settings}>
                            <div className='space-y-6'>
                                <div className='space-y-2'>
                                    <Label>{t('admin.servers.form.name')}</Label>
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder='My Server'
                                        required
                                    />
                                    <p className='text-xs text-muted-foreground'>{t('admin.servers.form.name_help')}</p>
                                </div>

                                <div className='space-y-2'>
                                    <Label>{t('admin.servers.form.description')}</Label>
                                    <Input
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder='A brief description'
                                    />
                                    <p className='text-xs text-muted-foreground'>
                                        {t('admin.servers.form.description_help')}
                                    </p>
                                </div>

                                <div className='space-y-2'>
                                    <Label>{t('admin.servers.form.owner')}</Label>
                                    <div className='flex gap-2'>
                                        <div className='flex-1 p-3 bg-muted/30 rounded-xl border border-border/50 text-sm'>
                                            {selectedOwner ? (
                                                <div className='flex items-center gap-2'>
                                                    <span className='font-medium text-foreground'>
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
                                            onClick={() => {
                                                fetchOwners();
                                                setOwnerModalOpen(true);
                                            }}
                                        >
                                            <Search className='h-4 w-4' />
                                        </Button>
                                    </div>
                                    <p className='text-xs text-muted-foreground'>
                                        {t('admin.servers.form.owner_help')}
                                    </p>
                                </div>

                                <div className='space-y-4 pt-2'>
                                    <div className='flex items-center justify-between'>
                                        <div className='space-y-0.5'>
                                            <Label>{t('admin.servers.form.skip_scripts')}</Label>
                                            <p className='text-xs text-muted-foreground'>
                                                {t('admin.servers.form.skip_scripts_help')}
                                            </p>
                                        </div>
                                        <Switch checked={skipScripts} onCheckedChange={setSkipScripts} />
                                    </div>
                                </div>
                            </div>
                        </PageCard>

                        {/* Allocation Management */}
                        <PageCard title={t('admin.servers.form.allocation_management')} icon={Network}>
                            <div className='space-y-6'>
                                <div className='space-y-2'>
                                    <Label>{t('admin.servers.form.location')}</Label>
                                    <div className='flex gap-2'>
                                        <div className='flex-1 p-3 bg-muted/30 rounded-xl border border-border/50 text-sm'>
                                            {selectedLocation ? (
                                                <span className='font-medium text-foreground'>
                                                    {selectedLocation.name}
                                                </span>
                                            ) : (
                                                <span className='text-muted-foreground'>
                                                    {t('admin.servers.form.select_location')}
                                                </span>
                                            )}
                                        </div>
                                        <Button
                                            type='button'
                                            onClick={() => {
                                                fetchLocations();
                                                setLocationModalOpen(true);
                                            }}
                                        >
                                            <Search className='h-4 w-4' />
                                        </Button>
                                    </div>
                                </div>

                                <div className={cn('space-y-2', !locationId && 'opacity-50 pointer-events-none')}>
                                    <Label>{t('admin.servers.form.node')}</Label>
                                    <div className='flex gap-2'>
                                        <div className='flex-1 p-3 bg-muted/30 rounded-xl border border-border/50 text-sm'>
                                            {selectedNode ? (
                                                <span className='font-medium text-foreground'>{selectedNode.name}</span>
                                            ) : (
                                                <span className='text-muted-foreground'>
                                                    {t('admin.servers.form.select_node')}
                                                </span>
                                            )}
                                        </div>
                                        <Button
                                            type='button'
                                            onClick={() => {
                                                fetchNodes();
                                                setNodeModalOpen(true);
                                            }}
                                            disabled={!locationId}
                                        >
                                            <Search className='h-4 w-4' />
                                        </Button>
                                    </div>
                                </div>

                                <div className={cn('space-y-2', !nodeId && 'opacity-50 pointer-events-none')}>
                                    <Label>{t('admin.servers.form.allocation')}</Label>
                                    <div className='flex gap-2'>
                                        <div className='flex-1 p-3 bg-muted/30 rounded-xl border border-border/50 text-sm'>
                                            {selectedAllocation ? (
                                                <span className='font-medium text-foreground'>
                                                    {selectedAllocation.ip}:{selectedAllocation.port}
                                                </span>
                                            ) : (
                                                <span className='text-muted-foreground'>
                                                    {t('admin.servers.form.select_allocation')}
                                                </span>
                                            )}
                                        </div>
                                        <Button
                                            type='button'
                                            onClick={() => {
                                                fetchAllocations();
                                                setAllocationModalOpen(true);
                                            }}
                                            disabled={!nodeId}
                                        >
                                            <Search className='h-4 w-4' />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </PageCard>
                    </div>

                    {/* Application Configuration */}
                    <div className='space-y-8'>
                        <PageCard title={t('admin.servers.form.application_configuration')} icon={Sparkles}>
                            <div className='space-y-6'>
                                <div className='space-y-2'>
                                    <Label>{t('admin.servers.form.realm')}</Label>
                                    <div className='flex gap-2'>
                                        <div className='flex-1 p-3 bg-muted/30 rounded-xl border border-border/50 text-sm'>
                                            {selectedRealm ? (
                                                <span className='font-medium text-foreground'>
                                                    {selectedRealm.name}
                                                </span>
                                            ) : (
                                                <span className='text-muted-foreground'>
                                                    {t('admin.servers.form.select_realm')}
                                                </span>
                                            )}
                                        </div>
                                        <Button
                                            type='button'
                                            onClick={() => {
                                                fetchRealms();
                                                setRealmModalOpen(true);
                                            }}
                                        >
                                            <Search className='h-4 w-4' />
                                        </Button>
                                    </div>
                                </div>

                                <div className={cn('space-y-2', !realmId && 'opacity-50 pointer-events-none')}>
                                    <Label>{t('admin.servers.form.spell')}</Label>
                                    <div className='flex gap-2'>
                                        <div className='flex-1 p-3 bg-muted/30 rounded-xl border border-border/50 text-sm'>
                                            {selectedSpell ? (
                                                <span className='font-medium text-foreground'>
                                                    {selectedSpell.name}
                                                </span>
                                            ) : (
                                                <span className='text-muted-foreground'>
                                                    {t('admin.servers.form.select_spell')}
                                                </span>
                                            )}
                                        </div>
                                        <Button
                                            type='button'
                                            onClick={() => {
                                                fetchSpells();
                                                setSpellModalOpen(true);
                                            }}
                                            disabled={!realmId}
                                        >
                                            <Search className='h-4 w-4' />
                                        </Button>
                                    </div>
                                </div>

                                {spellDetails &&
                                    spellDetails.docker_images &&
                                    (() => {
                                        try {
                                            const dockerImagesObj = JSON.parse(spellDetails.docker_images);
                                            const imagesArray = Object.values(dockerImagesObj) as string[];
                                            if (imagesArray.length > 0) {
                                                return (
                                                    <div className='space-y-2'>
                                                        <Label>{t('admin.servers.form.docker_image')}</Label>
                                                        <HeadlessSelect
                                                            value={dockerImage}
                                                            onChange={(val) => setDockerImage(String(val))}
                                                            options={imagesArray.map((img) => ({ id: img, name: img }))}
                                                            placeholder={t('admin.servers.form.select_docker_image')}
                                                        />
                                                        <p className='text-xs text-muted-foreground'>
                                                            {t('admin.servers.form.docker_image_help')}
                                                        </p>
                                                    </div>
                                                );
                                            }
                                        } catch (e) {
                                            console.error('Failed to parse docker images:', e);
                                        }
                                        return null;
                                    })()}
                            </div>
                        </PageCard>

                        {/* Feature Limits */}
                        <PageCard title={t('admin.servers.form.application_feature_limits')} icon={Shield}>
                            <div className='space-y-6'>
                                <div className='space-y-2'>
                                    <Label>{t('admin.servers.form.database_limit')}</Label>
                                    <Input
                                        type='number'
                                        value={databaseLimit}
                                        onChange={(e) => setDatabaseLimit(parseInt(e.target.value))}
                                        min={0}
                                    />
                                    <p className='text-xs text-muted-foreground'>
                                        {t('admin.servers.form.database_limit_help')}
                                    </p>
                                </div>

                                <div className='space-y-2'>
                                    <Label>{t('admin.servers.form.allocation_limit')}</Label>
                                    <Input
                                        type='number'
                                        value={allocationLimit}
                                        onChange={(e) => setAllocationLimit(parseInt(e.target.value))}
                                        min={0}
                                    />
                                    <p className='text-xs text-muted-foreground'>
                                        {t('admin.servers.form.allocation_limit_help')}
                                    </p>
                                </div>

                                <div className='space-y-2'>
                                    <Label>{t('admin.servers.form.backup_limit')}</Label>
                                    <Input
                                        type='number'
                                        value={backupLimit}
                                        onChange={(e) => setBackupLimit(parseInt(e.target.value))}
                                        min={0}
                                    />
                                    <p className='text-xs text-muted-foreground'>
                                        {t('admin.servers.form.backup_limit_help')}
                                    </p>
                                </div>
                            </div>
                        </PageCard>
                    </div>
                </div>

                {/* Resource Management */}
                <PageCard title={t('admin.servers.form.resource_management')} icon={Cpu}>
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
                        {/* Memory */}
                        <div className='space-y-4 font-normal'>
                            <div className='flex items-center justify-between'>
                                <Label className='text-base font-semibold'>{t('admin.servers.form.memory')}</Label>
                                <div className='flex bg-muted/50 p-1 rounded-lg border border-border/50'>
                                    <button
                                        type='button'
                                        className={cn(
                                            'px-3 py-1 text-xs font-medium rounded-md transition-all',
                                            !memoryUnlimited ? 'bg-primary text-white shadow-sm' : 'hover:bg-muted',
                                        )}
                                        onClick={() => setMemoryUnlimited(false)}
                                    >
                                        {t('admin.servers.form.limited')}
                                    </button>
                                    <button
                                        type='button'
                                        className={cn(
                                            'px-3 py-1 text-xs font-medium rounded-md transition-all',
                                            memoryUnlimited ? 'bg-primary text-white shadow-sm' : 'hover:bg-muted',
                                        )}
                                        onClick={() => setMemoryUnlimited(true)}
                                    >
                                        {t('admin.servers.form.unlimited')}
                                    </button>
                                </div>
                            </div>
                            {!memoryUnlimited && (
                                <Input
                                    type='number'
                                    value={memory}
                                    onChange={(e) => setMemory(parseInt(e.target.value))}
                                    min={0}
                                />
                            )}
                            <p className='text-xs text-muted-foreground'>{t('admin.servers.form.memory_help')}</p>
                        </div>

                        {/* Swap */}
                        <div className='space-y-4 font-normal'>
                            <div className='flex items-center justify-between'>
                                <Label className='text-base font-semibold'>{t('admin.servers.form.swap')}</Label>
                                <div className='flex bg-muted/50 p-1 rounded-lg border border-border/50'>
                                    <button
                                        type='button'
                                        className={cn(
                                            'px-3 py-1 text-xs font-medium rounded-md transition-all',
                                            swapType === 'disabled'
                                                ? 'bg-primary text-white shadow-sm'
                                                : 'hover:bg-muted',
                                        )}
                                        onClick={() => setSwapType('disabled')}
                                    >
                                        {t('admin.servers.form.disabled')}
                                    </button>
                                    <button
                                        type='button'
                                        className={cn(
                                            'px-3 py-1 text-xs font-medium rounded-md transition-all',
                                            swapType === 'unlimited'
                                                ? 'bg-primary text-white shadow-sm'
                                                : 'hover:bg-muted',
                                        )}
                                        onClick={() => setSwapType('unlimited')}
                                    >
                                        {t('admin.servers.form.unlimited')}
                                    </button>
                                    <button
                                        type='button'
                                        className={cn(
                                            'px-3 py-1 text-xs font-medium rounded-md transition-all',
                                            swapType === 'limited'
                                                ? 'bg-primary text-white shadow-sm'
                                                : 'hover:bg-muted',
                                        )}
                                        onClick={() => setSwapType('limited')}
                                    >
                                        {t('admin.servers.form.limited')}
                                    </button>
                                </div>
                            </div>
                            {swapType === 'limited' && (
                                <Input
                                    type='number'
                                    value={swap}
                                    onChange={(e) => setSwap(parseInt(e.target.value))}
                                    min={0}
                                />
                            )}
                            <p className='text-xs text-muted-foreground'>{t('admin.servers.form.swap_help')}</p>
                        </div>

                        {/* Disk */}
                        <div className='space-y-4 font-normal'>
                            <div className='flex items-center justify-between'>
                                <Label className='text-base font-semibold'>{t('admin.servers.form.disk')}</Label>
                                <div className='flex bg-muted/50 p-1 rounded-lg border border-border/50'>
                                    <button
                                        type='button'
                                        className={cn(
                                            'px-3 py-1 text-xs font-medium rounded-md transition-all',
                                            !diskUnlimited ? 'bg-primary text-white shadow-sm' : 'hover:bg-muted',
                                        )}
                                        onClick={() => setDiskUnlimited(false)}
                                    >
                                        {t('admin.servers.form.limited')}
                                    </button>
                                    <button
                                        type='button'
                                        className={cn(
                                            'px-3 py-1 text-xs font-medium rounded-md transition-all',
                                            diskUnlimited ? 'bg-primary text-white shadow-sm' : 'hover:bg-muted',
                                        )}
                                        onClick={() => setDiskUnlimited(true)}
                                    >
                                        {t('admin.servers.form.unlimited')}
                                    </button>
                                </div>
                            </div>
                            {!diskUnlimited && (
                                <Input
                                    type='number'
                                    value={disk}
                                    onChange={(e) => setDisk(parseInt(e.target.value))}
                                    min={0}
                                />
                            )}
                            <p className='text-xs text-muted-foreground'>{t('admin.servers.form.disk_help')}</p>
                        </div>

                        {/* CPU */}
                        <div className='space-y-4 font-normal'>
                            <div className='flex items-center justify-between'>
                                <Label className='text-base font-semibold'>{t('admin.servers.form.cpu')}</Label>
                                <div className='flex bg-muted/50 p-1 rounded-lg border border-border/50'>
                                    <button
                                        type='button'
                                        className={cn(
                                            'px-3 py-1 text-xs font-medium rounded-md transition-all',
                                            !cpuUnlimited ? 'bg-primary text-white shadow-sm' : 'hover:bg-muted',
                                        )}
                                        onClick={() => setCpuUnlimited(false)}
                                    >
                                        {t('admin.servers.form.limited')}
                                    </button>
                                    <button
                                        type='button'
                                        className={cn(
                                            'px-3 py-1 text-xs font-medium rounded-md transition-all',
                                            cpuUnlimited ? 'bg-primary text-white shadow-sm' : 'hover:bg-muted',
                                        )}
                                        onClick={() => setCpuUnlimited(true)}
                                    >
                                        {t('admin.servers.form.unlimited')}
                                    </button>
                                </div>
                            </div>
                            {!cpuUnlimited && (
                                <Input
                                    type='number'
                                    value={cpu}
                                    onChange={(e) => setCpu(parseInt(e.target.value))}
                                    min={0}
                                />
                            )}
                            <p className='text-xs text-muted-foreground'>{t('admin.servers.form.cpu_help')}</p>
                        </div>

                        <div className='space-y-2'>
                            <Label>{t('admin.servers.form.io')}</Label>
                            <Input
                                type='number'
                                value={io}
                                onChange={(e) => setIo(parseInt(e.target.value))}
                                min={10}
                                max={1000}
                            />
                            <p className='text-xs text-muted-foreground'>{t('admin.servers.form.io_help')}</p>
                        </div>

                        <div className='space-y-2'>
                            <Label>{t('admin.servers.form.threads')}</Label>
                            <Input value={threads} onChange={(e) => setThreads(e.target.value)} placeholder='0,1,3' />
                            <p className='text-xs text-muted-foreground'>{t('admin.servers.form.threads_help')}</p>
                        </div>

                        <div className='flex items-center justify-between pt-4'>
                            <div className='space-y-0.5'>
                                <Label>{t('admin.servers.form.oom_killer')}</Label>
                                <p className='text-xs text-muted-foreground'>
                                    {t('admin.servers.form.oom_killer_help')}
                                </p>
                            </div>
                            <Switch checked={oomKiller} onCheckedChange={setOomKiller} />
                        </div>
                    </div>
                </PageCard>

                {/* Spell Configuration (Dynamic Variables) */}
                {spellVariablesData.length > 0 && (
                    <PageCard title={t('admin.servers.form.spell_configuration')} icon={Binary}>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                            {spellVariablesData.map((v) => (
                                <div key={v.id} className='space-y-2'>
                                    <Label className='flex items-center gap-1.5'>
                                        {v.name}
                                        {v.rules.includes('required') && (
                                            <span className='text-red-500 font-bold'>*</span>
                                        )}
                                    </Label>
                                    <Input
                                        value={spellVariables[v.env_variable] || ''}
                                        onChange={(e) =>
                                            setSpellVariables((prev) => ({
                                                ...prev,
                                                [v.env_variable]: e.target.value,
                                            }))
                                        }
                                        placeholder={v.default_value}
                                    />
                                    <p className='text-xs text-muted-foreground'>{v.description}</p>
                                    <div className='flex gap-4 pt-1'>
                                        <div className='flex items-center gap-1.5'>
                                            <span className='text-[10px] font-bold uppercase text-muted-foreground'>
                                                {t('admin.servers.form.access_in_startup')}
                                            </span>
                                            <span className='text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded'>
                                                {`{{${v.env_variable}}}`}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </PageCard>
                )}

                {/* Startup Configuration */}
                <PageCard title={t('admin.servers.form.startup_configuration')} icon={Terminal}>
                    <div className='space-y-4'>
                        <div className='space-y-2'>
                            <Label>{t('admin.servers.form.startup_command')}</Label>
                            <Input
                                value={startup}
                                onChange={(e) => setStartup(e.target.value)}
                                className='font-mono'
                                required
                            />
                            <p className='text-xs text-muted-foreground'>
                                {t('admin.servers.form.startup_command_help')}
                            </p>
                        </div>
                    </div>
                </PageCard>

                <div className='flex justify-end pt-8'>
                    <Button type='submit' size='lg' loading={submitting}>
                        <Plus className='h-4 w-4 mr-2' />
                        {t('admin.servers.form.create_server')}
                    </Button>
                </div>
            </form>

            {/* Modals */}
            <SelectionModal
                isOpen={ownerModalOpen}
                onClose={() => setOwnerModalOpen(false)}
                title={t('admin.servers.form.select_owner')}
                items={owners}
                onSelect={(user: User) => {
                    setOwnerId(user.id);
                    setSelectedOwner(user);
                    setOwnerModalOpen(false);
                }}
                search={ownerSearch}
                onSearchChange={setOwnerSearch}
                renderItem={(user: User) => (
                    <div className='flex flex-col'>
                        <span className='font-semibold'>{user.username}</span>
                        <span className='text-xs text-muted-foreground'>{user.email}</span>
                    </div>
                )}
            />

            <SelectionModal
                isOpen={locationModalOpen}
                onClose={() => setLocationModalOpen(false)}
                title={t('admin.servers.form.select_location')}
                items={locations}
                onSelect={handleLocationSelect}
                search={locationSearch}
                onSearchChange={setLocationSearch}
                renderItem={(loc: Location) => <span className='font-semibold'>{loc.name}</span>}
            />

            <SelectionModal
                isOpen={nodeModalOpen}
                onClose={() => setNodeModalOpen(false)}
                title={t('admin.servers.form.select_node')}
                items={nodes}
                onSelect={handleNodeSelect}
                search={nodeSearch}
                onSearchChange={setNodeSearch}
                renderItem={(node: Node) => (
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
                onSelect={(alloc: Allocation) => {
                    setAllocationId(alloc.id);
                    setSelectedAllocation(alloc);
                    setAllocationModalOpen(false);
                }}
                search={allocationSearch}
                onSearchChange={setAllocationSearch}
                renderItem={(alloc: Allocation) => (
                    <div className='flex flex-col'>
                        <span className='font-semibold'>
                            {alloc.ip}:{alloc.port}
                        </span>
                        {alloc.ip_alias && <span className='text-xs text-muted-foreground'>{alloc.ip_alias}</span>}
                    </div>
                )}
            />

            <SelectionModal
                isOpen={realmModalOpen}
                onClose={() => setRealmModalOpen(false)}
                title={t('admin.servers.form.select_realm')}
                items={realms}
                onSelect={handleRealmSelect}
                search={realmSearch}
                onSearchChange={setRealmSearch}
                renderItem={(realm: Realm) => <span className='font-semibold'>{realm.name}</span>}
            />

            <SelectionModal
                isOpen={spellModalOpen}
                onClose={() => setSpellModalOpen(false)}
                title={t('admin.servers.form.select_spell')}
                items={spells}
                onSelect={(spell: Spell) => {
                    setSpellId(spell.id);
                    setSelectedSpell(spell);
                    setSpellModalOpen(false);
                }}
                search={spellSearch}
                onSearchChange={setSpellSearch}
                renderItem={(spell: Spell) => (
                    <div className='flex flex-col'>
                        <span className='font-semibold'>{spell.name}</span>
                        <span className='text-xs text-muted-foreground line-clamp-1'>{spell.description}</span>
                    </div>
                )}
            />
        </div>
    );
}

// Helper Sub-component for Selection Modals
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
