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
                        <div key={index} className='flex items-center flex-1'>
                            {/* Step Circle */}
                            <div className='flex flex-col items-center'>
                                <div
                                    className={cn(
                                        'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
                                        isCompleted && 'border-primary bg-primary text-white',
                                        isActive && 'border-primary bg-background text-primary ring-4 ring-primary/20',
                                        !isActive && !isCompleted && 'border-border bg-muted text-muted-foreground',
                                    )}
                                >
                                    {isCompleted ? (
                                        <Check className='h-5 w-5' />
                                    ) : (
                                        <span className='text-sm font-semibold'>{stepNumber}</span>
                                    )}
                                </div>

                                {/* Step Title - Only on larger screens */}
                                <div className='hidden lg:flex flex-col items-center mt-2 text-center max-w-[120px]'>
                                    <span
                                        className={cn(
                                            'text-sm font-medium',
                                            isActive ? 'text-primary' : 'text-muted-foreground',
                                        )}
                                    >
                                        {step.title}
                                    </span>
                                    <span className='text-xs text-muted-foreground mt-0.5'>{step.subtitle}</span>
                                </div>
                            </div>

                            {/* Connector Line */}
                            {!isLast && (
                                <div
                                    className={cn(
                                        'flex-1 h-0.5 mx-2 transition-all',
                                        isCompleted ? 'bg-primary' : 'bg-border',
                                    )}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Mobile Step Title */}
            <div className='lg:hidden mt-4 text-center'>
                <h3 className='text-base font-semibold text-primary'>{steps[currentStep - 1].title}</h3>
                <p className='text-sm text-muted-foreground mt-1'>{steps[currentStep - 1].subtitle}</p>
            </div>
        </div>
    );
}
