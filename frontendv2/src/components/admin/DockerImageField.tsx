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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Container } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DockerImageOption {
    name: string;
    value: string;
}

interface DockerImageFieldProps {
    value: string;
    onChange: (value: string) => void;
    images: DockerImageOption[];
    defaultImage?: string;
    disabled?: boolean;
    error?: string;
    required?: boolean;
}

export function DockerImageField({
    value,
    onChange,
    images,
    defaultImage = '',
    disabled = false,
    error,
    required = true,
}: DockerImageFieldProps) {
    const { t } = useTranslation();

    return (
        <div className='space-y-4'>
            <div className='space-y-2.5'>
                <Label className='flex items-center gap-1.5'>
                    {t('admin.servers.form.docker_image')}
                    {required && <span className='font-bold text-red-500'>*</span>}
                </Label>
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    placeholder='ghcr.io/pterodactyl/yolks:java_21'
                    className={cn('bg-muted/30 h-11 font-mono text-sm', error && 'border-red-500')}
                />
                {error && <p className='text-xs text-red-500'>{error}</p>}
                <p className='text-muted-foreground text-xs'>{t('admin.servers.form.docker_image_help')}</p>
            </div>

            {images.length > 0 && (
                <div className='space-y-2'>
                    <Label className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
                        {t('admin.servers.form.available_docker_images')}
                    </Label>
                    <div className='custom-scrollbar max-h-50 space-y-2 overflow-y-auto pr-2'>
                        {images.map((img) => (
                            <div
                                key={img.value}
                                role='button'
                                tabIndex={disabled ? -1 : 0}
                                onClick={() => !disabled && onChange(img.value)}
                                onKeyDown={(e) => {
                                    if (disabled) return;
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        onChange(img.value);
                                    }
                                }}
                                className={cn(
                                    'group/img relative overflow-hidden rounded-xl border p-3 transition-all duration-200',
                                    disabled ? 'cursor-default opacity-60' : 'cursor-pointer',
                                    value === img.value
                                        ? 'bg-primary/10 border-primary/40 ring-primary/20 ring-1'
                                        : 'bg-muted/20 border-border/50 hover:border-primary/30 hover:bg-muted/30',
                                )}
                            >
                                <div className='flex items-center justify-between gap-3'>
                                    <div className='flex min-w-0 items-center gap-2'>
                                        <Container className='text-primary h-4 w-4 shrink-0' />
                                        <div className='min-w-0'>
                                            <p
                                                className={cn(
                                                    'truncate text-sm font-medium',
                                                    value === img.value ? 'text-primary' : 'text-foreground',
                                                )}
                                            >
                                                {img.name}
                                                {img.value === defaultImage && (
                                                    <span className='text-muted-foreground ml-2 text-xs font-normal'>
                                                        ({t('admin.servers.form.spell_default_docker_image')})
                                                    </span>
                                                )}
                                            </p>
                                            <p className='text-muted-foreground truncate font-mono text-xs'>
                                                {img.value}
                                            </p>
                                        </div>
                                    </div>
                                    {value === img.value && (
                                        <div className='bg-primary h-2 w-2 shrink-0 rounded-full' />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
