/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    10|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, Code2, Copy, Loader2, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/contexts/TranslationContext';
import { copyToClipboard } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export type CalagopusAuthorizeViewProps = {
    mode: 'create' | 'update';
    keyName: string;
    callbackUrl: string;
    adminPermissions: string[];
    userPermissions: string[];
    serverPermissions: string[];
    submitting: boolean;
    canApprove: boolean;
    errorMessage?: string | null;
    /** Shown after the API key was created and the callback was triggered. */
    completedKey?: string | null;
    onApprove: () => void;
    onDeny: () => void;
};

function matchesAny(perms: string[], prefixes: string[]): boolean {
    return perms.some((p) =>
        prefixes.some((prefix) => p === prefix || p.startsWith(`${prefix}.`) || p.startsWith(`${prefix}-`)),
    );
}

export function CalagopusAuthorizeView({
    mode,
    keyName,
    callbackUrl,
    adminPermissions,
    userPermissions,
    serverPermissions,
    submitting,
    canApprove,
    errorMessage,
    completedKey,
    onApprove,
    onDeny,
}: CalagopusAuthorizeViewProps) {
    const { t } = useTranslation();
    const [showRaw, setShowRaw] = useState(false);

    const allPermissions = useMemo(
        () => [...adminPermissions, ...userPermissions, ...serverPermissions],
        [adminPermissions, userPermissions, serverPermissions],
    );

    const accessLines = useMemo(() => {
        const lines: string[] = [];
        if (matchesAny(allPermissions, ['files', 'servers.read'])) {
            lines.push(t('account.calagopus.featureFiles'));
        }
        if (matchesAny(allPermissions, ['control.console', 'control.read-console'])) {
            lines.push(t('account.calagopus.featureConsole'));
        }
        if (matchesAny(allPermissions, ['control.start', 'control.stop', 'control.restart', 'control.kill'])) {
            lines.push(t('account.calagopus.featurePower'));
        }
        if (matchesAny(allPermissions, ['command-snippets'])) {
            lines.push(t('account.calagopus.featureSnippets'));
        }
        if (lines.length === 0) {
            lines.push(t('account.calagopus.featureAccount'));
        }
        return lines;
    }, [allPermissions, t]);

    if (completedKey !== undefined && completedKey !== null) {
        return (
            <div className='flex min-h-[70vh] items-center justify-center p-6'>
                <div className='border-border/60 bg-card/70 w-full max-w-2xl space-y-6 rounded-2xl border border-emerald-500/30 p-6 shadow-sm backdrop-blur-xl md:p-8'>
                    <div className='flex min-w-0 items-center gap-4'>
                        <div className='flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15'>
                            <CheckCircle2 className='h-6 w-6 text-emerald-400' />
                        </div>
                        <div className='min-w-0'>
                            <h1 className='text-xl font-semibold md:text-2xl'>{t('account.calagopus.doneTitle')}</h1>
                            <p className='text-muted-foreground mt-1 text-sm'>
                                {t('account.calagopus.doneDescription')}
                            </p>
                        </div>
                    </div>

                    {completedKey ? (
                        <div className='border-border/60 bg-background/40 space-y-2 rounded-lg border p-3'>
                            <p className='text-muted-foreground text-sm'>{t('account.calagopus.apiKeyLabel')}</p>
                            <div className='flex items-start gap-2'>
                                <code className='bg-muted/60 flex-1 rounded-md px-3 py-2 font-mono text-xs break-all'>
                                    {completedKey}
                                </code>
                                <Button
                                    type='button'
                                    variant='outline'
                                    size='icon'
                                    className='shrink-0'
                                    onClick={() => {
                                        void copyToClipboard(completedKey);
                                        toast.success(t('account.calagopus.apiKeyCopied'));
                                    }}
                                >
                                    <Copy className='h-4 w-4' />
                                </Button>
                            </div>
                            <p className='text-muted-foreground text-xs'>{t('account.calagopus.apiKeyPasteHint')}</p>
                        </div>
                    ) : null}

                    <Button className='w-full' onClick={onDeny}>
                        {t('account.calagopus.returnToApiKeys')}
                    </Button>
                </div>
            </div>
        );
    }

    const title = mode === 'create' ? t('account.calagopus.createTitle') : t('account.calagopus.updateTitle');
    const description =
        mode === 'create'
            ? t('account.calagopus.createDescription', { name: keyName })
            : t('account.calagopus.updateDescription', { name: keyName });

    return (
        <div className='flex min-h-[70vh] items-center justify-center p-6'>
            <div className='border-border/60 bg-card/70 w-full max-w-2xl space-y-6 rounded-2xl border p-6 shadow-sm backdrop-blur-xl md:p-8'>
                <div className='flex min-w-0 items-center gap-4'>
                    <div className='bg-muted flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border'>
                        <Code2 className='text-muted-foreground h-6 w-6' />
                    </div>
                    <div className='min-w-0'>
                        <h1 className='truncate text-xl font-semibold md:text-2xl'>{title}</h1>
                        <p className='text-muted-foreground mt-1 text-sm'>{description}</p>
                    </div>
                </div>

                {errorMessage ? (
                    <div className='flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100'>
                        <TriangleAlert className='mt-0.5 h-4 w-4 shrink-0' />
                        <p>{errorMessage}</p>
                    </div>
                ) : (
                    <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 p-4'>
                        <p className='text-sm font-medium text-amber-900 dark:text-amber-100'>
                            {t('account.calagopus.permissionsNote')}
                        </p>
                    </div>
                )}

                <div className='grid gap-3 text-sm md:grid-cols-2'>
                    <div className='border-border/60 bg-background/40 rounded-lg border p-3'>
                        <p className='text-muted-foreground'>{t('account.calagopus.keyName')}</p>
                        <p className='font-medium break-all'>{keyName}</p>
                    </div>
                    <div className='border-border/60 bg-background/40 rounded-lg border p-3'>
                        <p className='text-muted-foreground'>{t('account.calagopus.client')}</p>
                        <p className='font-medium break-all'>{t('account.calagopus.clientValue')}</p>
                    </div>
                    {callbackUrl ? (
                        <div className='border-border/60 bg-background/40 rounded-lg border p-3 md:col-span-2'>
                            <p className='text-muted-foreground'>{t('account.calagopus.returnTo')}</p>
                            <p className='font-medium break-all'>{safeHost(callbackUrl)}</p>
                        </div>
                    ) : null}
                    <div className='border-border/60 bg-background/40 rounded-lg border p-3 md:col-span-2'>
                        <p className='text-muted-foreground'>{t('account.calagopus.accessTitle')}</p>
                        <p className='font-medium'>{accessLines.join(' · ')}</p>
                    </div>
                </div>

                {allPermissions.length > 0 ? (
                    <div className='border-border/60 overflow-hidden rounded-lg border'>
                        <button
                            type='button'
                            onClick={() => setShowRaw((v) => !v)}
                            className='hover:bg-muted/40 flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors'
                        >
                            <span>
                                {t('account.calagopus.rawPermissions')}
                                <span className='text-muted-foreground ml-1.5'>({allPermissions.length})</span>
                            </span>
                            <ChevronDown
                                className={cn(
                                    'text-muted-foreground h-4 w-4 transition-transform',
                                    showRaw && 'rotate-180',
                                )}
                            />
                        </button>
                        {showRaw ? (
                            <div className='border-border/60 space-y-3 border-t px-3 py-3'>
                                <PermissionChips
                                    title={t('account.calagopus.adminPermissions')}
                                    items={adminPermissions}
                                />
                                <PermissionChips
                                    title={t('account.calagopus.userPermissions')}
                                    items={userPermissions}
                                />
                                <PermissionChips
                                    title={t('account.calagopus.serverPermissions')}
                                    items={serverPermissions}
                                />
                            </div>
                        ) : null}
                    </div>
                ) : null}

                <div className='flex flex-col-reverse gap-3 pt-2 sm:flex-row'>
                    <Button variant='outline' className='sm:flex-1' disabled={submitting} onClick={onDeny}>
                        {t('account.calagopus.deny')}
                    </Button>
                    <Button className='sm:flex-1' disabled={submitting || !canApprove} onClick={onApprove}>
                        {submitting ? (
                            <span className='inline-flex items-center gap-2'>
                                <Loader2 className='h-4 w-4 animate-spin' />
                                {t('account.calagopus.approve')}
                            </span>
                        ) : (
                            t('account.calagopus.approve')
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function PermissionChips({ title, items }: { title: string; items: string[] }) {
    if (items.length === 0) return null;
    return (
        <div className='space-y-1.5'>
            <p className='text-muted-foreground text-xs'>{title}</p>
            <div className='flex flex-wrap gap-1.5'>
                {items.map((item) => (
                    <Badge key={item} variant='secondary' className='font-mono text-[11px] font-normal'>
                        {item}
                    </Badge>
                ))}
            </div>
        </div>
    );
}

function safeHost(url: string): string {
    try {
        const parsed = new URL(url);
        return parsed.host || url;
    } catch {
        return url;
    }
}
