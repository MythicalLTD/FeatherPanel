# Frontend Power SDK (`window.FeatherPanel`)

Source: `frontendv2/src/lib/plugin-sdk/`  
HTML overview: [`../plugin-power.html`](../plugin-power.html)

Host injects a JS API so plugins can listen to events, intercept actions, call the API, open modals, contribute search, and register shortcuts — **without rebuilding the panel**.

## Boot helper

```js
(function () {
  function boot() {
    var FP = window.FeatherPanel;
    if (!FP || !FP.events) return setTimeout(boot, 50);
    // use FP…
  }
  boot();
})();
```

Iframe widgets use same-origin `postMessage` bridge (`featherpanel-bus`).

## Namespaces

| Namespace | Role |
|-----------|------|
| `events` | `on`, `once`, `off`, `emit` |
| `actions` | `register`, `unregister`, `run` — cancellable middleware |
| `theme` | `getMode`, `getAccent`, `getPackId`, `subscribe` |
| `api` | HTTP helpers; intercept via `fp:api:request` |
| `toast` | Notifications |
| `navigate` | Client nav (`fp:nav:push`) |
| `context` | pathname / user / ui pack |
| `ui.modal` | register / open / close |
| `search` | contribute / query |
| `shortcuts` | register |

## Canonical IDs

**Events:** `fp:host:ready`, `fp:route:change`, `fp:page:mount|unmount`, `fp:theme:change`, `fp:uipack:change`, `fp:session:change`, `fp:server:context`, `fp:server:power:result`, `fp:server:console:ready`, `fp:files:saved|selection`, `fp:api:error`

**Actions:** `fp:server:power`, `fp:files:save|upload`, `fp:nav:push`, `fp:form:submit`, `fp:ui:confirm`, `fp:api:request`, `fp:search:query`, `fp:shortcut:invoke`, `fp:data:action`

## Full SDK example (UI-pack scaffold)

```js
FP.actions.register('fp:server:power', {
  id: 'myplugin.guard-kill',
  priority: 100,
  handler: async function (ctx, next) {
    if (ctx.action === 'kill' && !confirm('Kill?')) {
      ctx.cancel('aborted');
      return;
    }
    await next();
  },
});

FP.search.contribute({
  id: 'myplugin',
  search: function (q) {
    return q ? [{ id: '1', title: 'My plugin', href: '/admin/myplugin' }] : [];
  },
});

FP.shortcuts.register({
  id: 'myplugin-toast',
  combo: 'ctrl+shift+m',
  handler: function () { FP.toast.info('Hello'); },
});
```

## Real plugin patterns (lighter than full SDK)

### discordplus — API polling gate

`Frontend/index.js` waits for `window.FeatherPanel.api`, then `GET /api/user/discordplus/status`, and shows a link overlay when required. Does not need `FP.actions`.

### billingreferrals — route DOM hooks

Listens for navigation / injects UI on `/auth/register` using sessionStorage — useful when you only need a page-specific enhancement.

### widgetbot — third-party embed

Scaffold-style `waitForAPI()` then loads an external widget library.

## DOM `data-fp-action`

Attributes can bind clicks into the action pipeline. Prefer documented action ids.

## When to use what

| Need | Prefer |
|------|--------|
| Inject HTML card | `widgets.json` |
| Nav + page | `sidebar.json` |
| Intercept power/files/nav | Power SDK `actions` |
| Theme tokens | `theme.json` |
| PHP server create hooks | `processEvents` |
| REST API | `Routes/` + Controllers |

## Feature detection

```js
if (FP.ui && FP.ui.modal) { /* … */ }
```

Check `FP.version` / `FEATHERPANEL_HOST_VERSION` when supporting older panels.
