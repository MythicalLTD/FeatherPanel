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
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { Label } from '@/components/ui/label';
import { HeadlessSelect } from '@/components/ui/headless-select';
import type { LifecycleTaskType } from '@/types/server';
import { DiscordEmbedBuilder } from './DiscordEmbedBuilder';
import type { StepFormState } from './form-utils';

export function LifecycleStepForm({
    form,
    setForm,
    onSubmit,
    saving,
    cancelLabel,
    onCancel,
    submitLabel,
    containerShellEnabled = false,
}: {
    form: StepFormState;
    setForm: React.Dispatch<React.SetStateAction<StepFormState>>;
    onSubmit: (e: React.FormEvent) => void;
    saving: boolean;
    cancelLabel: string;
    onCancel: () => void;
    submitLabel: string;
    /** When false, Container Shell is hidden from the task-type picker (admin security flag). */
    containerShellEnabled?: boolean;
}) {
    const { t } = useTranslation();

    const taskTypeOptions = React.useMemo(() => {
        const options: { id: LifecycleTaskType; name: string }[] = [
            { id: 'container_command', name: t('lifecycleHooks.taskTypes.containerCommand') },
            { id: 'discord_webhook', name: t('lifecycleHooks.taskTypes.discordWebhook') },
            { id: 'http_request', name: t('lifecycleHooks.taskTypes.httpRequest') },
            { id: 'sleep', name: t('lifecycleHooks.taskTypes.sleep') },
        ];
        if (containerShellEnabled || form.task_type === 'container_shell') {
            options.splice(1, 0, {
                id: 'container_shell',
                name: t('lifecycleHooks.taskTypes.containerShell'),
            });
        }
        return options;
    }, [t, containerShellEnabled, form.task_type]);

    return (
        <form onSubmit={onSubmit} className='space-y-6'>
            <div className='space-y-2'>
                <Label>{t('lifecycleHooks.form.taskType')}</Label>
                <HeadlessSelect
                    value={form.task_type}
                    onChange={(val) => setForm((current) => ({ ...current, task_type: val as LifecycleTaskType }))}
                    options={taskTypeOptions}
                />
                {form.task_type === 'container_shell' && !containerShellEnabled && (
                    <p className='text-destructive text-[11px]'>
                        {t('lifecycleHooks.form.containerShellDisabledHint')}
                    </p>
                )}
            </div>

            {form.task_type === 'container_command' && (
                <div className='space-y-2'>
                    <Label>{t('lifecycleHooks.form.command')}</Label>
                    <Input
                        value={form.container_command}
                        onChange={(e) => setForm((current) => ({ ...current, container_command: e.target.value }))}
                        required
                    />
                    <p className='text-muted-foreground text-[11px]'>{t('lifecycleHooks.form.containerCommandHint')}</p>
                </div>
            )}

            {form.task_type === 'container_shell' && (
                <>
                    <div className='space-y-2'>
                        <Label>{t('lifecycleHooks.form.shellCommand')}</Label>
                        <Textarea
                            className='min-h-[100px] font-mono text-xs font-medium'
                            value={form.container_shell_command}
                            onChange={(e) =>
                                setForm((current) => ({ ...current, container_shell_command: e.target.value }))
                            }
                            placeholder={t('lifecycleHooks.form.shellCommandPlaceholder')}
                            required
                        />
                        <p className='text-muted-foreground text-[11px]'>
                            {t('lifecycleHooks.form.containerShellHint')}
                        </p>
                    </div>
                    <div className='space-y-2'>
                        <Label>{t('lifecycleHooks.form.shellTimeout')}</Label>
                        <Input
                            type='number'
                            min={1}
                            max={120}
                            step={1}
                            value={form.container_shell_timeout}
                            onChange={(e) =>
                                setForm((current) => ({
                                    ...current,
                                    container_shell_timeout: Number(e.target.value),
                                }))
                            }
                            required
                        />
                        <p className='text-muted-foreground text-[11px]'>{t('lifecycleHooks.form.shellTimeoutHint')}</p>
                    </div>
                </>
            )}

            {form.task_type === 'sleep' && (
                <div className='space-y-2'>
                    <Label>{t('lifecycleHooks.form.sleepSeconds')}</Label>
                    <Input
                        type='number'
                        min={1}
                        max={300}
                        step={1}
                        value={form.sleep_seconds}
                        onChange={(e) =>
                            setForm((current) => ({
                                ...current,
                                sleep_seconds: Number(e.target.value),
                            }))
                        }
                        required
                    />
                    <p className='text-muted-foreground text-[11px]'>{t('lifecycleHooks.form.sleepSecondsHint')}</p>
                </div>
            )}

            {form.task_type === 'discord_webhook' && (
                <>
                    <div className='space-y-2'>
                        <Label>{t('lifecycleHooks.form.webhookUrl')}</Label>
                        <Input
                            value={form.discord_url}
                            onChange={(e) => setForm((current) => ({ ...current, discord_url: e.target.value }))}
                            required
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label>{t('lifecycleHooks.form.content')}</Label>
                        <Textarea
                            className='min-h-[100px]'
                            maxLength={1800}
                            value={form.discord_content}
                            onChange={(e) => setForm((current) => ({ ...current, discord_content: e.target.value }))}
                            placeholder={t('lifecycleHooks.discord.placeholders.messageContent')}
                        />
                        <p className='text-muted-foreground text-[11px]'>{t('lifecycleHooks.discord.contentHint')}</p>
                    </div>
                    <div className='space-y-2'>
                        <Label>{t('lifecycleHooks.form.usernameOptional')}</Label>
                        <Input
                            value={form.discord_username}
                            maxLength={80}
                            onChange={(e) => setForm((current) => ({ ...current, discord_username: e.target.value }))}
                        />
                    </div>
                    <DiscordEmbedBuilder
                        embeds={form.discord_embeds}
                        onEmbedsChange={(next) =>
                            setForm((current) => ({
                                ...current,
                                discord_embeds: next,
                            }))
                        }
                        discordContent={form.discord_content}
                        discordUsername={form.discord_username}
                        className='pt-2'
                    />
                </>
            )}

            {form.task_type === 'http_request' && (
                <>
                    <div className='space-y-2'>
                        <Label>{t('lifecycleHooks.form.url')}</Label>
                        <Input
                            value={form.http_url}
                            onChange={(e) => setForm((current) => ({ ...current, http_url: e.target.value }))}
                            required
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label>{t('lifecycleHooks.form.method')}</Label>
                        <HeadlessSelect
                            value={form.http_method}
                            onChange={(val) =>
                                setForm((current) => ({ ...current, http_method: val as StepFormState['http_method'] }))
                            }
                            options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((method) => ({
                                id: method,
                                name: method,
                            }))}
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label>{t('lifecycleHooks.form.headersJson')}</Label>
                        <Textarea
                            className='min-h-[120px] font-mono text-xs font-medium'
                            value={form.http_headers_json}
                            onChange={(e) => setForm((current) => ({ ...current, http_headers_json: e.target.value }))}
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label>{t('lifecycleHooks.form.queryParamsJson')}</Label>
                        <Textarea
                            className='min-h-[120px] font-mono text-xs font-medium'
                            value={form.http_query_json}
                            onChange={(e) => setForm((current) => ({ ...current, http_query_json: e.target.value }))}
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label>{t('lifecycleHooks.form.bodyOptional')}</Label>
                        <Textarea
                            className='min-h-[120px] font-mono text-xs font-medium'
                            value={form.http_body}
                            onChange={(e) => setForm((current) => ({ ...current, http_body: e.target.value }))}
                        />
                    </div>
                </>
            )}

            <div className='space-y-2'>
                <Label>{t('lifecycleHooks.form.failureBehavior')}</Label>
                <HeadlessSelect
                    value={String(form.continue_on_failure)}
                    onChange={(val) => setForm((current) => ({ ...current, continue_on_failure: Number(val) }))}
                    options={[
                        { id: '0', name: t('lifecycleHooks.form.stopOnFailure') },
                        { id: '1', name: t('lifecycleHooks.form.continueOnFailure') },
                    ]}
                />
            </div>

            <div className='border-border/20 flex flex-wrap items-center justify-between gap-3 border-t pt-2'>
                <Button type='button' variant='glass' onClick={onCancel} disabled={saving}>
                    {cancelLabel}
                </Button>
                <Button type='submit' disabled={saving} loading={saving}>
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}
