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
use App\Helpers\BlockedEmailDomainImportUrlValidator;
use App\Helpers\EmailDomainValidator;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

/**
 * Persisted hostname blocklist used by EmailDomainValidator.
 */
class BlockedEmailDomain
{
    private static string $table = 'featherpanel_blocked_email_domains';

    /** Bundled disposable-domain lines (domains_mx.txt) for admin “import preset”. */
    public static function presetFilePath(): string
    {
        return dirname(__DIR__) . '/Helpers/Data/disposable-email-domains.txt';
    }

    /**
     * Normalize user input (domain string or full email) to a lowercase hostname or null if invalid.
     */
    public static function normalizeDomainInput(string $raw): ?string
    {
        $raw = trim($raw);
        if ($raw === '') {
            return null;
        }
        if (str_contains($raw, '@')) {
            if (!filter_var($raw, \FILTER_VALIDATE_EMAIL)) {
                return null;
            }
            $domain = EmailDomainValidator::extractDomain($raw);
        } else {
            $domain = strtolower(ltrim($raw, '@'));
            if (function_exists('idn_to_ascii')) {
                $ascii = idn_to_ascii($domain, \IDNA_DEFAULT, \INTL_IDNA_VARIANT_UTS46);
                if ($ascii !== false) {
                    $domain = strtolower((string) $ascii);
                }
            }
        }
        if ($domain === null || $domain === '') {
            return null;
        }
        if (strlen($domain) > 253) {
            return null;
        }
        if (!str_contains($domain, '.')) {
            return null;
        }
        if (!preg_match('/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/', $domain)) {
            return null;
        }

        return $domain;
    }

    /**
     * @return array<string, true>
     */
    public static function fetchAllDomainsAsFlip(): array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->query('SELECT `domain` FROM ' . self::$table);
        if ($stmt === false) {
            return [];
        }
        $flip = [];
        while ($row = $stmt->fetch(\PDO::FETCH_ASSOC)) {
            $d = strtolower(trim((string) ($row['domain'] ?? '')));
            if ($d !== '') {
                $flip[$d] = true;
            }
        }

