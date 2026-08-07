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

import { useRef, useState } from 'react';
import axios, { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/featherui/Input';
import { Button } from '@/components/featherui/Button';
import { resolveAttachmentUrl, cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/TranslationContext';

type ImageAttachmentFieldProps = {
    id?: string;
    label?: string;
    description?: string;
    value: string;
    onChange: (url: string) => void;
    placeholder?: string;
    /** Keep a manual URL input under the upload controls (default true). */
    allowManualUrl?: boolean;
    className?: string;
    disabled?: boolean;
};

const DEFAULT_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Upload an image into /attachments via admin settings upload, then store the returned URL.
 * Used for logos, Premium AI avatar, and other picture URL fields.
 */
export function ImageAttachmentField({
    id,
    label,
    description,
    value,
    onChange,
    placeholder = 'https://… or /attachments/…',
    allowManualUrl = true,
    className,
    disabled = false,
}: ImageAttachmentFieldProps) {
    const { t } = useTranslation();
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const previewUrl = resolveAttachmentUrl(value) || value.trim() || null;

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_BYTES) {
            toast.error(t('common.image_attachment.too_large'));
            if (inputRef.current) inputRef.current.value = '';
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('image', file);
            const { data } = await axios.post('/api/admin/settings/upload-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (data?.success && data.data?.url) {
                onChange(String(data.data.url));
                toast.success(t('common.image_attachment.uploaded'));
            } else {
                toast.error(data?.message || t('common.image_attachment.upload_failed'));
            }
        } catch (error: unknown) {
            let message = t('common.image_attachment.upload_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                message = String(error.response.data.message);
            }
            toast.error(message);
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    return (
        <div className={cn('space-y-3', className)}>
            {label && (
                <Label htmlFor={id} className='text-base font-medium'>
                    {label}
                </Label>
            )}

            <div className='flex flex-wrap items-start gap-4'>
                <div className='border-border bg-muted/40 flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border'>
                    {previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={previewUrl}
                            alt=''
                            className='h-full w-full object-contain'
                            onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    ) : (
                        <ImageIcon className='text-muted-foreground h-7 w-7' />
                    )}
                </div>

                <div className='flex min-w-0 flex-1 flex-col gap-2'>
                    <div className='flex flex-wrap gap-2'>
                        <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            disabled={disabled || uploading}
                            onClick={() => inputRef.current?.click()}
                        >
                            {uploading ? (
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            ) : (
                                <Upload className='mr-2 h-4 w-4' />
                            )}
                            {uploading ? t('common.image_attachment.uploading') : t('common.image_attachment.upload')}
                        </Button>
                        {value.trim() !== '' && (
                            <Button
                                type='button'
                                variant='ghost'
                                size='sm'
                                disabled={disabled || uploading}
                                onClick={() => onChange('')}
                            >
                                <Trash2 className='mr-2 h-4 w-4' />
                                {t('common.image_attachment.clear')}
                            </Button>
                        )}
                    </div>
                    <p className='text-muted-foreground text-xs'>{t('common.image_attachment.hint')}</p>
                </div>
            </div>

            <input
                ref={inputRef}
                type='file'
                accept={DEFAULT_ACCEPT}
                className='hidden'
                disabled={disabled || uploading}
                onChange={(e) => void handleUpload(e)}
            />

            {allowManualUrl && (
                <Input
                    id={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled || uploading}
                />
            )}

            {description && <p className='text-muted-foreground text-sm'>{description}</p>}
        </div>
    );
}
