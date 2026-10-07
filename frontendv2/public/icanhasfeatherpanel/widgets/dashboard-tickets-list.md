# Widget: `dashboard-tickets-list`

## Injection points

- `after-filters`
- `after-header`
- `after-tickets-list`
- `before-tickets-list`
- `bottom-of-page`
- `top-of-page`

## Source files

- `src/app/(app)/dashboard/tickets/page.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "dashboard-tickets-list",
  "location": "after-filters",
  "size": "full"
}
```