        return $flip;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function search(int $page = 1, int $limit = 20, string $search = ''): array
    {
        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 20;
        }
        if ($limit > 100) {
            $limit = 100;
        }
        $offset = ($page - 1) * $limit;
        $pdo = Database::getPdoConnection();
        $params = [];
        $where = '';
        if ($search !== '') {
            $where = ' WHERE `domain` LIKE :search';
            $params['search'] = '%' . $search . '%';
        }
        $sql = 'SELECT `id`, `domain`, `source`, `created_at` FROM ' . self::$table . $where
            . ' ORDER BY `domain` ASC LIMIT :limit OFFSET :offset';
        $stmt = $pdo->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
    }

    public static function countSearch(string $search = ''): int
    {
        $pdo = Database::getPdoConnection();
        if ($search === '') {
            $n = $pdo->query('SELECT COUNT(*) FROM ' . self::$table);

            return $n ? (int) $n->fetchColumn() : 0;
        }
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM ' . self::$table . ' WHERE `domain` LIKE :search');
        $stmt->execute(['search' => '%' . $search . '%']);

        return (int) $stmt->fetchColumn();
    }

    public static function create(string $domain, string $source = 'manual'): int | false
    {
        if (!in_array($source, ['manual', 'preset', 'import'], true)) {
            $source = 'manual';
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare(
            'INSERT INTO ' . self::$table . ' (`domain`, `source`) VALUES (:domain, :source)'
        );
        try {
            if ($stmt->execute(['domain' => $domain, 'source' => $source])) {
                return (int) $pdo->lastInsertId();
            }
        } catch (\PDOException) {
            return false;
        }

        return false;
    }

    public static function deleteById(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM ' . self::$table . ' WHERE `id` = :id');

        return $stmt->execute(['id' => $id]) && $stmt->rowCount() > 0;
    }

    /**
     * Import plaintext (one domain per line, # comments). Source is `preset` (bundled) or `import` (URL/paste).
     *
     * @return array{inserted: int, skipped_lines: int}|false
     */
    public static function importFromDecodedText(string $text, string $source = 'import'): array | false
    {
        $text = str_replace("\0", '', $text);
        if ($source !== 'preset' && $source !== 'import') {
            $source = 'import';
        }
        $lines = preg_split('/\R/', $text) ?: [];

        return self::persistDomainLines($lines, $source);
    }

    /**
     * Fetch a public list URL (no redirects) and import. URL must pass BlockedEmailDomainImportUrlValidator first.
     *
     * @return array{inserted: int, skipped_lines: int}|false
     */
    public static function importFromRemoteUrl(string $validatedUrl, int $maxBytes = 12582912): array | false
    {
        try {
            $client = new Client([
                'timeout' => 45,
                'connect_timeout' => 12,
                'http_errors' => false,
                'allow_redirects' => false,
                'headers' => [
                    'User-Agent' => 'FeatherPanel-BlockedEmailDomainImport/1.0',
                    'Accept' => 'text/plain,text/*,*/*;q=0.8',
                ],
            ]);
            $response = $client->get($validatedUrl);
        } catch (GuzzleException $e) {
            App::getInstance(true)->getLogger()->warning('Blocked email domain URL import: ' . $e->getMessage());

            return false;
        }

        $code = $response->getStatusCode();
        if ($code < 200 || $code >= 300) {
            return false;
        }

        $body = '';
        try {
            $stream = $response->getBody();
            while (!$stream->eof()) {
                $body .= $stream->read(65536);
                if (strlen($body) > $maxBytes) {
                    return false;
                }
            }
        } catch (\Throwable) {
            return false;
        }

        return self::importFromDecodedText($body, 'import');
    }

    /**
     * Import domains from the bundled preset file. Skips duplicates (INSERT IGNORE).
     *
     * @return array{inserted: int, skipped_lines: int}|false
     */
    public static function importFromPresetFile(?string $path = null): array | false
    {
        $file = $path ?? self::presetFilePath();
        if (!is_readable($file)) {
            return false;
        }
        $lines = file($file, \FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            return false;
        }

        return self::persistDomainLines($lines, 'preset');
    }

    /**
     * @param list<string>           $lines
     * @param 'preset'|'import'      $source
     *
     * @return array{inserted: int, skipped_lines: int}|false
     */
    private static function persistDomainLines(array $lines, string $source): array | false
    {
        if ($source !== 'preset' && $source !== 'import') {
            $source = 'import';
        }
        $pdo = Database::getPdoConnection();
        $inserted = 0;
        $skippedLines = 0;

        $pdo->beginTransaction();
        try {
            $placeholders = [];
            $params = [];
            $pi = 0;
            foreach ($lines as $line) {
                $d = strtolower(trim((string) $line));
                if ($d === '' || str_starts_with($d, '#')) {
                    continue;
                }
                if (strlen($d) > 253 || !str_contains($d, '.')) {
                    ++$skippedLines;

                    continue;
                }
                if (!preg_match('/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/', $d)) {
                    ++$skippedLines;

                    continue;
                }
                $k1 = ':d' . $pi;
                $k2 = ':s' . $pi;
                $placeholders[] = '(' . $k1 . ',' . $k2 . ')';
                $params[$k1] = $d;
                $params[$k2] = $source;
                ++$pi;
                if (count($placeholders) >= 200) {
                    $sql = 'INSERT IGNORE INTO ' . self::$table . ' (`domain`, `source`) VALUES ' . implode(',', $placeholders);
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($params);
                    $inserted += $stmt->rowCount();
                    $placeholders = [];
                    $params = [];
                    $pi = 0;
                }
            }
            if ($placeholders !== []) {
                $sql = 'INSERT IGNORE INTO ' . self::$table . ' (`domain`, `source`) VALUES ' . implode(',', $placeholders);
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                $inserted += $stmt->rowCount();
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            App::getInstance(true)->getLogger()->error('BlockedEmailDomain import failed: ' . $e->getMessage());

            return false;
        }

        return ['inserted' => $inserted, 'skipped_lines' => $skippedLines];
    }
}
