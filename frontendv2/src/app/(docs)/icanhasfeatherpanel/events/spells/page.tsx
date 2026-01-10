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
import { ArrowLeft, Zap, Code } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const categoryData = {
    name: 'Spells',
    events: [
        {
            method: 'onSpellCreated',
            name: 'featherpanel:admin:spells:spell:created',
            callback: 'array spell data.',
            category: 'Spells',
            actualData: ['created_by', 'spell'],
            sourceFiles: ['backend/app/Controllers/Admin/SpellsController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\SpellsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(SpellsEvent::onSpellCreated(), function ($createdBy, $spell) {\n        // Handle featherpanel:admin:spells:spell:created\n        // Data keys: created_by, spell\n    });\n}',
        },
        {
            method: 'onSpellDeleted',
            name: 'featherpanel:admin:spells:spell:deleted',
            callback: 'int spell id, array spell data.',
            category: 'Spells',
            actualData: ['deleted_by', 'spell'],
            sourceFiles: ['backend/app/Controllers/Admin/SpellsController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\SpellsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(SpellsEvent::onSpellDeleted(), function ($deletedBy, $spell) {\n        // Handle featherpanel:admin:spells:spell:deleted\n        // Data keys: deleted_by, spell\n    });\n}',
        },
        {
            method: 'onSpellExported',
            name: 'featherpanel:admin:spells:spell:exported',
            callback: 'int spell id, array export data.',
            category: 'Spells',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\SpellsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(SpellsEvent::onSpellExported(), function ($id, $data) {\n        // Handle featherpanel:admin:spells:spell:exported\n        // Parameters: int spell id, array export data.\n    });\n}',
        },
        {
            method: 'onSpellNotFound',
            name: 'featherpanel:admin:spells:spell:not:found',
            callback: 'int spell id, string error message.',
            category: 'Spells',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\SpellsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(SpellsEvent::onSpellNotFound(), function ($id, $message) {\n        // Handle featherpanel:admin:spells:spell:not:found\n        // Parameters: int spell id, string error message.\n    });\n}',
        },
        {
            method: 'onSpellRetrieved',
            name: 'featherpanel:admin:spells:spell:retrieved',
            callback: 'int spell id, array spell data.',
            category: 'Spells',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\SpellsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(SpellsEvent::onSpellRetrieved(), function ($id, $data) {\n        // Handle featherpanel:admin:spells:spell:retrieved\n        // Parameters: int spell id, array spell data.\n    });\n}',
        },
        {
            method: 'onSpellsByRealmRetrieved',
            name: 'featherpanel:admin:spells:by:realm:retrieved',
            callback: 'int realm id, array spells.',
            category: 'Spells',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\SpellsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(SpellsEvent::onSpellsByRealmRetrieved(), function ($id, $spells) {\n        // Handle featherpanel:admin:spells:by:realm:retrieved\n        // Parameters: int realm id, array spells.\n    });\n}',
        },
        {
            method: 'onSpellsError',
            name: 'featherpanel:admin:spells:error',
            callback: 'string error message, array context.',
            category: 'Spells',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\SpellsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(SpellsEvent::onSpellsError(), function ($message, $context) {\n        // Handle featherpanel:admin:spells:error\n        // Parameters: string error message, array context.\n    });\n}',
        },
        {
            method: 'onSpellsImported',
            name: 'featherpanel:admin:spells:spells:imported',
            callback: 'array import data, array results.',
            category: 'Spells',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\SpellsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(SpellsEvent::onSpellsImported(), function ($data, $results) {\n        // Handle featherpanel:admin:spells:spells:imported\n        // Parameters: array import data, array results.\n    });\n}',
        },
        {
            method: 'onSpellsRetrieved',
            name: 'featherpanel:admin:spells:retrieved',
            callback: 'array spells list.',
            category: 'Spells',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\SpellsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(SpellsEvent::onSpellsRetrieved(), function ($list) {\n        // Handle featherpanel:admin:spells:retrieved\n        // Parameters: array spells list.\n    });\n}',
        },
        {
            method: 'onSpellUpdated',
            name: 'featherpanel:admin:spells:spell:updated',
            callback: 'int spell id, array old data, array new data.',
            category: 'Spells',
            actualData: ['spell', 'updated_by', 'updated_data'],
            sourceFiles: ['backend/app/Controllers/Admin/SpellsController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\SpellsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(SpellsEvent::onSpellUpdated(), function ($spell, $updatedBy, $updatedData) {\n        // Handle featherpanel:admin:spells:spell:updated\n        // Data keys: spell, updated_by, updated_data\n    });\n}',
        },
        {
            method: 'onSpellVariableCreated',
            name: 'featherpanel:admin:spells:variable:created',
            callback: 'int spell id, array variable data.',
            category: 'Spells',
            actualData: ['spell_id', 'variable'],
            sourceFiles: ['backend/app/Controllers/Admin/SpellsController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\SpellsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(SpellsEvent::onSpellVariableCreated(), function ($spellId, $variable) {\n        // Handle featherpanel:admin:spells:variable:created\n        // Data keys: spell_id, variable\n    });\n}',
        },
        {
            method: 'onSpellVariableDeleted',
            name: 'featherpanel:admin:spells:variable:deleted',
            callback: 'int variable id, array variable data.',
            category: 'Spells',
            actualData: ['variable'],
            sourceFiles: ['backend/app/Controllers/Admin/SpellsController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\SpellsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(SpellsEvent::onSpellVariableDeleted(), function ($variable) {\n        // Handle featherpanel:admin:spells:variable:deleted\n        // Data keys: variable\n    });\n}',
        },
        {
            method: 'onSpellVariablesRetrieved',
            name: 'featherpanel:admin:spells:variables:retrieved',
            callback: 'int spell id, array variables.',
            category: 'Spells',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\SpellsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(SpellsEvent::onSpellVariablesRetrieved(), function ($id, $variables) {\n        // Handle featherpanel:admin:spells:variables:retrieved\n        // Parameters: int spell id, array variables.\n    });\n}',
        },
        {
            method: 'onSpellVariableUpdated',
            name: 'featherpanel:admin:spells:variable:updated',
            callback: 'int variable id, array old data, array new data.',
            category: 'Spells',
            actualData: ['updated_data', 'variable'],
            sourceFiles: ['backend/app/Controllers/Admin/SpellsController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\SpellsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(SpellsEvent::onSpellVariableUpdated(), function ($updatedData, $variable) {\n        // Handle featherpanel:admin:spells:variable:updated\n        // Data keys: updated_data, variable\n    });\n}',
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
