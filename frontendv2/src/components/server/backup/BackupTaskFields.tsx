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

import * as React from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { HeadlessSelect } from '@/components/ui/headless-select';
import type { Database } from '@/types/server';
import { type BackupFields, type BackupKind, type DatabaseScope, isMysqlLike } from './backup-payload';

type Props = {
    fields: BackupFields;
    setFields: React.Dispatch<React.SetStateAction<BackupFields>>;
    databases: Database[];
    disabled?: boolean;
    /** When set, hides the backup-type selector and keeps this kind. */
    lockKind?: BackupKind;
};

export function BackupTaskFields({ fields, setFields, databases, disabled = false, lockKind }: Props) {
    const { t } = useTranslation();
    const mysqlDatabases = React.useMemo(() => databases.filter(isMysqlLike), [databases]);
    const effectiveKind = lockKind ?? fields.kind;

    React.useEffect(() => {
        if (lockKind && fields.kind !== lockKind) {
            setFields((prev) => ({ ...prev, kind: lockKind }));
        }
    }, [lockKind, fields.kind, setFields]);

    const toggleDatabaseId = (id: string, checked: boolean) => {
        setFields((prev) => {
            const next = checked
                ? Array.from(new Set([...prev.database_ids, id]))
                : prev.database_ids.filter((existing) => existing !== id);
            return { ...prev, database_ids: next };
        });
    };

    const showDatabasePicker = effectiveKind === 'database' || effectiveKind === 'full';
    const showIgnore = effectiveKind === 'files' || effectiveKind === 'full';
    const showMetadata = effectiveKind === 'full';

    return (
        <div className='space-y-6'>
            {!lockKind && (
                <div className='space-y-2.5'>
                    <Label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                        {t('serverTasks.backupType')}
                    </Label>
                    <HeadlessSelect
                        value={fields.kind}
                        onChange={(val) =>
                            setFields((prev) => ({
                                ...prev,
                                kind: String(val) as BackupKind,
                            }))
                        }
                        options={[
                            { id: 'files', name: t('serverTasks.backupTypeFiles') },
                            { id: 'database', name: t('serverTasks.backupTypeDatabases') },
                            { id: 'full', name: t('serverTasks.backupTypeFull') },
                        ]}
                        placeholder={t('serverTasks.selectBackupType')}
                        disabled={disabled}
                    />
                    <p className='text-muted-foreground ml-1 text-xs'>{t('serverTasks.backupTypeHelp')}</p>
                </div>
            )}

            {showIgnore && (
                <div className='space-y-2.5'>
                    <Label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                        {t('serverTasks.backupIgnoredFilesLabel')}
                    </Label>
                    <Input
                        value={fields.ignored_files}
                        onChange={(e) => setFields((prev) => ({ ...prev, ignored_files: e.target.value }))}
                        placeholder={t('serverTasks.backupIgnoredFilesPlaceholder')}
                        disabled={disabled}
                    />
                    <p className='text-muted-foreground ml-1 text-xs'>{t('serverTasks.backupIgnoredFilesHelp')}</p>
                </div>
            )}

            {showDatabasePicker && (
                <>
                    <div className='space-y-2.5'>
                        <Label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                            {t('serverTasks.databaseScope')}
                        </Label>
                        <HeadlessSelect
                            value={fields.database_scope}
                            onChange={(val) =>
                                setFields((prev) => ({
                                    ...prev,
                                    database_scope: String(val) as DatabaseScope,
                                }))
                            }
                            options={[
                                { id: 'all', name: t('serverTasks.databaseScopeAll') },
                                { id: 'specific', name: t('serverTasks.databaseScopeSpecific') },
                            ]}
                            disabled={disabled}
                        />
                        <p className='text-muted-foreground ml-1 text-xs'>{t('serverTasks.databaseScopeHelp')}</p>
                    </div>

                    {fields.database_scope === 'specific' && (
                        <div className='space-y-2.5'>
                            <Label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                {t('serverTasks.databaseLabel')}
                            </Label>
                            {mysqlDatabases.length === 0 ? (
                                <p className='text-muted-foreground ml-1 text-xs'>
                                    {t('serverTasks.noDatabasesAvailable')}
                                </p>
                            ) : (
                                <div className='max-h-64 space-y-1 overflow-y-auto rounded-2xl border border-white/10 bg-black/10 p-3'>
                                    {mysqlDatabases.map((db) => {
                                        const id = String(db.id);
                                        const checked = fields.database_ids.includes(id);
                                        return (
                                            <label
                                                key={db.id}
                                                className='flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5'
                                            >
                                                <Checkbox
                                                    checked={checked}
                                                    onCheckedChange={(next) => toggleDatabaseId(id, next)}
                                                    disabled={disabled}
                                                />
                                                <span className='text-sm font-medium'>{db.database}</span>
                                                {db.database_type && (
                                                    <span className='text-muted-foreground text-xs uppercase'>
                                                        {db.database_type}
                                                    </span>
                                                )}
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {showMetadata && (
                <div className='space-y-3 rounded-2xl border border-white/10 bg-black/10 p-4'>
                    <p className='text-muted-foreground text-[9px] font-black tracking-[0.2em] uppercase'>
                        {t('serverTasks.fullMetadataSection')}
                    </p>
                    {(
                        [
                            {
                                key: 'include_metadata' as const,
                                label: t('serverTasks.includeMetadata'),
                                help: t('serverTasks.includeMetadataHelp'),
                            },
                            {
                                key: 'include_encrypted' as const,
                                label: t('serverTasks.includeEncrypted'),
                                help: t('serverTasks.includeEncryptedHelp'),
                            },
                            {
                                key: 'include_activities' as const,
                                label: t('serverTasks.includeActivities'),
                                help: t('serverTasks.includeActivitiesHelp'),
                            },
                        ] as const
                    ).map((opt) => (
                        <label key={opt.key} className='flex cursor-pointer items-start gap-3'>
                            <Checkbox
                                checked={fields[opt.key]}
                                onCheckedChange={(checked) =>
                                    setFields((prev) => ({ ...prev, [opt.key]: checked === true }))
                                }
                                disabled={disabled || (opt.key !== 'include_metadata' && !fields.include_metadata)}
                                className='mt-0.5'
                            />
                            <div className='space-y-0.5'>
                                <span className='text-sm font-medium'>{opt.label}</span>
                                <p className='text-muted-foreground text-xs'>{opt.help}</p>
                            </div>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}
