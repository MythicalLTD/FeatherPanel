// @ts-nocheck
'use client';

import Link from 'next/link';
import { ArrowLeft, Shield, Key } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const categoryData = {
    name: 'Admin Database Snapshots',
    permissions: [
        {
            constant: 'ADMIN_BACKUPS_CREATE',
            node: 'admin.backups.create',
            category: 'Admin Database Snapshots',
            description: 'Create database snapshots',
        },
        {
            constant: 'ADMIN_BACKUPS_DELETE',
            node: 'admin.backups.delete',
            category: 'Admin Database Snapshots',
            description: 'Delete database snapshots',
        },
        {
            constant: 'ADMIN_BACKUPS_DOWNLOAD',
            node: 'admin.backups.download',
            category: 'Admin Database Snapshots',
            description: 'Download database snapshots',
        },
        {
            constant: 'ADMIN_BACKUPS_RESTORE',
            node: 'admin.backups.restore',
            category: 'Admin Database Snapshots',
            description: 'Restore database from snapshot',
        },
        {
            constant: 'ADMIN_BACKUPS_VIEW',
            node: 'admin.backups.view',
            category: 'Admin Database Snapshots',
            description: 'View database snapshots',
        },
    ],
};

export default function CategoryPermissionsPage() {
    return (
        <div className='min-h-screen bg-background'>
            <div className='container mx-auto px-4 py-16 max-w-6xl'>
                <Link href='/icanhasfeatherpanel/permissions'>
                    <Button variant='ghost' className='mb-8 -ml-4'>
                        <ArrowLeft className='w-4 h-4 mr-2' />
                        Back to Permissions
                    </Button>
                </Link>

                <div className='mb-12 space-y-4'>
                    <div className='flex items-center gap-3'>
                        <div className='p-3 rounded-xl bg-primary/10 border border-primary/20 backdrop-blur-sm'>
                            <Shield className='w-6 h-6 text-primary' />
                        </div>
                        <div>
                            <h1 className='text-4xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent'>
                                {categoryData.name}
                            </h1>
                            <p className='text-muted-foreground mt-1'>
                                {categoryData.permissions.length} permission
                                {categoryData.permissions.length !== 1 ? 's' : ''} in this category
                            </p>
                        </div>
                    </div>
                </div>

                <div className='space-y-4'>
                    {categoryData.permissions.map((perm) => (
                        <Card
                            key={perm.node}
                            className='border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-colors'
                        >
                            <CardHeader>
                                <div className='flex items-start justify-between gap-4'>
                                    <div className='flex-1 min-w-0'>
                                        <div className='flex items-center gap-2 mb-2'>
                                            <Key className='w-4 h-4 text-primary flex-shrink-0' />
                                            <CardTitle className='text-lg font-mono text-foreground break-all'>
                                                {perm.node}
                                            </CardTitle>
                                        </div>
                                        <CardDescription className='text-muted-foreground'>
                                            {perm.description}
                                        </CardDescription>
                                    </div>
                                    <Badge
                                        variant='outline'
                                        className='text-xs font-mono bg-muted/30 border-border/50 text-foreground/80 flex-shrink-0'
                                    >
                                        {perm.constant}
                                    </Badge>
                                </div>
                            </CardHeader>
                        </Card>
                    ))}
                </div>

                <Card className='mt-8 border-primary/20 bg-primary/5 backdrop-blur-sm border-border/50'>
                    <CardHeader>
                        <CardTitle className='text-foreground'>Usage in Code</CardTitle>
                        <CardDescription className='text-muted-foreground'>
                            How to check permissions in your code
                        </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                        <div>
                            <h3 className='text-sm font-semibold text-foreground mb-2'>PHP Backend</h3>
                            <pre className='p-4 rounded-lg bg-muted/50 border border-border/50 overflow-x-auto backdrop-blur-sm'>
                                <code className='text-sm font-mono text-foreground'>
                                    {`use App\\Helpers\\PermissionHelper;

// Check if user has permission
if (PermissionHelper::hasPermission($userUuid, 'admin.backups.create')) {
    // User has permission
}`}
                                </code>
                            </pre>
                        </div>
                        <div>
                            <h3 className='text-sm font-semibold text-foreground mb-2'>Using Permission Constants</h3>
                            <pre className='p-4 rounded-lg bg-muted/50 border border-border/50 overflow-x-auto backdrop-blur-sm'>
                                <code className='text-sm font-mono text-foreground'>
                                    {`use App\\Permissions;

// Use constant instead of string
if (PermissionHelper::hasPermission($userUuid, Permissions::ADMIN_BACKUPS_CREATE)) {
    // User has permission
}`}
                                </code>
                            </pre>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
