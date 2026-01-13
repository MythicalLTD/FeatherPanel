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

/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PERMISSIONS_FILE = path.join(__dirname, '../../permission_nodes.fpperm');
const DOCS_DIR = path.join(__dirname, '../src/app/(docs)/icanhasfeatherpanel');
const PERMISSIONS_DOCS_DIR = path.join(DOCS_DIR, 'permissions');

function parsePermissionsFile() {
    const content = fs.readFileSync(PERMISSIONS_FILE, 'utf8');
    const lines = content.split('\n');
    const permissions = [];
    const categories = new Set();
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }
        
        // Parse format: KEY=value | category | description
        const match = trimmed.match(/^([A-Z_]+)=([^|]+)\s*\|\s*([^|]+)\s*\|\s*(.+)$/);
        if (match) {
            const [, constant, node, category, description] = match;
            permissions.push({
                constant: constant.trim(),
                node: node.trim(),
                category: category.trim(),
                description: description.trim()
            });
            categories.add(category.trim());
        }
    }
    
    // Group by category
    const grouped = {};
    permissions.forEach(perm => {
        if (!grouped[perm.category]) {
            grouped[perm.category] = [];
        }
        grouped[perm.category].push(perm);
    });
    
    // Sort permissions within each category by node
    Object.keys(grouped).forEach(category => {
        grouped[category].sort((a, b) => a.node.localeCompare(b.node));
    });
    
    return {
        permissions,
        categories: Array.from(categories).sort(),
        grouped
    };
}

function sanitizeCategory(category) {
    return category
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function generateMainPermissionsPage(categories, totalPermissions) {
    return `// @ts-nocheck
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
import { Shield, Lock, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const categories = ${JSON.stringify(categories, null, 2)};

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
                            ${categories.length} Categories
                        </Badge>
                        <Badge variant='outline' className='text-sm px-4 py-1.5 font-semibold bg-card border-border/50'>
                            ${totalPermissions} Permissions
                        </Badge>
                    </div>
                </div>

                <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12'>
                    {categories.map((category) => {
                        const sanitized = category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                        return (
                            <Link key={category} href={\`/icanhasfeatherpanel/permissions/\${sanitized}\`} className='block'>
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
                            Understanding FeatherPanel&apos;s permission system
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
`;
}

function generateCategoryPage(category, permissions) {
    
    return `// @ts-nocheck
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
    name: ${JSON.stringify(category)},
    permissions: ${JSON.stringify(permissions, null, 2)}
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
{\`use App\\\\Helpers\\\\PermissionHelper;

// Check if user has permission
if (PermissionHelper::hasPermission($userUuid, '${permissions[0]?.node || 'admin.example.view'}')) {
    // User has permission
}\`}
                                </code>
                            </pre>
                        </div>
                        <div>
                            <h3 className='text-sm font-semibold text-foreground mb-2'>Using Permission Constants</h3>
                            <pre className='p-4 rounded-lg bg-muted/50 border border-border/50 overflow-x-auto backdrop-blur-sm'>
                                <code className='text-sm font-mono text-foreground'>
{\`use App\\\\Permissions;

// Use constant instead of string
if (PermissionHelper::hasPermission($userUuid, Permissions::${permissions[0]?.constant || 'ADMIN_EXAMPLE_VIEW'})) {
    // User has permission
}\`}
                                </code>
                            </pre>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
`;
}

// Ensure docs directories exist
if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
}
if (!fs.existsSync(PERMISSIONS_DOCS_DIR)) {
    fs.mkdirSync(PERMISSIONS_DOCS_DIR, { recursive: true });
}

console.log('Parsing permissions file...');
const { permissions, categories, grouped } = parsePermissionsFile();

// Generate main permissions page
const mainPagePath = path.join(PERMISSIONS_DOCS_DIR, 'page.tsx');
const mainPage = generateMainPermissionsPage(categories, permissions.length);
fs.writeFileSync(mainPagePath, mainPage);
console.log(`✓ Main permissions page: ${mainPagePath}`);

// Generate category pages
categories.forEach(category => {
    const sanitized = sanitizeCategory(category);
    const categoryDir = path.join(PERMISSIONS_DOCS_DIR, sanitized);
    if (!fs.existsSync(categoryDir)) {
        fs.mkdirSync(categoryDir, { recursive: true });
    }
    const categoryPagePath = path.join(categoryDir, 'page.tsx');
    const categoryPage = generateCategoryPage(category, grouped[category]);
    fs.writeFileSync(categoryPagePath, categoryPage);
    console.log(`✓ Category page: ${categoryPagePath} (${grouped[category].length} permissions)`);
});

console.log(`\n✅ Permissions documentation generated successfully!`);
console.log(`   - Main page: /icanhasfeatherpanel/permissions`);
console.log(`   - ${categories.length} category pages`);
console.log(`   - ${permissions.length} total permissions`);
