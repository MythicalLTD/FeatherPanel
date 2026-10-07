# Plugin Mixins

Mixins are reusable PHP capabilities that plugins can opt into. Core code lives under `backend/app/Plugins/Mixins/`.

**Status:** the mixin framework exists (`AppMixin`, `MixinManager`, `MixinRegistry`, reflection helpers), but **no built-in mixins are registered** today (`MixinRegistry::registerBuiltInMixins()` is empty) and **no live addons declare mixins**. Custom classes would go in `backend/app/Plugins/Mixins/Custom/` (currently empty besides `.gitkeep`).

Documented so AIs do not invent wrong APIs — and so you can implement mixins correctly when you need them.

## `AppMixin` contract

```php
namespace App\Plugins\Mixins;

interface AppMixin
{
    public function initialize(string $pluginIdentifier, array $config = []): void;
    public static function getMixinIdentifier(): string;
    public static function getMixinVersion(): string;
}
```

`AbstractMixin` provides a base implementation you can extend.

## Declaring mixins on a plugin

**Runtime loader** (`MixinManager::loadMixinsForPlugin`) reads **top-level** YAML:

```yaml
plugin:
  name: MyPlugin
  identifier: myplugin
  # …required fields…
mixins:
  some-mixin-id:
    option: value
```

**Validation quirk:** `PluginConfig::isConfigValid()` historically looks for mixins on the **`plugin`** object (`plugin.mixins`). `getPluginMixinsConfig()` returns top-level `mixins`.

**Recommendation until core is unified:** put the same map in **both** places if you need validation + runtime:

```yaml
plugin:
  name: MyPlugin
  identifier: myplugin
  # …
  mixins:
    some-mixin-id: {}
mixins:
  some-mixin-id: {}
```

Or verify against your exact panel version before shipping.

## Registering a custom mixin class

1. Implement `AppMixin` under `backend/app/Plugins/Mixins/Custom/YourMixin.php` (panel core path — not inside the addon)
2. Ensure `MixinRegistry` discovers/registers it (see current `MixinRegistry` implementation for the scan/register path in your version)
3. Reference the mixin id from plugin YAML
4. Access via:

```php
$pluginManager->getPluginMixins('myplugin');
$pluginManager->hasPluginMixin('myplugin', 'some-mixin-id');
PluginProcessor::getMixin('myplugin', 'some-mixin-id');
```

## What mixins are *not*

- Not a substitute for `Routes/` / Controllers  
- Not Frontend manifests  
- Not automatically Composer packages  

Prefer plain PHP helpers under `Helpers/` or `Services/` inside your addon unless you need cross-plugin reusable core-registered behavior.

## Related core files

- `backend/app/Plugins/Mixins/AppMixin.php`
- `backend/app/Plugins/Mixins/AbstractMixin.php`
- `backend/app/Plugins/Mixins/MixinManager.php`
- `backend/app/Plugins/Mixins/MixinRegistry.php`
- `backend/app/Plugins/Mixins/Reflection/*` (advanced class patching — use carefully)
