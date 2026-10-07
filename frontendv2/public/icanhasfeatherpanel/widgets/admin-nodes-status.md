# Widget: `admin-nodes-status`

## Injection points

- `after-global-stats`
- `after-header`
- `after-individual-nodes`
- `after-resource-usage`
- `before-global-stats`
- `bottom-of-page`
- `top-of-page`

## Source files

- `src/app/(app)/admin/nodes/status/page.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "admin-nodes-status",
  "location": "after-global-stats",
  "size": "full"
}
```
