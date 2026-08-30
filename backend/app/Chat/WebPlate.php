<?php

/*
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studios
 * Copyright (C) 2025 FeatherPanel Contributors
 * Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

namespace App\Chat;

use App\App;
use App\Helpers\WebPlateDefaults;

/**
 * WebPlate — web-hosting templates for FeatherQuilld (not Spells / game eggs).
 */
class WebPlate
{
    /** @var list<string> */
    public const RUNTIMES = ['static', 'php', 'node', 'python', 'custom'];
    private static string $table = 'featherpanel_webplates';

    /** @var array<int, string> */
    private static array $allowedFields = [
        'id',
        'uuid',
        'author',
        'name',
        'description',
        'runtime',
        'docker_image',
        'document_root',
        'startup',
        'container_port',
        'script_container',
        'script_entry',
        'script_install',
        'default_schedules',
    ];

    public static function isValidUuid(string $uuid): bool
    {
        return (bool) preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $uuid);
    }

    public static function isValidRuntime(string $runtime): bool
    {
        return in_array(strtolower($runtime), self::RUNTIMES, true);
    }

    /**
     * Infer runtime from a Docker image name. Empty image → static.
     */
    public static function inferRuntimeFromDockerImage(?string $image): string
    {
        $s = strtolower(trim((string) $image));
        if ($s === '') {
            return 'static';
        }

        $withoutDigest = str_contains($s, '@') ? explode('@', $s, 2)[0] : $s;
        $name = str_contains($withoutDigest, ':')
            ? substr($withoutDigest, 0, (int) strrpos($withoutDigest, ':'))
            : $withoutDigest;

        if (preg_match('/\bphp\b|\bfpm\b|laravel/', $name) === 1) {
            return 'php';
        }
        if (preg_match('/\bnode\b|\bbun\b|\bdeno\b/', $name) === 1) {
            return 'node';
        }
        if (preg_match('/\bpython\b|gunicorn|uvicorn|django/', $name) === 1) {
            return 'python';
        }

        return 'custom';
    }

    /**
     * Blank / "." → site root (empty string). Strips leading/trailing slashes.
     */
    public static function normalizeDocumentRoot(mixed $value): string
    {
        $root = trim((string) ($value ?? ''));
        $root = str_replace('\\', '/', $root);
        $root = trim($root, '/');
        if ($root === '' || $root === '.') {
            return '';
        }

        $parts = [];
        foreach (explode('/', $root) as $part) {
            if ($part === '' || $part === '.') {
                continue;
            }
            if ($part === '..') {
                return '';
            }
            $parts[] = $part;
        }

        return implode('/', $parts);
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function create(array $data): int | false
    {
        if (empty($data['uuid']) || !self::isValidUuid((string) $data['uuid'])) {
            $data['uuid'] = self::generateUuid();
        }

        $name = trim((string) ($data['name'] ?? ''));
        if ($name === '') {
            App::getInstance(true)->getLogger()->error('WebPlate create missing name');

            return false;
        }

        $dockerImage = trim((string) ($data['docker_image'] ?? ''));
        $runtime = array_key_exists('runtime', $data)
            ? strtolower(trim((string) $data['runtime']))
            : self::inferRuntimeFromDockerImage($dockerImage);
        if ($dockerImage === '') {
            $runtime = 'static';
        } elseif ($runtime === '' || !self::isValidRuntime($runtime)) {
            $runtime = self::inferRuntimeFromDockerImage($dockerImage);
        }
        if (!self::isValidRuntime($runtime)) {
            App::getInstance(true)->getLogger()->error('WebPlate create invalid runtime: ' . $runtime);

            return false;
        }

        $row = [
            'uuid' => (string) $data['uuid'],
            'author' => trim((string) ($data['author'] ?? 'system')) ?: 'system',
            'name' => $name,
            'description' => (string) ($data['description'] ?? ''),
            'runtime' => $runtime,
            'docker_image' => $dockerImage,
            'document_root' => self::normalizeDocumentRoot($data['document_root'] ?? ''),
            'startup' => (string) ($data['startup'] ?? ''),
            'container_port' => isset($data['container_port']) && is_numeric($data['container_port'])
                ? max(0, (int) $data['container_port'])
                : 0,
            'script_container' => trim((string) ($data['script_container'] ?? 'alpine:3.20')) ?: 'alpine:3.20',
            'script_entry' => trim((string) ($data['script_entry'] ?? 'ash')) ?: 'ash',
            'script_install' => (string) ($data['script_install'] ?? ''),
            'default_schedules' => self::encodeDefaultSchedules($data['default_schedules'] ?? []),
        ];

        $pdo = Database::getPdoConnection();
        $fields = array_keys($row);
        $placeholders = array_map(fn ($f) => ':' . $f, $fields);
        $sql = 'INSERT INTO ' . self::$table . ' (`' . implode('`,`', $fields) . '`) VALUES (' . implode(',', $placeholders) . ')';
        $stmt = $pdo->prepare($sql);

        if ($stmt->execute($row)) {
            return (int) $pdo->lastInsertId();
        }

        App::getInstance(true)->getLogger()->error('Failed to create WebPlate: ' . json_encode($stmt->errorInfo()));

        return false;
    }

    /** @return array<string, mixed>|null */
    public static function getById(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;

        return $row ?: null;
    }

    /** @return array<string, mixed>|null */
    public static function getByUuid(string $uuid): ?array
    {
        if (!self::isValidUuid($uuid)) {
            return null;
        }

        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE uuid = :uuid LIMIT 1');
        $stmt->execute(['uuid' => $uuid]);
        $row = $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;

        return $row ?: null;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function listAll(int $page = 1, int $limit = 50, ?string $runtime = null, ?string $search = null): array
    {
        $page = max(1, $page);
        $limit = max(1, min(200, $limit));
        $offset = ($page - 1) * $limit;

        $pdo = Database::getPdoConnection();
        $where = [];
        $params = [];

        if ($runtime !== null && self::isValidRuntime($runtime)) {
            $where[] = 'runtime = :runtime';
            $params['runtime'] = strtolower($runtime);
        }

        if ($search !== null && trim($search) !== '') {
            $where[] = '(name LIKE :search OR description LIKE :search OR author LIKE :search)';
            $params['search'] = '%' . trim($search) . '%';
        }

        $sql = 'SELECT * FROM ' . self::$table;
        if ($where !== []) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY id DESC LIMIT :limit OFFSET :offset';

        $stmt = $pdo->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }

    public static function countAll(?string $runtime = null, ?string $search = null): int
    {
        $pdo = Database::getPdoConnection();
        $where = [];
        $params = [];

        if ($runtime !== null && self::isValidRuntime($runtime)) {
            $where[] = 'runtime = :runtime';
            $params['runtime'] = strtolower($runtime);
        }

        if ($search !== null && trim($search) !== '') {
            $where[] = '(name LIKE :search OR description LIKE :search OR author LIKE :search)';
            $params['search'] = '%' . trim($search) . '%';
        }

        $sql = 'SELECT COUNT(*) FROM ' . self::$table;
        if ($where !== []) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return (int) $stmt->fetchColumn();
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function update(int $id, array $data): bool
    {
        if ($id <= 0 || !self::getById($id)) {
            return false;
        }

        if (isset($data['runtime'])) {
            $runtime = strtolower(trim((string) $data['runtime']));
            if (!self::isValidRuntime($runtime)) {
                return false;
            }
            $data['runtime'] = $runtime;
        }

        if (array_key_exists('document_root', $data)) {
            $data['document_root'] = self::normalizeDocumentRoot($data['document_root']);
        }

        if (array_key_exists('docker_image', $data)) {
            $data['docker_image'] = trim((string) ($data['docker_image'] ?? ''));
            if ($data['docker_image'] === '' && !isset($data['runtime'])) {
                $data['runtime'] = 'static';
            }
        }

        unset($data['id'], $data['uuid'], $data['created_at'], $data['updated_at']);
        $filtered = array_intersect_key($data, array_flip(self::$allowedFields));
        if ($filtered === []) {
            return false;
        }

        if (array_key_exists('default_schedules', $filtered)) {
            $filtered['default_schedules'] = self::encodeDefaultSchedules($filtered['default_schedules']);
        }

        $sets = [];
        foreach (array_keys($filtered) as $field) {
            $sets[] = '`' . $field . '` = :' . $field;
        }

        $filtered['id'] = $id;
        $pdo = Database::getPdoConnection();
        $sql = 'UPDATE ' . self::$table . ' SET ' . implode(', ', $sets) . ' WHERE id = :id';
        $stmt = $pdo->prepare($sql);

        return $stmt->execute($filtered);
    }

    /**
     * @param array<string, mixed>|null $plate
     *
     * @return list<array<string, mixed>>
     */
    public static function getDefaultSchedules(?array $plate): array
    {
        if ($plate === null) {
            return [];
        }

        return self::decodeDefaultSchedules($plate['default_schedules'] ?? null);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function decodeDefaultSchedules(mixed $raw): array
    {
        if ($raw === null || $raw === '') {
            return [];
        }

        if (is_string($raw)) {
            $decoded = json_decode($raw, true);

            return is_array($decoded) ? array_values($decoded) : [];
        }

        return is_array($raw) ? array_values($raw) : [];
    }

    public static function encodeDefaultSchedules(mixed $schedules): ?string
    {
        if ($schedules === null || $schedules === '' || $schedules === []) {
            return null;
        }

        if (is_string($schedules)) {
            $decoded = json_decode($schedules, true);
            if (!is_array($decoded) || $decoded === []) {
                return null;
            }

            return json_encode(array_values($decoded), JSON_UNESCAPED_SLASHES);
        }

        if (!is_array($schedules) || $schedules === []) {
            return null;
        }

        return json_encode(array_values($schedules), JSON_UNESCAPED_SLASHES);
    }

    public static function delete(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }

        $pdo = Database::getPdoConnection();
        $check = $pdo->prepare('SELECT COUNT(*) FROM featherpanel_webspaces WHERE webplate_id = :id');
        $check->execute(['id' => $id]);
        if ((int) $check->fetchColumn() > 0) {
            App::getInstance(true)->getLogger()->error('Cannot delete WebPlate ' . $id . ': still in use by WebSpaces');

            return false;
        }

        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE id = :id');

        return $stmt->execute(['id' => $id]);
    }

    /**
     * Daemon-facing plate identity.
     *
     * @param array<string, mixed> $plate
     *
     * @return array{id: string, name: string, runtime: string}
     */
    public static function toDaemonRef(array $plate): array
    {
        return [
            'id' => !empty($plate['uuid']) ? (string) $plate['uuid'] : (string) ($plate['id'] ?? ''),
            'name' => (string) ($plate['name'] ?? ''),
            'runtime' => (string) ($plate['runtime'] ?? 'static'),
            'container_port' => (int) ($plate['container_port'] ?? 0),
            'startup' => (string) ($plate['startup'] ?? ''),
            'docker_image' => (string) ($plate['docker_image'] ?? ''),
        ];
    }

    /**
     * Install payload for FeatherQuilld.
     *
     * @param array<string, mixed> $plate
     *
     * @return array{container_image: string, entrypoint: string, script: string}
     */
    public static function toInstallConfig(array $plate): array
    {
        return [
            'container_image' => trim((string) ($plate['script_container'] ?? '')) ?: 'alpine:3.20',
            'entrypoint' => trim((string) ($plate['script_entry'] ?? '')) ?: 'ash',
            'script' => (string) ($plate['script_install'] ?? ''),
        ];
    }

    /**
     * Upsert bundled system WebPlates (fixed UUIDs).
     * Creates missing plates; refreshes rows that still have author = system.
     * Skips plates whose author was changed (local fork).
     *
     * @return array{created: int, updated: int, skipped: int}
     */
    public static function seedSystemDefaults(): array
    {
        $created = 0;
        $updated = 0;
        $skipped = 0;

        foreach (WebPlateDefaults::definitions() as $definition) {
            $uuid = (string) ($definition['uuid'] ?? '');
            if ($uuid === '' || !self::isValidUuid($uuid)) {
                ++$skipped;
                continue;
            }

            $existing = self::getByUuid($uuid);
            if ($existing === null) {
                $id = self::create($definition);
                if ($id === false) {
                    ++$skipped;
                    continue;
                }
                ++$created;
                continue;
            }

            $author = strtolower(trim((string) ($existing['author'] ?? '')));
            if ($author !== WebPlateDefaults::AUTHOR) {
                ++$skipped;
                continue;
            }

            $payload = $definition;
            unset($payload['uuid']);
            if (!self::update((int) $existing['id'], $payload)) {
                ++$skipped;
                continue;
            }
            ++$updated;
        }

        return [
            'created' => $created,
            'updated' => $updated,
            'skipped' => $skipped,
        ];
    }

    private static function generateUuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0F) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3F) | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
