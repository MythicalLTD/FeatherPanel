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
import { ArrowLeft, Shield, Key } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const categoryData = {
    name: "Admin Email Templates",
    permissions: [
  {
    "constant": "ADMIN_TEMPLATE_EMAIL_CREATE",
    "node": "admin.email.templates.create",
    "category": "Admin Email Templates",
    "description": "Create new email templates"
  },
  {
    "constant": "ADMIN_TEMPLATE_EMAIL_DELETE",
    "node": "admin.email.templates.delete",
    "category": "Admin Email Templates",
    "description": "Delete email templates"
  },
  {
    "constant": "ADMIN_TEMPLATE_EMAIL_EDIT",
    "node": "admin.email.templates.edit",
    "category": "Admin Email Templates",
    "description": "Edit existing email templates"
  },
  {
    "constant": "ADMIN_TEMPLATE_EMAIL_VIEW",
    "node": "admin.email.templates.view",
    "category": "Admin Email Templates",
    "description": "View email templates"
  }
]
};

export default function CategoryPermissionsPage() {
    return (
        <div className='min-h-screen bg-background'>
            <div className='container mx-auto px-4 py-16 max-w-6xl'>
                <Link href='/docs/permissions'>
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
                                {categoryData.permissions.length} permission{categoryData.permissions.length !== 1 ? 's' : ''} in this category
                            </p>
                        </div>
                    </div>
                </div>

                <div className='space-y-4'>
                    {categoryData.permissions.map((perm) => (
                        <Card key={perm.node} className='border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-colors'>
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
                                    <Badge variant='outline' className='text-xs font-mono bg-muted/30 border-border/50 text-foreground/80 flex-shrink-0'>
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
if (PermissionHelper::hasPermission($userUuid, 'admin.email.templates.create')) {
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
if (PermissionHelper::hasPermission($userUuid, Permissions::ADMIN_TEMPLATE_EMAIL_CREATE)) {
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
