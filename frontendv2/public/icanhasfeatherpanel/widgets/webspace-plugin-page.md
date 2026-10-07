# Widget: `webspace-plugin-page`

## Injection points

- `bottom-of-page`
- `top-of-page`

## Source files

- `src/app/(app)/webspace/[uuidShort]/[[...pluginPath]]/page.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "webspace-plugin-page",
  "location": "bottom-of-page",
  "size": "full"
}
```
