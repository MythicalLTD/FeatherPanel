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

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/featherui/Button';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { getApiErrorMessage } from '@/lib/api-errors';
import { requestAiHelper, type AiHelperRequest, type AiHelperResponse } from '@/lib/api/aiEditorHelper';

type Props = {
    uuidShort: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    request: AiHelperRequest | null;
    /** Apply suggested file body into the editor buffer only — does not save. */
    onApplySuggestion?: (content: string, filePath: string | null) => void;
    canApply?: boolean;
};

export function useAiHelperAvailable(): boolean {
    const { settings } = useSettings();
    return settings?.chatbot_enabled === 'true' && settings?.chatbot_editor_helper_enabled !== 'false';
}

export function AiHelperDialog({
    uuidShort,
    open,
    onOpenChange,
    request,
    onApplySuggestion,
    canApply = false,
}: Props) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AiHelperResponse | null>(null);
    const lastKey = useRef<string>('');

    const run = useCallback(async () => {
        if (!request) return;
        setLoading(true);
        setResult(null);
        try {
            const data = await requestAiHelper(uuidShort, request);
            setResult(data);
        } catch (e) {
            toast.error(getApiErrorMessage(e, t, 'servers.aiHelper.error'));
        } finally {
            setLoading(false);
        }
    }, [request, uuidShort, t]);

    useEffect(() => {
        if (!open || !request) {
            return;
        }
        const key = JSON.stringify(request);
        if (key === lastKey.current) {
            return;
        }
        lastKey.current = key;
        void run();
    }, [open, request, run]);

    const close = () => {
        lastKey.current = '';
        setResult(null);
        setLoading(false);
        onOpenChange(false);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next) close();
                else onOpenChange(true);
            }}
        >
            <DialogContent className='max-h-[85vh] overflow-y-auto sm:max-w-2xl'>
                <DialogHeader>
                    <DialogTitle className='flex items-center gap-2'>
                        <Sparkles className='h-4 w-4' />
                        {t('servers.aiHelper.title')}
                    </DialogTitle>
                    <DialogDescription>{t('servers.aiHelper.description')}</DialogDescription>
                </DialogHeader>

                {loading && (
                    <div className='text-muted-foreground flex items-center gap-2 py-8 text-sm'>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        {t('servers.aiHelper.thinking')}
                    </div>
                )}

                {!loading && result && (
                    <div className='space-y-4'>
                        {result.redacted && (
                            <p className='text-muted-foreground rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs'>
                                {t('servers.aiHelper.redactedNotice')}
                            </p>
                        )}
                        <div className='max-w-none whitespace-pre-wrap text-sm leading-relaxed'>{result.explanation}</div>
                        {result.unified_diff && (
                            <div>
                                <p className='mb-2 text-sm font-medium'>{t('servers.aiHelper.suggestedDiff')}</p>
                                <pre className='bg-muted/50 border-border/50 max-h-64 overflow-auto rounded-lg border p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap'>
                                    {result.unified_diff}
                                </pre>
                            </div>
                        )}
                        <p className='text-muted-foreground text-xs'>
                            {t('servers.aiHelper.model', { model: result.model })}
                        </p>
                        <p className='text-muted-foreground text-xs'>{t('servers.aiHelper.confirmNotice')}</p>
                    </div>
                )}

                <DialogFooter className='gap-2 sm:gap-2'>
                    <Button variant='ghost' onClick={close}>
                        {t('servers.aiHelper.close')}
                    </Button>
                    {!loading && result?.suggested_content && canApply && onApplySuggestion && (
                        <Button
                            onClick={() => {
                                onApplySuggestion(result.suggested_content as string, result.file_path);
                                toast.success(t('servers.aiHelper.applied'));
                                close();
                            }}
                        >
                            {t('servers.aiHelper.applyToEditor')}
                        </Button>
                    )}
                    {!loading && !result && (
                        <Button onClick={() => void run()} disabled={!request}>
                            {t('servers.aiHelper.retry')}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
