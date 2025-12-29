'use client'

import React, { use } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Activity, Clock, Server, FileText } from 'lucide-react'

export default function ServerActivityPage({ params }: { params: Promise<{ uuidShort: string }> }) {
    const { uuidShort } = use(params)

    // Mock data for demonstration - in production this would fetch from API
    const activities = [
        {
            id: 1,
            action: 'server.power.start',
            user: 'admin',
            timestamp: '2 mins ago',
            details: 'Server started manually'
        },
        {
            id: 2,
            action: 'server.files.write',
            user: 'admin',
            timestamp: '15 mins ago',
            details: 'Modified server.properties'
        },
        {
            id: 3,
            action: 'server.power.stop',
            user: 'system',
            timestamp: '1 hour ago',
            details: 'Automatic shutdown scheduled'
        }
    ]

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Server Activity</h2>
                <p className="text-muted-foreground">
                    Audit logs and recent actions for server {uuidShort}
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Recent Events
                    </CardTitle>
                    <CardDescription>
                        Latest actions performed on this server.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-8">
                        {activities.map((activity) => (
                            <div key={activity.id} className="flex items-start gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
                                <div className="mt-1 rounded-full bg-primary/10 p-2 text-primary">
                                    {activity.action.includes('power') ? (
                                        <Server className="h-4 w-4" />
                                    ) : (
                                        <FileText className="h-4 w-4" />
                                    )}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium leading-none">
                                        {activity.action}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {activity.details} by <span className="font-semibold text-foreground">{activity.user}</span>
                                    </p>
                                </div>
                                <div className="flex items-center text-sm text-muted-foreground">
                                    <Clock className="mr-1 h-3 w-3" />
                                    {activity.timestamp}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
