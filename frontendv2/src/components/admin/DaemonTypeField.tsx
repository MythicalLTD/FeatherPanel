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

import { AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select-native';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from '@/contexts/TranslationContext';
import { defaultDaemonBase, type DaemonType } from '@/lib/daemonCapabilities';
import { cn } from '@/lib/utils';

interface DaemonTypeFieldProps {
    value: DaemonType;
    onChange: (next: DaemonType, nextBase: string) => void;
    /** Create flow: required confirmation when Calagopus is selected. */
    confirmed?: boolean;
    onConfirmedChange?: (confirmed: boolean) => void;
    /** When true, require the confirmation checkbox for Calagopus. */
    requireConfirmation?: boolean;
    className?: string;
}

export function DaemonTypeField({
    value,
    onChange,
    confirmed = false,
    onConfirmedChange,
    requireConfirmation = false,
    className,
}: DaemonTypeFieldProps) {
    const { t } = useTranslation();
    const isCalagopus = value === 'wings_rs';

    return (
        <div className={cn('space-y-3', className)}>
            <div className='space-y-2'>
                <Label className='text-sm font-semibold'>{t('admin.node.form.daemon_type')}</Label>
                <Select
                    value={value}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        const daemon_type = e.target.value as DaemonType;
                        onChange(daemon_type, defaultDaemonBase(daemon_type));
                        if (daemon_type !== 'wings_rs') {
                            onConfirmedChange?.(false);
                        }
                    }}
                >
                    <option value='featherwings'>{t('admin.node.form.daemon_type_featherwings')}</option>
                    <option value='wings_rs'>{t('admin.node.form.daemon_type_wings_rs')}</option>
                </Select>
            </div>

            {!isCalagopus ? (
                <div className='border-primary/20 bg-primary/5 rounded-xl border p-4'>
                    <div className='flex gap-3'>
                        <CheckCircle2 className='text-primary mt-0.5 h-5 w-5 shrink-0' />
                        <div className='space-y-1'>
                            <p className='text-sm font-semibold'>
                                {t('admin.node.form.daemon_type_recommended_title')}
                            </p>
                            <p className='text-muted-foreground text-xs leading-relaxed'>
                                {t('admin.node.form.daemon_type_recommended_body')}
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className='space-y-3'>
                    <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 p-4'>
                        <div className='flex gap-3'>
                            <Zap className='mt-0.5 h-5 w-5 shrink-0 text-amber-500' />
                            <div className='space-y-1'>
                                <p className='text-sm font-semibold text-amber-600 dark:text-amber-400'>
                                    {t('admin.node.form.daemon_type_performance_title')}
                                </p>
                                <p className='text-muted-foreground text-xs leading-relaxed'>
                                    {t('admin.node.form.daemon_type_performance_body')}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className='rounded-xl border border-red-500/40 bg-red-500/10 p-4'>
                        <div className='flex gap-3'>
                            <AlertTriangle className='mt-0.5 h-5 w-5 shrink-0 text-red-500' />
                            <div className='space-y-1'>
                                <p className='text-sm font-bold tracking-wide text-red-600 uppercase dark:text-red-400'>
                                    {t('admin.node.form.daemon_type_last_warning_title')}
                                </p>
                                <p className='text-sm leading-relaxed font-medium text-red-700 dark:text-red-300'>
                                    {t('admin.node.form.daemon_type_last_warning_body')}
                                </p>
                            </div>
                        </div>
                    </div>
                    {requireConfirmation ? (
                        <div className='rounded-xl border border-red-500/50 bg-red-500/10 p-4'>
                            <label className='flex cursor-pointer items-start gap-3'>
                                <Checkbox
                                    checked={confirmed}
                                    onCheckedChange={(value) => onConfirmedChange?.(value === true)}
                                    className='mt-0.5'
                                />
                                <span className='text-sm leading-relaxed font-medium text-red-800 dark:text-red-200'>
                                    {t('admin.node.form.daemon_type_confirm_checkbox')}
                                </span>
                            </label>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}
