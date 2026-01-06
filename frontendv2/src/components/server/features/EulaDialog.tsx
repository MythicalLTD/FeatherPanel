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

import { useState } from 'react';
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
import { AlertCircle, ExternalLink } from 'lucide-react';
import { Server } from '@/types/server';

interface EulaDialogProps {
    isOpen: boolean;
    onClose: () => void;
    server: Server;
    onAccepted?: () => void;
}

export function EulaDialog({ isOpen, onClose, server, onAccepted }: EulaDialogProps) {
    const { t } = useTranslation();
    const [accepting, setAccepting] = useState(false);

    const handleAccept = async () => {
        try {
            setAccepting(true);
            const eulaContent = `#By changing the setting below to TRUE you are indicating your agreement to our EULA (https://www.minecraft.net/en-us/eula).\n#${new Date().toUTCString()}\neula=true\n`;

            // Write eula.txt
            await axios.post(`/api/user/servers/${server.uuidShort}/write-file?path=/eula.txt`, eulaContent, {
                headers: { 'Content-Type': 'application/octet-stream' },
            });

            // Try to start server
            try {
                await axios.post(`/api/user/servers/${server.uuidShort}/power/kill`);
                await axios.post(`/api/user/servers/${server.uuidShort}/power/start`);
                toast.success(t('features.eula.eulaAcceptedAndServerStarted'));
            } catch {
                toast.success(t('features.eula.eulaAccepted'));
                toast.warning(t('features.eula.failedToStartServer'));
            }

            if (onAccepted) onAccepted();
            onClose();
        } catch (error) {
            console.error('Failed to accept EULA:', error);
            if (axios.isAxiosError(error) && error.response?.status === 415) {
                toast.error(t('features.eula.failedToAccept') + ' (Invalid upload content-type)');
            } else {
                toast.error(t('features.eula.failedToAccept'));
            }
        } finally {
            setAccepting(false);
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose}>
            <DialogHeader>
                <DialogTitle className='flex items-center gap-2'>
                    <AlertCircle className='h-5 w-5 text-yellow-500' />
                    {t('features.eula.title')}
                </DialogTitle>
                <DialogDescription>{t('features.eula.description')}</DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-4'>
                <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4'>
                    <p className='text-sm text-yellow-800 dark:text-yellow-200'>{t('features.eula.eulaMessage')}</p>
                </div>

                <div className='space-y-2'>
                    <p className='text-sm text-muted-foreground'>{t('features.eula.eulaExplanation')}</p>
                    <a
                        href='https://www.minecraft.net/en-us/eula'
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-sm text-primary hover:underline flex items-center gap-1'
                    >
                        {t('features.eula.readEula')}
                        <ExternalLink className='h-3 w-3' />
                    </a>
                </div>
            </div>

            <DialogFooter>
                <Button variant='outline' onClick={onClose} disabled={accepting}>
                    {t('common.cancel')}
                </Button>
                <Button onClick={handleAccept} disabled={accepting}>
                    {accepting ? t('features.eula.accepting') : t('features.eula.accept')}
                </Button>
            </DialogFooter>
        </Dialog>
    );
}
