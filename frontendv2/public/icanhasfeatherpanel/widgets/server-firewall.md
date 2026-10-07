# Widget: `server-firewall`

## Injection points

- `after-header`
- `after-rules-list`
- `before-rules-list`
- `bottom-of-page`
- `top-of-page`

## Source files

- `src/app/(app)/server/[uuidShort]/firewall/page.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "server-firewall",
  "location": "after-header",
  "size": "full"
}
```
