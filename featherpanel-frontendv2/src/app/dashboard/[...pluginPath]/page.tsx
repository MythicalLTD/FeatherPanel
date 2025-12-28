'use client'

import { use } from 'react'
import PluginPage from '@/components/dashboard/PluginPage'

export default function DashboardPluginPage({ params }: { params: Promise<{ pluginPath: string[] }> }) {
    use(params)
    return <PluginPage context="client" />
}
