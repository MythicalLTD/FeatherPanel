# Events: PluginUi

7 events in this category.

### `featherpanel:system:plugins:ui:overrides:retrieved`

- **Method:** `onOverridesRetrieved`
- **Emitted:** yes
- **Callback docs:** array overrides from Frontend/overrides.json aggregations.
- **Data keys:** `actions`, `hide`, `replace`

**Source files**

- `backend/app/Controllers/System/PluginOverridesController.php`

### `featherpanel:system:plugins:ui:public-pages:retrieved`

- **Method:** `onPublicPagesRetrieved`
- **Emitted:** yes
- **Callback docs:** array public pages from Frontend/public.json aggregations.
- **Data keys:** `pages`

**Source files**

- `backend/app/Controllers/System/PluginPublicPagesController.php`

### `featherpanel:system:plugins:ui:sidebar:retrieved`

- **Method:** `onSidebarRetrieved`
- **Emitted:** yes
- **Callback docs:** array sidebar sections, array context metadata.
- **Data keys:** `context`, `server_spell_id`, `sidebar`

**Source files**

- `backend/app/Controllers/System/PluginSidebarController.php`

### `featherpanel:system:plugins:ui:themes:retrieved`

- **Method:** `onThemesRetrieved`
- **Emitted:** yes
- **Callback docs:** array themes from Frontend/theme.json aggregations.
- **Data keys:** `themes`

**Source files**

- `backend/app/Controllers/System/PluginThemesController.php`

### `featherpanel:system:plugins:ui:error`

- **Method:** `onUiError`
- **Emitted:** yes
- **Callback docs:** string source, string message, array context metadata.
- **Data keys:** `context`, `message`, `plugin`, `source`

**Source files**

- `backend/app/Controllers/System/PluginPublicPagesController.php`
- `backend/app/Controllers/System/PluginSidebarController.php`
- `backend/app/Controllers/System/PluginWidgetController.php`

### `featherpanel:system:plugins:ui:packs:retrieved`

- **Method:** `onUiPacksRetrieved`
- **Emitted:** yes
- **Callback docs:** array UI packs from Frontend/ui.json aggregations.
- **Data keys:** `packs`

**Source files**

- `backend/app/Controllers/System/PluginUiPacksController.php`

### `featherpanel:system:plugins:ui:widgets:retrieved`

- **Method:** `onWidgetsRetrieved`
- **Emitted:** yes
- **Callback docs:** array widgets by page/location, array context metadata.
- **Data keys:** `context`, `page_filter`, `widgets`

**Source files**

- `backend/app/Controllers/System/PluginWidgetController.php`

