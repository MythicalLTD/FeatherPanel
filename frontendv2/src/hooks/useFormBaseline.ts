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

import { useCallback, useMemo, useState } from 'react';

function serialize(value: unknown): string {
    return JSON.stringify(value ?? null);
}

interface FormBaselineOptions {
    /** Use the first value as the saved state (create forms that start from defaults). */
    trackFromStart?: boolean;
}

/**
 * Tracks whether a form differs from its last loaded / saved state.
 * Call `commit(value)` after loading and after a successful save, or `markClean()` when the
 * loaded values are spread over several state setters (the next render becomes the saved state).
 * `restore()` returns the saved copy for a Discard button. Until the first commit (edit forms
 * still loading) nothing is dirty.
 */
export function useFormBaseline<T>(value: T, options: FormBaselineOptions = {}) {
    const [baseline, setBaseline] = useState<string | null>(() => (options.trackFromStart ? serialize(value) : null));
    const [cleanRequested, setCleanRequested] = useState(false);
    const current = useMemo(() => serialize(value), [value]);

    // Adjusting state during render (instead of an effect) keeps the snapshot in the same commit.
    if (cleanRequested) {
        setCleanRequested(false);
        setBaseline(current);
    }

    const dirty = !cleanRequested && baseline !== null && baseline !== current;

    const commit = useCallback((next: T) => setBaseline(serialize(next)), []);
    const markClean = useCallback(() => setCleanRequested(true), []);
    const restore = useCallback((): T | null => (baseline === null ? null : (JSON.parse(baseline) as T)), [baseline]);

    return { dirty, commit, markClean, restore };
}
