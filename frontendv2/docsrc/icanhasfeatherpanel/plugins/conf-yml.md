# Plugin Manifest: `conf.yml`

Path: `backend/storage/addons/{identifier}/conf.yml`  
Validated by `PluginConfig` + `PluginEntryValidator`.

## Top-level shape

```yaml
plugin: { … }     # required
config: [ … ]     # optional admin settings schema
mixins: { … }     # optional — see mixins.md (also validation quirk)
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
| `requiredConfigs` | array | setting keys that must exist |

## Optional `plugin` fields

| Field | Type |
|-------|------|
| `plugin_cloud_id` | string \| int |
| `minimum_panel_version` / `maximum_panel_version` | semver strings |
| `mixins` | object — see [mixins.md](./mixins.md) |

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

## `requiredConfigs` vs `config:`

- **`requiredConfigs`**: keys that must exist in settings DB (`minecraftpluginmanger` → `curseforge_api_key`)
- **`config:`**: admin UI schema + defaults

### Config field object

```yaml
config:
  - name: curseforge_api_key
    display_name: "CurseForge API key"
    type: text              # text | textarea | url | email | password | number | boolean | file
    description: "…"
    required: true
    validation: {}
    default: ""
```

Booleans stored as `"true"` / `"false"` strings.

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

See `backend/storage/addons/discordplus/conf.yml` — boolean toggles + gate message text. Full walkthrough: [examples.md](./examples.md).

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
