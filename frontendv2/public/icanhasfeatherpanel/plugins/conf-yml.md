# Plugin Manifest: `conf.yml`

Path: `backend/storage/addons/{identifier}/conf.yml`

Validated by `App\Plugins\PluginConfig` and `PluginEntryValidator`.

## Top-level shape

```yaml
plugin:
  # required fields…
config:
  # optional admin settings schema (array)
# mixins:  # optional; see note below
```

## Required `plugin` fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | **Entry class name** (e.g. `DiscordPlus` → `DiscordPlus.php`) |
| `identifier` | string | Must match folder name; `[a-zA-Z0-9_]+` |
| `description` | string | Short description |
| `flags` | array | At least one known flag |
| `version` | string | Semver string used for updates |
| `target` | string | Panel target label (common: `v2`, `v3`) |
| `author` | array | List of author names |
| `icon` | string | Icon URL |
| `dependencies` | array | Dependency strings (may be empty) |
| `requiredConfigs` | array | Setting keys that must exist when configured |

## Optional `plugin` fields

| Field | Type | Description |
|-------|------|-------------|
| `plugin_cloud_id` | string \| int | Marketplace / cloud registry id |
| `minimum_panel_version` | string | Semver floor |
| `maximum_panel_version` | string | Semver ceiling |

## Flags

Allowed values (`PluginFlags`):

- `hasEvents`
- `hasInstallScript`
- `hasRemovalScript`
- `hasUpdateScript`
- `developerIgnoreInstallScript`
- `developerEscalateInstallScript`
- `userEscalateInstallScript`

`PluginFlags::validFlags` requires that **at least one** entry in your array is a known flag.

Flags are primarily metadata for admin/marketplace UX. Lifecycle methods still run when invoked by install/update/uninstall code paths.

## Dependencies

Each string uses a prefix:

```yaml
dependencies:
  - php=8.5
  - php-ext=pdo
  - php-ext=curl
  - composer=guzzlehttp/guzzle:^7
  - plugin=billingcore
```

| Prefix | Checks |
|--------|--------|
| `php=` | PHP version |
| `php-ext=` | PHP extension loaded |
| `composer=` | Composer package available |
| `plugin=` | Another addon identifier present/enabled |

## `requiredConfigs` vs `config:`

- **`plugin.requiredConfigs`**: list of setting **keys** that must be present in `featherpanel_addons_settings` for the plugin to count as configured.
- **`config:`** (top-level array): schema for the admin settings UI and defaults.

### Admin config field object

```yaml
config:
  - name: api_token
    display_name: "API token"
    type: password          # text | textarea | url | email | password | number | boolean | file
    description: "Token used to call the external API."
    required: true
    validation: {}
    default: ""
  - name: enabled
    display_name: "Enabled"
    type: boolean
    description: "Master switch."
    required: false
    validation: {}
    default: "true"
```

Defaults and stored values are strings. Booleans are typically `"true"` / `"false"`.

## Full example

```yaml
plugin:
  name: DiscordPlus
  identifier: discordplus
  description: "Search users by Discord ID and optionally require Discord linking."
  flags:
    - hasEvents
    - hasInstallScript
    - hasRemovalScript
    - hasUpdateScript
  version: 1.0.0
  target: v2
  author:
    - FeatherPanel
  icon: "https://cdn.discordapp.com/embed/avatars/0.png"
  requiredConfigs: []
  dependencies:
    - php-ext=pdo
  # optional:
  # minimum_panel_version: "1.4.0"
config:
  - name: require_discord_link
    display_name: "Require Discord link"
    type: boolean
    description: "Users must link Discord before using the panel."
    required: false
    validation: {}
    default: "false"
```

## Identifier rules

Runtime (`PluginConfig::isValidIdentifier`):

- Non-empty
- No whitespace
- Matches `^[a-zA-Z0-9_]+$`

Installer paths may accept hyphens in some places — **do not rely on that**. Use underscores or concatenated lowercase words.

## Entry class resolution

1. Prefer `App\Addons\{identifier}\{plugin.name}`
2. Fallback: single root `*.php` that implements `AppPlugin`
3. Namespace **must** be `App\Addons\{identifier}`

Mismatch between `plugin.name` and class/file fails package validation.

## Mixins note

Mixin validation historically inspects `plugin.mixins`, while some loaders read top-level `mixins:`. There are few (if any) live marketplace examples. Prefer avoiding custom mixins unless you verify against current `MixinManager` behavior, or keep configuration in both places only if you know the panel version you target.
