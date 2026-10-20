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

/**
 * macOS-inspired genie minimize: FLIP the live window toward its dock icon while
 * morphing a clip-path funnel into the dock. Uses Web Animations API (60fps via
 * compositor when possible). No-ops when the user prefers reduced motion.
 */

export interface GenieRects {
    from: DOMRect;
    to: DOMRect;
}

function prefersReduced(): boolean {
    if (typeof window === 'undefined') return true;
    const root = document.querySelector('.fos-root');
    if (root?.getAttribute('data-fos-motion') === 'reduced') return true;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Duration scaled by --fos-speed on .fos-root (default 480ms). */
function durationMs(): number {
    const root = document.querySelector('.fos-root') as HTMLElement | null;
    const speed =
        Number(
            root?.style.getPropertyValue('--fos-speed') ||
                getComputedStyle(root || document.documentElement).getPropertyValue('--fos-speed') ||
                '1',
        ) || 1;
    return Math.max(180, Math.round(480 / speed));
}

/**
 * Find the dock icon that best matches this app (pinned app or minimized window slot).
 */
export function findDockTargetRect(appId: string, windowId?: string): DOMRect | null {
    if (typeof document === 'undefined') return null;
    const byWindow = windowId
        ? (document.querySelector(`[data-fos-dock-window="${CSS.escape(windowId)}"]`) as HTMLElement | null)
        : null;
    const byApp = document.querySelector(`[data-fos-dock-app="${CSS.escape(appId)}"]`) as HTMLElement | null;
    const el = byWindow ?? byApp ?? (document.querySelector('[data-fos-dock-trash]') as HTMLElement | null);
    return el?.getBoundingClientRect() ?? null;
}

/**
 * Animate `el` genie-style into `to`. Resolves when finished (or immediately if reduced).
 * Temporarily sets pointer-events:none; caller should hide/minimize the real window after.
 */
export async function playGenieMinimize(el: HTMLElement, to: DOMRect | null): Promise<void> {
    if (prefersReduced() || !to) return;

    const from = el.getBoundingClientRect();
    if (from.width < 2 || from.height < 2) return;

    const clone = el.cloneNode(true) as HTMLElement;
    clone.removeAttribute('data-minimized');
    clone.style.position = 'fixed';
    clone.style.left = `${from.left}px`;
    clone.style.top = `${from.top}px`;
    clone.style.width = `${from.width}px`;
    clone.style.height = `${from.height}px`;
    clone.style.margin = '0';
    clone.style.zIndex = '10000';
    clone.style.pointerEvents = 'none';
    clone.style.transformOrigin = '50% 100%';
    clone.style.willChange = 'transform, opacity, clip-path, border-radius, filter';
    clone.style.overflow = 'hidden';
    document.body.appendChild(clone);

    // Hide the live window for the duration so only the clone is visible.
    const prevVisibility = el.style.visibility;
    el.style.visibility = 'hidden';

    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const sx = Math.max(0.04, to.width / from.width);
    const sy = Math.max(0.04, to.height / from.height);
    const ms = durationMs();

    try {
        const anim = clone.animate(
            [
                {
                    offset: 0,
                    transform: 'translate(0px, 0px) scale(1, 1)',
                    opacity: 1,
                    borderRadius: '12px',
                    clipPath: 'inset(0% 0% 0% 0% round 12px)',
                    filter: 'blur(0px)',
                },
                {
                    // Pull downward and start narrowing - the “sucked into dock” look.
                    offset: 0.45,
                    transform: `translate(${dx * 0.35}px, ${dy * 0.55}px) scale(${Math.max(sx, 0.55)}, ${Math.max(sy, 0.35)})`,
                    opacity: 0.95,
                    borderRadius: '18px',
                    clipPath: 'inset(8% 18% 0% 18% round 18px)',
                    filter: 'blur(0.2px)',
                },
                {
                    offset: 1,
                    transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
                    opacity: 0,
                    borderRadius: '999px',
                    clipPath: 'inset(55% 42% 0% 42% round 999px)',
                    filter: 'blur(1.5px)',
                },
            ],
            {
                duration: ms,
                easing: 'cubic-bezier(0.45, 0.02, 0.55, 0.95)',
                fill: 'forwards',
            },
        );
        await anim.finished.catch(() => undefined);
    } finally {
        clone.remove();
        el.style.visibility = prevVisibility;
    }
}

/** Reverse genie when restoring a minimized window from the dock. */
export async function playGenieRestore(el: HTMLElement, fromDock: DOMRect | null): Promise<void> {
    if (prefersReduced() || !fromDock) return;
    const to = el.getBoundingClientRect();
    if (to.width < 2 || to.height < 2) return;

    const clone = el.cloneNode(true) as HTMLElement;
    clone.style.position = 'fixed';
    clone.style.left = `${to.left}px`;
    clone.style.top = `${to.top}px`;
    clone.style.width = `${to.width}px`;
    clone.style.height = `${to.height}px`;
    clone.style.zIndex = '10000';
    clone.style.pointerEvents = 'none';
    clone.style.transformOrigin = '50% 100%';
    clone.style.willChange = 'transform, opacity, clip-path, border-radius';
    document.body.appendChild(clone);

    const prevVisibility = el.style.visibility;
    el.style.visibility = 'hidden';

    const dx = fromDock.left + fromDock.width / 2 - (to.left + to.width / 2);
    const dy = fromDock.top + fromDock.height / 2 - (to.top + to.height / 2);
    const sx = Math.max(0.04, fromDock.width / to.width);
    const sy = Math.max(0.04, fromDock.height / to.height);
    const ms = durationMs();

    try {
        const anim = clone.animate(
            [
                {
                    transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
                    opacity: 0.2,
                    borderRadius: '999px',
                    clipPath: 'inset(55% 42% 0% 42% round 999px)',
                },
                {
                    transform: 'translate(0px, 0px) scale(1, 1)',
                    opacity: 1,
                    borderRadius: '12px',
                    clipPath: 'inset(0% 0% 0% 0% round 12px)',
                },
            ],
            {
                duration: ms * 0.85,
                easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)',
                fill: 'forwards',
            },
        );
        await anim.finished.catch(() => undefined);
    } finally {
        clone.remove();
        el.style.visibility = prevVisibility;
    }
}
