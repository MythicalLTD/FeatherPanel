# Migrations & Chat Models

## SQL Migrations

### Path

```
{identifier}/Migrations/*.sql
```

### When they run

1. Addon install / update (`CloudPluginsController::runAddonMigrations`)
2. `php fuse migrate` (includes plugin migrations with a namespaced tracking id)

Tracked in `featherpanel_migrations`.

### Conventions

- Prefer table names `featherpanel_{identifier}_…` or a clear product prefix (`featherpanel_imagehosting_*` in featherimages)
- Use InnoDB + `utf8mb4`
- Prefer idempotent statements: `CREATE TABLE IF NOT EXISTS`, `INSERT IGNORE`
- Filename with timestamp prefix, e.g. `2025-12-15-01.00-image_hosting.sql`
- Add FKs carefully; match core user/server id types

### Example (featherimages style)

```sql
CREATE TABLE IF NOT EXISTS `featherpanel_imagehosting_uploads` (
  `id` INT NOT NULL AUTO_INCREMENT,
  -- columns…
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

### Generating

```bash
php fuse makemigration   # via devutils patterns / plugin file creator
```

Or Dev → Plugins → create migration file.

---

## Chat models (data access)

Optional PHP classes under:

```
{identifier}/Chat/{Model}.php
namespace App\Addons\{identifier}\Chat;
```

Pattern mirrors core `App\Chat\*` models: static methods, PDO via `App\Chat\Database::getPdoConnection()`, private `$table` string.

### Real example — featherimages `Chat/Upload.php`

```php
namespace App\Addons\featherimages\Chat;

use App\App;
use App\Chat\Database;

class Upload
{
    private static string $table = 'featherpanel_imagehosting_uploads';

    public static function getById(int $id): ?array
    {
        try {
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
            $stmt->execute(['id' => $id]);
            $result = $stmt->fetch(\PDO::FETCH_ASSOC);
            return $result ?: null;
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to get upload by ID: ' . $e->getMessage());
            return null;
        }
    }
}
```

Also study: `billinglinks/Chat/Link.php`.

### Guidelines

1. Never concatenate user input into SQL — use bound parameters  
2. Soft-delete flags often use string `'true'` / `'false'` to match panel conventions  
3. Keep business logic in Controllers/Services; Chat classes = persistence  
4. Log failures; return `null` / empty arrays rather than throwing through HTTP layers unchecked  

---

## Storage directory vs database

| Path | Purpose |
|------|---------|
| `Migrations/` | Schema |
| `Chat/` | PDO access code |
| `Storage/` | Durable files (uploads); preserved across marketplace updates |
| `Public/` | Publicly served static files → `/addons/{id}/` |

Do **not** put large binaries in git; write into `Storage/` at runtime.

## Related

- [examples.md](./examples.md) — featherimages, billinglinks  
- [backend.md](./backend.md) — controllers calling Chat models  
- [packaging.md](./packaging.md) — Storage preservation on update  
