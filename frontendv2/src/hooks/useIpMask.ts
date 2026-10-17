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

import { useHideServerIps } from '@/contexts/PreferencesContext';
import { HIDDEN_IP_PLACEHOLDER, maskEndpoint, maskEndpointIpLike, maskIp, maskIpLike } from '@/lib/ip-mask';

export interface IpMask {
    /** True when the signed-in user asked to hide server IP addresses. */
    hidden: boolean;
    /** Placeholder shown instead of an IP while hiding is on. */
    placeholder: string;
    /** Mask a single IP / host value. */
    ip: (value: string | null | undefined) => string;
    /** Mask only when the value actually is an IP (hostnames stay readable). */
    ipLike: (value: string | null | undefined) => string;
    /** Mask an `ip:port` pair. */
    endpoint: (ip: string | null | undefined, port: number | string | null | undefined) => string;
    /** Mask an `ip:port` pair only when the host really is an IP (domains stay readable). */
    endpointLike: (ip: string | null | undefined, port: number | string | null | undefined) => string;
}

/**
 * Render helper for server addresses: returns the real value, or the
 * placeholder when the user's "hide IP addresses" preference is on.
 *
 * @example
 * const ipMask = useIpMask();
 * <span>{ipMask.endpoint(allocation.ip, allocation.port)}</span>
 */
export function useIpMask(): IpMask {
    const hidden = useHideServerIps();
    return {
        hidden,
        placeholder: HIDDEN_IP_PLACEHOLDER,
        ip: (value) => maskIp(value, hidden),
        ipLike: (value) => maskIpLike(value, hidden),
        endpoint: (ip, port) => maskEndpoint(ip, port, hidden),
        endpointLike: (ip, port) => maskEndpointIpLike(ip, port, hidden),
    };
}
