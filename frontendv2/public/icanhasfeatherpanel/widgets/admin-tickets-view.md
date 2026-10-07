# Widget: `admin-tickets-view`

## Injection points

- `after-header`
- `after-messages`
- `sidebar-bottom`
- `sidebar-top`
- `top-of-page`

## Source files

- `src/app/(app)/admin/tickets/[uuid]/page.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "admin-tickets-view",
  "location": "after-header",
  "size": "full"
}
```
