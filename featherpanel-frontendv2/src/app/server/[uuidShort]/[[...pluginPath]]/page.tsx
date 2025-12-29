'use client'

import { use } from 'react'
import PluginPage from '@/components/dashboard/PluginPage'
import ServerConsolePage from '@/components/server/ServerConsolePage'

export default function ServerPluginPage({ params }: { params: Promise<{ uuidShort: string, pluginPath?: string[] }> }) {
    const { uuidShort, pluginPath } = use(params)
    
    // If no plugin path is provided, show the console (default server page)
    if (!pluginPath || pluginPath.length === 0) {
        return <ServerConsolePage />
    }
    
    // Otherwise, show the plugin page
    return <PluginPage context="server" serverUuid={uuidShort} />
}
