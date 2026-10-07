# Widget: `server-files`

## Injection points

- `after-files-list`
- `after-header`
- `after-search-bar`
- `before-files-list`
- `bottom-of-page`
- `top-of-page`

## Source files

- `src/app/(app)/server/[uuidShort]/files/page.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "server-files",
  "location": "after-files-list",
  "size": "full"
}
```
