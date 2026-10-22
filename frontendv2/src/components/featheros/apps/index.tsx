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

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import type { OsAppId, OsWindow } from '../types';

export interface OsAppProps {
    win: OsWindow;
}

function AppLoading() {
    return (
        <div className='fos-app-loading' aria-busy='true'>
            <div className='fos-app-loading-bar'>
                <span className='fos-shimmer' />
            </div>
            <div className='fos-app-loading-body'>
                <div className='fos-app-loading-line is-mid fos-shimmer' />
                <div className='fos-app-loading-line fos-shimmer' />
                <div className='fos-app-loading-line is-short fos-shimmer' />
                <div className='fos-app-loading-line is-mid fos-shimmer' />
            </div>
        </div>
    );
}

/** Apps are code split: Monaco / xterm only load when their window opens. */
export const OS_APP_COMPONENTS: Record<OsAppId, ComponentType<OsAppProps>> = {
    finder: dynamic(() => import('./FinderApp'), { ssr: false, loading: AppLoading }),
    terminal: dynamic(() => import('./TerminalApp'), { ssr: false, loading: AppLoading }),
    editor: dynamic(() => import('./EditorApp'), { ssr: false, loading: AppLoading }),
    servers: dynamic(() => import('./ServerManagerApp'), { ssr: false, loading: AppLoading }),
    monitor: dynamic(() => import('./ActivityMonitorApp'), { ssr: false, loading: AppLoading }),
    logs: dynamic(() => import('./LogViewerApp'), { ssr: false, loading: AppLoading }),
    databases: dynamic(() => import('./DatabasesApp'), { ssr: false, loading: AppLoading }),
    notes: dynamic(() => import('./NotesApp'), { ssr: false, loading: AppLoading }),
    settings: dynamic(() => import('./SettingsApp'), { ssr: false, loading: AppLoading }),
    backups: dynamic(() => import('./BackupsApp'), { ssr: false, loading: AppLoading }),
    schedules: dynamic(() => import('./SchedulesApp'), { ssr: false, loading: AppLoading }),
    network: dynamic(() => import('./NetworkApp'), { ssr: false, loading: AppLoading }),
    transfers: dynamic(() => import('./TransfersApp'), { ssr: false, loading: AppLoading }),
    calculator: dynamic(() => import('./CalculatorApp'), { ssr: false, loading: AppLoading }),
    trash: dynamic(() => import('./TrashApp'), { ssr: false, loading: AppLoading }),
    connection: dynamic(() => import('./ConnectionApp'), { ssr: false, loading: AppLoading }),
    subusers: dynamic(() => import('./SubusersApp'), { ssr: false, loading: AppLoading }),
    startup: dynamic(() => import('./StartupApp'), { ssr: false, loading: AppLoading }),
    spells: dynamic(() => import('./SpellsApp'), { ssr: false, loading: AppLoading }),
    server: dynamic(() => import('./ServerWorkspaceApp'), { ssr: false, loading: AppLoading }),
    archive: dynamic(() => import('./ArchiveApp'), { ssr: false, loading: AppLoading }),
};
