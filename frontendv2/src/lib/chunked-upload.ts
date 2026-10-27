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

import axios, { AxiosError, type AxiosInstance } from 'axios';

/**
 * Resumable chunked uploads to FeatherWings (`/upload/chunk`).
 *
 * Big files are sent as raw parts below the proxy's per-request limit
 * (Cloudflare: 100 MB). The upload id is derived from the server, folder and
 * file, so after a reload or a network drop the same file picks up where it
 * stopped: the node reports how many bytes it has and those are skipped.
 */

export interface ChunkedUploadTarget {
    /** Signed `/upload/chunk?token=...` URL. */
    url: string;
    /** Preferred part size in bytes. */
    chunkSize: number;
    /** Unix ms when the token expires. */
    expiresAt: number;
}

export interface UploadStats {
    loaded: number;
    total: number;
    /** Bytes per second, smoothed. */
    speed: number;
    /** Seconds remaining, null when unknown. */
    eta: number | null;
    /** True when the upload continued from bytes the node already had. */
    resumed: boolean;
}

export class ChunkedUploadUnsupportedError extends Error {}

const wingsClient = axios.create({ withCredentials: false });

const MAX_ATTEMPTS = 6;

function hash53(str: string, seed = 0): number {
    let h1 = 0xdeadbeef ^ seed;
    let h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** Stable id for one file going to one folder on one server. */
export function chunkedUploadId(serverUuid: string, directory: string, file: File): string {
    const key = `${serverUuid}|${directory}|${file.name}|${file.size}|${file.lastModified}`;
    return `fp-${hash53(key).toString(36)}-${hash53(key, 7).toString(36)}`;
}

function withParams(url: string, params: Record<string, string | number>): string {
    const u = new URL(url);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
    return u.toString();
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
        const t = setTimeout(resolve, ms);
        signal?.addEventListener(
            'abort',
            () => {
                clearTimeout(t);
                reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
            },
            { once: true },
        );
    });
}

function statusOf(error: unknown): number | undefined {
    return axios.isAxiosError(error) ? error.response?.status : undefined;
}

function offsetOf(error: unknown): number | undefined {
    if (!axios.isAxiosError(error)) return undefined;
    const off = (error as AxiosError<{ offset?: unknown }>).response?.data?.offset;
    return typeof off === 'number' ? off : undefined;
}

export interface ChunkedUploadOptions {
    serverUuid: string;
    directory: string;
    file: File;
    /** Returns a (fresh) signed target. Called again when the token is close to expiry or refused. */
    getTarget: () => Promise<ChunkedUploadTarget>;
    signal?: AbortSignal;
    onStats?: (stats: UploadStats) => void;
    /** HTTP client; defaults to a credential-less client for node URLs. Pass the panel client for panel-hosted endpoints. */
    client?: AxiosInstance;
}

/** `.../upload/chunk?q` -> `.../upload/chunk/complete?q` */
export function chunkCompleteUrl(url: string): string {
    const u = new URL(url);
    u.pathname = u.pathname.replace(/\/upload\/chunk\/?$/, '/upload/chunk/complete');
    return u.toString();
}

