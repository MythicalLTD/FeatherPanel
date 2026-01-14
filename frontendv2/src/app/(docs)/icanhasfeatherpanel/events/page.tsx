// @ts-nocheck
/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
'use client';

import Link from 'next/link';
import { Zap, Code, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const categories = [
    'Allocations',
    'App',
    'Auth',
    'CloudManagement',
    'CloudPlugins',
    'Console',
    'DatabaseManagement',
    'DatabaseSnapshots',
    'Databases',
    'FeatherZeroTrust',
    'FileManager',
    'Images',
    'Knowledgebase',
    'Locations',
    'LogViewer',
    'MailTemplates',
    'Nodes',
    'Notifications',
    'Permissions',
    'PluginManager',
    'PluginsSettings',
    'Realms',
    'RedirectLinks',
    'Roles',
    'Server',
    'ServerAllocation',
    'ServerBackup',
    'ServerDatabase',
    'ServerFiles',
    'ServerSchedule',
    'ServerSubuser',
    'ServerTask',
    'ServerUser',
    'Settings',
    'Spells',
    'Subdomains',
    'Ticket',
    'User',
    'UserApiClient',
    'UserSshKey',
    'Wings',
];

export default function EventsPage() {
    return (
        <div className='min-h-screen bg-background'>
            <div className='container mx-auto px-4 py-16 max-w-6xl'>
                <div className='mb-12 text-center space-y-4'>
                    <div className='inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 mb-4 backdrop-blur-sm'>
                        <Zap className='w-10 h-10 text-primary' />
                    </div>
                    <h1 className='text-5xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent'>
                        Plugin Events & Hooks
                    </h1>
                    <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
                        Complete reference of all plugin events and hooks available in FeatherPanel for extending
                        functionality
                    </p>
                    <div className='flex items-center justify-center gap-4 pt-2'>
                        <Badge
                            variant='secondary'
                            className='text-sm px-4 py-1.5 font-semibold bg-card border border-border/50'
                        >
                            41 Event Categories
                        </Badge>
                        <Badge variant='outline' className='text-sm px-4 py-1.5 font-semibold bg-card border-border/50'>
                            338 Total Events
                        </Badge>
                    </div>
                </div>

                <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12'>
                    {categories.map((category) => {
                        const sanitized = category
                            .toLowerCase()
                            .replace(/([A-Z])/g, '-$1')
                            .replace(/^-+/, '')
                            .replace(/[^a-z0-9-]+/g, '-')
                            .replace(/-+/g, '-')
                            .replace(/^-+|-+$/g, '');
                        return (
                            <Link key={category} href={`/icanhasfeatherpanel/events/${sanitized}`} className='block'>
                                <Card className='h-full transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/60 cursor-pointer border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 group'>
                                    <CardHeader className='pb-3'>
                                        <div className='flex items-center gap-3 mb-2'>
                                            <div className='p-2 rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors backdrop-blur-sm'>
                                                <Code className='w-5 h-5 text-primary' />
                                            </div>
                                            <CardTitle className='text-lg text-foreground group-hover:text-primary transition-colors'>
                                                {category}
                                            </CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className='flex items-center gap-2 text-primary font-semibold text-sm'>
                                            <span>View Events</span>
                                            <ExternalLink className='w-4 h-4 group-hover:translate-x-1 transition-transform' />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>

                <Card className='border-primary/20 bg-primary/5 backdrop-blur-sm border-border/50'>
                    <CardHeader>
                        <CardTitle className='text-xl text-foreground'>About Plugin Events</CardTitle>
                        <CardDescription className='text-muted-foreground'>
                            Understanding FeatherPanel&apos;s event-driven architecture
                        </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                        <div className='space-y-2'>
                            <h3 className='font-semibold text-sm text-foreground'>Event System Overview</h3>
                            <p className='text-sm text-muted-foreground'>
                                FeatherPanel uses an event-driven architecture that allows plugins to hook into system
                                events and extend functionality without modifying core code. Events are emitted at key
                                points in the application lifecycle and can be listened to by plugins.
                            </p>
                        </div>
                        <div className='space-y-2'>
                            <h3 className='font-semibold text-sm text-foreground'>Registering Event Listeners</h3>
                            <p className='text-sm text-muted-foreground mb-2'>
                                In your plugin&apos;s main class, implement the{' '}
                                <code className='px-1.5 py-0.5 rounded bg-muted/50 text-xs font-mono'>
                                    processEvents
                                </code>{' '}
                                method:
                            </p>
                            <pre className='p-3 rounded-lg bg-muted/50 border border-border/50 overflow-x-auto backdrop-blur-sm'>
                                <code className='text-xs font-mono text-foreground'>
                                    {
                                        "public static function processEvents(PluginEvents $event): void\n{\n    $event->on('featherpanel:user:created', function ($user) {\n        // Handle user creation\n    });\n}"
                                    }
                                </code>
                            </pre>
                        </div>
                        <div className='space-y-2'>
                            <h3 className='font-semibold text-sm text-foreground'>Event Naming</h3>
                            <p className='text-sm text-muted-foreground'>
                                Events follow a consistent naming pattern:{' '}
                                <code className='px-1.5 py-0.5 rounded bg-muted/50 text-xs font-mono'>
                                    featherpanel:category:action
                                </code>
                                . Each event includes callback parameter information to help you understand what data is
                                available.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
