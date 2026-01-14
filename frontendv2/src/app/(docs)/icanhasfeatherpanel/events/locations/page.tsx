// @ts-nocheck
'use client';

import Link from 'next/link';
import { ArrowLeft, Zap, Code } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const categoryData = {
    name: 'Locations',
    events: [
        {
            method: 'onLocationCreated',
            name: 'featherpanel:admin:locations:location:created',
            callback: 'array location data.',
            category: 'Locations',
            actualData: ['created_by', 'location'],
            sourceFiles: ['backend/app/Controllers/Admin/LocationsController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\LocationsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(LocationsEvent::onLocationCreated(), function ($createdBy, $location) {\n        // Handle featherpanel:admin:locations:location:created\n        // Data keys: created_by, location\n    });\n}',
        },
        {
            method: 'onLocationDeleted',
            name: 'featherpanel:admin:locations:location:deleted',
            callback: 'int location id, array location data.',
            category: 'Locations',
            actualData: ['deleted_by', 'location'],
            sourceFiles: ['backend/app/Controllers/Admin/LocationsController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\LocationsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(LocationsEvent::onLocationDeleted(), function ($deletedBy, $location) {\n        // Handle featherpanel:admin:locations:location:deleted\n        // Data keys: deleted_by, location\n    });\n}',
        },
        {
            method: 'onLocationNotFound',
            name: 'featherpanel:admin:locations:location:not:found',
            callback: 'int location id, string error message.',
            category: 'Locations',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\LocationsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(LocationsEvent::onLocationNotFound(), function ($id, $message) {\n        // Handle featherpanel:admin:locations:location:not:found\n        // Parameters: int location id, string error message.\n    });\n}',
        },
        {
            method: 'onLocationRetrieved',
            name: 'featherpanel:admin:locations:location:retrieved',
            callback: 'int location id, array location data.',
            category: 'Locations',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\LocationsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(LocationsEvent::onLocationRetrieved(), function ($id, $data) {\n        // Handle featherpanel:admin:locations:location:retrieved\n        // Parameters: int location id, array location data.\n    });\n}',
        },
        {
            method: 'onLocationsError',
            name: 'featherpanel:admin:locations:error',
            callback: 'string error message, array context.',
            category: 'Locations',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\LocationsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(LocationsEvent::onLocationsError(), function ($message, $context) {\n        // Handle featherpanel:admin:locations:error\n        // Parameters: string error message, array context.\n    });\n}',
        },
        {
            method: 'onLocationsRetrieved',
            name: 'featherpanel:admin:locations:retrieved',
            callback: 'array locations list.',
            category: 'Locations',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\LocationsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(LocationsEvent::onLocationsRetrieved(), function ($list) {\n        // Handle featherpanel:admin:locations:retrieved\n        // Parameters: array locations list.\n    });\n}',
        },
        {
            method: 'onLocationUpdated',
            name: 'featherpanel:admin:locations:location:updated',
            callback: 'int location id, array old data, array new data.',
            category: 'Locations',
            actualData: ['location', 'updated_by', 'updated_data'],
            sourceFiles: ['backend/app/Controllers/Admin/LocationsController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\LocationsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(LocationsEvent::onLocationUpdated(), function ($location, $updatedBy, $updatedData) {\n        // Handle featherpanel:admin:locations:location:updated\n        // Data keys: location, updated_by, updated_data\n    });\n}',
        },
    ],
};

export default function CategoryEventsPage() {
    // Helper to unescape JSON-escaped strings
    const unescapeCode = (str: string) => {
        // Replace double backslashes (escaped in JSON) with single backslash
        // Replace escaped newlines with actual newlines
        return str.replace(/\\\\/g, '\\').replace(/\\n/g, '\n');
    };

    return (
        <div className='min-h-screen bg-background'>
            <div className='container mx-auto px-4 py-16 max-w-6xl'>
                <Link href='/icanhasfeatherpanel/events'>
                    <Button variant='ghost' className='mb-8 -ml-4'>
                        <ArrowLeft className='w-4 h-4 mr-2' />
                        Back to Events
                    </Button>
                </Link>

                <div className='mb-12 space-y-4'>
                    <div className='flex items-center gap-3'>
                        <div className='p-3 rounded-xl bg-primary/10 border border-primary/20 backdrop-blur-sm'>
                            <Zap className='w-6 h-6 text-primary' />
                        </div>
                        <div>
                            <h1 className='text-4xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent'>
                                {categoryData.name}
                            </h1>
                            <p className='text-muted-foreground mt-1'>
                                {categoryData.events.length} event{categoryData.events.length !== 1 ? 's' : ''} in this
                                category
                            </p>
                        </div>
                    </div>
                </div>

                <div className='space-y-4'>
                    {categoryData.events.map((event) => (
                        <Card
                            key={event.name}
                            className='border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-colors'
                        >
                            <CardHeader>
                                <div className='flex items-start justify-between gap-4 flex-wrap'>
                                    <div className='flex-1 min-w-0'>
                                        <div className='flex items-center gap-2 mb-2 flex-wrap'>
                                            <Code className='w-4 h-4 text-primary flex-shrink-0' />
                                            <CardTitle className='text-lg font-mono text-foreground break-all'>
                                                {event.name}
                                            </CardTitle>
                                        </div>
                                        <CardDescription className='text-muted-foreground mb-3'>
                                            <span className='font-semibold'>Callback parameters:</span> {event.callback}
                                        </CardDescription>
                                    </div>
                                    <Badge
                                        variant='outline'
                                        className='text-xs font-mono bg-muted/30 border-border/50 text-foreground/80 flex-shrink-0'
                                    >
                                        {event.method}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className='space-y-4'>
                                {event.actualData && event.actualData.length > 0 && (
                                    <div className='p-4 rounded-lg bg-muted/30 border border-border/50 backdrop-blur-sm'>
                                        <h4 className='text-sm font-semibold text-foreground mb-2'>
                                            Event Data Structure
                                        </h4>
                                        <p className='text-xs text-muted-foreground mb-3'>
                                            This event receives the following data when emitted:
                                        </p>
                                        <div className='flex flex-wrap gap-2'>
                                            {event.actualData.map((key) => (
                                                <Badge
                                                    key={key}
                                                    variant='outline'
                                                    className='text-xs font-mono bg-muted/50 border-border/50 text-foreground/80'
                                                >
                                                    {key}
                                                </Badge>
                                            ))}
                                        </div>
                                        {event.sourceFiles && event.sourceFiles.length > 0 && (
                                            <div className='mt-3 pt-3 border-t border-border/30'>
                                                <p className='text-xs text-muted-foreground mb-1'>Emitted from:</p>
                                                <div className='space-y-1'>
                                                    {event.sourceFiles.slice(0, 2).map((file) => (
                                                        <code
                                                            key={file}
                                                            className='text-xs text-muted-foreground block truncate'
                                                        >
                                                            {file}
                                                        </code>
                                                    ))}
                                                    {event.sourceFiles.length > 2 && (
                                                        <p className='text-xs text-muted-foreground italic'>
                                                            +{event.sourceFiles.length - 2} more location
                                                            {event.sourceFiles.length - 2 !== 1 ? 's' : ''}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className='p-4 rounded-lg bg-muted/30 border border-border/50 backdrop-blur-sm'>
                                    <h4 className='text-sm font-semibold text-foreground mb-2'>Usage Example</h4>
                                    <pre className='p-3 rounded-lg bg-muted/50 border border-border/50 overflow-x-auto'>
                                        <code className='text-xs font-mono text-foreground'>
                                            {unescapeCode(event.exampleCode)}
                                        </code>
                                    </pre>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
