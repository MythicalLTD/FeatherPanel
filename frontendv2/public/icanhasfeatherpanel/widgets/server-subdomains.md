# Widget: `server-subdomains`

## Injection points

- `after-header`
- `after-subdomains-list`
- `before-subdomains-list`
- `bottom-of-page`
- `top-of-page`

## Source files

- `src/app/(app)/server/[uuidShort]/subdomains/page.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "server-subdomains",
  "location": "after-header",
  "size": "full"
}
```
