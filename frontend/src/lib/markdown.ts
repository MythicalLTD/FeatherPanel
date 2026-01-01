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

import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure marked with better defaults
marked.setOptions({
    breaks: true,
    gfm: true,
});

/**
 * Render markdown or HTML text with proper sanitization and spacing preservation.
 *
 * @param text - The markdown or HTML text to render
 * @param mode - 'markdown' or 'html' - if not provided, will auto-detect
 * @returns Sanitized HTML string
 */
export function renderMarkdown(text: string, mode?: 'markdown' | 'html'): string {
    if (!text) return '';

    try {
        // Don't trim - preserve leading/trailing whitespace
        let originalText = text;

        // Auto-detect mode if not provided
        let isHtml = mode === 'html';
        if (!mode) {
            // More accurate HTML detection - check for actual HTML tags, not just <
            isHtml = /<[a-z][\s\S]*>/i.test(originalText) && !originalText.trim().startsWith('#');
        }

        if (isHtml) {
            // It's HTML, sanitize it directly
            let sanitized = DOMPurify.sanitize(originalText, {
                ALLOWED_TAGS: [
                    'p',
                    'br',
                    'hr',
                    'strong',
                    'em',
                    'u',
                    's',
                    'b',
                    'i',
                    'small',
                    'sub',
                    'sup',
                    'h1',
                    'h2',
                    'h3',
                    'h4',
                    'h5',
                    'h6',
                    'ul',
                    'ol',
                    'li',
                    'dl',
                    'dt',
                    'dd',
                    'a',
                    'img',
                    'figure',
                    'figcaption',
                    'code',
                    'pre',
                    'blockquote',
                    'cite',
                    'div',
                    'span',
                    'section',
                    'article',
                    'table',
                    'thead',
                    'tbody',
                    'tfoot',
                    'tr',
                    'th',
                    'td',
                ],
                ALLOWED_ATTR: [
                    'href',
                    'src',
                    'alt',
                    'title',
                    'class',
                    'style',
                    'id',
                    'width',
                    'height',
                    'target',
                    'rel',
                ],
                KEEP_CONTENT: true,
            });

            // Preserve line breaks
            sanitized = sanitized.replace(/\n/g, '<br>');

            // Ensure paragraphs have proper spacing
            sanitized = sanitized.replace(/<p>/g, '<p style="margin-bottom: 1rem; margin-top: 0; line-height: 1.8;">');
            sanitized = sanitized.replace(/<p>\s*<\/p>/g, '<br>');

            return sanitized;
        } else {
            // It's Markdown, parse it with better spacing handling
            // First, normalize line endings
            originalText = originalText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

            // Preserve double line breaks (paragraphs)
            // Convert triple+ line breaks to double
            originalText = originalText.replace(/\n{3,}/g, '\n\n');

            // Parse markdown
            const html = marked.parse(originalText) as string;

            let sanitized = DOMPurify.sanitize(html, {
                ALLOWED_TAGS: [
                    'p',
                    'br',
                    'hr',
                    'strong',
                    'em',
                    'u',
                    's',
                    'b',
                    'i',
                    'small',
                    'sub',
                    'sup',
                    'h1',
                    'h2',
                    'h3',
                    'h4',
                    'h5',
                    'h6',
                    'ul',
                    'ol',
                    'li',
                    'dl',
                    'dt',
                    'dd',
                    'a',
                    'img',
                    'figure',
                    'figcaption',
                    'code',
                    'pre',
                    'blockquote',
                    'cite',
                    'div',
                    'span',
                    'section',
                    'article',
                    'table',
                    'thead',
                    'tbody',
                    'tfoot',
                    'tr',
                    'th',
                    'td',
                ],
                ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'width', 'height', 'target', 'rel'],
                KEEP_CONTENT: true,
            });

            // Fix paragraph spacing - ensure consistent margins
            sanitized = sanitized.replace(/<p>/g, '<p style="margin-bottom: 1rem; margin-top: 0; line-height: 1.8;">');

            // Handle empty paragraphs - convert to breaks for visible spacing
            sanitized = sanitized.replace(/<p>\s*<\/p>/gi, '<br>');

            // Fix headings spacing
            sanitized = sanitized.replace(/<h([1-6])>/g, '<h$1 style="margin-top: 1.5rem; margin-bottom: 0.75rem;">');

            // Fix list spacing
            sanitized = sanitized.replace(/<ul>/g, '<ul style="margin-bottom: 1rem; margin-top: 0;">');
            sanitized = sanitized.replace(/<ol>/g, '<ol style="margin-bottom: 1rem; margin-top: 0;">');
            sanitized = sanitized.replace(/<li>/g, '<li style="margin-bottom: 0.25rem;">');

            // Fix code blocks
            sanitized = sanitized.replace(/<pre>/g, '<pre style="margin-bottom: 1rem; margin-top: 0;">');
            sanitized = sanitized.replace(/<blockquote>/g, '<blockquote style="margin-bottom: 1rem; margin-top: 0;">');

            // Remove extra breaks at the start/end
            sanitized = sanitized.replace(/^(<br\s*\/?>)+/i, '').replace(/(<br\s*\/?>)+$/i, '');

            return sanitized;
        }
    } catch (e) {
        console.error('Markdown rendering error:', e);
        return DOMPurify.sanitize(text);
    }
}
