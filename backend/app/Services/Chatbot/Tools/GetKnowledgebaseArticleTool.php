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

class GetKnowledgebaseArticleTool implements ToolInterface
{
    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        if (!$this->isEnabled()) {
            return [
                'success' => false,
                'error'   => 'Knowledgebase articles are disabled.',
            ];
        }

        $articleId = isset($params['article_id']) ? (int) $params['article_id'] : 0;
        if ($articleId <= 0) {
            return [
                'success' => false,
                'error'   => 'article_id is required.',
            ];
        }

        $article = KnowledgebaseArticle::getById($articleId);
        if (!$article || ($article['status'] ?? '') !== 'published') {
            return [
                'success' => false,
                'error'   => 'Published article not found.',
            ];
        }

        $category = $this->areCategoriesEnabled() && !empty($article['category_id'])
            ? KnowledgebaseCategory::getById((int) $article['category_id'])
            : null;

        return [
            'success' => true,
            'article' => [
                'id'       => (int) $article['id'],
                'title'    => $article['title'] ?? 'Untitled',
                'slug'     => $article['slug'] ?? null,
                'category' => $category['name'] ?? null,
                'content'  => $this->truncate((string) ($article['content'] ?? ''), 6000),
            ],
        ];
    }

    public function getDescription(): string
    {
        return 'Fetch one published knowledgebase article by ID. Use after search when full article content is needed.';
    }

    public function getParameters(): array
    {
        return [
            'article_id' => 'Knowledgebase article ID returned by search_knowledgebase.',
        ];
    }

    private function isEnabled(): bool
    {
        $config = App::getInstance(true)->getConfig();

        return $config->getSetting(ConfigInterface::KNOWLEDGEBASE_ENABLED, 'true') === 'true'
            && $config->getSetting(ConfigInterface::KNOWLEDGEBASE_SHOW_ARTICLES, 'true') === 'true';
    }

    private function areCategoriesEnabled(): bool
    {
        $config = App::getInstance(true)->getConfig();

        return $config->getSetting(ConfigInterface::KNOWLEDGEBASE_ENABLED, 'true') === 'true'
            && $config->getSetting(ConfigInterface::KNOWLEDGEBASE_SHOW_CATEGORIES, 'true') === 'true';
    }

    private function truncate(string $text, int $limit): string
    {
        if (strlen($text) <= $limit) {
            return $text;
        }

        return rtrim(substr($text, 0, $limit - 3)) . '...';
    }
}
