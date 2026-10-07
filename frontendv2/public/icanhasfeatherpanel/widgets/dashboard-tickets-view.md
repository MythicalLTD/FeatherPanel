# Widget: `dashboard-tickets-view`

## Injection points

- `after-header`
- `after-messages`
- `bottom-of-page`
- `sidebar-bottom`
- `sidebar-top`
- `top-of-page`

## Source files

- `src/app/(app)/dashboard/tickets/[uuid]/page.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "dashboard-tickets-view",
  "location": "after-header",
  "size": "full"
}
```
