/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>
*/

import fs from "fs";
import path from "path";

const licenseHeader = fs
  .readFileSync(path.join(process.cwd(), ".license-header"), "utf8")
  .trim();

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  meta: {
    type: "layout",
    docs: {
      description: "Enforce license header in source files",
      category: "Stylistic Issues",
    },
    fixable: "whitespace",
    schema: [],
  },
  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();

    return {
      Program(node) {
        // Get the filename
        const filename = context.filename || context.getFilename();

        // Only process specific extensions
        if (!/\.(js|mjs|cjs|ts|tsx|jsx)$/.test(filename)) {
          return;
        }

        // Get the source code text
        const text = sourceCode.getText();

        // Check if license header already exists anywhere in the file
        // We check for key phrases to avoid duplicates if the header is slightly different or reformatted
        // Split strings to avoid matching this rule file itself
        if (
          text.includes("This file is part of FeatherPanel") &&
          text.includes("GNU Affero General Public License")
        ) {
          return;
        }

        // Get the first token
        const firstToken = sourceCode.getFirstToken(node);
        // If the file is empty, we still want to add the header?
        // Mostly yes, but if there are no tokens, insert at start.

        context.report({
          node,
          loc: { line: 1, column: 0 },
          message: "Missing license header",
          fix(fixer) {
            if (firstToken) {
              return fixer.insertTextBefore(firstToken, licenseHeader + "\n\n");
            } else {
              return fixer.insertTextAfterRange([0, 0], licenseHeader + "\n");
            }
          },
        });
      },
    };
  },
};
