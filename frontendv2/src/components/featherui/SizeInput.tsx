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

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { formatSizeInput, parseSizeInput, type SizeDisplayUnit, type SizeUnit } from '@/lib/size-input';

const DISPLAY_UNITS: SizeDisplayUnit[] = ['MB', 'GB', 'TB'];

interface SizeInputProps {
    value: number | '';
    onValueChange: (value: number | '') => void;
    unit: SizeUnit;
    ariaLabel: string;
    min?: number;
    max?: number;
    allowEmpty?: boolean;
    onValidityChange?: (valid: boolean) => void;
    resetKey?: number;
}

export function SizeInput({
    value,
    onValueChange,
    unit,
    ariaLabel,
    min = 0,
    max,
    allowEmpty = false,
    onValidityChange,
    resetKey,
}: SizeInputProps) {
    const { t } = useTranslation();
    const [displayUnit, setDisplayUnit] = useState<SizeDisplayUnit>(unit.startsWith('G') ? 'GB' : 'MB');
    const [draft, setDraft] = useState(String(value));
    const [touched, setTouched] = useState(false);
    const focused = useRef(false);

    useEffect(() => {
        if (!focused.current) {
            setDraft(formatSizeInput(value, unit, displayUnit));
            setTouched(false);
        }
    }, [value, resetKey, displayUnit, unit]);

    const parsed = draft.trim() ? parseSizeInput(draft, unit, displayUnit) : null;
    const valid = draft.trim()
        ? parsed !== null && parsed.value >= min && (max === undefined || parsed.value <= max)
        : allowEmpty;
    const showError = touched && !valid;

    const handleChange = (raw: string) => {
        setDraft(raw);
        setTouched(true);
        const next = raw.trim() ? parseSizeInput(raw, unit, displayUnit) : null;
        const nextValid = raw.trim()
            ? next !== null && next.value >= min && (max === undefined || next.value <= max)
            : allowEmpty;
        onValidityChange?.(nextValid);
        if (nextValid && next) onValueChange(next.value);
        else if (!raw.trim() && allowEmpty) onValueChange('');
    };

    const errorMessage =
        showError && parsed && parsed.value < min
            ? t('common.sizeInput.min', { value: String(min), unit })
            : showError && parsed && max !== undefined && parsed.value > max
              ? t('common.sizeInput.max', { value: String(max), unit })
              : showError
                ? t('common.sizeInput.invalid')
                : undefined;

    return (
        <div className='space-y-1.5'>
            <div
                className={cn(
                    'border-border/50 bg-muted/30 focus-within:border-primary focus-within:ring-primary/20 hover:border-border flex h-12 w-full min-w-0 items-center rounded-xl border p-1 shadow-sm transition-all focus-within:ring-4',
                    showError && 'border-destructive focus-within:border-destructive focus-within:ring-destructive/20',
                )}
            >
                <input
                    type='text'
                    autoComplete='off'
                    value={draft}
                    onChange={(event) => handleChange(event.target.value)}
                    onFocus={() => {
                        focused.current = true;
                    }}
                    onBlur={() => {
                        focused.current = false;
                        if (valid && parsed) setDraft(formatSizeInput(parsed.value, unit, displayUnit));
                    }}
                    aria-label={ariaLabel}
                    aria-invalid={showError || undefined}
                    placeholder={t(
                        displayUnit === 'MB'
                            ? 'common.sizeInput.placeholderMb'
                            : displayUnit === 'GB'
                              ? 'common.sizeInput.placeholderGb'
                              : 'common.sizeInput.placeholderTb',
                    )}
                    className='placeholder:text-muted-foreground/50 text-foreground h-full min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold outline-none'
                />
                <div
                    role='group'
                    aria-label={t('common.sizeInput.selectUnit', { field: ariaLabel })}
                    className='border-border/50 bg-background/70 flex shrink-0 items-center gap-0.5 rounded-lg border p-0.5'
                >
                    {DISPLAY_UNITS.map((choice) => (
                        <button
                            key={choice}
                            type='button'
                            aria-pressed={displayUnit === choice}
                            onClick={() => {
                                const currentValue = valid && parsed ? parsed.value : value;
                                setDisplayUnit(choice);
                                setDraft(formatSizeInput(currentValue, unit, choice));
                                setTouched(false);
                                const nextValid =
                                    currentValue === ''
                                        ? allowEmpty
                                        : currentValue >= min && (max === undefined || currentValue <= max);
                                onValidityChange?.(nextValid);
                            }}
                            className={cn(
                                'focus-visible:ring-primary h-8 min-w-9 cursor-pointer rounded-md px-2 text-[11px] font-bold transition-colors focus-visible:ring-2 focus-visible:outline-none',
                                displayUnit === choice
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                            )}
                        >
                            {choice}
                        </button>
                    ))}
                </div>
            </div>
            {errorMessage ? (
                <p className='text-destructive text-xs' role='alert'>
                    {errorMessage}
                </p>
            ) : parsed && touched && (parsed.hasUnit || displayUnit !== (unit.startsWith('G') ? 'GB' : 'MB')) ? (
                <p className='text-muted-foreground text-xs'>
                    {t(parsed.roundedUp ? 'common.sizeInput.convertedRounded' : 'common.sizeInput.converted', {
                        value: parsed.value.toLocaleString('en-US'),
                        unit,
                    })}
                </p>
            ) : null}
        </div>
    );
}
