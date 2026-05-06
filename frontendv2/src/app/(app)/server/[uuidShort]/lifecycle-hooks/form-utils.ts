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

import type { LifecycleHookStep, LifecycleTaskType } from '@/types/server';

export type DiscordEmbedFieldForm = {
    name: string;
    value: string;
    inline: boolean;
};

export type DiscordEmbedForm = {
    title: string;
    description: string;
    url: string;
    color: string;
    timestamp: boolean;
    footer_text: string;
    footer_icon_url: string;
    image_url: string;
    thumbnail_url: string;
    author_name: string;
    author_url: string;
    author_icon_url: string;
    fields: DiscordEmbedFieldForm[];
};

export function createEmptyDiscordField(): DiscordEmbedFieldForm {
    return { name: '', value: '', inline: false };
}

export function createEmptyDiscordEmbed(): DiscordEmbedForm {
    return {
        title: '',
        description: '',
        url: '',
        color: '#5865F2',
        timestamp: false,
        footer_text: '',
        footer_icon_url: '',
        image_url: '',
        thumbnail_url: '',
        author_name: '',
        author_url: '',
        author_icon_url: '',
        fields: [],
    };
}

/** Parse Discord embed color from hex (#RRGGBB) or plain int string; clamps to Discord range. */
export function parseEmbedColorHex(input: string): number {
    const s = input.trim();
    let n: number;
    if (s.startsWith('#')) {
        n = parseInt(s.slice(1), 16);
    } else if (/^[0-9]+$/.test(s)) {
        n = parseInt(s, 10);
    } else {
        n = 0x5865f2;
    }
    if (Number.isNaN(n) || n < 0) return 0x5865f2;
    if (n > 0xffffff) return 0xffffff;
    return n;
}

export function formatEmbedColorHex(n: number): string {
    const c = Math.max(0, Math.min(0xffffff, Math.floor(n)));
    return `#${c.toString(16).padStart(6, '0')}`;
}

export type StepFormState = {
    task_type: LifecycleTaskType;
    continue_on_failure: number;
    discord_url: string;
    discord_content: string;
    discord_username: string;
    discord_embeds: DiscordEmbedForm[];
    container_command: string;
    http_url: string;
    http_method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    http_headers_json: string;
    http_query_json: string;
    http_body: string;
};

export const defaultForm: StepFormState = {
    task_type: 'container_command',
    continue_on_failure: 0,
    discord_url: '',
    discord_content: '',
    discord_username: '',
    discord_embeds: [createEmptyDiscordEmbed()],
    container_command: '',
    http_url: '',
    http_method: 'GET',
    http_headers_json: '{}',
    http_query_json: '{}',
    http_body: '',
};

type DiscordWebhookPayloadEmbed = Record<string, unknown>;

function discordEmbedFormToApiEmbed(
    form: DiscordEmbedForm,
    isoTimestamp: string | null,
): DiscordWebhookPayloadEmbed | null {
    const title = form.title.trim();
    const description = form.description.trim();
    const embedUrl = form.url.trim();

    const rawFields = form.fields.filter((f) => f.name.trim() !== '' && f.value.trim() !== '');
    const fields = rawFields.slice(0, 25).map((f) => ({
        name: f.name.trim().slice(0, 256),
        value: f.value.trim().slice(0, 1024),
        inline: Boolean(f.inline),
    }));

    let author: Record<string, string> | null = null;
    if (form.author_name.trim() || form.author_url.trim() || form.author_icon_url.trim()) {
        author = {};
        if (form.author_name.trim()) author.name = form.author_name.trim();
        if (form.author_url.trim()) author.url = form.author_url.trim();
        if (form.author_icon_url.trim()) author.icon_url = form.author_icon_url.trim();
    }

    const thumb = form.thumbnail_url.trim();
    const img = form.image_url.trim();

    let footer: Record<string, string> | null = null;
    if (form.footer_text.trim() || form.footer_icon_url.trim()) {
        footer = {};
        if (form.footer_text.trim()) footer.text = form.footer_text.trim();
        if (form.footer_icon_url.trim()) footer.icon_url = form.footer_icon_url.trim();
    }

    const hasTimestamp = Boolean(form.timestamp && isoTimestamp);
    const substantive =
        Boolean(title) ||
        Boolean(description) ||
        Boolean(embedUrl) ||
        Boolean(author && Object.keys(author).length) ||
        Boolean(footer && Object.keys(footer).length) ||
        Boolean(thumb) ||
        Boolean(img) ||
        fields.length > 0 ||
        hasTimestamp;

    if (!substantive) return null;

    const out: DiscordWebhookPayloadEmbed = {};
    const color = parseEmbedColorHex(form.color);
    out.color = color;

    if (title) out.title = title;
    if (description) out.description = description;
    if (embedUrl) out.url = embedUrl;
    if (hasTimestamp && isoTimestamp) out.timestamp = isoTimestamp;
    if (author && Object.keys(author).length) out.author = author;
    if (thumb) out.thumbnail = { url: thumb };
    if (img) out.image = { url: img };
    if (footer && Object.keys(footer).length) out.footer = footer;
    if (fields.length) out.fields = fields;

    return out;
}

