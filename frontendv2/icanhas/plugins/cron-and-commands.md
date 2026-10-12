# Cron Jobs & CLI Commands

## Addon Cron jobs

### Location & discovery

```
{identifier}/Cron/{ClassName}.php
```

Loaded by `backend/storage/cron/runner.php` (separate from core jobs in `backend/storage/cron/php/`).

**Required namespace:**

```php
namespace App\Addons\{identifier}\Cron;
```

⚠️ Some older starter scaffolds incorrectly used `namespace App\Cron;` — that is for **core** cron only. Addon jobs must use the `App\Addons\…\Cron` namespace (as `devutils` `MakePluginCron` and `createPluginCron` generate).

### Interface

Implement `App\Cron\TimeTask` with `public function run(): void` (or `run()`).

### Real example — `billinglinks`

Path: `backend/storage/addons/billinglinks/Cron/LinkPurgeCron.php`

```php
namespace App\Addons\billinglinks\Cron;

use App\Cron\Cron;
use App\Cron\TimeTask;
use App\Chat\TimedTask;

class LinkPurgeCron implements TimeTask
{
    public function run(): void
    {
        $cron = new Cron('billinglinks-link-purge', '1D');
        try {
            $cron->runIfDue(function () {
                // …purge work…
                TimedTask::markRun('billinglinks-link-purge', true, 'Link purge completed');
            });
        } catch (\Exception $e) {
            TimedTask::markRun('billinglinks-link-purge', false, $e->getMessage());
        }
    }
}
```

### Schedule tokens

`Cron` schedule strings are panel cron intervals (examples seen in code: `'1D'`, `'1H'`). Use the same helpers as core timed tasks.

### Empty Cron dirs

Some plugins (e.g. `fivemutils`) ship an empty `Cron/` folder — harmless. Prefer omitting empty dirs.

### Generating Cron via tooling

```bash
# with devutils installed
php fuse makeplugincron
```

Or Admin → Dev → Plugins → create file type cron (developer mode).

---

## CLI Commands

### Location & discovery

```
{identifier}/Commands/{CommandName}.php
```

Namespace: `App\Addons\{identifier}\Commands`

Discovered by `backend/app/Cli/App.php`. Match is **case-insensitive class basename**.

### Invoke

```bash
php fuse {CommandName}
# examples from devutils:
php fuse exportpermissions
php fuse makeplugincron
php fuse makeplugincommand
```

### Contract (`CommandBuilder`)

```php
namespace App\Addons\myplugin\Commands;

use App\Cli\App;
use App\Cli\CommandBuilder;

class HelloWorld implements CommandBuilder
{
    public static function execute(array $args): void
    {
        $app = App::getInstance();
        $app->send('&aHello from myplugin');
    }

    public static function getDescription(): string
    {
        return 'Say hello';
    }

    public static function getSubCommands(): array
    {
        return [];
    }
}
```

### Real example family — `devutils`

`backend/storage/addons/devutils/Commands/` includes generators:

- `MakePluginCommand`, `MakePluginCron`, `MakeMigration`, `MakeCommand`
- `FrontendBuild`, `FrontendWatch`, `BackendWatch`, `BackendLint`
- `ExportPermissions`, `Colors`, …

Study these when building author tooling — not required for normal feature plugins.

### Colorized CLI output

`App\Cli\App::send()` supports Minecraft-style color codes (`&a`, `&c`, `&e`, …) via the CLI utilities.

---

## Checklist

- [ ] Cron class namespace is `App\Addons\{id}\Cron`
- [ ] Cron implements `TimeTask` and uses `Cron::runIfDue`
- [ ] Cron id string is unique (`{plugin}-{task}`)
- [ ] Command class implements `CommandBuilder`
- [ ] Command name does not collide with core fuse commands
- [ ] No secrets printed to CLI logs
