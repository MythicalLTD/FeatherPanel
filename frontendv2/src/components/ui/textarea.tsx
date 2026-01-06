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

import { Field, Label, Textarea as HeadlessTextarea, Description } from '@headlessui/react';
import { forwardRef } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    description?: string;
    error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className = '', label, description, error, ...props }, ref) => {
        return (
            <Field>
                {label && <Label className='block text-sm font-semibold text-foreground mb-2'>{label}</Label>}
                {description && <Description className='text-sm text-muted-foreground mb-2'>{description}</Description>}
                <HeadlessTextarea
                    className={`
            flex min-h-[120px] w-full rounded-xl border bg-muted/30 px-4 py-3 text-sm
            transition-all duration-200 font-semibold
            ${
                error
                    ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                    : 'border-border/50 focus:border-primary focus:ring-primary/20 hover:border-border'
            }
            focus:outline-none focus:ring-4
            disabled:cursor-not-allowed disabled:opacity-50
            placeholder:text-muted-foreground/50
            shadow-sm hover:shadow-md focus:shadow-lg
            ${className}
          `}
                    ref={ref}
                    {...props}
                />
                {error && (
                    <Description className='text-sm text-destructive mt-2 flex items-center gap-1 animate-fade-in'>
                        <svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                            <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                            />
                        </svg>
                        {error}
                    </Description>
                )}
            </Field>
        );
    },
);
Textarea.displayName = 'Textarea';

export { Textarea, Field, Label };