/** True if Discord webhook will have message content or ≥1 substantive embed after serialization. */
export function discordWebhookHasRenderablePayload(
    state: Pick<StepFormState, 'discord_content' | 'discord_embeds'>,
): boolean {
    if (state.discord_content.trim() !== '') return true;
    const iso = state.discord_embeds.some((e) => e.timestamp) ? new Date().toISOString() : null;
    return state.discord_embeds.some((emb) => discordEmbedFormToApiEmbed(emb, iso) !== null);
}

export type DiscordEmbedPayloadPreviewEmbed = {
    title?: string;
    description?: string;
    url?: string;
    color?: number;
    timestamp?: string;
    author?: { name?: string; icon_url?: string };
    fields?: Array<{ name: string; value: string; inline: boolean }>;
    image?: { url: string };
    thumbnail?: { url: string };
    footer?: { text?: string };
};

export type DiscordEmbedPayloadPreview = {
    hasBody: boolean;
    content?: string;
    username?: string;
    embeds?: DiscordEmbedPayloadPreviewEmbed[];
};

export function discordEmbedFormsToPayloadPreview(
    input: Pick<StepFormState, 'discord_content' | 'discord_username' | 'discord_embeds'>,
): DiscordEmbedPayloadPreview | null {
    const content = input.discord_content.trim();
    const username = input.discord_username.trim();
    const iso = new Date().toISOString();
    const embeds: DiscordEmbedPayloadPreviewEmbed[] = [];
    for (const form of input.discord_embeds) {
        const raw = discordEmbedFormToApiEmbed(form, iso);
        if (!raw) continue;
        const e: DiscordEmbedPayloadPreviewEmbed = {};
        if (typeof raw.title === 'string') e.title = raw.title;
        if (typeof raw.description === 'string') e.description = raw.description;
        if (typeof raw.url === 'string') e.url = raw.url;
        if (typeof raw.color === 'number') e.color = raw.color;
        if (typeof raw.timestamp === 'string') e.timestamp = raw.timestamp;
        if (raw.author && typeof raw.author === 'object') {
            const a = raw.author as Record<string, unknown>;
            e.author = {
                name: typeof a.name === 'string' ? a.name : undefined,
                icon_url: typeof a.icon_url === 'string' ? a.icon_url : undefined,
            };
        }
        if (raw.fields && Array.isArray(raw.fields)) {
            e.fields = raw.fields as DiscordEmbedPayloadPreviewEmbed['fields'];
        }
        if (raw.image && typeof raw.image === 'object') {
            const i = raw.image as { url?: string };
            if (i.url) e.image = { url: i.url };
        }
        if (raw.thumbnail && typeof raw.thumbnail === 'object') {
            const i = raw.thumbnail as { url?: string };
            if (i.url) e.thumbnail = { url: i.url };
        }
        if (raw.footer && typeof raw.footer === 'object') {
            const f = raw.footer as { text?: string };
            if (f.text) e.footer = { text: f.text };
        }
        embeds.push(e);
    }

    const hasBody = Boolean(content || username || embeds.length > 0);
    if (!hasBody) return { hasBody: false };
    return {
        hasBody: true,
        content: content || undefined,
        username: username || undefined,
        embeds: embeds.length ? embeds : undefined,
    };
}

export function serializeLifecyclePayload(state: StepFormState) {
    if (state.task_type === 'discord_webhook') {
        const isoTimestamp = state.discord_embeds.some((e) => e.timestamp) ? new Date().toISOString() : null;
        const embeds: DiscordWebhookPayloadEmbed[] = [];
        for (const form of state.discord_embeds) {
            const api = discordEmbedFormToApiEmbed(form, isoTimestamp);
            if (api) embeds.push(api);
        }

        const body: Record<string, unknown> = {
            url: state.discord_url.trim(),
            content: state.discord_content || undefined,
            username: state.discord_username.trim() || undefined,
        };
        if (embeds.length > 0) {
            body.embeds = embeds.slice(0, 10);
        }
        Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);
        return body;
    }
    if (state.task_type === 'container_command') {
        return {
            command: state.container_command,
        };
    }

    const headers = state.http_headers_json.trim() === '' ? {} : JSON.parse(state.http_headers_json);
    const query = state.http_query_json.trim() === '' ? {} : JSON.parse(state.http_query_json);
    return {
        url: state.http_url,
        method: state.http_method,
        headers,
        query,
        body: state.http_body || undefined,
    };
}

