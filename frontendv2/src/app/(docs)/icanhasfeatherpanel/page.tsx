// @ts-nocheck
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
                                    Explore all available widget injection points and learn how to create custom widgets
                                    for FeatherPanel
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className='flex items-center gap-2 text-primary font-semibold group-hover:gap-3 transition-all'>
                                    <span>View Widgets</span>
                                    <ExternalLink className='w-4 h-4 group-hover:translate-x-1 transition-transform' />
                                </div>
                                <div className='mt-4'>
                                    <Badge variant='secondary' className='text-xs bg-muted/50 border-border/50'>
                                        69 Widget Slugs Available
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
                                    Complete reference of all permission nodes available in FeatherPanel for role-based
                                    access control
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
                                    Complete reference of all plugin events and hooks available in FeatherPanel for
                                    extending functionality
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
                                Widgets allow you to extend FeatherPanel&apos;s functionality by injecting custom
                                components into specific pages. Each page has unique injection points where widgets can
                                be rendered.
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
