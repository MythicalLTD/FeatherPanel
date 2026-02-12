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
import { Sparkles, Search, Wand2, Box, Binary, Container } from 'lucide-react';
import { cn } from '@/lib/utils';
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
        if (!spellDetails?.docker_images) return [];
        try {
            const dockerImagesObj = JSON.parse(spellDetails.docker_images) as Record<string, string>;
            return Object.entries(dockerImagesObj).map(([name, value]) => ({ name, value }));
        } catch {
            return [];
        }
    };

    const dockerImages = getDockerImages();

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
                            <span className='text-red-500 font-bold'>*</span>
                        </Label>
                        <div className='flex gap-2'>
                            <div className='flex-1 h-11 px-3 bg-muted/30 rounded-xl border border-border/50 text-sm flex items-center'>
                                {selectedEntities.realm ? (
                                    <div className='flex items-center gap-2'>
                                        <Box className='h-4 w-4 text-primary' />
                                        <span className='font-medium text-foreground'>
                                            {selectedEntities.realm.name}
                                        </span>
                                    </div>
                                ) : (
                                    <span className='text-muted-foreground'>
                                        {t('admin.servers.form.select_realm')}
                                    </span>
                                )}
                            </div>
                            <Button
                                type='button'
                                size='icon'
                                onClick={() => {
                                    fetchRealms();
                                    setRealmModalOpen(true);
                                }}
                            >
                                <Search className='h-4 w-4' />
                            </Button>
                        </div>
                    </div>

                    <div className={cn('space-y-3', !formData.realmId && 'opacity-50 pointer-events-none')}>
                        <Label className='flex items-center gap-1.5'>
                            {t('admin.servers.form.spell')}
                            <span className='text-red-500 font-bold'>*</span>
                        </Label>
                        <div className='flex gap-2'>
                            <div className='flex-1 h-11 px-3 bg-muted/30 rounded-xl border border-border/50 text-sm flex items-center'>
                                {selectedEntities.spell ? (
                                    <div className='flex items-center gap-2'>
                                        <Wand2 className='h-4 w-4 text-primary' />
                                        <span className='font-medium text-foreground'>
                                            {selectedEntities.spell.name}
                                        </span>
                                    </div>
                                ) : (
                                    <span className='text-muted-foreground'>
                                        {t('admin.servers.form.select_spell')}
                                    </span>
                                )}
                            </div>
                            <Button
                                type='button'
                                size='icon'
                                onClick={() => {
                                    fetchSpells();
                                    setSpellModalOpen(true);
                                }}
                                disabled={!formData.realmId}
                            >
                                <Search className='h-4 w-4' />
                            </Button>
                        </div>
                    </div>

                    {formData.spellId && (
                        <div className='space-y-4'>
                            <div className='space-y-2.5'>
                                <Label className='flex items-center gap-1.5'>
                                    {t('admin.servers.form.docker_image')}
                                    <span className='text-red-500 font-bold'>*</span>
                                </Label>
                                <Input
                                    value={formData.dockerImage}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, dockerImage: e.target.value }))}
                                    placeholder='ghcr.io/pterodactyl/yolks:java_8'
                                    className='font-mono text-sm h-11 bg-muted/30'
                                />
                                <p className='text-xs text-muted-foreground'>
                                    {t('admin.servers.form.docker_image_help')}
                                </p>
                            </div>

                            {dockerImages.length > 0 && (
                                <div className='space-y-2'>
                                    <Label className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                                        {t('admin.servers.form.available_docker_images')}
                                    </Label>
                                    <div className='space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar'>
                                        {dockerImages.map((img) => (
                                            <div
                                                key={img.value}
                                                role='button'
                                                tabIndex={0}
                                                onClick={() =>
                                                    setFormData((prev) => ({ ...prev, dockerImage: img.value }))
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        setFormData((prev) => ({ ...prev, dockerImage: img.value }));
                                                    }
                                                }}
                                                className={cn(
                                                    'p-3 rounded-xl border transition-all duration-200 cursor-pointer group/img relative overflow-hidden',
                                                    formData.dockerImage === img.value
                                                        ? 'bg-primary/10 border-primary/40 ring-1 ring-primary/20'
                                                        : 'bg-muted/20 border-border/50 hover:border-primary/30 hover:bg-muted/30',
                                                )}
                                            >
                                                <div className='flex items-center justify-between gap-3'>
                                                    <div className='flex items-center gap-2 min-w-0'>
                                                        <Container className='h-4 w-4 text-primary shrink-0' />
                                                        <div className='min-w-0'>
                                                            <p
                                                                className={cn(
                                                                    'text-sm font-medium truncate',
                                                                    formData.dockerImage === img.value
                                                                        ? 'text-primary'
                                                                        : 'text-foreground group-hover/img:text-foreground',
                                                                )}
                                                            >
                                                                {img.name}
                                                            </p>
                                                            <p className='text-xs font-mono text-muted-foreground truncate'>
                                                                {img.value}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {formData.dockerImage === img.value && (
                                                        <div className='h-2 w-2 rounded-full bg-primary shrink-0' />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </PageCard>

            {spellVariablesData.length > 0 && (
                <PageCard
                    title={t('admin.servers.form.spell_configuration')}
                    icon={Binary}
                    className='animate-in fade-in-0 slide-in-from-right-4 duration-500'
                >
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                        {spellVariablesData.map((v) => (
                            <div key={v.id} className='space-y-3'>
                                <Label className='flex items-center gap-1.5'>
                                    {v.name}
                                    {v.rules.includes('required') && <span className='text-red-500 font-bold'>*</span>}
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
                                <p className='text-xs text-muted-foreground'>{v.description}</p>
                            </div>
                        ))}
                    </div>
                </PageCard>
            )}
        </div>
    );
}
