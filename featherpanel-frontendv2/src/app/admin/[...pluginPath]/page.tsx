'use client'

import { use } from 'react'
import PluginPage from '@/components/dashboard/PluginPage'

export default function AdminPluginPage({ params }: { params: Promise<{ pluginPath: string[] }> }) {
    use(params)
    return <PluginPage context="admin" />
}
