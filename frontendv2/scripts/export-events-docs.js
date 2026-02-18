
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

const EVENTS_DIR = path.join(__dirname, '../../backend/app/Plugins/Events/Events');
const CONTROLLERS_DIR = path.join(__dirname, '../../backend/app/Controllers');
const PUBLIC_DOCS_DIR = path.join(__dirname, '../public/icanhasfeatherpanel');
const EVENTS_DOCS_DIR = path.join(PUBLIC_DOCS_DIR, 'events');

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
    const categoryItems = categories
        .map((category) => {
            const sanitized = sanitizeCategory(category);
            return `<li>
    <a href="/icanhasfeatherpanel/events/${sanitized}.html">${category}</a>
</li>`;
        })
        .join('\n');

    const exampleCode = [
        'public static function processEvents(PluginEvents $event): void',
        '{',
        "    $event->on('featherpanel:user:created', function ($user) {",
        '        // Handle user creation',
        '    });',
        '}',
    ].join('\n');

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>FeatherPanel Plugin Events & Hooks</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 2rem; background: #020617; color: #e5e7eb; }
    a { color: #60a5fa; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .container { max-width: 960px; margin: 0 auto; }
    h1 { font-size: 2.25rem; margin-bottom: 0.5rem; }
    h2 { font-size: 1.5rem; margin-top: 2rem; }
    h3 { font-size: 1.125rem; margin-top: 1.5rem; }
    .muted { color: #9ca3af; }
    .badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; background: #0f172a; border: 1px solid #1f2937; margin-right: 0.5rem; }
    ul { padding-left: 1.25rem; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 0.875rem; }
    pre { background: #020617; border-radius: 0.5rem; padding: 1rem; border: 1px solid #1f2937; overflow-x: auto; }
    .card { border-radius: 0.75rem; border: 1px solid #1f2937; background: #020617; padding: 1.5rem; margin-top: 2rem; }
  </style>
</head>
<body>
  <main class="container">
    <header>
      <h1>Plugin Events &amp; Hooks</h1>
      <p class="muted">
        Complete reference of all plugin events and hooks available in FeatherPanel for extending functionality.
      </p>
      <div style="margin-top: 0.75rem;">
        <span class="badge">${categories.length} event categories</span>
        <span class="badge">${totalEvents} total events</span>
      </div>
    </header>

    <section>
      <h2>Event Categories</h2>
      <p class="muted">Click a category to see all events and their payloads.</p>
      <ul>
${categoryItems}
      </ul>
    </section>

    <section class="card">
      <h2>About Plugin Events</h2>
      <p class="muted">
        FeatherPanel uses an event-driven architecture that allows plugins to hook into system events and extend
        functionality without modifying core code. Events are emitted at key points in the application lifecycle and
        can be listened to by plugins.
      </p>

      <h3>Registering Event Listeners</h3>
      <p class="muted">
        In your plugin's main class, implement the <code>processEvents</code> method:
      </p>
      <pre><code>${exampleCode}</code></pre>

      <h3>Event Naming</h3>
      <p class="muted">
        Events follow a consistent naming pattern:
        <code>featherpanel:category:action</code>. Each event includes callback parameter information to help you
        understand what data is available.
      </p>
    </section>
  </main>
</body>
</html>
`;
}

function generateCategoryPage(category, events) {
    const headerTitle = `Events: ${category}`;

    const eventItems = events
        .map((event) => {
            const dataKeys =
                event.actualData && event.actualData.length > 0
                    ? event.actualData.join(', ')
                    : 'N/A';

            const sourceFiles =
                event.sourceFiles && event.sourceFiles.length > 0
                    ? event.sourceFiles.map((f) => `<li><code>${f}</code></li>`).join('\n')
                    : '<li class="muted">No known emission locations.</li>';

            let params = [];
            if (event.actualData && event.actualData.length > 0) {
                params = event.actualData.map((key) => {
                    const parts = key.split('_');
                    const camelCase =
                        parts[0] + parts.slice(1).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
                    return '$' + camelCase;
                });
            } else {
                params = event.callback.split(',').map((p) => {
                    const trimmed = p.trim();
                    const parts = trimmed.split(' ');
                    const paramName = parts.length > 0 ? parts[parts.length - 1].replace(/\.$/, '') : 'param';
                    return '$' + paramName;
                });
            }

            const exampleCode = [
                'use App\\Plugins\\PluginEvents;',
                `use App\\Plugins\\Events\\Events\\${category}Event;`,
                '',
                'public static function processEvents(PluginEvents $evt): void',
                '{',
                `    $evt->on(${category}Event::${event.method}(), function (${params.join(', ')}) {`,
                `        // Handle ${event.name}`,
                event.actualData && event.actualData.length > 0
                    ? `        // Data keys: ${event.actualData.join(', ')}`
                    : `        // Parameters: ${event.callback}`,
                '    });',
                '}',
            ].join('\n');

            return `<article class="card">
  <h2><code>${event.name}</code></h2>
  <p class="muted"><strong>Method:</strong> <code>${event.method}</code></p>
  <p class="muted"><strong>Callback parameters:</strong> ${event.callback}</p>

  <h3>Event Data</h3>
  <p class="muted"><strong>Data keys:</strong> ${dataKeys}</p>

  <h3>Emitted From</h3>
  <ul>
${sourceFiles}
  </ul>

  <h3>Usage Example</h3>
  <pre><code>${exampleCode}</code></pre>
</article>`;
        })
        .join('\n\n');

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${headerTitle}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 2rem; background: #020617; color: #e5e7eb; }
    a { color: #60a5fa; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .container { max-width: 960px; margin: 0 auto; }
    h1 { font-size: 2rem; margin-bottom: 0.25rem; }
    h2 { font-size: 1.25rem; margin: 0 0 0.25rem; }
    h3 { font-size: 1rem; margin-top: 1.25rem; }
    .muted { color: #9ca3af; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 0.875rem; }
    pre { background: #020617; border-radius: 0.5rem; padding: 1rem; border: 1px solid #1f2937; overflow-x: auto; }
    .card { border-radius: 0.75rem; border: 1px solid #1f2937; background: #020617; padding: 1.25rem 1.5rem; margin-top: 1.5rem; }
    .back-link { margin-bottom: 1.5rem; display: inline-block; }
  </style>
</head>
<body>
  <main class="container">
    <a href="/icanhasfeatherpanel/events/index.html" class="back-link">&larr; Back to all event categories</a>
    <header>
      <h1>${category}</h1>
      <p class="muted">${events.length} event${events.length !== 1 ? 's' : ''} in this category.</p>
    </header>

${eventItems}
  </main>
</body>
</html>
`;
}

// Ensure docs directories exist
if (!fs.existsSync(PUBLIC_DOCS_DIR)) {
    fs.mkdirSync(PUBLIC_DOCS_DIR, { recursive: true });
}
if (!fs.existsSync(EVENTS_DOCS_DIR)) {
    fs.mkdirSync(EVENTS_DOCS_DIR, { recursive: true });
}

console.log('Parsing plugin events...');
const { events, categories, grouped } = parseAllEvents();

// Generate main events page
const mainPagePath = path.join(EVENTS_DOCS_DIR, 'index.html');
const mainPage = generateMainEventsPage(categories, events.length);
fs.writeFileSync(mainPagePath, mainPage);
console.log(`✓ Main events page: ${mainPagePath}`);

// Generate category pages
categories.forEach(category => {
    const sanitized = sanitizeCategory(category);
    const categoryPagePath = path.join(EVENTS_DOCS_DIR, `${sanitized}.html`);
    const categoryPage = generateCategoryPage(category, grouped[category]);
    fs.writeFileSync(categoryPagePath, categoryPage);
    console.log(`✓ Category page: ${categoryPagePath} (${grouped[category].length} events)`);
});

console.log(`\n✅ Plugin events documentation generated successfully!`);
console.log(`   - Main page: /icanhasfeatherpanel/events`);
console.log(`   - ${categories.length} category pages`);
console.log(`   - ${events.length} total events`);
