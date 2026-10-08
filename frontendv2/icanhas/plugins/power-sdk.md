# Power SDK (`window.FeatherPanel`)

Runtime host API for plugins — events, cancellable actions, toasts, modals, search, shortcuts. Source: `frontendv2/src/lib/plugin-sdk/` (host version 2). HTML overview: [`../plugin-power.html`](../plugin-power.html).

## When to use it

| Need                        | Prefer         |
| --------------------------- | -------------- |
| Card on an existing page    | `widgets.json` |
| Nav + page                  | `sidebar.json` |
| Colors                      | `theme.json`   |
| Replace chrome              | `ui.json`      |
| Guard kill / wrap file save | **`actions`**  |
| React to route / session    | **`events`**   |
| PHP hooks / REST            | backend routes |

## Boot

`Frontend/index.js` — wait for the host; it is not always there on the first tick.

```js
(function () {
    function boot() {
        var FP = window.FeatherPanel;
        if (!FP || !FP.events) return setTimeout(boot, 50);

        FP.actions.register('fp:server:power', {
            id: 'myplugin.guard-kill',
            priority: 100,
            handler: async function (ctx, next) {
                if (ctx.action === 'kill' && !confirm('Kill this server?')) {
                    ctx.cancel('aborted');
                    return;
                }
                await next();
            },
        });
    }
    boot();
})();
```

Always `await next()` unless you cancel. Feature-detect namespaces (`FP.ui && FP.ui.modal`) when targeting older panels.

## Namespaces

`events`, `actions`, `theme`, `api`, `toast`, `navigate`, `context`, `ui.modal`, `search`, `shortcuts`.

## Events

`fp:host:ready`, `fp:route:change`, `fp:page:mount` / `unmount`, `fp:theme:change`, `fp:uipack:change`, `fp:session:change`, `fp:server:context`, `fp:server:power:result`, `fp:server:console:ready`, `fp:files:saved` / `selection`, `fp:api:error`.

## Actions

`fp:server:power`, `fp:files:save` / `upload`, `fp:nav:push`, `fp:form:submit`, `fp:ui:confirm`, `fp:api:request`, `fp:search:query`, `fp:shortcut:invoke`, `fp:data:action`.

DOM opt-in:

```html
<button type="button" data-fp-action="fp:data:action" data-fp-payload='{"op":"ping"}'>Ping</button>
```

## Iframes

Same-origin widgets talk over `postMessage` (`featherpanel-bus` with `emit` / `on` / `off` / `runAction`). Also `featherpanel-ready`, `featherpanel-navigate`, `featherpanel-toast`.

Slots you will see: `shell.*`, `toolbar.server-header`, `toolbar.server-console`, `drawer.global`, `modal.global`.

## Real plugins (lighter than full SDK)

- **discordplus** — waits for `FP.api`, polls status, overlays a link. Often no `actions`.
- **billingreferrals** — DOM hooks on `/auth/register`.
- **widgetbot** — loads a third-party embed after `waitForAPI()`.

## Debug

In DevTools: `window.FeatherPanel`. If undefined, host not mounted or script failed. Log `fp:host:ready` first. Kill goes through `fp:server:power` (and often `fp:ui:confirm`).

## Related

[themes.md](./themes.md) · [ui-packs.md](./ui-packs.md) · [frontend.md](./frontend.md)
