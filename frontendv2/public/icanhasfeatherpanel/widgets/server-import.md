# Widget: `server-import`

## Injection points

- `after-header`
- `after-imports-list`
- `before-imports-list`
- `bottom-of-page`
- `top-of-page`

## Source files

- `src/app/(app)/server/[uuidShort]/import/page.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "server-import",
  "location": "after-header",
  "size": "full"
}
```
