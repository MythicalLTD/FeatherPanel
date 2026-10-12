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

import { pluginActionHooks } from '@/lib/plugin-sdk/action-hooks';
import { FP_ACTIONS } from '@/lib/plugin-sdk/ids';

/**
 * Bind clicks on elements with `data-fp-action="fp:..."` inside root.
 * Runs the cancelable action hook chain before optional default behavior.
 */
export function bindFpActionClicks(root: ParentNode | Document = document): () => void {
    const onClick = (event: Event) => {
        const target = event.target as HTMLElement | null;
        if (!target) return;
        const el = target.closest<HTMLElement>('[data-fp-action]');
        if (!el || !root.contains(el)) return;

        const actionId = el.getAttribute('data-fp-action');
        if (!actionId) return;

        event.preventDefault();
        event.stopPropagation();

        const payloadAttr = el.getAttribute('data-fp-payload');
        let payload: Record<string, unknown> = {};
        if (payloadAttr) {
            try {
                payload = JSON.parse(payloadAttr) as Record<string, unknown>;
            } catch {
                payload = { raw: payloadAttr };
            }
        }

        void (async () => {
            const ctx = await pluginActionHooks.run(actionId, {
                ...payload,
                elementId: el.id || null,
                href: el.getAttribute('href'),
                source: 'data-fp-action',
            });
            if (ctx.cancelled) return;

            // Also emit generic data-action for observers
            await pluginActionHooks.run(FP_ACTIONS.DATA_ACTION, {
                actionId,
                ...payload,
            });

            const href = typeof ctx.href === 'string' ? ctx.href : el.getAttribute('href');
            if (href && window.FeatherPanel?.navigate) {
                window.FeatherPanel.navigate(href);
            }
        })();
    };

    const onSubmit = (event: Event) => {
        const form = event.target as HTMLFormElement | null;
        if (!form || form.tagName !== 'FORM') return;
        if (!root.contains(form)) return;
        const actionId = form.getAttribute('data-fp-action') || FP_ACTIONS.FORM_SUBMIT;
        if (!form.hasAttribute('data-fp-action') && actionId === FP_ACTIONS.FORM_SUBMIT) {
            // Only intercept forms that opt in
            return;
        }

        event.preventDefault();
        const formData = new FormData(form);
        const data: Record<string, string> = {};
        formData.forEach((value, key) => {
            data[key] = String(value);
        });

        void (async () => {
            const ctx = await pluginActionHooks.run(actionId, {
                formId: form.id || null,
                action: form.getAttribute('action'),
                method: (form.getAttribute('method') || 'get').toLowerCase(),
                data,
                source: 'data-fp-form',
            });
            if (ctx.cancelled) return;

            if (typeof ctx.submitNative === 'boolean' && ctx.submitNative) {
                form.removeAttribute('data-fp-action');
                form.submit();
            }
        })();
    };

    root.addEventListener('click', onClick as EventListener, true);
    root.addEventListener('submit', onSubmit as EventListener, true);

    return () => {
        root.removeEventListener('click', onClick as EventListener, true);
        root.removeEventListener('submit', onSubmit as EventListener, true);
    };
}
