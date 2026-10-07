# Widget: `dashboard-servers`

## Injection points

- `after-header`
- `after-server-list`
- `before-server-list`
- `bottom-of-page`
- `top-of-page`

## Source files

- `src/app/(app)/dashboard/servers/page.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "dashboard-servers",
  "location": "after-header",
  "size": "full"
}
```
