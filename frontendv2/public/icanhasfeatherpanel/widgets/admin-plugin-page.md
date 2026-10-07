# Widget: `admin-plugin-page`

## Injection points

- `bottom-of-page`
- `top-of-page`

## Source files

- `src/app/(app)/admin/[...pluginPath]/page.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "admin-plugin-page",
  "location": "bottom-of-page",
  "size": "full"
}
```
