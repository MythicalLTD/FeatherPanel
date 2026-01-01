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
            const images = typeof server.spell.docker_images === 'string' 
                ? JSON.parse(server.spell.docker_images) 
                : server.spell.docker_images;
            
            return Object.entries(images).map(([label, value]) => ({ 
                label, 
                value: value as string 
            }));
        } catch (e) {
            console.error("Failed to parse docker images", e);
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
                <DialogDescription>
                    {t('features.javaVersion.description')}
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
                {detectedIssue && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <p className="text-sm text-red-800 dark:text-red-200">
                            {detectedIssue}
                        </p>
                    </div>
                )}

                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        {t('features.javaVersion.recommendation')}
                    </p>

                    {availableDockerImages.length > 0 && (
                        <div className="space-y-2">
                            <Label>{t('serverStartup.availableImages')}</Label>
                            <div className="grid gap-2 max-h-[200px] overflow-y-auto">
                                {availableDockerImages.map((img) => (
                                    <Button
                                        key={img.label}
                                        variant={selectedImage === img.value ? "default" : "outline"}
                                        size="sm"
                                        className="justify-start text-left h-auto py-2"
                                        onClick={() => setSelectedImage(img.value)}
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className="font-medium">{img.label}</span>
                                            <span className="text-xs opacity-70 truncate max-w-[300px]">{img.value}</span>
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedImage && (
                        <div className="bg-muted p-3 rounded-lg">
                            <Label className="text-xs">{t('features.javaVersion.selectedImage')}</Label>
                            <p className="text-sm font-mono mt-1 break-all">{selectedImage}</p>
                        </div>
                    )}
                </div>
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={onClose} disabled={updating}>
                    {t('common.cancel')}
                </Button>
                <Button disabled={!selectedImage || updating} onClick={handleUpdate}>
                    {updating ? t('common.saving') : t('features.javaVersion.updateImage')}
                </Button>
            </DialogFooter>
        </Dialog>
    );
}
