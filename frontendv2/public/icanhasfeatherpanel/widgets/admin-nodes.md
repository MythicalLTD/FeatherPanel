# Widget: `admin-nodes`

## Injection points

- `after-header`
- `before-list`
- `bottom-of-page`
- `top-of-page`

## Source files

- `src/app/(app)/admin/nodes/page.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "admin-nodes",
  "location": "after-header",
  "size": "full"
}
```
