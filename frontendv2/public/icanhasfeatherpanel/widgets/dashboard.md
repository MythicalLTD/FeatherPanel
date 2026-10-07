# Widget: `dashboard`

## Injection points

- `after-server-list`
- `before-server-list`
- `bottom-of-page`
- `top-of-page`

## Source files

- `src/app/(app)/dashboard/page.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "dashboard",
  "location": "after-server-list",
  "size": "full"
}
```
