<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

namespace App\Chat;

use App\App;

class RedirectLink
{
    public static function getAll(int $page = 1, int $limit = 10): array
    {
        $pdo = Database::getPdoConnection();
        $offset = ($page - 1) * $limit;

        $stmt = $pdo->prepare('
            SELECT * FROM featherpanel_redirect_links 
            ORDER BY created_at DESC 
            LIMIT :limit OFFSET :offset
        ');
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public static function getById(int $id): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM featherpanel_redirect_links WHERE id = :id');
        $stmt->bindValue(':id', $id, \PDO::PARAM_INT);
        $stmt->execute();

        $result = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $result ?: null;
    }

    public static function getByName(string $name): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM featherpanel_redirect_links WHERE name = :name');
        $stmt->bindValue(':name', $name, \PDO::PARAM_STR);
        $stmt->execute();

        $result = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $result ?: null;
    }

    public static function getByUrl(string $url): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM featherpanel_redirect_links WHERE url = :url');
        $stmt->bindValue(':url', $url, \PDO::PARAM_STR);
        $stmt->execute();

        $result = $stmt->fetch(\PDO::FETCH_ASSOC);

        return $result ?: null;
    }

    public static function getBySlug(string $slug): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM featherpanel_redirect_links WHERE slug = :slug');
        $stmt->bindValue(':slug', $slug, \PDO::PARAM_STR);
        $stmt->execute();

        $result = $stmt->fetch(\PDO::FETCH_ASSOC);
        if ($result) {
            App::getInstance(true)->getLogger()->info('Redirect link found in database for slug: ' . $slug);
        } else {
            App::getInstance(true)->getLogger()->info('No redirect found in database for slug: ' . $slug);
        }

        return $result ?: null;
    }

    public static function create(array $data): ?int
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
            INSERT INTO featherpanel_redirect_links (name, slug, url, created_at, updated_at) 
            VALUES (:name, :slug, :url, :created_at, :updated_at)
        ');

        $stmt->bindValue(':name', $data['name'], \PDO::PARAM_STR);
        $stmt->bindValue(':slug', $data['slug'], \PDO::PARAM_STR);
        $stmt->bindValue(':url', $data['url'], \PDO::PARAM_STR);
        $stmt->bindValue(':created_at', $data['created_at'], \PDO::PARAM_STR);
        $stmt->bindValue(':updated_at', $data['updated_at'], \PDO::PARAM_STR);

        if ($stmt->execute()) {
            return (int) $pdo->lastInsertId();
        }

        return null;
    }

    public static function update(int $id, array $data): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
            UPDATE featherpanel_redirect_links 
            SET name = :name, slug = :slug, url = :url, updated_at = :updated_at 
            WHERE id = :id
        ');

        $stmt->bindValue(':id', $id, \PDO::PARAM_INT);
        $stmt->bindValue(':name', $data['name'], \PDO::PARAM_STR);
        $stmt->bindValue(':slug', $data['slug'], \PDO::PARAM_STR);
        $stmt->bindValue(':url', $data['url'], \PDO::PARAM_STR);
        $stmt->bindValue(':updated_at', $data['updated_at'], \PDO::PARAM_STR);

        return $stmt->execute();
    }

    public static function delete(int $id): bool
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('DELETE FROM featherpanel_redirect_links WHERE id = :id');
        $stmt->bindValue(':id', $id, \PDO::PARAM_INT);

        return $stmt->execute();
    }

    public static function getCount(): int
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT COUNT(*) as count FROM featherpanel_redirect_links');
        $stmt->execute();

        $result = $stmt->fetch(\PDO::FETCH_ASSOC);

        return (int) $result['count'];
    }

    public static function searchRedirectLinks(string $search, int $page = 1, int $limit = 10): array
    {
        $pdo = Database::getPdoConnection();
        $offset = ($page - 1) * $limit;

        $stmt = $pdo->prepare('
            SELECT * FROM featherpanel_redirect_links 
            WHERE name LIKE :search OR slug LIKE :search OR url LIKE :search
            ORDER BY created_at DESC 
            LIMIT :limit OFFSET :offset
        ');
        $stmt->bindValue(':search', '%' . $search . '%', \PDO::PARAM_STR);
        $stmt->bindValue(':limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(\PDO::FETCH_ASSOC);
    }

    public static function getSearchCount(string $search): int
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('
            SELECT COUNT(*) as count FROM featherpanel_redirect_links 
            WHERE name LIKE :search OR slug LIKE :search OR url LIKE :search
        ');
        $stmt->bindValue(':search', '%' . $search . '%', \PDO::PARAM_STR);
        $stmt->execute();

        $result = $stmt->fetch(\PDO::FETCH_ASSOC);

        return (int) $result['count'];
    }

    public static function generateSlug(string $name): string
    {
        // Convert to lowercase and replace spaces with hyphens
        $slug = strtolower(trim($name));
        $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
        $slug = trim($slug, '-');

        // Ensure slug is not empty
        if (empty($slug)) {
            $slug = 'redirect-' . uniqid();
        }

        // Check if slug already exists and append number if needed
        $originalSlug = $slug;
        $counter = 1;
        while (self::getBySlug($slug)) {
            $slug = $originalSlug . '-' . $counter;
            ++$counter;
        }

        return $slug;
    }
}
