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

'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
    steps: {
        title: string;
        subtitle: string;
    }[];
    currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
    return (
        <div className='w-full'>
            <div className='flex items-center justify-between'>
                {steps.map((step, index) => {
                    const stepNumber = index + 1;
                    const isActive = stepNumber === currentStep;
                    const isCompleted = stepNumber < currentStep;
                    const isLast = index === steps.length - 1;

                    return (
                        <div key={index} className='flex flex-1 items-center'>
                            <div className='flex flex-col items-center'>
                                <div
                                    className={cn(
                                        'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                                        isCompleted && 'border-primary bg-primary text-white',
                                        isActive && 'border-primary bg-background text-primary',
                                        !isActive && !isCompleted && 'border-border bg-muted text-muted-foreground',
                                    )}
                                >
                                    {isCompleted ? (
                                        <Check className='h-5 w-5' />
                                    ) : (
                                        <span className='text-sm font-semibold'>{stepNumber}</span>
                                    )}
                                </div>

                                <div className='mt-2 hidden max-w-[120px] flex-col items-center text-center lg:flex'>
                                    <span
                                        className={cn(
                                            'text-sm font-medium',
                                            isActive ? 'text-primary' : 'text-muted-foreground',
                                        )}
                                    >
                                        {step.title}
                                    </span>
                                    <span className='text-muted-foreground mt-0.5 text-xs'>{step.subtitle}</span>
                                </div>
                            </div>

                            {!isLast && (
                                <div
                                    className={cn(
                                        'mx-2 h-0.5 flex-1 transition-all',
                                        isCompleted ? 'bg-primary' : 'bg-border',
                                    )}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            <div className='mt-4 text-center lg:hidden'>
                <h3 className='text-primary text-base font-semibold'>{steps[currentStep - 1].title}</h3>
                <p className='text-muted-foreground mt-1 text-sm'>{steps[currentStep - 1].subtitle}</p>
            </div>
        </div>
    );
}
