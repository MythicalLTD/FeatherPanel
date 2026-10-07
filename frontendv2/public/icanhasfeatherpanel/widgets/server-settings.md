# Widget: `server-settings`

## Injection points

- `after-delete-server`
- `after-header`
- `after-server-actions`
- `after-server-info`
- `after-sftp-details`
- `bottom-of-page`
- `top-of-page`

## Source files

- `src/app/(app)/server/[uuidShort]/settings/page.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "server-settings",
  "location": "after-delete-server",
  "size": "full"
}
```
