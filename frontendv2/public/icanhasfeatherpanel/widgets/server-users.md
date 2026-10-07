# Widget: `server-users`

## Injection points

- `after-header`
- `after-subusers-list`
- `before-subusers-list`
- `bottom-of-page`
- `top-of-page`

## Source files

- `src/app/(app)/server/[uuidShort]/users/page.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "server-users",
  "location": "after-header",
  "size": "full"
}
```
