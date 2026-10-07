# Widget: `server-file-editor`

## Injection points

- `after-header`
- `bottom-of-page`
- `top-of-page`

## Source files

- `src/app/(app)/server/[uuidShort]/files/edit/page.tsx`
- `src/app/(app)/server/[uuidShort]/files/ide/page.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "server-file-editor",
  "location": "after-header",
  "size": "full"
}
```
