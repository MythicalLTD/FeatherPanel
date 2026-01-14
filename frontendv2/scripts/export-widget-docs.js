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

const APP_DIR = path.join(__dirname, '../src/app');
const COMPONENTS_DIR = path.join(__dirname, '../src/components');
const DOCS_DIR = path.join(__dirname, '../src/app/(docs)/icanhasfeatherpanel');
const WIDGETS_DOCS_DIR = path.join(DOCS_DIR, 'widgets');

const SLUG_REGEX = /usePluginWidgets\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const IP_PROPS_REGEX = /injectionPoint\s*=\s*['"]([^'"]+)['"]/g;
const IP_GETWIDGETS_REGEX = /getWidgets\s*\(\s*['"][^'"]+['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g;

function getFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    const fileList = fs.readdirSync(dir);
    for (const file of fileList) {
        const name = path.join(dir, file);
        if (fs.statSync(name).isDirectory()) {
            getFiles(name, files);
        } else if (name.endsWith('.tsx')) {
            files.push(name);
        }
    }
    return files;
}

function extractDocs() {
    const files = [...getFiles(APP_DIR), ...getFiles(COMPONENTS_DIR)];
    const results = {};

    files.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');

        const slugs = [...content.matchAll(SLUG_REGEX)].map((m) => m[1]);

        if (slugs.length > 0) {
            const relativePath = path.relative(path.join(__dirname, '..'), file);

            slugs.forEach((slug) => {
                if (!results[slug]) {
                    results[slug] = {
                        files: [],
                        injectionPoints: new Set(),
                    };
                }

                if (!results[slug].files.includes(relativePath)) {
                    results[slug].files.push(relativePath);
                }

                // Pattern 1: injectionPoint="name"
                const ipMatches1 = [...content.matchAll(IP_PROPS_REGEX)].map((m) => m[1]);
                ipMatches1.forEach((ip) => results[slug].injectionPoints.add(ip));

                // Pattern 2: getWidgets(slug, "name")
                const ipMatches2 = [...content.matchAll(IP_GETWIDGETS_REGEX)].map((m) => m[1]);
                ipMatches2.forEach((ip) => results[slug].injectionPoints.add(ip));
            });
        }
    });

    return results;
}

function generateNextJsPages(results) {
    const sortedSlugs = Object.keys(results).sort();
    
    // Generate main docs page
    const mainPage = generateMainDocsPage(sortedSlugs);
    
    // Generate widgets listing page
    const widgetsListPage = generateWidgetsListPage(results, sortedSlugs);
    
    // Generate individual widget pages
    const widgetPages = {};
    sortedSlugs.forEach((slug) => {
        widgetPages[slug] = generateWidgetDetailPage(slug, results[slug]);
    });
    
    return { mainPage, widgetsListPage, widgetPages };
}

