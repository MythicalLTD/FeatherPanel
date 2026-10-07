# Packaging, Install & Distribution

## Install location

```
backend/storage/addons/{identifier}/
```

`plugin.identifier` must match the folder name.

## Pre-install validation

`PluginEntryValidator::validatePackage($dir)` checks:

1. `conf.yml` parses and passes `PluginConfig::isConfigValid`
2. Identifier valid
3. Entry class file / discoverable `AppPlugin`
4. Namespace `App\Addons\{identifier}`
5. Implements `AppPlugin`

## `.fpa` packages

Password-protected ZIP used by marketplace / upload install.

- Extract via PHP `ZipArchive` (AES) with `unzip` fallback
- Upload: `POST /api/admin/plugins/upload/install`
- Prefer **Export** in developer mode over hand-rolled zips

## Install / update steps (panel)

Approximate order:

1. Extract / stage  
2. Validate entry + conf  
3. On update: backup `Storage/` + settings  
4. Replace addon tree  
5. Restore `Storage/`  
6. Symlink `Public/` → `public/addons/{identifier}`  
7. Symlink `Frontend/Components/` → `public/components/{identifier}`  
8. Run `Migrations/*.sql`  
9. Call `pluginUpdate` or `pluginInstall`  
10. Record installed plugin metadata  

**Never wipe `Storage/`** in your uninstall/update logic unless intentional — the panel preserves it across marketplace updates (e.g. billing file store uploads).

## Manual / git installs

Copy into `storage/addons/{identifier}/`, restart PHP-FPM/opcache if needed, `php fuse migrate`, ensure Components/Public symlinks exist.

## What to ship

**Include:** conf.yml, entry class, Routes, Controllers, Migrations, Cron, Commands, built `Frontend/Components`, manifest JSON, README  

**Exclude:** `Frontend/App/node_modules/`, build caches, `.git`, secrets, panel core files  

## Cloud fields

```yaml
plugin:
  plugin_cloud_id: 12345
  minimum_panel_version: "1.4.0"
  maximum_panel_version: "2.0.0"
```

## Operator checklist

1. Enable / configure settings (`requiredConfigs`)  
2. Hit new API routes  
3. Confirm sidebar/widgets/public pages appear (hard refresh)  
4. Confirm theme/UI packs selectable if shipped  
5. Check `backend/storage/logs/` on failure  

## Related

- [examples.md](./examples.md) · [database.md](./database.md) · [ai-guide.md](./ai-guide.md)
