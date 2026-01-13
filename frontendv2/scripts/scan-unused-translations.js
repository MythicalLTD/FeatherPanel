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

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, "../src");
const LOCALE_FILE = path.join(__dirname, "../public/locales/en.json");

// Helper to flatten object keys
function flattenKeys(obj, prefix = "") {
  let keys = [];
  for (const key in obj) {
    if (typeof obj[key] === "object" && obj[key] !== null) {
      keys = keys.concat(flattenKeys(obj[key], prefix + key + "."));
    } else {
      keys.push(prefix + key);
    }
  }
  return keys;
}

// Recursively find all .ts and .tsx files
function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getFiles(filePath, fileList);
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function scan() {
  console.log("Scanning for unused translations...\n");

  // 1. Load defined keys
  if (!fs.existsSync(LOCALE_FILE)) {
    console.error(`Error: Locale file not found at ${LOCALE_FILE}`);
    process.exit(1);
  }

  const localeContent = JSON.parse(fs.readFileSync(LOCALE_FILE, "utf8"));
  const definedKeys = new Set(flattenKeys(localeContent));
  console.log(`✓ Loaded locale file with ${definedKeys.size} keys.`);

  // 2. Scan source files for usage
  const files = getFiles(SRC_DIR);
  console.log(`✓ Found ${files.length} source files to scan.`);

  const usedKeys = new Set();
  const dynamicPrefixes = new Set();

  // Regex for exact static matches: t('key') or t("key")
  // Note: removed \) at the end to support arguments like t('key', { ... })
  const regexStatic = /t\(['"]([a-zA-Z0-9_.-]+)['"]/g;

  // Regex for template literals: t(`prefix.${var}`)
  // Captures the prefix before the ${
  const regexTemplate = /t\(`([a-zA-Z0-9_.-]+)\$\{/g;

  // Regex for string concatenation: t('prefix.' + var)
  // Captures the prefix before the quote closure and +
  const regexConcat = /t\(['"]([a-zA-Z0-9_.-]+)['"]\s*\+/g;

  files.forEach((file) => {
    const content = fs.readFileSync(file, "utf8");

    // Find static keys
    let match;
    while ((match = regexStatic.exec(content)) !== null) {
      usedKeys.add(match[1]);
    }

    // Find dynamic prefixes (Template literals)
    while ((match = regexTemplate.exec(content)) !== null) {
      dynamicPrefixes.add(match[1]);
    }

    // Find dynamic prefixes (Concatenation)
    while ((match = regexConcat.exec(content)) !== null) {
      dynamicPrefixes.add(match[1]);
    }
  });

  console.log(`✓ Found ${usedKeys.size} unique static keys used in code.`);
  if (dynamicPrefixes.size > 0) {
    console.log(`✓ Found ${dynamicPrefixes.size} dynamic prefixes:`);
    dynamicPrefixes.forEach((p) => console.log(`  - ${p}*`));
  }

  // 3. Find unused keys
  const unusedKeys = [];
  definedKeys.forEach((key) => {
    // Check if explicitly used
    if (usedKeys.has(key)) return;

    // Check if matches any dynamic prefix
    for (const prefix of dynamicPrefixes) {
      if (key.startsWith(prefix)) return;
    }

    unusedKeys.push(key);
  });

  // 4. Report or Purge
  const shouldPurge = process.argv.includes("--purge");

  if (unusedKeys.length > 0) {
    if (shouldPurge) {
      console.log(`\nPurging ${unusedKeys.length} unused translation keys...`);
      let purgedCount = 0;

      unusedKeys.forEach((key) => {
        const parts = key.split(".");
        let current = localeContent;
        let valid = true;

        // Navigate to the parent object
        for (let i = 0; i < parts.length - 1; i++) {
          if (current[parts[i]] === undefined) {
            valid = false;
            break;
          }
          current = current[parts[i]];
        }

        if (valid && current[parts[parts.length - 1]] !== undefined) {
          delete current[parts[parts.length - 1]];
          purgedCount++;
        }
      });

      // Write back to file
      fs.writeFileSync(
        LOCALE_FILE,
        JSON.stringify(localeContent, null, 4),
        "utf8"
      ); // 4 space indent per original file (usually)
      console.log(
        `\n✓ Successfully purged ${purgedCount} keys from ${LOCALE_FILE}`
      );
    } else {
      console.log(
        `\nFound ${unusedKeys.length} potentially unused translation keys:\n`
      );
      unusedKeys.sort().forEach((key) => {
        console.log(`  - ${key}`);
      });
      console.log(
        `\nNote: Some keys might be constructed dynamically or used in backend/other places.`
      );
      console.log(`\nRun with --purge to remove these keys automatically:`);
      console.log(`  npm run scan:translations:unused -- --purge`);
    }
  } else {
    console.log("\nSuccess! No unused translations found.");
  }
}

scan();