function generateMainDocsPage(slugs) {
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
import { Code2, Puzzle, BookOpen, ExternalLink, Shield, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function DocsPage() {
    return (
        <div className='min-h-screen bg-background'>
            <div className='container mx-auto px-4 py-16 max-w-6xl'>
                <div className='mb-12 text-center space-y-4'>
                    <div className='inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 mb-4 backdrop-blur-sm'>
                        <BookOpen className='w-10 h-10 text-primary' />
                    </div>
                    <h1 className='text-5xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent'>
                        FeatherPanel Documentation
                    </h1>
                    <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
                        Comprehensive guides and references for developers and widget creators
                    </p>
                </div>

                <div className='grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12'>
                    <Link href='/icanhasfeatherpanel/widgets' className='group block'>
                        <Card className='h-full transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/60 cursor-pointer border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80'>
                            <CardHeader>
                                <div className='flex items-center gap-3 mb-2'>
                                    <div className='p-3 rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors backdrop-blur-sm'>
                                        <Puzzle className='w-7 h-7 text-primary' />
                                    </div>
                                    <CardTitle className='text-2xl text-foreground'>Widgets</CardTitle>
                                </div>
                                <CardDescription className='text-base text-muted-foreground'>
                                    Explore all available widget injection points and learn how to create custom widgets for FeatherPanel
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className='flex items-center gap-2 text-primary font-semibold group-hover:gap-3 transition-all'>
                                    <span>View Widgets</span>
                                    <ExternalLink className='w-4 h-4 group-hover:translate-x-1 transition-transform' />
                                </div>
                                <div className='mt-4'>
                                    <Badge variant='secondary' className='text-xs bg-muted/50 border-border/50'>
                                        ${slugs.length} Widget Slugs Available
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href='/icanhasfeatherpanel/api' className='group block'>
                        <Card className='h-full transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/60 cursor-pointer border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80'>
                            <CardHeader>
                                <div className='flex items-center gap-3 mb-2'>
                                    <div className='p-3 rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors backdrop-blur-sm'>
                                        <Code2 className='w-7 h-7 text-primary' />
                                    </div>
                                    <CardTitle className='text-2xl text-foreground'>API Reference</CardTitle>
                                </div>
                                <CardDescription className='text-base text-muted-foreground'>
                                    Complete API documentation with interactive examples and endpoint details
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className='flex items-center gap-2 text-primary font-semibold group-hover:gap-3 transition-all'>
                                    <span>View API Docs</span>
                                    <ExternalLink className='w-4 h-4 group-hover:translate-x-1 transition-transform' />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href='/icanhasfeatherpanel/permissions' className='group block'>
                        <Card className='h-full transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/60 cursor-pointer border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80'>
                            <CardHeader>
                                <div className='flex items-center gap-3 mb-2'>
                                    <div className='p-3 rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors backdrop-blur-sm'>
                                        <Shield className='w-7 h-7 text-primary' />
                                    </div>
                                    <CardTitle className='text-2xl text-foreground'>Permissions</CardTitle>
                                </div>
                                <CardDescription className='text-base text-muted-foreground'>
                                    Complete reference of all permission nodes available in FeatherPanel for role-based access control
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className='flex items-center gap-2 text-primary font-semibold group-hover:gap-3 transition-all'>
                                    <span>View Permissions</span>
                                    <ExternalLink className='w-4 h-4 group-hover:translate-x-1 transition-transform' />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href='/icanhasfeatherpanel/events' className='group block'>
                        <Card className='h-full transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/60 cursor-pointer border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80'>
                            <CardHeader>
                                <div className='flex items-center gap-3 mb-2'>
                                    <div className='p-3 rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors backdrop-blur-sm'>
                                        <Zap className='w-7 h-7 text-primary' />
                                    </div>
                                    <CardTitle className='text-2xl text-foreground'>Events</CardTitle>
                                </div>
                                <CardDescription className='text-base text-muted-foreground'>
                                    Complete reference of all plugin events and hooks available in FeatherPanel for extending functionality
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className='flex items-center gap-2 text-primary font-semibold group-hover:gap-3 transition-all'>
                                    <span>View Events</span>
                                    <ExternalLink className='w-4 h-4 group-hover:translate-x-1 transition-transform' />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                <Card className='border-primary/20 bg-primary/5 backdrop-blur-sm border-border/50'>
                    <CardHeader>
                        <CardTitle className='text-xl text-foreground'>Quick Start</CardTitle>
                        <CardDescription className='text-muted-foreground'>
                            Get started with FeatherPanel development
                        </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                        <div className='space-y-2'>
                            <h3 className='font-semibold text-sm text-foreground'>For Widget Developers</h3>
                            <p className='text-sm text-muted-foreground'>
                                Widgets allow you to extend FeatherPanel&apos;s functionality by injecting custom components into specific pages. 
                                Each page has unique injection points where widgets can be rendered.
                            </p>
                        </div>
                        <div className='space-y-2'>
                            <h3 className='font-semibold text-sm text-foreground'>Getting Started</h3>
                            <ol className='list-decimal list-inside space-y-1 text-sm text-muted-foreground'>
                                <li>Browse available widget slugs and injection points</li>
                                <li>Create your widget component following FeatherPanel&apos;s patterns</li>
                                <li>Register your widget with the appropriate slug and injection point</li>
                            </ol>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
`;
}

function sanitizeSlug(slug) {
    return slug.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-');
}

function generateWidgetsListPage(results, sortedSlugs) {
    const widgetsList = sortedSlugs.map(slug => {
        const data = results[slug];
        return { 
            slug,
            sanitizedSlug: sanitizeSlug(slug),
            files: data.files,
            injectionPoints: Array.from(data.injectionPoints).sort()
        };
    });
    
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
import { ArrowLeft, ArrowRight, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const widgets = ${JSON.stringify(widgetsList, null, 2)};

export default function WidgetsListPage() {
    return (
        <div className='min-h-screen bg-background'>
            <div className='container mx-auto px-4 py-16 max-w-6xl'>
                <Link href='/icanhasfeatherpanel'>
                    <Button variant='ghost' className='mb-8 -ml-4'>
                        <ArrowLeft className='w-4 h-4 mr-2' />
                        Back to Documentation
                    </Button>
                </Link>

                <div className='mb-12 space-y-4'>
                    <h1 className='text-5xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent'>
                        Widget Injection Points
                    </h1>
                    <p className='text-xl text-muted-foreground max-w-3xl'>
                        All available widget slugs and their injection points in FeatherPanel. Click on any widget to view detailed information.
                    </p>
                    <div className='flex items-center gap-4 pt-2'>
                        <Badge variant='secondary' className='text-sm px-4 py-1.5 font-semibold bg-card border border-border/50'>
                            {widgets.length} Widget Slugs
                        </Badge>
                        <Badge variant='outline' className='text-sm px-4 py-1.5 font-semibold bg-card border-border/50'>
                            {widgets.reduce((sum, w) => sum + w.injectionPoints.length, 0)} Total Injection Points
                        </Badge>
                    </div>
                </div>

                <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-4'>
                    {widgets.map((widget) => (
                        <Link key={widget.slug} href={\`/icanhasfeatherpanel/widgets/\${widget.sanitizedSlug}\`} className='block'>
                            <Card className='h-full transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/60 cursor-pointer group border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80'>
                                <CardHeader className='pb-3'>
                                    <div className='flex items-start justify-between mb-2'>
                                        <CardTitle className='text-base font-mono group-hover:text-primary transition-colors text-foreground'>
                                            {widget.slug}
                                        </CardTitle>
                                        <ArrowRight className='w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 mt-0.5' />
                                    </div>
                                    <CardDescription className='text-xs text-muted-foreground'>
                                        {widget.files.length} source file{widget.files.length !== 1 ? 's' : ''}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className='space-y-3 pt-0'>
                                    <div className='space-y-2'>
                                        <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                                            <MapPin className='w-3 h-3' />
                                            <span className='font-semibold uppercase tracking-wide'>Injection Points</span>
                                        </div>
                                        {widget.injectionPoints.length > 0 ? (
                                            <div className='flex flex-wrap gap-1.5'>
                                                {widget.injectionPoints.slice(0, 3).map((ip) => (
                                                    <Badge 
                                                        key={ip} 
                                                        variant='outline' 
                                                        className='text-xs font-mono bg-muted/30 border-border/50 text-foreground/80 hover:bg-muted/50 hover:border-primary/50 transition-colors'
                                                    >
                                                        {ip}
                                                    </Badge>
                                                ))}
                                                {widget.injectionPoints.length > 3 && (
                                                    <Badge 
                                                        variant='outline' 
                                                        className='text-xs bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50 transition-colors'
                                                    >
                                                        +{widget.injectionPoints.length - 3} more
                                                    </Badge>
                                                )}
                                            </div>
                                        ) : (
                                            <p className='text-xs text-muted-foreground italic'>
                                                Check detail page for dynamic injection points
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
`;
}

function generateWidgetDetailPage(slug, data) {
    const injectionPoints = Array.from(data.injectionPoints).sort();
    const files = data.files.map(f => ({
        name: path.basename(f),
        path: f.replace(/\\/g, '/') // Normalize path separators
    }));
    
    // Escape slug and injection point for use in JSX template strings
    const escapedSlug = slug.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\$/g, '\\$');
    const escapedIp = injectionPoints.length > 0 
        ? injectionPoints[0].replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\$/g, '\\$')
        : 'injection-point';
    
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
import { ArrowLeft, FileCode, MapPin, Code } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const widgetData = {
    slug: '${slug}',
    files: ${JSON.stringify(files, null, 2)},
    injectionPoints: ${JSON.stringify(injectionPoints, null, 2)}
};

export default function WidgetDetailPage() {
    return (
        <div className='min-h-screen bg-background'>
            <div className='container mx-auto px-4 py-16 max-w-6xl'>
                <Link href='/icanhasfeatherpanel/widgets'>
                    <Button variant='ghost' className='mb-8 -ml-4'>
                        <ArrowLeft className='w-4 h-4 mr-2' />
                        Back to Widgets
                    </Button>
                </Link>

                <div className='mb-12 space-y-4'>
                    <div className='flex items-center gap-3'>
                        <div className='p-3 rounded-xl bg-primary/10 border border-primary/20 backdrop-blur-sm'>
                            <Code className='w-6 h-6 text-primary' />
                        </div>
                        <div>
                            <h1 className='text-4xl font-black tracking-tight font-mono bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent'>
                                {widgetData.slug}
                            </h1>
                            <p className='text-muted-foreground mt-1'>
                                Widget slug and injection point details
                            </p>
                        </div>
                    </div>
                </div>

                <div className='grid lg:grid-cols-2 gap-6 mb-6'>
                    <Card className='border-border/50 bg-card/50 backdrop-blur-sm'>
                        <CardHeader>
                            <div className='flex items-center gap-2 mb-2'>
                                <MapPin className='w-5 h-5 text-primary' />
                                <CardTitle className='text-foreground'>Injection Points</CardTitle>
                            </div>
                            <CardDescription className='text-muted-foreground'>
                                Available injection points for this widget slug
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {widgetData.injectionPoints.length > 0 ? (
                                <div className='space-y-2'>
                                    {widgetData.injectionPoints.map((ip) => (
                                        <div
                                            key={ip}
                                            className='p-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors backdrop-blur-sm'
                                        >
                                            <code className='text-sm font-mono text-foreground'>{ip}</code>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className='text-sm text-muted-foreground italic'>
                                    No injection points found in source files. They may be rendered dynamically or in child components.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card className='border-border/50 bg-card/50 backdrop-blur-sm'>
                        <CardHeader>
                            <div className='flex items-center gap-2 mb-2'>
                                <FileCode className='w-5 h-5 text-primary' />
                                <CardTitle className='text-foreground'>Source Files</CardTitle>
                            </div>
                            <CardDescription className='text-muted-foreground'>
                                Files where this widget slug is used
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className='space-y-2'>
                                {widgetData.files.map((file) => (
                                    <div
                                        key={file.path}
                                        className='p-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors backdrop-blur-sm'
                                    >
                                        <div className='flex items-center justify-between gap-2'>
                                            <code className='text-sm font-mono text-foreground truncate'>{file.name}</code>
                                            <Badge variant='outline' className='text-xs bg-muted/50 border-border/50 flex-shrink-0'>
                                                {file.path}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className='border-primary/20 bg-primary/5 backdrop-blur-sm border-border/50'>
                    <CardHeader>
                        <CardTitle className='text-foreground'>Plugin Widget Integration</CardTitle>
                        <CardDescription className='text-muted-foreground'>
                            How plugins can inject widgets into this page
                        </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                        <div className='space-y-3'>
                            <div>
                                <h3 className='text-sm font-semibold text-foreground mb-2'>Widget Configuration</h3>
                                <p className='text-sm text-muted-foreground mb-3'>
                                    To inject a widget into this page, create a <code className='px-1.5 py-0.5 rounded bg-muted/50 text-xs font-mono'>widgets.json</code> file in your plugin&apos;s <code className='px-1.5 py-0.5 rounded bg-muted/50 text-xs font-mono'>Frontend/</code> directory:
                                </p>
                                <pre className='p-4 rounded-lg bg-muted/50 border border-border/50 overflow-x-auto backdrop-blur-sm'>
                                    <code className='text-sm font-mono text-foreground'>
{\`{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "priority": 100,
  "page": "${escapedSlug}",
  "location": "${injectionPoints.length > 0 ? escapedIp : 'top-of-page'}",
  "size": "full"
}\`}
                                    </code>
                                </pre>
                            </div>
                            
                            {widgetData.injectionPoints.length > 0 && (
                                <div>
                                    <h3 className='text-sm font-semibold text-foreground mb-2'>Available Injection Points</h3>
                                    <p className='text-sm text-muted-foreground mb-2'>
                                        This page supports the following injection points. Use the <code className='px-1.5 py-0.5 rounded bg-muted/50 text-xs font-mono'>location</code> property in your widget configuration:
                                    </p>
                                    <div className='flex flex-wrap gap-2'>
                                        {widgetData.injectionPoints.map((ip) => (
                                            <Badge 
                                                key={ip} 
                                                variant='outline' 
                                                className='text-xs font-mono bg-muted/30 border-border/50 text-foreground/80'
                                            >
                                                {ip}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            <div>
                                <h3 className='text-sm font-semibold text-foreground mb-2'>Widget Sizing</h3>
                                <p className='text-sm text-muted-foreground mb-2'>
                                    Set the <code className='px-1.5 py-0.5 rounded bg-muted/50 text-xs font-mono'>size</code> property to control widget width:
                                </p>
                                <ul className='text-sm text-muted-foreground space-y-1 list-disc list-inside'>
                                    <li><code className='px-1.5 py-0.5 rounded bg-muted/50 text-xs font-mono'>&quot;full&quot;</code> - Full width (default)</li>
                                    <li><code className='px-1.5 py-0.5 rounded bg-muted/50 text-xs font-mono'>&quot;half&quot;</code> - Half width (2 per row)</li>
                                    <li><code className='px-1.5 py-0.5 rounded bg-muted/50 text-xs font-mono'>&quot;third&quot;</code> - One-third width (3 per row)</li>
                                    <li><code className='px-1.5 py-0.5 rounded bg-muted/50 text-xs font-mono'>&quot;quarter&quot;</code> - One-quarter width (4 per row)</li>
                                </ul>
                            </div>
                            
                            <div>
                                <h3 className='text-sm font-semibold text-foreground mb-2'>Widget Context</h3>
                                <p className='text-sm text-muted-foreground mb-2'>
                                    Widgets automatically receive context information accessible via:
                                </p>
                                <pre className='p-4 rounded-lg bg-muted/50 border border-border/50 overflow-x-auto backdrop-blur-sm'>
                                    <code className='text-sm font-mono text-foreground'>
const context = window.FeatherPanel?.widgetContext || {};
const userUuid = context.userUuid;
const serverUuid = context.serverUuid;
                                    </code>
                                </pre>
                            </div>
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
if (!fs.existsSync(WIDGETS_DOCS_DIR)) {
    fs.mkdirSync(WIDGETS_DOCS_DIR, { recursive: true });
}

console.log('Extracting widget documentation...');
const documentation = extractDocs();
const pages = generateNextJsPages(documentation);

// Write main docs page
const mainPagePath = path.join(DOCS_DIR, 'page.tsx');
fs.writeFileSync(mainPagePath, pages.mainPage);
console.log(`✓ Main docs page: ${mainPagePath}`);

// Write widgets list page
const widgetsListPath = path.join(WIDGETS_DOCS_DIR, 'page.tsx');
fs.writeFileSync(widgetsListPath, pages.widgetsListPage);
console.log(`✓ Widgets list page: ${widgetsListPath}`);

// Write individual widget pages
Object.keys(pages.widgetPages).forEach((slug) => {
    // Sanitize slug for use in file paths (replace special chars with dashes)
    const sanitizedSlug = sanitizeSlug(slug);
    const widgetPageDir = path.join(WIDGETS_DOCS_DIR, sanitizedSlug);
    if (!fs.existsSync(widgetPageDir)) {
        fs.mkdirSync(widgetPageDir, { recursive: true });
    }
    const widgetPagePath = path.join(widgetPageDir, 'page.tsx');
    fs.writeFileSync(widgetPagePath, pages.widgetPages[slug]);
    console.log(`✓ Widget page: ${widgetPagePath} (slug: ${slug})`);
});

console.log(`\n✅ Documentation generated successfully!`);
console.log(`   - Main page: /docs`);
console.log(`   - Widgets list: /docs/widgets`);
console.log(`   - ${Object.keys(pages.widgetPages).length} widget detail pages`);
