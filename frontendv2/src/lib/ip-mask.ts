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

/**
 * Helpers for the per-user "hide server IP addresses" preference.
 *
 * The masking happens in the UI only: the API keeps returning the real
 * allocation data so actions that need it (firewall rules, proxies,
 * allocation management) keep working. What the user sees on screen — and
 * therefore what ends up in a screen share, recording or stream — is the
 * placeholder.
 */

/** Placeholder rendered instead of an IP address while masking is on. */
export const HIDDEN_IP_PLACEHOLDER = '••••••••';

const IPV4_PATTERN = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6_CHARS_PATTERN = /^[0-9a-f:.]+$/i;
// IPv4 inside text, IPv6 in brackets ([2001:db8::1]:25565), compressed IPv6
// containing `::` (2001:db8::1, fe80::1, ::1) and bare IPv6 with at least
// three colon groups — timestamps like 12:30:00 have neither and stay.
const IP_IN_TEXT_PATTERN =
    /\b(?:\d{1,3}\.){3}\d{1,3}\b|\[(?:[0-9a-f]{0,4}:){2,}[0-9a-f:.]*\]|(?<![0-9a-z:])(?:[0-9a-f]{1,4}(?::[0-9a-f]{1,4})*::(?:[0-9a-f]{1,4}(?::[0-9a-f]{1,4})*)?|::[0-9a-f]{1,4}(?::[0-9a-f]{1,4})*)(?::(?:\d{1,3}\.){3}\d{1,3})?(?![0-9a-z:.])|\b(?:[0-9a-f]{1,4}:){3,}[0-9a-f]{0,4}\b/gi;

/**
 * Masks IP addresses inside a free-form text (activity metadata, raw JSON
 * payloads). Non-IP content is left untouched so the block stays readable.
 */
export function maskIpsInText(text: string, hidden: boolean): string {
    if (!hidden || !text) return text;
    return text.replace(IP_IN_TEXT_PATTERN, HIDDEN_IP_PLACEHOLDER);
}

/**
 * Whether a value is an IP address (v4 or a v6-looking string) rather than a
 * hostname. Used where the API returns either — e.g. allocation aliases and
 * SFTP/database hosts, which may point at a node IP or at a domain.
 */
export function looksLikeIp(value: string | null | undefined): boolean {
    if (!value) return false;
    const trimmed = value.trim().replace(/^\[|\]$/g, '');
    if (IPV4_PATTERN.test(trimmed)) return true;
    return trimmed.includes(':') && IPV6_CHARS_PATTERN.test(trimmed);
}

/**
 * Mask a value only when it actually is an IP address, so readable hostnames
 * stay visible for users who hide addresses.
 */
export function maskIpLike(value: string | null | undefined, hidden: boolean): string {
    if (hidden && looksLikeIp(value)) return HIDDEN_IP_PLACEHOLDER;
    return value ?? '';
}

/**
 * Mask a single IP / host value.
 *
 * @param value  the real value from the API
 * @param hidden whether the user enabled IP masking
 */
export function maskIp(value: string | null | undefined, hidden: boolean): string {
    if (hidden) return HIDDEN_IP_PLACEHOLDER;
    return value ?? '';
}

/**
 * Like `maskEndpoint`, but only masks when the host part really is an IP —
 * used for SFTP/database hosts, which are either a node IP or a domain.
 */
export function maskEndpointIpLike(
    ip: string | null | undefined,
    port: number | string | null | undefined,
    hidden: boolean,
): string {
    return maskEndpoint(ip, port, hidden && looksLikeIp(ip));
}

/**
 * Mask an `ip:port` pair (or a bare host when no port is given).
 *
 * Only the host is masked: the port stays visible so allocations on the same
 * IP remain distinguishable in lists and pickers.
 *
 * @param ip     the real host/IP value
 * @param port   optional port
 * @param hidden whether the user enabled IP masking
 */
export function maskEndpoint(
    ip: string | null | undefined,
    port: number | string | null | undefined,
    hidden: boolean,
): string {
    const hasPort = port !== null && port !== undefined && port !== '';
    if (hidden) return hasPort ? `${HIDDEN_IP_PLACEHOLDER}:${port}` : HIDDEN_IP_PLACEHOLDER;
    const host = ip ?? '';
    if (!host) return hasPort ? String(port) : '';
    return hasPort ? `${host}:${port}` : host;
}
