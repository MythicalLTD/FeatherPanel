# Widget: `server-startup`

## Injection points

- `after-docker-image`
- `after-header`
- `after-spell-selection`
- `after-startup-command`
- `after-variables`
- `bottom-of-page`
- `top-of-page`

## Source files

- `src/app/(app)/server/[uuidShort]/startup/page.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "server-startup",
  "location": "after-docker-image",
  "size": "full"
}
```
