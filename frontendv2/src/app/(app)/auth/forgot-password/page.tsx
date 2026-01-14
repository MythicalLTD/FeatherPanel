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

import { Suspense } from 'react';
import ForgotPasswordForm from './ForgotPasswordForm';

export default function ForgotPasswordPage() {
    return (
        <Suspense
            fallback={
                <div className='flex items-center justify-center p-8'>
                    <div className='animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent' />
                </div>
            }
        >
            <ForgotPasswordForm />
        </Suspense>
    );
}
