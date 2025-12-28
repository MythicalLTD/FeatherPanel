'use client'

import { use } from 'react'
import PluginPage from '@/components/dashboard/PluginPage'

export default function ServerPluginPage({ params }: { params: Promise<{ id: string, pluginPath: string[] }> }) {
    const { id } = use(params)
    return <PluginPage context="server" serverUuid={id} />
}
