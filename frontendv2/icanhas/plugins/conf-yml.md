# Plugin Manifest: `conf.yml`

Path: `backend/storage/addons/{identifier}/conf.yml`  
Validated by `PluginConfig` + `PluginEntryValidator`.

## Top-level shape

```yaml
plugin: { … }     # required
config: [ … ]     # optional admin settings schema
mixins: { … }     # optional, see mixins.md
```

## Required `plugin` fields

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | **Entry class name** (`DiscordPlus` → `DiscordPlus.php`) |
| `identifier` | string | === folder name; `[a-zA-Z0-9_]+` |
| `description` | string | |
| `flags` | array | ≥1 known flag |
| `version` | string | Semver for updates |
| `target` | string | e.g. `v2`, `v3` |
| `author` | array | |
| `icon` | string | URL |
| `dependencies` | array | may be `[]` |
| `requiredConfigs` | array | setting keys that need a non-empty value, may be `[]` |

## Optional `plugin` fields

| Field | Type |
|-------|------|
| `plugin_cloud_id` | string \| int |
| `minimum_panel_version` / `maximum_panel_version` | semver strings |
| `mixins` | object, same format as top-level `mixins` (both are read). See [mixins.md](./mixins.md) |

## Flags

`hasEvents`, `hasInstallScript`, `hasRemovalScript`, `hasUpdateScript`, `developerIgnoreInstallScript`, `developerEscalateInstallScript`, `userEscalateInstallScript`

At least one must be a known flag. Lifecycle methods still run when install/update code invokes them.

## Dependencies

```yaml
dependencies:
  - php=8.5
  - php-ext=pdo
  - php-ext=curl          # fivemutils
  - composer=guzzlehttp/guzzle:^7
  - plugin=billingcore    # billinglinks
```

## `config:` admin settings

`config:` is a list of fields. The admin plugin page (Admin → Plugins → {plugin} → Settings) renders one input per field and saves each value with `POST /api/admin/plugins/{identifier}/settings/set`. Values are stored as strings in `featherpanel_addons_settings` and read with `PluginSettings::getSetting($identifier, $name)`.

Use `config: {}` or leave it out when the plugin has no settings.

### Config field object

```yaml
config:
  - name: curseforge_api_key          # setting key, required
    display_name: "CurseForge API key"
    type: text              # text | textarea | url | email | password | number | boolean | file
    description: "…"
    required: true
    default: ""
    validation:             # optional, every key is optional
      regex: '/^[A-Za-z0-9$._-]{20,}$/'
      min: 20
      max: 120
      message: "Paste the API key from the CurseForge console."
```

| Key | What the panel does with it |
|-----|-----------------------------|
| `name` | Setting key. Fields without a `name` are ignored. |
| `display_name`, `description` | Label and help text in the admin form. `display_name` is also used in error messages. |
| `type` | Picks the input. `number` must be numeric, `boolean` must be `true`/`false`/`1`/`0`, `email` must be an email address, `url` must be an `http` or `https` URL. The other types accept any text. `textarea` and `file` currently render as a text input. |
| `required` | `true` means the value cannot be saved empty (empty or only whitespace). The API rejects it and the admin form refuses to save until it is filled in. A required field without a value also makes the plugin "Not configured" (see below). |
| `default` | Saved as the value when the setting does not exist yet. Defaults are written after install and after every update (only for keys that are not stored yet, existing values are never overwritten), and when the admin opens the plugin settings page. `true`/`false` are stored as `"true"`/`"false"`, numbers as their string form. Leave it out or use `null` for no default. |
| `validation` | Extra rules, listed below. `validation: {}` means no extra rules. |

### `validation` rules

Rules only run on non-empty values. An empty optional field is always accepted.

| Rule | Type | Meaning |
|------|------|---------|
| `regex` | string | PCRE pattern **with delimiters** (`'/^\d+$/'`, `'#^https://#i'`). The value must match. A pattern that does not compile fails every save with "has an invalid validation pattern in conf.yml", so test it. |
| `min` | number | For `type: number` (or `validation.type: integer`/`number`): smallest allowed value. For every other type: shortest allowed length in characters. |
| `max` | number | Same as `min`, for the largest value or the longest length. |
| `type` | string | Extra format check on top of the field `type`: `string`, `integer` (whole number, optional leading `-`), `number`, `boolean`, `email` or `url`. |
| `message` | string | Replaces the generated error text when any rule fails. |

Example: a port typed into a text field.

```yaml
  - name: query_port
    display_name: "Query port"
    type: text
    required: false
    default: "25565"
    validation:
      type: integer
      min: 1
      max: 65535
```

When a value fails, `settings/set` answers `400` with `error_code: PLUGIN_SETTING_INVALID`, the error text in `message`, and `data: { "key": "query_port", "errors": ["Query port must be at most 65535."] }`. The developer-mode bulk endpoint `PUT`/`PATCH /api/admin/plugin-manager/{identifier}/settings` applies the same rules. Keys that are not declared in `config:` (for example the panel's own `plugin-sidebar-*` visibility keys) are not checked. `PluginSettings::setSetting()` called from PHP is not checked either.

The rules are implemented in `backend/app/Plugins/PluginSettingsSchema.php`.

## `requiredConfigs`

`plugin.requiredConfigs` lists setting keys the plugin needs before it is useful (`minecraftpluginmanger` → `curseforge_api_key`). Fields under `config:` with `required: true` count the same way.

A key with no stored value, or with an empty value, is reported as missing:

- The plugin is **still loaded**. Its routes, events and pages keep working.
- The admin API returns `plugin.missingConfigs` (the missing keys) and `plugin.configured: false` from `GET /api/admin/plugins` and `GET /api/admin/plugins/{identifier}/config`.
- The admin plugin list shows the plugin as "Not configured" with one badge per missing key, and the plugin settings tab shows a warning listing them.

If a feature must not run until the keys are set, check it in your own code:

```php
use App\Plugins\PluginRequiredConfigs;

if (!PluginRequiredConfigs::areRequiredConfigsSet('minecraftpluginmanger')) {
    return ApiResponse::error('CurseForge API key is not configured', 'CURSEFORGE_NOT_CONFIGURED', 503);
}
```

Give every key in `requiredConfigs` a matching `config:` field, otherwise the admin has no input to fill it in.

## Real manifests

### featherimages (minimal)

```yaml
plugin:
  name: FeatherImages
  identifier: featherimages
  description: 'Light as a feather image hosting inside FeatherPanel!'
  flags: [hasEvents]
  version: 2.0.3
  target: v2
  author: [NaysKutzu, MythicalSystems]
  icon: 'https://getsharex.com/img/image-effects/NeonRainbowGlow.png'
  requiredConfigs: {}
  dependencies:
    - php=8.5
    - php-ext=pdo
config: {}
```

### discordplus (settings-rich)

See `backend/storage/addons/discordplus/conf.yml` - boolean toggles + gate message text. Full walkthrough: [examples.md](./examples.md).

### billinglinks (plugin dependency)

```yaml
dependencies:
  - plugin=billingcore
  # plus php / php-ext as needed
```

## Identifier rules

Runtime: non-empty, no whitespace, `^[a-zA-Z0-9_]+$`.  
Do not use hyphens even if some installers are looser.

## Entry class alignment

1. File `{plugin.name}.php`
2. `namespace App\Addons\{identifier};`
3. `class {plugin.name} implements AppPlugin`

Mismatch fails package validation.
