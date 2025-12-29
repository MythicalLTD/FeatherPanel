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
import { Server } from '@/types/server';

interface PidLimitDialogProps {
    isOpen: boolean;
    onClose: () => void;
    server: Server;
    onRestarted?: () => void;
}

export function PidLimitDialog({ isOpen, onClose, server, onRestarted }: PidLimitDialogProps) {
    const { t } = useTranslation();
    const [restarting, setRestarting] = useState(false);

    const handleRestart = async () => {
        try {
            setRestarting(true);
            await axios.post(`/api/user/servers/${server.uuidShort}/power`, {
                action: 'restart',
            });
            
            toast.success(t('features.pidLimit.serverRestarted'));
            if (onRestarted) onRestarted();
            onClose();
        } catch (error) {
            console.error('Failed to restart server:', error);
            toast.error(t('serverConsole.failedToRestartServer'));
        } finally {
            setRestarting(false);
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose}>
            <DialogHeader>
                <DialogTitle>{t('features.pidLimit.title')}</DialogTitle>
                <DialogDescription>
                    {t('features.pidLimit.description')}
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                    <p className="text-sm text-orange-800 dark:text-orange-200">
                        {t('features.pidLimit.explanation')}
                    </p>
                </div>

                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        {t('features.pidLimit.suggestions')}
                    </p>

                    <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                        <li>{t('features.pidLimit.suggestion1')}</li>
                        <li>{t('features.pidLimit.suggestion2')}</li>
                        <li>{t('features.pidLimit.suggestion3')}</li>
                    </ul>
                </div>
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={onClose} disabled={restarting}>
                    {t('common.close')}
                </Button>
                <Button onClick={handleRestart} disabled={restarting}>
                    {restarting ? t('features.eula.accepting') : t('features.pidLimit.restartServer')}
                </Button>
            </DialogFooter>
        </Dialog>
    );
}
