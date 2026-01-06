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
          text.includes("MIT" + " License") &&
          text.includes("Mythical" + "Systems")
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
