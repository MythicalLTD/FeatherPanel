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

import { Sensitive } from '@/components/common/Sensitive';
import { maskEndpoint } from '@/lib/ip-mask';
import { cn } from '@/lib/utils';

interface MaskedIpProps {
    ip?: string | null;
    port?: number | string | null;
    className?: string;
}

/**
 * Renders a server address, or a click-to-reveal placeholder in privacy mode.
 *
 * @example
 * <MaskedIp ip={allocation.ip} port={allocation.port} className='font-mono' />
 */
export function MaskedIp({ ip, port, className }: MaskedIpProps) {
    return (
        <span className={cn(className)}>
            <Sensitive>{maskEndpoint(ip, port, false)}</Sensitive>
        </span>
    );
}
