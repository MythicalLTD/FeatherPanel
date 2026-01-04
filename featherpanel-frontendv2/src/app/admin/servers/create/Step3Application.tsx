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

import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { HeadlessSelect } from '@/components/ui/headless-select';
import { Label } from '@/components/ui/label';
import { Sparkles, Search, Wand2, Box, Binary } from 'lucide-react';
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

    // Parse Docker images from JSON string
    const getDockerImages = (): string[] => {
        if (!spellDetails?.docker_images) return [];
        try {
            const dockerImagesObj = JSON.parse(spellDetails.docker_images);
            return Object.values(dockerImagesObj) as string[];
        } catch {
            return [];
        }
    };

    const dockerImages = getDockerImages();

    return (
        <div className='space-y-8'>
            {/* Application Configuration */}
            <PageCard
                title={t('admin.servers.form.wizard.step3_title')}
                icon={Sparkles}
                className='animate-in fade-in-0 slide-in-from-right-4 duration-300'
            >
                <div className='space-y-6'>
                    {/* Realm */}
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

                    {/* Spell */}
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

                    {/* Docker Image */}
                    {dockerImages.length > 0 && (
                        <div className='space-y-3'>
                            <Label className='flex items-center gap-1.5'>
                                {t('admin.servers.form.docker_image')}
                                <span className='text-red-500 font-bold'>*</span>
                            </Label>
                            <HeadlessSelect
                                value={formData.dockerImage}
                                onChange={(val) => setFormData((prev) => ({ ...prev, dockerImage: String(val) }))}
                                options={dockerImages.map((img) => ({ id: img, name: img }))}
                                placeholder={t('admin.servers.form.select_docker_image')}
                            />
                            <p className='text-xs text-muted-foreground'>{t('admin.servers.form.docker_image_help')}</p>
                        </div>
                    )}
                </div>
            </PageCard>

            {/* Spell Variables */}
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
