/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    10|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import React from 'react';

interface ChunkErrorBoundaryProps {
    /** Rendered after the lazy chunk failed; `retry` remounts the children. */
    fallback: (retry: () => void) => React.ReactNode;
    children: React.ReactNode;
}

interface ChunkErrorBoundaryState {
    failed: boolean;
    attempt: number;
}

/**
 * Small error boundary for `React.lazy` chunks: a failed chunk request renders `fallback`
 * instead of taking the whole page down, and `retry` tries the import again.
 */
export class ChunkErrorBoundary extends React.Component<ChunkErrorBoundaryProps, ChunkErrorBoundaryState> {
    state: ChunkErrorBoundaryState = { failed: false, attempt: 0 };

    static getDerivedStateFromError(): Partial<ChunkErrorBoundaryState> {
        return { failed: true };
    }

    private retry = () => {
        this.setState((s) => ({ failed: false, attempt: s.attempt + 1 }));
    };

    render() {
        if (this.state.failed) return this.props.fallback(this.retry);
        return <React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>;
    }
}
