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
                'rounded-2xl border border-border/40 bg-[#313338]/95 backdrop-blur-sm overflow-hidden shadow-xl',
                'min-h-[120px]',
            )}
        >
            <div className='flex items-center gap-2 border-b border-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-white/45'>
                <LayoutTemplate className='h-3.5 w-3.5' />
                {t('lifecycleHooks.discord.previewTitle')}
            </div>
            <div className='p-3 space-y-2'>
                {!preview?.hasBody ? (
                    <p className='text-xs text-muted-foreground italic px-1 py-4 text-center'>
                        {t('lifecycleHooks.discord.previewEmpty')}
                    </p>
                ) : (
                    <>
                        {preview.username ? (
                            <div className='text-xs text-white/55 font-semibold truncate'>{preview.username}</div>
                        ) : null}
                        {preview.content ? (
                            <div className='text-sm text-[#dcddde] whitespace-pre-wrap wrap-break-word'>
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
                                    className='rounded-md bg-[#2b2d31] border-l-4 pl-3 pr-2 py-2 max-w-full'
                                    style={{ borderLeftColor: accent }}
                                >
                                    <div className='flex gap-2'>
                                        {emb.thumbnail?.url ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img
                                                src={emb.thumbnail.url}
                                                alt=''
                                                className='h-14 w-14 shrink-0 rounded object-cover mt-0.5'
                                            />
                                        ) : null}
                                        <div className='flex-1 min-w-0 space-y-1'>
                                            {emb.author?.name ? (
                                                <div className='flex items-center gap-2 mb-1'>
                                                    {emb.author.icon_url ? (
                                                        /* eslint-disable-next-line @next/next/no-img-element */
                                                        <img
                                                            src={emb.author.icon_url}
                                                            alt=''
                                                            className='h-5 w-5 rounded-full shrink-0'
                                                        />
                                                    ) : null}
                                                    <span className='text-sm font-semibold text-white'>
                                                        {emb.author.name}
                                                    </span>
                                                </div>
                                            ) : null}
                                            {emb.title ? (
                                                <div className='text-sm font-semibold text-white mb-1 wrap-break-word'>
                                                    {emb.title}
                                                </div>
                                            ) : null}
                                            {emb.description ? (
                                                <div className='text-xs text-[#dcddde] whitespace-pre-wrap wrap-break-word'>
                                                    {emb.description}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                    {emb.fields && emb.fields.length > 0 ? (
                                        <div className='mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2'>
                                            {emb.fields.map((f, fi) => (
                                                <div
                                                    key={fi}
                                                    className={cn(
                                                        'min-w-0 rounded bg-black/20 p-1.5',
                                                        f.inline && 'sm:col-span-1',
                                                        !f.inline && 'sm:col-span-3',
                                                    )}
                                                >
                                                    <div className='text-[10px] font-bold uppercase text-white/50 truncate'>
                                                        {f.name}
                                                    </div>
                                                    <div className='text-xs text-[#dcddde] whitespace-pre-wrap wrap-break-word'>
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
                                            className='mt-2 rounded max-h-36 w-full object-cover'
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
        <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-6', className)}>
            <div className='space-y-4 order-2 lg:order-1'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                    <Label className='text-base'>{t('lifecycleHooks.discord.embedBuilder')}</Label>
                    <Button type='button' size='sm' variant='outline' onClick={addEmbed} disabled={embeds.length >= 10}>
                        <Plus className='h-3.5 w-3.5 mr-1.5' />
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
                                    'rounded-2xl border border-border/30 bg-card/40 overflow-hidden transition-shadow',
                                    isOpen && 'ring-1 ring-primary/35 shadow-md',
                                )}
                            >
                                <button
                                    type='button'
                                    className='flex w-full items-center gap-2 px-3 py-3 text-left bg-background/40 hover:bg-background/55'
                                    onClick={() => setOpenIndex(ei)}
                                >
                                    <GripVertical className='h-4 w-4 text-muted-foreground shrink-0' />
                                    <span className='flex-1 min-w-0 font-semibold truncate text-sm'>
                                        {embed.title.trim()
                                            ? embed.title.trim()
                                            : t('lifecycleHooks.discord.embedNumber', { n: String(ei + 1) })}
                                    </span>
                                    <Button
                                        type='button'
                                        size='sm'
                                        variant='ghost'
                                        className='shrink-0 h-8 px-2'
                                        disabled={embeds.length <= 1}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeEmbed(ei);
                                        }}
                                        aria-label={t('lifecycleHooks.discord.removeEmbed')}
                                    >
                                        <Trash2 className='h-3.5 w-3.5 text-destructive' />
                                    </Button>
                                </button>

                                {isOpen ? (
                                    <div className='space-y-4 p-4 border-t border-border/20'>
                                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
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
                                            <p className='text-[11px] text-muted-foreground text-right'>
                                                {embed.description.length} / 4096
                                            </p>
                                        </div>
                                        <div className='flex flex-wrap items-end gap-4'>
                                            <div className='space-y-2'>
                                                <Label>{t('lifecycleHooks.discord.embedColor')}</Label>
                                                <div className='flex items-center gap-2'>
                                                    <input
                                                        type='color'
                                                        className='h-10 w-14 cursor-pointer rounded-lg border border-border/30 bg-transparent p-1'
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
                                            <label className='flex items-center gap-2 text-sm font-medium pb-2 cursor-pointer select-none'>
                                                <input
                                                    type='checkbox'
                                                    className='rounded border-border'
                                                    checked={embed.timestamp}
                                                    onChange={(e) => updateEmbed(ei, { timestamp: e.target.checked })}
                                                />
                                                {t('lifecycleHooks.discord.includeTimestamp')}
                                            </label>
                                        </div>

                                        <details className='rounded-xl border border-border/20 bg-background/40 px-3 py-2'>
                                            <summary className='cursor-pointer text-sm font-semibold py-2'>
                                                {t('lifecycleHooks.discord.mediaAndFooter')}
                                            </summary>
                                            <div className='space-y-3 pt-2 pb-2'>
                                                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
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
                                                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
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
                                                    <div className='grid grid-cols-1 sm:grid-cols-3 gap-2'>
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
                                                    <Plus className='h-3.5 w-3.5 mr-1.5' />
                                                    {t('lifecycleHooks.discord.addField')}
                                                </Button>
                                            </div>
                                            {embed.fields.length === 0 ? (
                                                <p className='text-xs text-muted-foreground'>
                                                    {t('lifecycleHooks.discord.fieldsHint')}
                                                </p>
                                            ) : (
                                                <div className='space-y-2'>
                                                    {embed.fields.map((field, fi) => (
                                                        <div
                                                            key={fi}
                                                            className='rounded-xl border border-border/25 bg-background/40 p-3 space-y-2'
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
                                                            <label className='flex items-center gap-2 text-xs text-muted-foreground'>
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

            <div className='order-1 lg:order-2 lg:sticky lg:top-24 h-fit space-y-2'>
                <Label className='text-base'>{t('lifecycleHooks.discord.livePreview')}</Label>
                <DiscordEmbedLivePreview preview={preview} />
            </div>
        </div>
    );
}
