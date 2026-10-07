# Widget: `admin-plugins`

## Injection points

- `after-header`
- `bottom-of-page`
- `top-of-page`

## Source files

- `src/app/(app)/admin/plugins/page.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "admin-plugins",
  "location": "after-header",
  "size": "full"
}
```
