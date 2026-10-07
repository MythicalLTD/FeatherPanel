# Widget: `admin-users`

## Injection points

- `after-header`
- `before-list`
- `bottom-of-page`
- `top-of-page`

## Source files

- `src/app/(app)/admin/users/page.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "admin-users",
  "location": "after-header",
  "size": "full"
}
```
