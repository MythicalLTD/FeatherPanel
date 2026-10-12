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

import { useEffect, useRef } from 'react';

export const SAVE_SHORTCUT_ATTR = 'data-fp-save-shortcut';

export type SaveShortcutOptions = {
    /** When false, the shortcut is not registered. Default true. */
    enabled?: boolean;
    /** When true, Ctrl/Cmd+S is still captured (browser save blocked) but onSave is not called. */
    disabled?: boolean;
    /**
     * Use capture phase and stop other save handlers when onSave returns true.
     * Prefer this for open sheets/dialogs so they win over page-level saves.
     */
    capture?: boolean;
};

/**
 * Bind Ctrl+S (Windows/Linux) or Cmd+S (macOS) to a save/submit action.
 * Works while focus is in inputs/textareas so form editing can save immediately.
 *
 * Return `true` from onSave (with `capture: true`) to claim the shortcut and
 * prevent other save handlers from also firing.
 */
export function useSaveShortcut(onSave: () => void | boolean, options: SaveShortcutOptions = {}) {
    const { enabled = true, disabled = false, capture = false } = options;
    const onSaveRef = useRef(onSave);
    const disabledRef = useRef(disabled);

    useEffect(() => {
        onSaveRef.current = onSave;
    }, [onSave]);

    useEffect(() => {
        disabledRef.current = disabled;
    }, [disabled]);

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
            if (event.key.toLowerCase() !== 's') return;

            // Always prevent the browser "Save page" dialog while the shortcut is active.
            event.preventDefault();

            if (event.repeat || disabledRef.current) return;

            const claimed = onSaveRef.current() === true;
            if (capture && claimed) {
                event.stopImmediatePropagation();
            }
        };

        window.addEventListener('keydown', handleKeyDown, capture);
        return () => window.removeEventListener('keydown', handleKeyDown, capture);
    }, [enabled, capture]);
}

/** True on Apple platforms where Cmd is the primary modifier. */
export function isAppleModifierPlatform(): boolean {
    if (typeof navigator === 'undefined') return false;
    const platform = navigator.platform || '';
    const ua = navigator.userAgent || '';
    return /Mac|iPhone|iPad|iPod/i.test(platform) || /Mac OS X/.test(ua);
}

/** Human-readable save shortcut label (⌘S or Ctrl+S). */
export function getSaveShortcutLabel(): string {
    return isAppleModifierPlatform() ? '⌘S' : 'Ctrl+S';
}

function isVisible(el: Element): boolean {
    if (!(el instanceof HTMLElement)) return false;
    if (el.hidden || el.getAttribute('aria-hidden') === 'true') return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
}

function submitForm(form: HTMLFormElement): boolean {
    if (!isVisible(form)) return false;

    const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"], input[type="submit"]');
    if (submitButton?.disabled) return false;

    if (submitButton) {
        form.requestSubmit(submitButton);
    } else {
        form.requestSubmit();
    }
    return true;
}

function clickSaveButton(button: HTMLButtonElement | HTMLInputElement): boolean {
    if (!isVisible(button)) return false;
    if (button.disabled) return false;
    button.click();
    return true;
}

/**
 * Submit an opted-in form inside a container (`form[data-fp-save-shortcut]`).
 * Skips when the primary submit button is disabled/loading.
 */
export function requestSaveShortcutSubmit(root: ParentNode | null | undefined): boolean {
    if (!root) return false;

    const form = root.querySelector<HTMLFormElement>(`form[${SAVE_SHORTCUT_ATTR}]`);
    if (!form) return false;

    return submitForm(form);
}

/**
 * Resolve and trigger the best save target currently on screen:
 * 1) form containing the focused element
 * 2) form inside an open dialog/sheet overlay
 * 3) first visible page form with data-fp-save-shortcut
 * 4) button with data-fp-save-shortcut (page-header saves, etc.)
 */
export function triggerSaveShortcutTarget(root?: ParentNode | Document | null): boolean {
    const scope: ParentNode | Document = root ?? document;

    const active = document.activeElement;
    if (active instanceof HTMLElement) {
        const focusedForm = active.closest<HTMLFormElement>(`form[${SAVE_SHORTCUT_ATTR}]`);
        if (focusedForm && (scope === document || scope.contains(focusedForm)) && submitForm(focusedForm)) {
            return true;
        }

        const focusedButton = active.closest<HTMLButtonElement>(
            `button[${SAVE_SHORTCUT_ATTR}], input[${SAVE_SHORTCUT_ATTR}]`,
        );
        if (focusedButton && (scope === document || scope.contains(focusedButton)) && clickSaveButton(focusedButton)) {
            return true;
        }
    }

    if (scope === document) {
        const overlayRoots = document.querySelectorAll<HTMLElement>(
            '[data-headlessui-state*="open"], [role="dialog"][aria-modal="true"]',
        );
        for (const overlay of overlayRoots) {
            if (!isVisible(overlay)) continue;
            const form = overlay.querySelector<HTMLFormElement>(`form[${SAVE_SHORTCUT_ATTR}]`);
            if (form && submitForm(form)) return true;
            const button = overlay.querySelector<HTMLButtonElement>(`button[${SAVE_SHORTCUT_ATTR}]`);
            if (button && clickSaveButton(button)) return true;
        }
    }

    const forms = scope.querySelectorAll<HTMLFormElement>(`form[${SAVE_SHORTCUT_ATTR}]`);
    for (const form of forms) {
        if (submitForm(form)) return true;
    }

    const buttons = scope.querySelectorAll<HTMLButtonElement>(
        `button[${SAVE_SHORTCUT_ATTR}], input[${SAVE_SHORTCUT_ATTR}]`,
    );
    for (const button of buttons) {
        if (clickSaveButton(button)) return true;
    }

    return false;
}
