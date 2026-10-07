# Widget: `dashboard-knowledgebase-article`

## Injection points

- `after-article-content`
- `after-attachments`
- `after-header`
- `before-article-content`
- `before-attachments`
- `bottom-of-page`
- `top-of-page`

## Source files

- `src/app/(app)/dashboard/knowledgebase/article/[id]/page.tsx`

## Example `widgets.json` entry

```json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "dashboard-knowledgebase-article",
  "location": "after-article-content",
  "size": "full"
}
```
