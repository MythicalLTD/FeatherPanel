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

import { useState, useMemo } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { toast } from 'sonner';
import axios from 'axios';
import {
    Dialog,
    DialogHeader,
    DialogTitleCustom as DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Server } from '@/types/server';

interface JavaVersionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    server: Server;
    detectedIssue?: string;
    onUpdated?: () => void;
}

export function JavaVersionDialog({ isOpen, onClose, server, detectedIssue, onUpdated }: JavaVersionDialogProps) {
    const { t } = useTranslation();
    const [updating, setUpdating] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string>('');

    const availableDockerImages = useMemo(() => {
        if (!server.spell?.docker_images) return [];
        try {
            const images =
                typeof server.spell.docker_images === 'string'
                    ? JSON.parse(server.spell.docker_images)
                    : server.spell.docker_images;

            return Object.entries(images).map(([label, value]) => ({
                label,
                value: value as string,
            }));
        } catch (e) {
            console.error('Failed to parse docker images', e);
            return [];
        }
    }, [server.spell]);

    const handleUpdate = async () => {
        if (!selectedImage) return;

        try {
            setUpdating(true);
            const { data } = await axios.put(`/api/user/servers/${server.uuidShort}`, {
                image: selectedImage,
            });

            if (!data.success) {
                throw new Error(data.message || 'Failed to update Docker image');
            }

            toast.success(t('features.javaVersion.imageUpdated'));
            if (onUpdated) onUpdated();
            onClose();
        } catch (error) {
            console.error('Failed to update Docker image:', error);
            toast.error(t('features.javaVersion.failedToUpdate'));
        } finally {
            setUpdating(false);
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose}>
            <DialogHeader>
                <DialogTitle>{t('features.javaVersion.title')}</DialogTitle>
                <DialogDescription>{t('features.javaVersion.description')}</DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-4'>
                {detectedIssue && (
                    <div className='rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20'>
                        <p className='text-sm text-red-800 dark:text-red-200'>{detectedIssue}</p>
                    </div>
                )}

                <div className='space-y-3'>
                    <p className='text-muted-foreground text-sm'>{t('features.javaVersion.recommendation')}</p>

                    {availableDockerImages.length > 0 && (
                        <div className='space-y-2'>
                            <Label>{t('serverStartup.availableImages')}</Label>
                            <div className='grid max-h-50 gap-2 overflow-y-auto'>
                                {availableDockerImages.map((img) => (
                                    <Button
                                        key={img.label}
                                        variant={selectedImage === img.value ? 'default' : 'outline'}
                                        size='sm'
                                        className='h-auto justify-start py-2 text-left'
                                        onClick={() => setSelectedImage(img.value)}
                                    >
                                        <div className='flex flex-col items-start'>
                                            <span className='font-medium'>{img.label}</span>
                                            <span className='max-w-[300px] truncate text-xs opacity-70'>
                                                {img.value}
                                            </span>
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedImage && (
                        <div className='bg-muted rounded-lg p-3'>
                            <Label className='text-xs'>{t('features.javaVersion.selectedImage')}</Label>
                            <p className='mt-1 font-mono text-sm break-all'>{selectedImage}</p>
                        </div>
                    )}
                </div>
            </div>

            <DialogFooter>
                <Button variant='outline' onClick={onClose} disabled={updating}>
                    {t('common.cancel')}
                </Button>
                <Button disabled={!selectedImage || updating} onClick={handleUpdate}>
                    {updating ? t('common.saving') : t('features.javaVersion.updateImage')}
                </Button>
            </DialogFooter>
        </Dialog>
    );
}
