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

namespace App\Services\Chatbot\Tools;

use App\App;
use App\Config\ConfigInterface;
use App\Chat\KnowledgebaseCategory;

class ListKnowledgebaseCategoriesTool implements ToolInterface
{
    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        if (!$this->isEnabled()) {
            return [
                'success' => false,
                'error'   => 'Knowledgebase categories are disabled.',
            ];
        }

        $limit = max(1, min(20, (int) ($params['limit'] ?? 10)));
        $search = isset($params['query']) ? trim((string) $params['query']) : null;
        $categories = KnowledgebaseCategory::getAll($search !== '' ? $search : null, $limit, 0);

        return [
            'success'    => true,
            'categories' => array_map(static fn (array $category): array => [
                'id'          => (int) $category['id'],
                'name'        => $category['name'] ?? 'Untitled',
                'slug'        => $category['slug'] ?? null,
                'description' => $category['description'] ?? null,
            ], $categories),
        ];
    }

    public function getDescription(): string
    {
        return 'List knowledgebase categories on demand. Use to narrow knowledgebase searches.';
    }

    public function getParameters(): array
    {
        return [
            'query' => 'Optional category search text.',
            'limit' => 'Optional result limit, capped at 20.',
        ];
    }

    private function isEnabled(): bool
    {
        $config = App::getInstance(true)->getConfig();

        return $config->getSetting(ConfigInterface::KNOWLEDGEBASE_ENABLED, 'true') === 'true'
            && $config->getSetting(ConfigInterface::KNOWLEDGEBASE_SHOW_CATEGORIES, 'true') === 'true';
    }
}
