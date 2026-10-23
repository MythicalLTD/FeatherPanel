# Plugin Mixins

Mixins are reusable PHP capabilities that plugins can opt into. Core code lives under `backend/app/Plugins/Mixins/`.

**Status:** the framework is wired in. On every web request boot, `PluginManager::loadKernel()` calls `MixinRegistry::registerMixins()` once, then loads each plugin and attaches the mixins it declares. The panel ships **no built-in mixins** (`MixinRegistry::registerBuiltInMixins()` is empty) and no live addons declare mixins yet, so a mixin id only resolves if a mixin class has been added to the panel as described below.

Documented so AIs do not invent wrong APIs, and so you can implement mixins correctly when you need them.

## What works

| Step | Behaviour |
|------|-----------|
| Registration | `MixinRegistry::registerMixins()` registers built-in mixins (none today) and every class in `backend/app/Plugins/Mixins/Custom/**/*.php` that implements `AppMixin`. It runs once per process, before any plugin is loaded. |
| Declaration | A plugin lists mixin ids in `conf.yml` (see below). Both the top-level `mixins` map and `plugin.mixins` are read and validated. |
| Attach | While the plugin loads, `MixinManager::loadMixinsForPlugin()` creates one instance per declared id and calls `initialize($pluginIdentifier, $options)`. |
| Access | `PluginProcessor::getMixin($id, $mixinId)`, `PluginProcessor::getMixins($id)`, `$pluginManager->getPluginMixins($id)`, `$pluginManager->hasPluginMixin($id, $mixinId)`. |

Limits:

- Mixins are attached only in the web kernel boot. The cron runner (`CRON_MODE`) and `php cli` do not call `loadKernel()`, so no mixins are attached there.
- An unknown mixin id does not stop the plugin from loading. The panel logs `No mixin registered with identifier: …` and the plugin runs without it.
- Mixin classes are discovered only from the panel's `Custom/` directory. Classes inside an addon folder are not scanned. An addon can still call `MixinManager::registerMixin(MyMixin::class)` itself, but only plugins that load after that call can use it.
- Mixin ids must be unique. A second class with the same `getMixinIdentifier()` is rejected with a warning.

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

`AbstractMixin` implements `initialize()` and adds `getPluginIdentifier()`, `getConfig()`, `getConfigValue($key, $default)` and an `onInitialize()` hook.

## Declaring mixins on a plugin

Use the top-level `mixins` map. The key is the mixin id, the value is an options map passed to `initialize()` (`{}` or `null` for no options):

```yaml
plugin:
  name: MyPlugin
  identifier: myplugin
  # …required fields…
mixins:
  RateLimiter:
    per_minute: 30
```

`plugin.mixins` uses the same format and is read too, so manifests that only declare it there keep working. When both declare the same id, the top-level entry wins. A non-map value (for example `mixins: RateLimiter`) or a mixin entry whose options are not a map makes `conf.yml` invalid and the plugin is not loaded.

## Writing a custom mixin

1. Add the class to the panel at `backend/app/Plugins/Mixins/Custom/RateLimiter.php`:

```php
<?php

namespace App\Plugins\Mixins\Custom;

use App\Plugins\Mixins\AbstractMixin;

class RateLimiter extends AbstractMixin
{
    public static function getMixinIdentifier(): string
    {
        return 'RateLimiter';
    }

    public static function getMixinVersion(): string
    {
        return '1.0.0';
    }

    public function perMinute(): int
    {
        return (int) $this->getConfigValue('per_minute', 60);
    }
}
```

The namespace must match the folder (`App\Plugins\Mixins\Custom\…`) so the autoloader finds it.

2. Declare `RateLimiter` under `mixins:` in the plugin `conf.yml`.
3. Use it from the plugin:

```php
use App\Plugins\PluginProcessor;

$limiter = PluginProcessor::getMixin('myplugin', 'RateLimiter');
if ($limiter !== null) {
    $limit = $limiter->perMinute();
}
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
- `backend/app/Plugins/Mixins/Reflection/*` (advanced class patching, use carefully)
