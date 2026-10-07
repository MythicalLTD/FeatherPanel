# Widget: `server-tasks`

## Injection points

- `after-header`
- `after-tasks-list`
- `before-tasks-list`
- `bottom-of-page`
- `top-of-page`

## Source files

- `src/app/(app)/server/[uuidShort]/schedules/[id]/tasks/page.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "server-tasks",
  "location": "after-header",
  "size": "full"
}
```
