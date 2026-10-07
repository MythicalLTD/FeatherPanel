# Widget: `server-schedules`

## Injection points

- `after-header`
- `after-schedules-list`
- `bottom-of-page`
- `top-of-page`

## Source files

- `src/app/(app)/server/[uuidShort]/schedules/page.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "server-schedules",
  "location": "after-header",
  "size": "full"
}
```
