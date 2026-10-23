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

`namespace App\Cron;` is for **core** cron jobs only. The runner loads addon jobs as `App\Addons\{identifier}\Cron\{ClassName}`, so a class in any other namespace is never found. The `starter` template, the Admin → Dev → Plugins cron file creator and `devutils` `MakePluginCron` all generate the addon namespace. Plugins created with the `starter` template before this was fixed have `namespace App\Cron;` in `Cron/{ClassName}CronExample.php`; change it to `namespace App\Addons\{identifier}\Cron;`.

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

`new Cron($id, $interval)` takes an interval written as a whole number followed by a unit. The job runs when at least that much time has passed since its last run.

| Unit | Meaning | Example |
|------|---------|---------|
| `S` | seconds | `'30S'` |
| `M` | minutes | `'5M'` |
| `H` | hours | `'1H'` |
| `D` | days | `'1D'` |
| `W` | weeks | `'2W'` |
| `MO` | months (30 days) | `'1MO'` |
| `Y` | years (365 days) | `'1Y'` |

Units are upper case. Anything else (`'1d'`, `'1.5H'`, `'H'`) throws an `\Exception` when the `Cron` object is created. The installer schedules `runner.php` once a minute, so any interval under `60S` means the job runs on every runner pass.

### Empty Cron dirs

Some plugins (e.g. `fivemutils`) ship an empty `Cron/` folder — harmless. Prefer omitting empty dirs.

### Generating Cron via tooling

```bash
# with devutils installed
php cli makeplugincron
```

Or Admin → Dev → Plugins → create file type cron (developer mode).

---

## CLI Commands

### Location & discovery

```
{identifier}/Commands/{CommandName}.php
```

Namespace: `App\Addons\{identifier}\Commands`

Discovered by `backend/app/Cli/Utils/PluginCommandLocator.php` (used by `backend/app/Cli/App.php` and `help`). The command name is the **case-insensitive class basename**.

The locator reads the addons directory from `APP_ADDONS_DIR` (`backend/storage/addons`), so plugin commands work no matter which directory you run `php cli` from (including with `--skip-path-check`). Older installs that keep addons under `{cwd}/backend/storage/addons` are still checked as a fallback. Obsolete addons (see `ObsoleteAddons`) are skipped.

Plugin commands are checked **before** core commands. A plugin command named like a core command (`migrate`, `help`, `users`, …) replaces it, so pick a unique name.

### Invoke

Run from the backend directory (inside Docker: `docker exec -it featherpanel_backend php cli …`, or the `featherpanel` wrapper on the host):

```bash
php cli {commandname}
# examples from devutils:
php cli exportpermissions
php cli makeplugincron
php cli makeplugincommand
```

`php cli help` lists core commands and every plugin command it finds.

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
- [ ] Command name does not collide with a core `php cli` command
- [ ] No secrets printed to CLI logs
