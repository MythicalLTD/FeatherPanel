# Widget: `admin-subdomains`

## Injection points

- `after-header`
- `before-list`
- `bottom-of-page`
- `top-of-page`

## Source files

- `src/app/(app)/admin/subdomains/page.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "admin-subdomains",
  "location": "after-header",
  "size": "full"
}
```
