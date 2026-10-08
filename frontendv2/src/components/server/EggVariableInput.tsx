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

import type { ChangeEvent } from 'react';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';

export function EggVariableInput({
    fieldType,
    ...props
}: {
    fieldType: string;
    value: string;
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    disabled?: boolean;
    error?: boolean;
    className?: string;
    placeholder?: string;
}) {
    return fieldType === 'textarea' ? <Textarea rows={4} {...props} /> : <Input {...props} />;
}
