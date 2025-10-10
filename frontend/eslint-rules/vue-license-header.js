import fs from 'fs';
import path from 'path';

const licenseHeader = fs.readFileSync(path.join(process.cwd(), '.license-header-vue'), 'utf8').trim();

export default {
    meta: {
        type: 'layout',
        docs: {
            description: 'Enforce license header in Vue files',
            category: 'Stylistic Issues',
        },
        fixable: 'whitespace',
        schema: [],
    },
    create(context) {
        const sourceCode = context.sourceCode || context.getSourceCode();

        return {
            Program(node) {
                // Get the filename
                const filename = context.filename || context.getFilename();

                // Only process .vue files
                if (!filename.endsWith('.vue')) {
                    return;
                }

                // Get the source code text
                const text = sourceCode.getText();

                // Check if license header already exists anywhere in the file
                if (text.includes('MIT License') && text.includes('MythicalSystems')) {
                    return;
                }

                // Get the first token
                const firstToken = sourceCode.getFirstToken(node);
                if (!firstToken) {
                    return;
                }

                context.report({
                    node,
                    loc: { line: 1, column: 0 },
                    message: 'Missing license header',
                    fix(fixer) {
                        return fixer.insertTextBefore(firstToken, licenseHeader + '\n\n');
                    },
                });
            },
        };
    },
};
