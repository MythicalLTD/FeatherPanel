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
import { Shield, Lock, Key, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const categories = [
  "Admin API",
  "Admin Allocations",
  "Admin Dashboard View",
  "Admin Database Snapshots",
  "Admin Databases",
  "Admin Email Templates",
  "Admin FeatherZeroTrust",
  "Admin Images",
  "Admin Knowledgebase Articles",
  "Admin Knowledgebase Categories",
  "Admin Locations",
  "Admin Nodes",
  "Admin Notifications",
  "Admin Plugins",
  "Admin Realms",
  "Admin Redirect Links",
  "Admin Role Permissions",
  "Admin Roles",
  "Admin Root",
  "Admin Servers",
  "Admin Settings",
  "Admin Spells",
  "Admin Statistics",
  "Admin Subdomains",
  "Admin Ticket Attachments",
  "Admin Ticket Categories",
  "Admin Ticket Messages",
  "Admin Ticket Priorities",
  "Admin Ticket Statuses",
  "Admin Tickets",
  "Admin Users"
];

export default function PermissionsPage() {
    return (
        <div className='min-h-screen bg-background'>
            <div className='container mx-auto px-4 py-16 max-w-6xl'>
                <div className='mb-12 text-center space-y-4'>
                    <div className='inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 mb-4 backdrop-blur-sm'>
                        <Shield className='w-10 h-10 text-primary' />
                    </div>
                    <h1 className='text-5xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent'>
                        Permission Nodes
                    </h1>
                    <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
                        Complete reference of all permission nodes available in FeatherPanel for role-based access control
                    </p>
                    <div className='flex items-center justify-center gap-4 pt-2'>
                        <Badge variant='secondary' className='text-sm px-4 py-1.5 font-semibold bg-card border border-border/50'>
                            31 Categories
                        </Badge>
                        <Badge variant='outline' className='text-sm px-4 py-1.5 font-semibold bg-card border-border/50'>
                            114 Permissions
                        </Badge>
                    </div>
                </div>

                <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12'>
                    {categories.map((category) => {
                        const sanitized = category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                        return (
                            <Link key={category} href={`/docs/permissions/${sanitized}`} className='block'>
                                <Card className='h-full transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/60 cursor-pointer border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 group'>
                                    <CardHeader className='pb-3'>
                                        <div className='flex items-center gap-3 mb-2'>
                                            <div className='p-2 rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors backdrop-blur-sm'>
                                                <Lock className='w-5 h-5 text-primary' />
                                            </div>
                                            <CardTitle className='text-lg text-foreground group-hover:text-primary transition-colors'>
                                                {category}
                                            </CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className='flex items-center gap-2 text-primary font-semibold text-sm'>
                                            <span>View Permissions</span>
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
                        <CardTitle className='text-xl text-foreground'>About Permissions</CardTitle>
                        <CardDescription className='text-muted-foreground'>
                            Understanding FeatherPanel's permission system
                        </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                        <div className='space-y-2'>
                            <h3 className='font-semibold text-sm text-foreground'>Role-Based Access Control</h3>
                            <p className='text-sm text-muted-foreground'>
                                FeatherPanel uses a role-based permission system where permissions are assigned to roles, 
                                and users are assigned roles. Each permission node controls access to specific features or actions.
                            </p>
                        </div>
                        <div className='space-y-2'>
                            <h3 className='font-semibold text-sm text-foreground'>Permission Format</h3>
                            <p className='text-sm text-muted-foreground mb-2'>
                                Permissions follow a hierarchical dot notation format:
                            </p>
                            <pre className='p-3 rounded-lg bg-muted/50 border border-border/50 overflow-x-auto backdrop-blur-sm'>
                                <code className='text-xs font-mono text-foreground'>
admin.users.view
admin.servers.create
admin.settings.edit
                                </code>
                            </pre>
                        </div>
                        <div className='space-y-2'>
                            <h3 className='font-semibold text-sm text-foreground'>Root Permission</h3>
                            <p className='text-sm text-muted-foreground'>
                                The <code className='px-1.5 py-0.5 rounded bg-muted/50 text-xs font-mono'>admin.root</code> permission 
                                grants full access to everything in the panel. Users with this permission bypass all other permission checks.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
