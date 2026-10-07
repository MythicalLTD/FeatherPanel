# Widget: `server-databases`

## Injection points

- `after-databases-list`
- `after-warning-banner`
- `before-databases-list`
- `bottom-of-page`
- `top-of-page`

## Source files

- `src/app/(app)/server/[uuidShort]/databases/page.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "server-databases",
  "location": "after-databases-list",
  "size": "full"
}
```
