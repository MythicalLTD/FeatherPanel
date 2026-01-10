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

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EVENTS_DIR = path.join(__dirname, '../../backend/app/Plugins/Events/Events');
const CONTROLLERS_DIR = path.join(__dirname, '../../backend/app/Controllers');
const DOCS_DIR = path.join(__dirname, '../src/app/(docs)/icanhasfeatherpanel');
const EVENTS_DOCS_DIR = path.join(DOCS_DIR, 'events');

function getControllerFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    const fileList = fs.readdirSync(dir);
    for (const file of fileList) {
        const name = path.join(dir, file);
        if (fs.statSync(name).isDirectory()) {
            getControllerFiles(name, files);
        } else if (name.endsWith('.php')) {
            files.push(name);
        }
    }
    return files;
}

function parseEventEmissions() {
    const files = getControllerFiles(CONTROLLERS_DIR);
    const eventDataMap = new Map(); // Map: "Category::method" -> data keys
    
    files.forEach(filePath => {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Match: $eventManager->emit(EventClass::method(), [array]);
            // More flexible pattern to handle various formatting
            const emitPatterns = [
                /eventManager\s*->\s*emit\s*\(\s*([A-Za-z0-9_\\]+)::(\w+)\(\)\s*,\s*\[(.*?)\]\s*\)/gs,
                /\$eventManager\s*->\s*emit\s*\(\s*([A-Za-z0-9_\\]+)::(\w+)\(\)\s*,\s*\[(.*?)\]\s*\)/gs
            ];
            
            emitPatterns.forEach(pattern => {
                let match;
                while ((match = pattern.exec(content)) !== null) {
                    const [, eventClass, method, dataArray] = match;
                    
                    // Extract category from class name
                    const categoryMatch = eventClass.match(/([A-Za-z]+)Event$/);
                    if (!categoryMatch) continue;
                    const category = categoryMatch[1];
                    
                    // Extract data keys from the array
                    const dataKeys = [];
                    // Match: 'key' => or "key" =>
                    const keyPattern = /['"]([^'"]+)['"]\s*=>/g;
                    let keyMatch;
                    while ((keyMatch = keyPattern.exec(dataArray)) !== null) {
                        dataKeys.push(keyMatch[1]);
                    }
                    
                    const key = `${category}::${method}`;
                    if (!eventDataMap.has(key)) {
                        eventDataMap.set(key, []);
                    }
                    eventDataMap.get(key).push({
                        keys: dataKeys,
                        file: path.relative(path.join(__dirname, '../..'), filePath)
                    });
                }
            });
        } catch {
            // Skip files that can't be read
        }
    });
    
    // Merge data keys for same events (some events are emitted from multiple places)
    const merged = new Map();
    eventDataMap.forEach((occurrences, key) => {
        const allKeys = new Set();
        occurrences.forEach(occ => {
            occ.keys.forEach(k => allKeys.add(k));
        });
        merged.set(key, {
            keys: Array.from(allKeys).sort(),
            files: [...new Set(occurrences.map(o => o.file))]
        });
    });
    
    return merged;
}

function parseEventFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const className = path.basename(filePath, '.php');
    const events = [];
    
    // Extract class name without "Event" suffix for category
    const category = className.replace(/Event$/, '');
    
    // Match static methods with optional PHPDoc comments
    const methodRegex = /(?:\/\*\*\s*\n\s*\*\s*Callback:\s*(.+?)\s*\n\s*\*\/\s*\n)?\s*public\s+static\s+function\s+(\w+)\(\):\s*string\s*\n\s*\{\s*\n\s*return\s+['"](.+?)['"];?\s*\n\s*\}/gs;
    
    let match;
    while ((match = methodRegex.exec(content)) !== null) {
        const [, callbackParams, methodName, eventName] = match;
        events.push({
            method: methodName,
            name: eventName,
            callback: callbackParams ? callbackParams.trim() : 'No parameters',
            category: category
        });
    }
    
    return { category, events, className };
}

function parseAllEvents() {
    const files = fs.readdirSync(EVENTS_DIR).filter(f => f.endsWith('.php') && f !== 'PluginEvent.php');
    const allEvents = [];
    const categories = new Set();
    const grouped = {};
    
    // Parse actual event emissions from controllers
    const eventDataMap = parseEventEmissions();
    
    files.forEach(file => {
        const filePath = path.join(EVENTS_DIR, file);
        const { category, events } = parseEventFile(filePath);
        
        categories.add(category);
        
        if (!grouped[category]) {
            grouped[category] = [];
        }
        
        events.forEach(event => {
            // Try to find actual data being sent for this event
            const dataKey = `${category}::${event.method}`;
            const eventData = eventDataMap.get(dataKey);
            
            if (eventData) {
                event.actualData = eventData.keys;
                event.sourceFiles = eventData.files;
            }
            
            allEvents.push(event);
            grouped[category].push(event);
        });
    });
    
    // Sort events within each category by method name
    Object.keys(grouped).forEach(category => {
        grouped[category].sort((a, b) => a.method.localeCompare(b.method));
    });
    
    return {
        events: allEvents,
        categories: Array.from(categories).sort(),
        grouped
    };
}

function sanitizeCategory(category) {
    return category
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()
        .replace(/^-+/, '')
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function generateMainEventsPage(categories, totalEvents) {
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
import { Zap, Code, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const categories = ${JSON.stringify(categories, null, 2)};

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
                        Complete reference of all plugin events and hooks available in FeatherPanel for extending functionality
                    </p>
                    <div className='flex items-center justify-center gap-4 pt-2'>
                        <Badge variant='secondary' className='text-sm px-4 py-1.5 font-semibold bg-card border border-border/50'>
                            ${categories.length} Event Categories
                        </Badge>
                        <Badge variant='outline' className='text-sm px-4 py-1.5 font-semibold bg-card border-border/50'>
                            ${totalEvents} Total Events
                        </Badge>
                    </div>
                </div>

                <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12'>
                    {categories.map((category) => {
                        const sanitized = category.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-+/, '').replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
                        return (
                            <Link key={category} href={\`/icanhasfeatherpanel/events/\${sanitized}\`} className='block'>
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
                                FeatherPanel uses an event-driven architecture that allows plugins to hook into system events 
                                and extend functionality without modifying core code. Events are emitted at key points in the 
                                application lifecycle and can be listened to by plugins.
                            </p>
                        </div>
                        <div className='space-y-2'>
                            <h3 className='font-semibold text-sm text-foreground'>Registering Event Listeners</h3>
                            <p className='text-sm text-muted-foreground mb-2'>
                                In your plugin&apos;s main class, implement the <code className='px-1.5 py-0.5 rounded bg-muted/50 text-xs font-mono'>processEvents</code> method:
                            </p>
                            <pre className='p-3 rounded-lg bg-muted/50 border border-border/50 overflow-x-auto backdrop-blur-sm'>
                                <code className='text-xs font-mono text-foreground'>
{${JSON.stringify(`public static function processEvents(PluginEvents $event): void
{
    $event->on('featherpanel:user:created', function ($user) {
        // Handle user creation
    });
}`)}}
                                </code>
                            </pre>
                        </div>
                        <div className='space-y-2'>
                            <h3 className='font-semibold text-sm text-foreground'>Event Naming</h3>
                            <p className='text-sm text-muted-foreground'>
                                Events follow a consistent naming pattern: <code className='px-1.5 py-0.5 rounded bg-muted/50 text-xs font-mono'>featherpanel:category:action</code>. 
                                Each event includes callback parameter information to help you understand what data is available.
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

function generateCategoryPage(category, events) {
    const escapedCategory = category.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
    
    // Build code examples for each event
    const eventsWithExamples = events.map(event => {
        // Use actual data keys if available, otherwise parse from callback description
        let params = [];
        if (event.actualData && event.actualData.length > 0) {
            // Use actual data keys from controller emissions - convert snake_case to camelCase for PHP
            params = event.actualData.map(key => {
                // Convert snake_case to camelCase: user_uuid -> userUuid, allocation_id -> allocationId
                const parts = key.split('_');
                const camelCase = parts[0] + parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
                return '$' + camelCase;
            });
        } else {
            // Fallback to parsing callback description
            params = event.callback.split(',').map(p => {
                const trimmed = p.trim();
                const parts = trimmed.split(' ');
                const paramName = parts.length > 0 ? parts[parts.length - 1].replace(/\.$/, '') : 'param';
                return '$' + paramName;
            });
        }
        
        // Build the code example - use single backslashes, JSON.stringify will handle escaping
        const exampleCodeLines = [
            `use App\\Plugins\\PluginEvents;`,
            `use App\\Plugins\\Events\\Events\\${escapedCategory}Event;`,
            ``,
            `public static function processEvents(PluginEvents $evt): void`,
            `{`,
            `    $evt->on(${escapedCategory}Event::${event.method}(), function (${params.join(', ')}) {`,
            `        // Handle ${event.name}`,
            event.actualData && event.actualData.length > 0 
                ? `        // Data keys: ${event.actualData.join(', ')}`
                : `        // Parameters: ${event.callback}`,
            `    });`,
            `}`
        ];
        
        const exampleCode = exampleCodeLines.join('\n');
        
        return { ...event, exampleCode };
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
import { ArrowLeft, Zap, Code } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const categoryData = {
    name: ${JSON.stringify(category)},
    events: ${JSON.stringify(eventsWithExamples, null, 2)}
};

export default function CategoryEventsPage() {
    // Helper to unescape JSON-escaped strings
    const unescapeCode = (str: string) => {
        // Replace double backslashes (escaped in JSON) with single backslash
        // Replace escaped newlines with actual newlines
        return str.replace(/\\\\\\\\/g, '\\\\').replace(/\\\\n/g, '\\n');
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
                                {categoryData.events.length} event{categoryData.events.length !== 1 ? 's' : ''} in this category
                            </p>
                        </div>
                    </div>
                </div>

                <div className='space-y-4'>
                    {categoryData.events.map((event) => (
                        <Card key={event.name} className='border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-colors'>
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
                                    <Badge variant='outline' className='text-xs font-mono bg-muted/30 border-border/50 text-foreground/80 flex-shrink-0'>
                                        {event.method}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className='space-y-4'>
                                {event.actualData && event.actualData.length > 0 && (
                                    <div className='p-4 rounded-lg bg-muted/30 border border-border/50 backdrop-blur-sm'>
                                        <h4 className='text-sm font-semibold text-foreground mb-2'>Event Data Structure</h4>
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
                                                        <code key={file} className='text-xs text-muted-foreground block truncate'>
                                                            {file}
                                                        </code>
                                                    ))}
                                                    {event.sourceFiles.length > 2 && (
                                                        <p className='text-xs text-muted-foreground italic'>
                                                            +{event.sourceFiles.length - 2} more location{event.sourceFiles.length - 2 !== 1 ? 's' : ''}
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
`;
}

// Ensure docs directories exist
if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
}
if (!fs.existsSync(EVENTS_DOCS_DIR)) {
    fs.mkdirSync(EVENTS_DOCS_DIR, { recursive: true });
}

console.log('Parsing plugin events...');
const { events, categories, grouped } = parseAllEvents();

// Generate main events page
const mainPagePath = path.join(EVENTS_DOCS_DIR, 'page.tsx');
const mainPage = generateMainEventsPage(categories, events.length);
fs.writeFileSync(mainPagePath, mainPage);
console.log(`✓ Main events page: ${mainPagePath}`);

// Generate category pages
categories.forEach(category => {
    const sanitized = sanitizeCategory(category);
    const categoryDir = path.join(EVENTS_DOCS_DIR, sanitized);
    if (!fs.existsSync(categoryDir)) {
        fs.mkdirSync(categoryDir, { recursive: true });
    }
    const categoryPagePath = path.join(categoryDir, 'page.tsx');
    const categoryPage = generateCategoryPage(category, grouped[category]);
    fs.writeFileSync(categoryPagePath, categoryPage);
    console.log(`✓ Category page: ${categoryPagePath} (${grouped[category].length} events)`);
});

console.log(`\n✅ Plugin events documentation generated successfully!`);
console.log(`   - Main page: /icanhasfeatherpanel/events`);
console.log(`   - ${categories.length} category pages`);
console.log(`   - ${events.length} total events`);
