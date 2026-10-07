# Packaging, Install & Distribution

## Install locations

Installed addons always expand to:

```
backend/storage/addons/{identifier}/
```

Identifier comes from `conf.yml` (`plugin.identifier`) and must match the folder name.

## Validation before install

`PluginEntryValidator::validatePackage($dir)` checks:

1. `conf.yml` exists and parses
2. `PluginConfig::isConfigValid`
3. Identifier valid
4. Entry class file present (`{plugin.name}.php` or single discoverable `AppPlugin`)
5. Namespace is `App\Addons\{identifier}`
6. Class implements `App\Plugins\AppPlugin`

Fix validation errors before packaging.

## `.fpa` packages

Marketplace / upload installs use a password-protected ZIP with the `.fpa` extension.

- Extracted via PHP `ZipArchive` (AES) with `unzip` fallback (`AddonPackageHelper`)
- Upload endpoint: `POST /api/admin/plugins/upload/install`
- Cloud/marketplace installs call the same perform-install path

Exact zip password is defined in `CloudPluginsController` for the development kit / panel packaging flow. Prefer exporting through the panel’s **Export** action in developer mode rather than inventing a zip by hand.

### Export (developer mode)

Admin Plugins / Plugin Manager export builds a zip with ignore patterns (e.g. `.featherexport` / node_modules exclusions). Use that artifact for distribution.

## Install steps (what the panel does)

Approximate order in `performAddonInstall`:

1. Extract / stage package
2. Validate entry + conf
3. Backup existing `Storage/` and settings on update
4. Copy/replace addon tree
5. Restore `Storage/`
6. Symlink `Public/` → `public/addons/{identifier}`
7. Symlink `Frontend/Components/` → `public/components/{identifier}`
8. Run `Migrations/*.sql`
9. Call `pluginUpdate` or `pluginInstall`
10. Record installed plugin metadata

## Updates

- Compare `plugin.version`
- Prefer implementing `pluginUpdate($old, $new)` for migrations of settings/data
- Never wipe `Storage/` in your uninstall/update logic unless intentional — panel tries to preserve it

## Manual / git installs

For development you can clone or copy directly into `storage/addons/{identifier}/`. Ensure:

- Composer autoload can see `App\Addons\…` (already configured)
- Opcache/PHP-FPM restarted if classes don’t appear
- Run `php fuse migrate` for SQL
- Create symlinks for Components/Public if the install path didn’t

## Cloud marketplace fields

Optional in `conf.yml`:

```yaml
plugin:
  plugin_cloud_id: 12345
  minimum_panel_version: "1.4.0"
  maximum_panel_version: "2.0.0"
```

## What to ship / what to ignore

**Ship:**

- `conf.yml`, entry class, Routes, Controllers, Migrations, Cron, Commands
- Built frontend assets under `Frontend/Components/`
- Manifest JSON files
- `README.md`

**Do not ship:**

- `Frontend/App/node_modules/`
- Build caches, `.git` (optional), local secrets
- Panel core files

## Post-install operator checklist

1. Admin → Plugins → enable / configure settings
2. Fill `requiredConfigs` keys
3. Confirm routes respond
4. Confirm sidebar/widgets appear (hard refresh frontend)
5. Check logs under `backend/storage/logs/` on failure
