# Middleware & PHP Event Hooks

## PHP plugin events

During boot, each loaded plugin’s `processEvents(PluginEvents $event)` runs. Register listeners with `$event->on($eventId, $callback)`.

Event ids come from classes in `backend/app/Plugins/Events/Events/*Event.php` (static methods returning strings).

Browse the generated catalog: [../events/](../events/) (also `../events/all.json` for RAG).

### Common: `onRouterReady`

Emitted after core + addon routes are registered. Payload is a `RouteCollection` (sometimes wrapped — accept both):

```php
use App\Plugins\Events\Events\AppEvent;

public static function processEvents(PluginEvents $event): void
{
    $event->on(AppEvent::onRouterReady(), function ($payload) {
        $router = is_array($payload) ? ($payload['router'] ?? null) : $payload;
        if ($router === null) {
            return;
        }
        // attach middleware / inspect routes
    });
}
```

Real usage: `discordplus` → `Helpers/RouteGuard::attach($router)`.

### Emitting your own events (advanced)

Prefer listening to core events. If you emit, use the global `$eventManager` / helpers consistently with core controllers so other plugins can subscribe. Document custom event ids in your plugin README.

---

## HTTP Middleware

### Location

Convention in real plugins: lowercase folder

```
{identifier}/middleware/MyMiddleware.php
namespace App\Addons\{identifier}\middleware;
```

Implement `App\Middleware\MiddlewareInterface` with `handle($request, $next)`.

### Registration

There is **no** `conf.yml` middleware list. You attach middleware in PHP — typically by mutating route defaults when the router is ready (see `discordplus`).

### Real example — Discord link gate

`discordplus/middleware/RequireDiscordLinkMiddleware.php`:

- Reads plugin settings (`require_discord_link`, bypasses, etc.)
- Blocks unauthenticated-to-Discord users from using the panel
- Allows linking / session endpoints through

Wired from `DiscordPlus::processEvents` → `RouteGuard`.

Another example pattern: API-key style middleware in addons such as `pterodactylpanelapi/middleware/`.

### Guidelines

1. Keep middleware fast — it may run on many requests  
2. Use `PluginSettings` for toggles; default **off** for invasive gates  
3. Always provide admin bypass / escape hatches for lockouts  
4. Return the same JSON error shapes as core APIs when blocking API clients  
5. Log denials with context, never log secrets  

---

## Other useful hooks

Domain events cover users, servers, wings, tickets, webspaces, backups, auth, settings, plugin UI aggregation, etc. Examples of listener use-cases:

| Goal | Look at event category |
|------|------------------------|
| React to user create/delete | `User` events |
| React to server power/install | `Server` / `Wings` |
| Observe settings changes | `Settings` / `PluginsSettings` |
| React when UI manifests are collected | `PluginUi` |

Always guard with try/catch inside listeners so one plugin cannot take down boot.

---

## Related

- [backend.md](./backend.md) — routes & AppPlugin lifecycle  
- [examples.md](./examples.md) — discordplus walkthrough  
- Events reference — [../events/](../events/)
