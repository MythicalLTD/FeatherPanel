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
use App\Chat\KnowledgebaseArticle;
use App\Chat\KnowledgebaseCategory;

class SearchKnowledgebaseTool implements ToolInterface
{
    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        if (!$this->isEnabled(ConfigInterface::KNOWLEDGEBASE_SHOW_ARTICLES)) {
            return [
                'success' => false,
                'error'   => 'Knowledgebase articles are disabled.',
            ];
        }

        $query = trim((string) ($params['query'] ?? ''));
        if ($query === '') {
            return [
                'success' => false,
                'error'   => 'A query is required.',
            ];
        }

        $limit = max(1, min(5, (int) ($params['limit'] ?? 5)));
        $categoryId = isset($params['category_id']) ? (int) $params['category_id'] : null;
        $articles = KnowledgebaseArticle::searchArticles(1, $limit, $query, $categoryId, 'published');

        $results = [];
        foreach ($articles as $article) {
            $category = $this->areCategoriesEnabled() && !empty($article['category_id'])
                ? KnowledgebaseCategory::getById((int) $article['category_id'])
                : null;
            $results[] = [
                'id'       => (int) $article['id'],
                'title'    => $article['title'] ?? 'Untitled',
                'slug'     => $article['slug'] ?? null,
                'category' => $category['name'] ?? null,
                'snippet'  => $this->truncate($this->plainText((string) ($article['content'] ?? '')), 700),
            ];
        }

        return [
            'success' => true,
            'query'   => $query,
            'results' => $results,
        ];
    }

    public function getDescription(): string
    {
        return 'Search published knowledgebase articles on demand. Use when the user asks a knowledgebase/support question.';
    }

    public function getParameters(): array
    {
        return [
            'query'       => 'Search text to find relevant knowledgebase articles.',
            'category_id' => 'Optional category ID filter.',
            'limit'       => 'Optional result limit, capped at 5.',
        ];
    }

    private function isEnabled(string $feature): bool
    {
        $config = App::getInstance(true)->getConfig();

        return $config->getSetting(ConfigInterface::KNOWLEDGEBASE_ENABLED, 'true') === 'true'
            && $config->getSetting($feature, 'true') === 'true';
    }

    private function areCategoriesEnabled(): bool
    {
        return $this->isEnabled(ConfigInterface::KNOWLEDGEBASE_SHOW_CATEGORIES);
    }

    private function plainText(string $content): string
    {
        $content = preg_replace('/```.*?```/s', ' ', $content) ?? $content;
        $content = strip_tags($content);
        $content = preg_replace('/\s+/', ' ', $content) ?? $content;

        return trim($content);
    }

    private function truncate(string $text, int $limit): string
    {
        if (strlen($text) <= $limit) {
            return $text;
        }

        return rtrim(substr($text, 0, $limit - 3)) . '...';
    }
}
