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
import { Plus, Trash2, GripVertical, LayoutTemplate } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/featherui/Button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import {
    createEmptyDiscordEmbed,
    createEmptyDiscordField,
    discordEmbedFormsToPayloadPreview,
    type DiscordEmbedFieldForm,
    type DiscordEmbedForm,
    type DiscordEmbedPayloadPreview,
    parseEmbedColorHex,
    formatEmbedColorHex,
} from './form-utils';

type DiscordEmbedBuilderProps = {
    embeds: DiscordEmbedForm[];
    onEmbedsChange: (next: DiscordEmbedForm[]) => void;
    discordContent: string;
    discordUsername: string;
    className?: string;
};

function DiscordEmbedLivePreview({ preview }: { preview: DiscordEmbedPayloadPreview | null }) {
    const { t } = useTranslation();

    return (
        <div
            className={cn(
                'border-border/40 overflow-hidden rounded-2xl border bg-[#313338]/95 shadow-xl backdrop-blur-sm',
                'min-h-[120px]',
            )}
        >
            <div className='flex items-center gap-2 border-b border-white/10 px-3 py-2 text-[11px] font-semibold tracking-wider text-white/45 uppercase'>
                <LayoutTemplate className='h-3.5 w-3.5' />
                {t('lifecycleHooks.discord.previewTitle')}
            </div>
            <div className='space-y-2 p-3'>
                {!preview?.hasBody ? (
                    <p className='text-muted-foreground px-1 py-4 text-center text-xs italic'>
                        {t('lifecycleHooks.discord.previewEmpty')}
                    </p>
                ) : (
                    <>
                        {preview.username ? (
                            <div className='truncate text-xs font-semibold text-white/55'>{preview.username}</div>
                        ) : null}
                        {preview.content ? (
                            <div className='text-sm wrap-break-word whitespace-pre-wrap text-[#dcddde]'>
                                {preview.content}
                            </div>
                        ) : null}
                        {preview.embeds?.map((emb, idx) => {
                            const c =
                                typeof emb.color === 'number' && Number.isFinite(emb.color)
                                    ? Math.max(0, Math.min(0xffffff, Math.floor(emb.color)))
                                    : 0x5865f2;
                            const accent = `#${c.toString(16).padStart(6, '0')}`;
                            return (
                                <div
                                    key={idx}
                                    className='max-w-full rounded-md border-l-4 bg-[#2b2d31] py-2 pr-2 pl-3'
                                    style={{ borderLeftColor: accent }}
                                >
                                    <div className='flex gap-2'>
                                        {emb.thumbnail?.url ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img
                                                src={emb.thumbnail.url}
                                                alt=''
                                                className='mt-0.5 h-14 w-14 shrink-0 rounded object-cover'
                                            />
                                        ) : null}
                                        <div className='min-w-0 flex-1 space-y-1'>
                                            {emb.author?.name ? (
                                                <div className='mb-1 flex items-center gap-2'>
                                                    {emb.author.icon_url ? (
                                                        /* eslint-disable-next-line @next/next/no-img-element */
                                                        <img
                                                            src={emb.author.icon_url}
                                                            alt=''
                                                            className='h-5 w-5 shrink-0 rounded-full'
                                                        />
                                                    ) : null}
                                                    <span className='text-sm font-semibold text-white'>
                                                        {emb.author.name}
                                                    </span>
                                                </div>
                                            ) : null}
                                            {emb.title ? (
                                                <div className='mb-1 text-sm font-semibold wrap-break-word text-white'>
                                                    {emb.title}
                                                </div>
                                            ) : null}
                                            {emb.description ? (
                                                <div className='text-xs wrap-break-word whitespace-pre-wrap text-[#dcddde]'>
                                                    {emb.description}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                    {emb.fields && emb.fields.length > 0 ? (
                                        <div className='mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3'>
                                            {emb.fields.map((f, fi) => (
                                                <div
                                                    key={fi}
                                                    className={cn(
                                                        'min-w-0 rounded bg-black/20 p-1.5',
                                                        f.inline && 'sm:col-span-1',
                                                        !f.inline && 'sm:col-span-3',
                                                    )}
                                                >
                                                    <div className='truncate text-[10px] font-bold text-white/50 uppercase'>
                                                        {f.name}
                                                    </div>
                                                    <div className='text-xs wrap-break-word whitespace-pre-wrap text-[#dcddde]'>
                                                        {f.value}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                    {emb.image?.url ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img
                                            src={emb.image.url}
                                            alt=''
                                            className='mt-2 max-h-36 w-full rounded object-cover'
                                        />
                                    ) : null}
                                    {emb.footer?.text ? (
                                        <div className='mt-2 text-[10px] text-white/45'>{emb.footer.text}</div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </>
                )}
            </div>
        </div>
    );
}

export function DiscordEmbedBuilder({
    embeds,
    onEmbedsChange,
    discordContent,
    discordUsername,
    className,
}: DiscordEmbedBuilderProps) {
    const { t } = useTranslation();
    const [openIndex, setOpenIndex] = React.useState(0);

    const preview = React.useMemo(
        () =>
            discordEmbedFormsToPayloadPreview({
                discord_content: discordContent,
                discord_username: discordUsername,
                discord_embeds: embeds,
            }),
        [discordContent, discordUsername, embeds],
    );

    const updateEmbed = (index: number, patch: Partial<DiscordEmbedForm>) => {
        onEmbedsChange(embeds.map((e, i) => (i === index ? { ...e, ...patch } : e)));
    };

    const updateField = (embedIndex: number, fieldIndex: number, patch: Partial<DiscordEmbedFieldForm>) => {
        const next = [...embeds];
        const emb = next[embedIndex];
        if (!emb) return;
        const fields = [...emb.fields];
        fields[fieldIndex] = { ...fields[fieldIndex], ...patch };
        next[embedIndex] = { ...emb, fields };
        onEmbedsChange(next);
    };

    const addEmbed = () => {
        const next = [...embeds, createEmptyDiscordEmbed()];
        onEmbedsChange(next);
        setOpenIndex(next.length - 1);
    };

    const removeEmbed = (index: number) => {
        const next = embeds.filter((_, i) => i !== index);
        onEmbedsChange(next.length ? next : [createEmptyDiscordEmbed()]);
        setOpenIndex(Math.max(0, Math.min(openIndex, next.length - 1)));
    };

    const addField = (embedIndex: number) => {
        const next = [...embeds];
        const emb = next[embedIndex];
        if (!emb || emb.fields.length >= 25) return;
        next[embedIndex] = { ...emb, fields: [...emb.fields, createEmptyDiscordField()] };
        onEmbedsChange(next);
    };

    const removeField = (embedIndex: number, fieldIndex: number) => {
        const next = [...embeds];
        const emb = next[embedIndex];
        if (!emb) return;
        next[embedIndex] = { ...emb, fields: emb.fields.filter((_, i) => i !== fieldIndex) };
        onEmbedsChange(next);
    };

    return (
        <div className={cn('grid grid-cols-1 gap-6 lg:grid-cols-2', className)}>
            <div className='order-2 space-y-4 lg:order-1'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                    <Label className='text-base'>{t('lifecycleHooks.discord.embedBuilder')}</Label>
                    <Button type='button' size='sm' variant='outline' onClick={addEmbed} disabled={embeds.length >= 10}>
                        <Plus className='mr-1.5 h-3.5 w-3.5' />
                        {t('lifecycleHooks.discord.addEmbed')}
                    </Button>
                </div>

                <div className='space-y-3'>
                    {embeds.map((embed, ei) => {
                        const isOpen = openIndex === ei;
                        return (
                            <div
                                key={ei}
                                className={cn(
                                    'border-border/30 bg-card/40 overflow-hidden rounded-2xl border transition-shadow',
                                    isOpen && 'ring-primary/35 shadow-md ring-1',
                                )}
                            >
                                <button
                                    type='button'
                                    className='bg-background/40 hover:bg-background/55 flex w-full items-center gap-2 px-3 py-3 text-left'
                                    onClick={() => setOpenIndex(ei)}
                                >
                                    <GripVertical className='text-muted-foreground h-4 w-4 shrink-0' />
                                    <span className='min-w-0 flex-1 truncate text-sm font-semibold'>
                                        {embed.title.trim()
                                            ? embed.title.trim()
                                            : t('lifecycleHooks.discord.embedNumber', { n: String(ei + 1) })}
                                    </span>
                                    <Button
                                        type='button'
                                        size='sm'
                                        variant='ghost'
                                        className='h-8 shrink-0 px-2'
                                        disabled={embeds.length <= 1}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeEmbed(ei);
                                        }}
                                        aria-label={t('lifecycleHooks.discord.removeEmbed')}
                                    >
                                        <Trash2 className='text-destructive h-3.5 w-3.5' />
                                    </Button>
                                </button>

                                {isOpen ? (
                                    <div className='border-border/20 space-y-4 border-t p-4'>
                                        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                                            <div className='space-y-2'>
                                                <Label>{t('lifecycleHooks.discord.embedTitle')}</Label>
                                                <Input
                                                    value={embed.title}
                                                    maxLength={256}
                                                    onChange={(e) => updateEmbed(ei, { title: e.target.value })}
                                                    placeholder={t('lifecycleHooks.discord.placeholders.title')}
                                                />
                                            </div>
                                            <div className='space-y-2'>
                                                <Label>{t('lifecycleHooks.discord.embedUrl')}</Label>
                                                <Input
                                                    type='url'
                                                    value={embed.url}
                                                    onChange={(e) => updateEmbed(ei, { url: e.target.value })}
                                                    placeholder='https://'
                                                />
                                            </div>
                                        </div>
                                        <div className='space-y-2'>
                                            <Label>{t('lifecycleHooks.discord.embedDescription')}</Label>
                                            <Textarea
                                                className='min-h-[100px] text-sm font-medium'
                                                maxLength={4096}
                                                value={embed.description}
                                                onChange={(e) => updateEmbed(ei, { description: e.target.value })}
                                                placeholder={t('lifecycleHooks.discord.placeholders.description')}
                                            />
                                            <p className='text-muted-foreground text-right text-[11px]'>
                                                {embed.description.length} / 4096
                                            </p>
                                        </div>
                                        <div className='flex flex-wrap items-end gap-4'>
                                            <div className='space-y-2'>
                                                <Label>{t('lifecycleHooks.discord.embedColor')}</Label>
                                                <div className='flex items-center gap-2'>
                                                    <input
                                                        type='color'
                                                        className='border-border/30 h-10 w-14 cursor-pointer rounded-lg border bg-transparent p-1'
                                                        value={
                                                            /^#[0-9A-Fa-f]{6}$/.test(embed.color)
                                                                ? embed.color
                                                                : formatEmbedColorHex(parseEmbedColorHex(embed.color))
                                                        }
                                                        onChange={(e) => updateEmbed(ei, { color: e.target.value })}
                                                    />
                                                    <Input
                                                        className='w-28 font-mono text-xs uppercase'
                                                        value={embed.color}
                                                        onChange={(e) => updateEmbed(ei, { color: e.target.value })}
                                                        placeholder='#5865F2'
                                                        maxLength={7}
                                                    />
                                                </div>
                                            </div>
                                            <label className='flex cursor-pointer items-center gap-2 pb-2 text-sm font-medium select-none'>
                                                <input
                                                    type='checkbox'
                                                    className='border-border rounded'
                                                    checked={embed.timestamp}
                                                    onChange={(e) => updateEmbed(ei, { timestamp: e.target.checked })}
                                                />
                                                {t('lifecycleHooks.discord.includeTimestamp')}
                                            </label>
                                        </div>

                                        <details className='border-border/20 bg-background/40 rounded-xl border px-3 py-2'>
                                            <summary className='cursor-pointer py-2 text-sm font-semibold'>
                                                {t('lifecycleHooks.discord.mediaAndFooter')}
                                            </summary>
                                            <div className='space-y-3 pt-2 pb-2'>
                                                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                                                    <div className='space-y-2'>
                                                        <Label>{t('lifecycleHooks.discord.thumbnailUrl')}</Label>
                                                        <Input
                                                            type='url'
                                                            value={embed.thumbnail_url}
                                                            onChange={(e) =>
                                                                updateEmbed(ei, { thumbnail_url: e.target.value })
                                                            }
                                                            placeholder='https://'
                                                        />
                                                    </div>
                                                    <div className='space-y-2'>
                                                        <Label>{t('lifecycleHooks.discord.imageUrl')}</Label>
                                                        <Input
                                                            type='url'
                                                            value={embed.image_url}
                                                            onChange={(e) =>
                                                                updateEmbed(ei, { image_url: e.target.value })
                                                            }
                                                            placeholder='https://'
                                                        />
                                                    </div>
                                                </div>
                                                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                                                    <div className='space-y-2'>
                                                        <Label>{t('lifecycleHooks.discord.footerText')}</Label>
                                                        <Input
                                                            value={embed.footer_text}
                                                            maxLength={2048}
                                                            onChange={(e) =>
                                                                updateEmbed(ei, { footer_text: e.target.value })
                                                            }
                                                        />
                                                    </div>
                                                    <div className='space-y-2'>
                                                        <Label>{t('lifecycleHooks.discord.footerIconUrl')}</Label>
                                                        <Input
                                                            type='url'
                                                            value={embed.footer_icon_url}
                                                            onChange={(e) =>
                                                                updateEmbed(ei, { footer_icon_url: e.target.value })
                                                            }
                                                            placeholder='https://'
                                                        />
                                                    </div>
                                                </div>
                                                <div className='space-y-2'>
                                                    <Label>{t('lifecycleHooks.discord.author')}</Label>
                                                    <div className='grid grid-cols-1 gap-2 sm:grid-cols-3'>
                                                        <Input
                                                            value={embed.author_name}
                                                            maxLength={256}
                                                            placeholder={t(
                                                                'lifecycleHooks.discord.placeholders.authorName',
                                                            )}
                                                            onChange={(e) =>
                                                                updateEmbed(ei, { author_name: e.target.value })
                                                            }
                                                        />
                                                        <Input
                                                            type='url'
                                                            value={embed.author_url}
                                                            placeholder='https:// author link'
                                                            onChange={(e) =>
                                                                updateEmbed(ei, { author_url: e.target.value })
                                                            }
                                                        />
                                                        <Input
                                                            type='url'
                                                            value={embed.author_icon_url}
                                                            placeholder={t(
                                                                'lifecycleHooks.discord.placeholders.authorIcon',
                                                            )}
                                                            onChange={(e) =>
                                                                updateEmbed(ei, { author_icon_url: e.target.value })
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </details>

                                        <div className='space-y-2'>
                                            <div className='flex items-center justify-between gap-2'>
                                                <Label>{t('lifecycleHooks.discord.fields')}</Label>
                                                <Button
                                                    type='button'
                                                    variant='outline'
                                                    size='sm'
                                                    onClick={() => addField(ei)}
                                                >
                                                    <Plus className='mr-1.5 h-3.5 w-3.5' />
                                                    {t('lifecycleHooks.discord.addField')}
                                                </Button>
                                            </div>
                                            {embed.fields.length === 0 ? (
                                                <p className='text-muted-foreground text-xs'>
                                                    {t('lifecycleHooks.discord.fieldsHint')}
                                                </p>
                                            ) : (
                                                <div className='space-y-2'>
                                                    {embed.fields.map((field, fi) => (
                                                        <div
                                                            key={fi}
                                                            className='border-border/25 bg-background/40 space-y-2 rounded-xl border p-3'
                                                        >
                                                            <div className='flex gap-2'>
                                                                <Input
                                                                    className='flex-1'
                                                                    value={field.name}
                                                                    maxLength={256}
                                                                    placeholder={t(
                                                                        'lifecycleHooks.discord.placeholders.fieldName',
                                                                    )}
                                                                    onChange={(e) =>
                                                                        updateField(ei, fi, { name: e.target.value })
                                                                    }
                                                                />
                                                                <Button
                                                                    type='button'
                                                                    variant='ghost'
                                                                    size='sm'
                                                                    className='shrink-0'
                                                                    onClick={() => removeField(ei, fi)}
                                                                >
                                                                    <Trash2 className='h-3.5 w-3.5' />
                                                                </Button>
                                                            </div>
                                                            <Textarea
                                                                className='min-h-[72px] text-xs font-medium'
                                                                value={field.value}
                                                                maxLength={1024}
                                                                placeholder={t(
                                                                    'lifecycleHooks.discord.placeholders.fieldValue',
                                                                )}
                                                                onChange={(e) =>
                                                                    updateField(ei, fi, { value: e.target.value })
                                                                }
                                                            />
                                                            <label className='text-muted-foreground flex items-center gap-2 text-xs'>
                                                                <input
                                                                    type='checkbox'
                                                                    checked={field.inline}
                                                                    onChange={(e) =>
                                                                        updateField(ei, fi, {
                                                                            inline: e.target.checked,
                                                                        })
                                                                    }
                                                                />
                                                                {t('lifecycleHooks.discord.inline')}
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className='order-1 h-fit space-y-2 lg:sticky lg:top-24 lg:order-2'>
                <Label className='text-base'>{t('lifecycleHooks.discord.livePreview')}</Label>
                <DiscordEmbedLivePreview preview={preview} />
            </div>
        </div>
    );
}