export async function chunkedUpload(opts: ChunkedUploadOptions): Promise<void> {
    const { file, signal } = opts;
    const client = opts.client ?? wingsClient;
    const uploadId = chunkedUploadId(opts.serverUuid, opts.directory, file);
    let target = await opts.getTarget();
    const fresh = async (force = false) => {
        if (force || Date.now() > target.expiresAt - 60_000) target = await opts.getTarget();
        return target;
    };

    // Ask the node what it already has.
    let offset = 0;
    let maxChunk = Infinity;
    try {
        const res = await client.get(withParams((await fresh()).url, { upload_id: uploadId }), { signal });
        const d = res.data as { exists?: boolean; offset?: number; total_size?: number; max_chunk_size?: number };
        if (typeof d?.max_chunk_size !== 'number') throw new ChunkedUploadUnsupportedError('no chunk support');
        maxChunk = d.max_chunk_size > 0 ? d.max_chunk_size : Infinity;
        if (d.exists && d.total_size === file.size && typeof d.offset === 'number') offset = d.offset;
    } catch (e) {
        if (e instanceof ChunkedUploadUnsupportedError || statusOf(e) === 404 || statusOf(e) === 405) {
            throw new ChunkedUploadUnsupportedError('Node does not support chunked uploads');
        }
        throw e;
    }

    const resumed = offset > 0;
    const startedAt = Date.now();
    const startOffset = offset;
    let speed = 0;
    let lastT = Date.now();
    let lastLoaded = offset;
    const report = (loaded: number) => {
        const now = Date.now();
        const dt = (now - lastT) / 1000;
        if (dt >= 0.5) {
            const inst = (loaded - lastLoaded) / dt;
            speed = speed ? speed * 0.7 + inst * 0.3 : inst;
            lastT = now;
            lastLoaded = loaded;
        } else if (!speed) {
            const elapsed = (now - startedAt) / 1000;
            if (elapsed > 0) speed = (loaded - startOffset) / elapsed;
        }
        opts.onStats?.({
            loaded,
            total: file.size,
            speed,
            eta: speed > 0 ? (file.size - loaded) / speed : null,
            resumed,
        });
    };
    report(offset);

    let attempt = 0;
    while (offset < file.size) {
        const size = Math.max(1, Math.min(target.chunkSize, maxChunk));
        const end = Math.min(offset + size, file.size);
        const blob = file.slice(offset, end);
        try {
            const t = await fresh();
            const res = await client.post(
                withParams(t.url, {
                    upload_id: uploadId,
                    offset,
                    total_size: file.size,
                    file_name: file.name,
                    directory: opts.directory || '/',
                }),
                blob,
                {
                    signal,
                    headers: { 'Content-Type': 'application/octet-stream' },
                    onUploadProgress: (e) => report(offset + (e.loaded ?? 0)),
                },
            );
            offset = typeof res.data?.offset === 'number' ? res.data.offset : end;
            attempt = 0;
            report(offset);
        } catch (e) {
            if (signal?.aborted) throw signal.reason ?? e;
            const status = statusOf(e);
            const serverOffset = offsetOf(e);
            if (status === 409 && serverOffset !== undefined) {
                // Out of sync with the node (lost response, other tab): continue from what it has.
                offset = serverOffset;
                await sleep(500, signal);
                continue;
            }
            if (status === 413 && maxChunk > 1024 * 1024) {
                // A proxy in front of the node refused the part: try smaller parts.
                maxChunk = Math.floor(Math.min(maxChunk, size) / 2);
                continue;
            }
            if (status === 400 || status === 422 || status === 429 || status === 507) throw e;
            attempt += 1;
            if (attempt >= MAX_ATTEMPTS) throw e;
            if (status === 401 || status === 403 || status === 404) await fresh(true);
            await sleep(Math.min(30_000, 1000 * 2 ** (attempt - 1)), signal);
        }
    }

    // Assemble on the node; retry a couple of times on network errors.
    for (let i = 0; ; i++) {
        try {
            await client.post(
                withParams(chunkCompleteUrl((await fresh()).url), {
                    upload_id: uploadId,
                }),
                null,
                {
                    signal,
                },
            );
            return;
        } catch (e) {
            if (signal?.aborted || i >= 2 || (statusOf(e) ?? 0) >= 400) throw e;
            await sleep(2000, signal);
        }
    }
}

/** Removes the node's staged parts for a file (cancel). Best effort. */
export async function discardChunkedUpload(
    serverUuid: string,
    directory: string,
    file: File,
    getTarget: () => Promise<ChunkedUploadTarget>,
    client: AxiosInstance = wingsClient,
): Promise<void> {
    try {
        const t = await getTarget();
        await client.delete(withParams(t.url, { upload_id: chunkedUploadId(serverUuid, directory, file) }));
    } catch {
        // ignore
    }
}
