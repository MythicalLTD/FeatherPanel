'use client'

import { use } from 'react'
import PluginPage from '@/components/dashboard/PluginPage'

export default function ServerPluginPage({ params }: { params: Promise<{ uuidShort: string, pluginPath: string[] }> }) {
    const { uuidShort } = use(params)
    return <PluginPage context="server" serverUuid={uuidShort} />
}
