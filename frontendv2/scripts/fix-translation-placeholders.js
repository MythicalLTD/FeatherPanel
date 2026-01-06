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

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALE_FILE = path.join(__dirname, "../public/locales/en.json");

function fixPlaceholders() {
  console.log("Fixing translation placeholders...\n");

  if (!fs.existsSync(LOCALE_FILE)) {
    console.error(`Error: Locale file not found at ${LOCALE_FILE}`);
    process.exit(1);
  }

  let content = fs.readFileSync(LOCALE_FILE, "utf8");

  // Regex to find {{ param }} or {{param}} and replace with {param}
  // We capture the inner content and wrap it in single braces.
  const regex = /\{\{\s*([^}]+?)\s*\}\}/g;

  let count = 0;
  const newContent = content.replace(regex, (match, param) => {
    count++;
    return `{${param}}`;
  });

  if (count > 0) {
    fs.writeFileSync(LOCALE_FILE, newContent, "utf8");
    console.log(`✓ Fixed ${count} placeholders in ${LOCALE_FILE}`);
  } else {
    console.log(`✓ No placeholders needed fixing.`);
  }
}

fixPlaceholders();