function deserializeDiscordEmbeds(parsed: Record<string, unknown>): DiscordEmbedForm[] {
    const raw = parsed.embeds;
    if (!Array.isArray(raw) || raw.length === 0) {
        return [createEmptyDiscordEmbed()];
    }

    const forms: DiscordEmbedForm[] = [];
    for (const item of raw.slice(0, 10)) {
        if (!item || typeof item !== 'object') continue;
        const emb = item as Record<string, unknown>;
        const form = createEmptyDiscordEmbed();
        if (typeof emb.title === 'string') form.title = emb.title;
        if (typeof emb.description === 'string') form.description = emb.description;
        if (typeof emb.url === 'string') form.url = emb.url;
        if (typeof emb.color === 'number' && !Number.isNaN(emb.color)) {
            form.color = formatEmbedColorHex(emb.color);
        }
        form.timestamp = typeof emb.timestamp === 'string' && emb.timestamp.trim() !== '';

        if (emb.author && typeof emb.author === 'object') {
            const a = emb.author as Record<string, unknown>;
            if (typeof a.name === 'string') form.author_name = a.name;
            if (typeof a.url === 'string') form.author_url = a.url;
            if (typeof a.icon_url === 'string') form.author_icon_url = a.icon_url;
        }
        if (emb.footer && typeof emb.footer === 'object') {
            const f = emb.footer as Record<string, unknown>;
            if (typeof f.text === 'string') form.footer_text = f.text;
            if (typeof f.icon_url === 'string') form.footer_icon_url = f.icon_url;
        }
        if (emb.image && typeof emb.image === 'object') {
            const i = emb.image as { url?: unknown };
            if (typeof i.url === 'string') form.image_url = i.url;
        }
        if (emb.thumbnail && typeof emb.thumbnail === 'object') {
            const i = emb.thumbnail as { url?: unknown };
            if (typeof i.url === 'string') form.thumbnail_url = i.url;
        }
        if (Array.isArray(emb.fields)) {
            form.fields = emb.fields
                .filter((x) => x && typeof x === 'object')
                .map((x) => {
                    const fld = x as Record<string, unknown>;
                    return {
                        name: typeof fld.name === 'string' ? fld.name : '',
                        value: typeof fld.value === 'string' ? fld.value : '',
                        inline: Boolean(fld.inline),
                    };
                })
                .slice(0, 25);
        }
        forms.push(form);
    }

    return forms.length ? forms : [createEmptyDiscordEmbed()];
}

export function deserializeLifecyclePayload(step: LifecycleHookStep): StepFormState {
    let parsed: Record<string, unknown> = {};
    try {
        parsed = JSON.parse(step.payload);
    } catch {
        parsed = {};
    }

    if (step.task_type === 'discord_webhook') {
        return {
            ...defaultForm,
            task_type: 'discord_webhook',
            continue_on_failure: step.continue_on_failure,
            discord_url: String(parsed.url || ''),
            discord_content: typeof parsed.content === 'string' ? parsed.content : String(parsed.content || ''),
            discord_username: String(parsed.username || ''),
            discord_embeds: deserializeDiscordEmbeds(parsed),
        };
    }
    if (step.task_type === 'container_command') {
        return {
            ...defaultForm,
            task_type: 'container_command',
            continue_on_failure: step.continue_on_failure,
            container_command: String(parsed.command || ''),
        };
    }

    return {
        ...defaultForm,
        task_type: 'http_request',
        continue_on_failure: step.continue_on_failure,
        http_url: String(parsed.url || ''),
        http_method: (String(parsed.method || 'GET').toUpperCase() as StepFormState['http_method']) || 'GET',
        http_headers_json: JSON.stringify(parsed.headers || {}, null, 2),
        http_query_json: JSON.stringify(parsed.query || {}, null, 2),
        http_body: String(parsed.body || ''),
    };
}

export function computeMovedSequence(sequenceId: number, direction: -1 | 1): number {
    return sequenceId + direction;
}
