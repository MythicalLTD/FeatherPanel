# Widget: `server-plugin-page`

## Injection points

- `bottom-of-page`
- `top-of-page`

## Source files

- `src/app/(app)/server/[uuidShort]/[[...pluginPath]]/page.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "server-plugin-page",
  "location": "bottom-of-page",
  "size": "full"
}
```
