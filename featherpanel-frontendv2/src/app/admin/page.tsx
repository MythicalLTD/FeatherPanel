'use client'

import { ShieldCheck } from 'lucide-react'

export default function AdminDashboardPage() {
    return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center p-4">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <ShieldCheck className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground max-w-md">
                Welcome to the administration panel. Use the sidebar to manage your system, users, and infrastructure.
            </p>
        </div>
    )
}
