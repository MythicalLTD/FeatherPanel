# Events: Knowledgebase

23 events in this category.

### `featherpanel:admin:knowledgebase:article:created`

- **Method:** `onKnowledgebaseArticleCreated`
- **Emitted:** yes
- **Callback docs:** array article, array created_by.
- **Data keys:** `article`, `created_by`

**Source files**

- `backend/app/Controllers/Admin/KnowledgebaseController.php`

### `featherpanel:admin:knowledgebase:article:deleted`

- **Method:** `onKnowledgebaseArticleDeleted`
- **Emitted:** yes
- **Callback docs:** array article, array deleted_by.
- **Data keys:** `article`, `deleted_by`

**Source files**

- `backend/app/Controllers/Admin/KnowledgebaseController.php`

### `featherpanel:admin:knowledgebase:article:retrieved`

- **Method:** `onKnowledgebaseArticleRetrieved`
- **Emitted:** yes
- **Callback docs:** array article.
- **Data keys:** `article`

**Source files**

- `backend/app/Controllers/Admin/KnowledgebaseController.php`

### `featherpanel:admin:knowledgebase:articles:reordered`

- **Method:** `onKnowledgebaseArticlesReordered`
- **Emitted:** yes
- **Callback docs:** array articles, array reordered_by.
- **Data keys:** `articles`, `reordered_by`

**Source files**

- `backend/app/Controllers/Admin/KnowledgebaseController.php`

### `featherpanel:admin:knowledgebase:articles:retrieved`

- **Method:** `onKnowledgebaseArticlesRetrieved`
- **Emitted:** yes
- **Callback docs:** array articles, array pagination, array search.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/Admin/KnowledgebaseController.php`

### `featherpanel:admin:knowledgebase:article:updated`

- **Method:** `onKnowledgebaseArticleUpdated`
- **Emitted:** yes
- **Callback docs:** array article, array updated_by.
- **Data keys:** `article`, `updated_by`

**Source files**

- `backend/app/Controllers/Admin/KnowledgebaseController.php`

### `featherpanel:admin:knowledgebase:attachment:deleted`

- **Method:** `onKnowledgebaseAttachmentDeleted`
- **Emitted:** yes
- **Callback docs:** array article, array attachment, array deleted_by.
- **Data keys:** `article`, `attachment`, `deleted_by`

**Source files**

- `backend/app/Controllers/Admin/KnowledgebaseController.php`

### `featherpanel:admin:knowledgebase:attachments:retrieved`

- **Method:** `onKnowledgebaseAttachmentsRetrieved`
- **Emitted:** yes
- **Callback docs:** array article, array attachments.
- **Data keys:** `article`, `attachments`

**Source files**

- `backend/app/Controllers/Admin/KnowledgebaseController.php`

### `featherpanel:admin:knowledgebase:attachment:uploaded`

- **Method:** `onKnowledgebaseAttachmentUploaded`
- **Emitted:** yes
- **Callback docs:** array article, array attachment, array uploaded_by.
- **Data keys:** `article`, `attachment`, `uploaded_by`

**Source files**

- `backend/app/Controllers/Admin/KnowledgebaseController.php`

### `featherpanel:admin:knowledgebase:categories:retrieved`

- **Method:** `onKnowledgebaseCategoriesRetrieved`
- **Emitted:** yes
- **Callback docs:** array categories, array pagination, array search.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/Admin/KnowledgebaseController.php`

### `featherpanel:admin:knowledgebase:category:created`

- **Method:** `onKnowledgebaseCategoryCreated`
- **Emitted:** yes
- **Callback docs:** array category, array created_by.
- **Data keys:** `category`, `created_by`

**Source files**

- `backend/app/Controllers/Admin/KnowledgebaseController.php`

### `featherpanel:admin:knowledgebase:category:deleted`

- **Method:** `onKnowledgebaseCategoryDeleted`
- **Emitted:** yes
- **Callback docs:** array category, array deleted_by.
- **Data keys:** `category`, `deleted_by`

**Source files**

- `backend/app/Controllers/Admin/KnowledgebaseController.php`

### `featherpanel:admin:knowledgebase:category:retrieved`

- **Method:** `onKnowledgebaseCategoryRetrieved`
- **Emitted:** yes
- **Callback docs:** array category.
- **Data keys:** `category`

**Source files**

- `backend/app/Controllers/Admin/KnowledgebaseController.php`

### `featherpanel:admin:knowledgebase:category:updated`

- **Method:** `onKnowledgebaseCategoryUpdated`
- **Emitted:** yes
- **Callback docs:** array category, array updated_by.
- **Data keys:** `category`, `updated_by`

**Source files**

- `backend/app/Controllers/Admin/KnowledgebaseController.php`

### `featherpanel:admin:knowledgebase:icon:uploaded`

- **Method:** `onKnowledgebaseIconUploaded`
- **Emitted:** yes
- **Callback docs:** string filename, string url, array uploaded_by.
- **Data keys:** `filename`, `uploaded_by`, `url`

**Source files**

- `backend/app/Controllers/Admin/KnowledgebaseController.php`

### `featherpanel:admin:knowledgebase:tag:created`

- **Method:** `onKnowledgebaseTagCreated`
- **Emitted:** yes
- **Callback docs:** array article, array tag, array created_by.
- **Data keys:** `article`, `created_by`, `tag`

**Source files**

- `backend/app/Controllers/Admin/KnowledgebaseController.php`

### `featherpanel:admin:knowledgebase:tag:deleted`

- **Method:** `onKnowledgebaseTagDeleted`
- **Emitted:** yes
- **Callback docs:** array article, array tag, array deleted_by.
- **Data keys:** `article`, `deleted_by`, `tag`

**Source files**

- `backend/app/Controllers/Admin/KnowledgebaseController.php`

### `featherpanel:admin:knowledgebase:tags:retrieved`

- **Method:** `onKnowledgebaseTagsRetrieved`
- **Emitted:** yes
- **Callback docs:** array article, array tags.
- **Data keys:** `article`, `tags`

**Source files**

- `backend/app/Controllers/Admin/KnowledgebaseController.php`

### `featherpanel:user:knowledgebase:article:retrieved`

- **Method:** `onUserKnowledgebaseArticleRetrieved`
- **Emitted:** yes
- **Callback docs:** array article, array attachments, array tags, array|null user.
- **Data keys:** `article`, `attachments`, `tags`, `user`

**Source files**

- `backend/app/Controllers/User/KnowledgebaseController.php`

### `featherpanel:user:knowledgebase:articles:retrieved`

- **Method:** `onUserKnowledgebaseArticlesRetrieved`
- **Emitted:** yes
- **Callback docs:** array articles, array pagination.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/User/KnowledgebaseController.php`

### `featherpanel:user:knowledgebase:categories:retrieved`

- **Method:** `onUserKnowledgebaseCategoriesRetrieved`
- **Emitted:** yes
- **Callback docs:** array categories, array pagination.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/User/KnowledgebaseController.php`

### `featherpanel:user:knowledgebase:category:articles:retrieved`

- **Method:** `onUserKnowledgebaseCategoryArticlesRetrieved`
- **Emitted:** yes
- **Callback docs:** array category, array articles, array pagination.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/User/KnowledgebaseController.php`

### `featherpanel:user:knowledgebase:category:retrieved`

- **Method:** `onUserKnowledgebaseCategoryRetrieved`
- **Emitted:** yes
- **Callback docs:** array category.
- **Data keys:** `category`

**Source files**

- `backend/app/Controllers/User/KnowledgebaseController.php`

