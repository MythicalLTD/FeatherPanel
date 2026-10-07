# Widget: `admin-home`

## Injection points

- `after-header`
- `after-widgets-grid`
- `before-widgets-grid`
- `bottom-of-page`
- `top-of-page`

## Source files

- `src/app/(app)/admin/page.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "admin-home",
  "location": "after-header",
  "size": "full"
}
```
