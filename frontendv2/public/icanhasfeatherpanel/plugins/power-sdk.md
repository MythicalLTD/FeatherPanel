# Frontend Power SDK (`window.FeatherPanel`)

Source: `frontendv2/src/lib/plugin-sdk/`  
HTML overview: [`../plugin-power.html`](../plugin-power.html)

The host injects a JS API so plugins can listen to panel events, intercept actions, call the API, open modals, contribute search results, and register shortcuts — **without rebuilding the panel**.

## Boot helper

Put a script in `Frontend/index.js` or inside a component:

```js
(function () {
  function boot() {
    var FP = window.FeatherPanel;
    if (!FP || !FP.events) return setTimeout(boot, 50);

    FP.events.on('fp:route:change', function (p) {
      console.log('route', p);
    });
  }
  boot();
})();
```

Iframe widgets use a same-origin `postMessage` bridge (`featherpanel-bus`) so the same API shape works inside components.

## Namespaces

| Namespace | Role |
|-----------|------|
| `events` | `on`, `once`, `off`, `emit` |
| `actions` | `register`, `unregister`, `run` — cancellable middleware pipeline |
| `theme` | `getMode`, `getAccent`, `getPackId`, `subscribe` |
| `api` | HTTP helpers (axios-backed); can intercept via `fp:api:request` |
| `toast` | User notifications |
| `navigate` | Client navigation (`fp:nav:push`) |
| `context` | `getPathname`, `getUser`, `getUiPackId`, `subscribe` |
| `ui.modal` | `register` / `open` / `close` |
| `search` | `contribute`, `query` |
| `shortcuts` | `register` |

## Canonical event IDs

From `FP_EVENTS`:

| ID | When |
|----|------|
| `fp:host:ready` | Host API installed |
| `fp:route:change` | Pathname changes |
| `fp:page:mount` / `fp:page:unmount` | Route settle |
| `fp:theme:change` | Theme / accent / pack |
| `fp:uipack:change` | Active UI pack |
| `fp:session:change` | Login / user change |
| `fp:server:context` | Enter/leave server routes |
| `fp:server:power:result` | Power action result |
| `fp:server:console:ready` | Console ready |
| `fp:files:saved` / `fp:files:selection` | File manager |
| `fp:api:error` | API error |

## Canonical action IDs

From `FP_ACTIONS`:

| ID | Purpose |
|----|---------|
| `fp:server:power` | Start/stop/restart/kill |
| `fp:files:save` / `fp:files:upload` | Files |
| `fp:nav:push` | Navigation |
| `fp:form:submit` | Forms |
| `fp:ui:confirm` | Confirm dialogs |
| `fp:api:request` | Outgoing API |
| `fp:search:query` | Search |
| `fp:shortcut:invoke` | Shortcuts |
| `fp:data:action` | `data-fp-action` DOM hooks |

### Action middleware example

```js
FP.actions.register('fp:server:power', {
  id: 'myplugin.guard-kill',
  priority: 100,
  handler: async function (ctx, next) {
    if (ctx.action === 'kill' && !confirm('Kill server?')) {
      ctx.cancel('aborted');
      return;
    }
    await next();
  },
});
```

### Search + shortcuts

```js
FP.search.contribute({
  id: 'myplugin',
  search: function (q) {
    return q
      ? [{ id: '1', title: 'My plugin', href: '/admin/myplugin' }]
      : [];
  },
});

FP.shortcuts.register({
  id: 'myplugin-toast',
  combo: 'ctrl+shift+m',
  handler: function () {
    FP.toast.info('Hello from plugin');
  },
});
```

## DOM actions

`data-fp-action` attributes can bind clicks to the action pipeline (`bindFpActionClicks`). Prefer documented action ids.

## Versioning

Host version is exposed as `FEATHERPANEL_HOST_VERSION` / `FP.version` (see `types.ts`). Feature-detect namespaces (`if (FP.ui && FP.ui.modal)`) when supporting older panels.

## When to use SDK vs widgets vs PHP events

| Need | Prefer |
|------|--------|
| Inject HTML into a page | `widgets.json` |
| Add nav entry / full page | `sidebar.json` + component |
| Intercept UI power/files/nav | Power SDK actions |
| React to server create/delete in PHP | PHP `processEvents` |
| Custom REST API | PHP `Routes/` + Controllers |
