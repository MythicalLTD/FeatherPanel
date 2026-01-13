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

namespace App\Controllers\User;

use App\App;
use App\Helpers\ApiResponse;
use App\Config\ConfigInterface;
use App\Chat\KnowledgebaseArticle;
use App\Chat\KnowledgebaseCategory;
use App\Chat\KnowledgebaseArticleTag;
use App\Chat\KnowledgebaseArticleAttachment;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Plugins\Events\Events\KnowledgebaseEvent;

class KnowledgebaseController
{
    public function categoriesIndex(Request $request): Response
    {
        if (!$this->isKnowledgebaseEnabled() || !$this->isFeatureEnabled(ConfigInterface::KNOWLEDGEBASE_SHOW_CATEGORIES)) {
            return ApiResponse::error('Knowledgebase is disabled', 'KNOWLEDGEBASE_DISABLED', 403);
        }

        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 100);
        $search = $request->query->get('search', '');

        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 100;
        }
        if ($limit > 100) {
            $limit = 100;
        }

        $offset = ($page - 1) * $limit;
        $categories = KnowledgebaseCategory::getAll($search, $limit, $offset);
        $total = KnowledgebaseCategory::getCount($search);

        $totalPages = ceil($total / $limit);
        $from = $total > 0 ? $offset + 1 : 0;
        $to = min($offset + $limit, $total);

        $responseData = [
            'categories' => $categories,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $total,
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1,
                'from' => $from,
                'to' => $to,
            ],
        ];

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                KnowledgebaseEvent::onUserKnowledgebaseCategoriesRetrieved(),
                $responseData
            );
        }

        return ApiResponse::success($responseData, 'Categories fetched successfully', 200);
    }

    public function categoriesShow(Request $request, int $id): Response
    {
        if (!$this->isKnowledgebaseEnabled() || !$this->isFeatureEnabled(ConfigInterface::KNOWLEDGEBASE_SHOW_CATEGORIES)) {
            return ApiResponse::error('Knowledgebase is disabled', 'KNOWLEDGEBASE_DISABLED', 403);
        }

        $category = KnowledgebaseCategory::getById($id);
        if (!$category) {
            return ApiResponse::error('Category not found', 'CATEGORY_NOT_FOUND', 404);
        }

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                KnowledgebaseEvent::onUserKnowledgebaseCategoryRetrieved(),
                [
                    'category' => $category,
                ]
            );
        }

        return ApiResponse::success(['category' => $category], 'Category fetched successfully', 200);
    }

    public function articlesIndex(Request $request): Response
    {
        if (!$this->isKnowledgebaseEnabled() || !$this->isFeatureEnabled(ConfigInterface::KNOWLEDGEBASE_SHOW_ARTICLES)) {
            return ApiResponse::error('Knowledgebase is disabled', 'KNOWLEDGEBASE_DISABLED', 403);
        }

        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 10);
        $search = $request->query->get('search', '');
        $categoryId = $request->query->get('category_id');
        $status = $request->query->get('status', 'published'); // Only show published by default
        $pinned = $request->query->get('pinned');

        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 10;
        }
        if ($limit > 100) {
            $limit = 100;
        }

        $categoryId = $categoryId !== null && is_numeric($categoryId) ? (int) $categoryId : null;
        $pinned = $pinned !== null ? filter_var($pinned, FILTER_VALIDATE_BOOLEAN) : null;

        $articles = KnowledgebaseArticle::searchArticles($page, $limit, $search, $categoryId, $status, $pinned);
        $total = KnowledgebaseArticle::getCount($search, $categoryId, $status, $pinned);

        $totalPages = ceil($total / $limit);
        $from = $total > 0 ? ($page - 1) * $limit + 1 : 0;
        $to = min(($page - 1) * $limit + $limit, $total);

        $responseData = [
            'articles' => $articles,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $total,
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1,
                'from' => $from,
                'to' => $to,
            ],
        ];

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                KnowledgebaseEvent::onUserKnowledgebaseArticlesRetrieved(),
                $responseData
            );
        }

        return ApiResponse::success($responseData, 'Articles fetched successfully', 200);
    }

    public function articlesShow(Request $request, int $id): Response
    {
        if (!$this->isKnowledgebaseEnabled() || !$this->isFeatureEnabled(ConfigInterface::KNOWLEDGEBASE_SHOW_ARTICLES)) {
            return ApiResponse::error('Knowledgebase is disabled', 'KNOWLEDGEBASE_DISABLED', 403);
        }

        $article = KnowledgebaseArticle::getById($id);
        if (!$article) {
            return ApiResponse::error('Article not found', 'ARTICLE_NOT_FOUND', 404);
        }

        // Only show published articles to users
        if ($article['status'] !== 'published') {
            return ApiResponse::error('Article not found', 'ARTICLE_NOT_FOUND', 404);
        }

        // Get only user-downloadable attachments if enabled
        $attachments = [];
        if ($this->isFeatureEnabled(ConfigInterface::KNOWLEDGEBASE_SHOW_ATTACHMENTS)) {
            $attachments = KnowledgebaseArticleAttachment::getByArticleId($id, true);
        }

        // Get tags if enabled
        $tags = [];
        if ($this->isFeatureEnabled(ConfigInterface::KNOWLEDGEBASE_SHOW_TAGS)) {
            $tags = KnowledgebaseArticleTag::getByArticleId($id);
        }

        // Get user if authenticated (may be null for public access)
        $viewer = $request->attributes->has('user') ? $request->get('user') : null;

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                KnowledgebaseEvent::onUserKnowledgebaseArticleRetrieved(),
                [
                    'article' => $article,
                    'attachments' => $attachments,
                    'tags' => $tags,
                    'user' => $viewer,
                ]
            );
        }

        return ApiResponse::success([
            'article' => $article,
            'attachments' => $attachments,
            'tags' => $tags,
        ], 'Article fetched successfully', 200);
    }

    public function categoryArticles(Request $request, int $id): Response
    {
        if (!$this->isKnowledgebaseEnabled() || !$this->isFeatureEnabled(ConfigInterface::KNOWLEDGEBASE_SHOW_CATEGORIES) || !$this->isFeatureEnabled(ConfigInterface::KNOWLEDGEBASE_SHOW_ARTICLES)) {
            return ApiResponse::error('Knowledgebase is disabled', 'KNOWLEDGEBASE_DISABLED', 403);
        }

        // Verify category exists
        $category = KnowledgebaseCategory::getById($id);
        if (!$category) {
            return ApiResponse::error('Category not found', 'CATEGORY_NOT_FOUND', 404);
        }

        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 10);
        $search = $request->query->get('search', '');
        $pinned = $request->query->get('pinned');

        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 10;
        }
        if ($limit > 100) {
            $limit = 100;
        }

        $pinned = $pinned !== null ? filter_var($pinned, FILTER_VALIDATE_BOOLEAN) : null;

        // Only show published articles
        $articles = KnowledgebaseArticle::searchArticles($page, $limit, $search, $id, 'published', $pinned);
        $total = KnowledgebaseArticle::getCount($search, $id, 'published', $pinned);

        $totalPages = ceil($total / $limit);
        $from = $total > 0 ? ($page - 1) * $limit + 1 : 0;
        $to = min(($page - 1) * $limit + $limit, $total);

        $responseData = [
            'category' => $category,
            'articles' => $articles,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $total,
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1,
                'from' => $from,
                'to' => $to,
            ],
        ];

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                KnowledgebaseEvent::onUserKnowledgebaseCategoryArticlesRetrieved(),
                $responseData
            );
        }

        return ApiResponse::success($responseData, 'Category articles fetched successfully', 200);
    }

    private function isKnowledgebaseEnabled(): bool
    {
        $app = App::getInstance(true);
        $config = $app->getConfig();

        return $config->getSetting(ConfigInterface::KNOWLEDGEBASE_ENABLED, 'true') === 'true';
    }

    private function isFeatureEnabled(string $feature): bool
    {
        $app = App::getInstance(true);
        $config = $app->getConfig();

        return $config->getSetting($feature, 'true') === 'true';
    }
}
