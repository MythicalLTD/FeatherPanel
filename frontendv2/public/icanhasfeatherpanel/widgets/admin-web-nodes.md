# Widget: `admin-web-nodes`

## Injection points

- `after-header`
- `before-list`
- `bottom-of-page`
- `top-of-page`

## Source files

- `src/app/(app)/admin/web-nodes/page.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "admin-web-nodes",
  "location": "after-header",
  "size": "full"
}
```
