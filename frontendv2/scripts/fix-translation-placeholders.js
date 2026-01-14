
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
