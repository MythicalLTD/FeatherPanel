# Widget: `dashboard-knowledgebase-category`

## Injection points

- `after-articles-list`
- `after-header`
- `before-articles-list`
- `bottom-of-page`
- `top-of-page`

## Source files

- `src/app/(app)/dashboard/knowledgebase/category/[id]/page.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "dashboard-knowledgebase-category",
  "location": "after-articles-list",
  "size": "full"
}
```
