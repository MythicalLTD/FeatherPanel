# Widget: `server-fastdl`

## Injection points

- `after-header`
- `bottom-of-page`
- `top-of-page`

## Source files

- `src/app/(app)/server/[uuidShort]/fastdl/page.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "server-fastdl",
  "location": "after-header",
  "size": "full"
}
```
