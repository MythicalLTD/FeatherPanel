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
    slug: 'dashboard-servers',
    files: [
  {
    "name": "page.tsx",
    "path": "src/app/(app)/dashboard/servers/page.tsx"
  }
],
    injectionPoints: [
  "after-header",
  "after-server-list",
  "before-server-list",
  "bottom-of-page",
  "top-of-page"
]
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
                                    To inject a widget into this page, create a <code className='px-1.5 py-0.5 rounded bg-muted/50 text-xs font-mono'>widgets.json</code> file in your plugin's <code className='px-1.5 py-0.5 rounded bg-muted/50 text-xs font-mono'>Frontend/</code> directory:
                                </p>
                                <pre className='p-4 rounded-lg bg-muted/50 border border-border/50 overflow-x-auto backdrop-blur-sm'>
                                    <code className='text-sm font-mono text-foreground'>
{`{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "priority": 100,
  "page": "dashboard-servers",
  "location": "after-header",
  "size": "full"
}`}
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
                                    <li><code className='px-1.5 py-0.5 rounded bg-muted/50 text-xs font-mono'>"full"</code> - Full width (default)</li>
                                    <li><code className='px-1.5 py-0.5 rounded bg-muted/50 text-xs font-mono'>"half"</code> - Half width (2 per row)</li>
                                    <li><code className='px-1.5 py-0.5 rounded bg-muted/50 text-xs font-mono'>"third"</code> - One-third width (3 per row)</li>
                                    <li><code className='px-1.5 py-0.5 rounded bg-muted/50 text-xs font-mono'>"quarter"</code> - One-quarter width (4 per row)</li>
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
