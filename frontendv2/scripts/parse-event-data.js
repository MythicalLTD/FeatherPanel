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

const CONTROLLERS_DIR = path.join(__dirname, '../../backend/app/Controllers');

function getFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    const fileList = fs.readdirSync(dir);
    for (const file of fileList) {
        const name = path.join(dir, file);
        if (fs.statSync(name).isDirectory()) {
            getFiles(name, files);
        } else if (name.endsWith('.php')) {
            files.push(name);
        }
    }
    return files;
}

function parseEventEmissions(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const events = [];
    
    // Match eventManager->emit patterns
    // Pattern: $eventManager->emit(EventClass::method(), [array data]);
    const emitRegex = /eventManager\s*->\s*emit\s*\(\s*([A-Za-z0-9_\\]+)::(\w+)\(\)\s*,\s*\[(.*?)\]\s*\)/gs;
    
    let match;
    while ((match = emitRegex.exec(content)) !== null) {
        const [, eventClass, method, dataArray] = match;
        
        // Extract the category from class name (e.g., ServerAllocationEvent -> ServerAllocation)
        const category = eventClass.replace(/.*\\([A-Za-z]+)Event$/, '$1');
        
        // Parse the data array to extract keys
        const dataKeys = [];
        const keyRegex = /['"]([^'"]+)['"]\s*=>/g;
        let keyMatch;
        while ((keyMatch = keyRegex.exec(dataArray)) !== null) {
            dataKeys.push(keyMatch[1]);
        }
        
        // Build event name from method (e.g., onServerAllocationDeleted -> featherpanel:server:allocation:delete)
        const eventName = method
            .replace(/^on/, '')
            .replace(/([A-Z])/g, ':$1')
            .toLowerCase()
            .replace(/^:/, 'featherpanel:');
        
        events.push({
            category,
            method,
            eventName,
            dataKeys: [...new Set(dataKeys)], // Remove duplicates
            file: path.relative(path.join(__dirname, '../..'), filePath)
        });
    }
    
    return events;
}

function parseAllEventEmissions() {
    const files = getFiles(CONTROLLERS_DIR);
    const allEvents = [];
    const eventMap = new Map(); // Map event name to data keys
    
    files.forEach(file => {
        const events = parseEventEmissions(file);
        events.forEach(event => {
            // Use the event name from the Event class (more reliable)
            // For now, we'll match by method name
            const key = `${event.category}::${event.method}`;
            if (!eventMap.has(key)) {
                eventMap.set(key, []);
            }
            eventMap.get(key).push({
                dataKeys: event.dataKeys,
                file: event.file
            });
        });
        allEvents.push(...events);
    });
    
    // Merge data keys for same events
    const merged = new Map();
    eventMap.forEach((occurrences, key) => {
        const allKeys = new Set();
        occurrences.forEach(occ => {
            occ.dataKeys.forEach(k => allKeys.add(k));
        });
        merged.set(key, Array.from(allKeys).sort());
    });
    
    return merged;
}

// Export for use in other scripts
export { parseAllEventEmissions, parseEventEmissions };

// If run directly, output results
if (import.meta.url === `file://${process.argv[1]}`) {
    const results = parseAllEventEmissions();
    console.log(JSON.stringify(Object.fromEntries(results), null, 2));
}
