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

import * as React from 'react';
import { cn } from '@/lib/utils';

const Alert = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'destructive' | 'warning' }
>(({ className, variant = 'default', ...props }, ref) => (
    <div
        ref={ref}
        role='alert'
        className={cn(
            'relative w-full rounded-xl border p-4 [&>svg]:absolute [&>svg]:top-4 [&>svg]:left-4 [&>svg+div]:translate-y-[-3px] [&>svg~*]:pl-7',
            variant === 'default' && 'fp-surface text-foreground [&>svg]:text-primary',
            variant === 'destructive' &&
                'text-foreground border-red-500/25 bg-red-500/[0.06] [&_h5]:text-red-500 [&>svg]:text-red-500',
            variant === 'warning' &&
                'text-foreground border-amber-500/25 bg-amber-500/[0.06] [&_h5]:text-amber-500 [&>svg]:text-amber-500',
            className,
        )}
        {...props}
    />
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h5 ref={ref} className={cn('mb-1 leading-none font-medium tracking-tight', className)} {...props} />
    ),
);
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('text-sm opacity-90 [&_p]:leading-relaxed', className)} {...props} />
    ),
);
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
