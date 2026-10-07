# Widget: `server-console`

## Injection points

- `after-header`
- `after-performance`
- `after-terminal`
- `after-wings-status`
- `before-performance`
- `before-terminal`
- `bottom-of-page`
- `top-of-page`
- `under-server-info-cards`

## Source files

- `src/components/server/ServerConsolePage.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "server-console",
  "location": "after-header",
  "size": "full"
}
```
