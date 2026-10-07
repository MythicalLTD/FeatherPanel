# Widget: `dashboard-status`

## Injection points

- `after-global-stats`
- `after-header`
- `after-node-list`
- `before-node-list`
- `bottom-of-page`
- `top-of-page`

## Source files

- `src/app/(app)/dashboard/status/page.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "dashboard-status",
  "location": "after-global-stats",
  "size": "full"
}
```
