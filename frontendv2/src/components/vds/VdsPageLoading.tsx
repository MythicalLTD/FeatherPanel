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

import { Loader2 } from 'lucide-react';

/** Full-page loading state shared by the VDS pages (same look as the game server console loader). */
export function VdsPageLoading({ label }: { label: string }) {
    return (
        <div className='flex min-h-[60vh] items-center justify-center' role='status' aria-live='polite'>
            <div className='flex flex-col items-center gap-4'>
                <Loader2 className='text-primary h-8 w-8 animate-spin' aria-hidden />
                <p className='text-muted-foreground text-sm'>{label}</p>
            </div>
        </div>
    );
}
