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

import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { Sparkles, Search, Wand2, Box, Binary } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseSpellDockerImages, resolveSpellDefaultDockerImage } from '@/lib/spellDockerImages';
import { DockerImageField } from '@/components/admin/DockerImageField';
import { StepProps, Realm, Spell } from './types';

interface Step3Props extends StepProps {
    realms: Realm[];
    spells: Spell[];
    realmModalOpen: boolean;
    setRealmModalOpen: (val: boolean) => void;
    spellModalOpen: boolean;
    setSpellModalOpen: (val: boolean) => void;
    fetchRealms: () => void;
    fetchSpells: () => void;
}

export function Step3Application({
    formData,
    setFormData,
    selectedEntities,
    spellDetails,
    spellVariablesData,
    setRealmModalOpen,
    setSpellModalOpen,
    fetchRealms,
    fetchSpells,
}: Step3Props) {
    const { t } = useTranslation();

    const getDockerImages = (): { name: string; value: string }[] => {
        return parseSpellDockerImages(spellDetails?.docker_images);
    };

    const defaultDockerImage = spellDetails ? resolveSpellDefaultDockerImage(spellDetails) : '';

    const dockerImages = getDockerImages();

    const openRealmModal = () => {
        fetchRealms();
        setRealmModalOpen(true);
    };

    const openSpellModal = () => {
        if (!formData.realmId) return;
        fetchSpells();
        setSpellModalOpen(true);
    };

    return (
        <div className='space-y-8'>
            <PageCard
                title={t('admin.servers.form.wizard.step3_title')}
                icon={Sparkles}
                className='animate-in fade-in-0 slide-in-from-right-4 duration-300'
            >
                <div className='space-y-6'>
                    <div className='space-y-3'>
                        <Label className='flex items-center gap-1.5'>
                            {t('admin.servers.form.realm')}
                            <span className='font-bold text-red-500'>*</span>
                        </Label>
                        <div className='flex gap-2'>
                            <div
                                role='button'
                                tabIndex={0}
                                className='bg-muted/30 border-border/50 focus-visible:ring-ring flex h-11 flex-1 cursor-pointer items-center rounded-xl border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
                                onClick={openRealmModal}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        openRealmModal();
                                    }
                                }}
                            >
                                {selectedEntities.realm ? (
                                    <div className='flex items-center gap-2'>
                                        <Box className='text-primary h-4 w-4' />
                                        <span className='text-foreground font-medium'>
                                            {selectedEntities.realm.name}
                                        </span>
                                    </div>
                                ) : (
                                    <span className='text-muted-foreground'>
                                        {t('admin.servers.form.select_realm')}
                                    </span>
                                )}
                            </div>
                            <Button type='button' size='icon' onClick={openRealmModal}>
                                <Search className='h-4 w-4' />
                            </Button>
                        </div>
                    </div>

                    <div className={cn('space-y-3', !formData.realmId && 'pointer-events-none opacity-50')}>
                        <Label className='flex items-center gap-1.5'>
                            {t('admin.servers.form.spell')}
                            <span className='font-bold text-red-500'>*</span>
                        </Label>
                        <div className='flex gap-2'>
                            <div
                                role='button'
                                tabIndex={formData.realmId ? 0 : -1}
                                className={cn(
                                    'bg-muted/30 border-border/50 focus-visible:ring-ring flex h-11 flex-1 items-center rounded-xl border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                                    formData.realmId ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
                                )}
                                onClick={openSpellModal}
                                onKeyDown={(e) => {
                                    if (!formData.realmId) return;
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        openSpellModal();
                                    }
                                }}
                            >
                                {selectedEntities.spell ? (
                                    <div className='flex items-center gap-2'>
                                        <Wand2 className='text-primary h-4 w-4' />
                                        <span className='text-foreground font-medium'>
                                            {selectedEntities.spell.name}
                                        </span>
                                    </div>
                                ) : (
                                    <span className='text-muted-foreground'>
                                        {t('admin.servers.form.select_spell')}
                                    </span>
                                )}
                            </div>
                            <Button type='button' size='icon' onClick={openSpellModal} disabled={!formData.realmId}>
                                <Search className='h-4 w-4' />
                            </Button>
                        </div>
                    </div>

                    {formData.spellId && (
                        <DockerImageField
                            value={formData.dockerImage}
                            onChange={(dockerImage) => setFormData((prev) => ({ ...prev, dockerImage }))}
                            images={dockerImages}
                            defaultImage={defaultDockerImage}
                        />
                    )}
                </div>
            </PageCard>

            {spellVariablesData.length > 0 && (
                <PageCard
                    title={t('admin.servers.form.spell_configuration')}
                    icon={Binary}
                    className='animate-in fade-in-0 slide-in-from-right-4 duration-500'
                >
                    <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                        {spellVariablesData.map((v) => (
                            <div key={v.id} className='space-y-3'>
                                <Label className='flex items-center gap-1.5'>
                                    {v.name}
                                    {v.rules.includes('required') && <span className='font-bold text-red-500'>*</span>}
                                </Label>
                                <Input
                                    value={formData.spellVariables[v.env_variable] || ''}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            spellVariables: {
                                                ...prev.spellVariables,
                                                [v.env_variable]: e.target.value,
                                            },
                                        }))
                                    }
                                    placeholder={v.default_value}
                                    className='bg-muted/30 h-11'
                                />
                                <p className='text-muted-foreground text-xs'>{v.description}</p>
                            </div>
                        ))}
                    </div>
                </PageCard>
            )}
        </div>
    );
}
