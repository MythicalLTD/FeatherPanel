import type { Updater } from '@tanstack/vue-table';
import type { ClassValue } from 'clsx';

import type { Ref } from 'vue';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function valueUpdater<T extends Updater<unknown>>(updaterOrValue: T, ref: Ref<unknown>) {
    ref.value = typeof updaterOrValue === 'function' ? updaterOrValue(ref.value) : updaterOrValue;
}
