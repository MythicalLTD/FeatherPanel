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

namespace App\Plugins\Events\Events;

use App\Plugins\Events\PluginEvent;

class KnowledgebaseEvent implements PluginEvent
{
    // ==================== ADMIN - CATEGORIES ====================

    /**
     * Callback: array categories, array pagination, array search.
     */
    public static function onKnowledgebaseCategoriesRetrieved(): string
    {
        return 'featherpanel:admin:knowledgebase:categories:retrieved';
    }

    /**
     * Callback: array category.
     */
    public static function onKnowledgebaseCategoryRetrieved(): string
    {
        return 'featherpanel:admin:knowledgebase:category:retrieved';
    }

    /**
     * Callback: array category, array created_by.
     */
    public static function onKnowledgebaseCategoryCreated(): string
    {
        return 'featherpanel:admin:knowledgebase:category:created';
    }

    /**
     * Callback: array category, array updated_by.
     */
    public static function onKnowledgebaseCategoryUpdated(): string
    {
        return 'featherpanel:admin:knowledgebase:category:updated';
    }

    /**
     * Callback: array category, array deleted_by.
     */
    public static function onKnowledgebaseCategoryDeleted(): string
    {
        return 'featherpanel:admin:knowledgebase:category:deleted';
    }

    // ==================== ADMIN - ARTICLES ====================

    /**
     * Callback: array articles, array pagination, array search.
     */
    public static function onKnowledgebaseArticlesRetrieved(): string
    {
        return 'featherpanel:admin:knowledgebase:articles:retrieved';
    }

    /**
     * Callback: array article.
     */
    public static function onKnowledgebaseArticleRetrieved(): string
    {
        return 'featherpanel:admin:knowledgebase:article:retrieved';
    }

    /**
     * Callback: array article, array created_by.
     */
    public static function onKnowledgebaseArticleCreated(): string
    {
        return 'featherpanel:admin:knowledgebase:article:created';
    }

    /**
     * Callback: array article, array updated_by.
     */
    public static function onKnowledgebaseArticleUpdated(): string
    {
        return 'featherpanel:admin:knowledgebase:article:updated';
    }

    /**
     * Callback: array article, array deleted_by.
     */
    public static function onKnowledgebaseArticleDeleted(): string
    {
        return 'featherpanel:admin:knowledgebase:article:deleted';
    }

    // ==================== ADMIN - FILES & ATTACHMENTS ====================

    /**
     * Callback: string filename, string url, array uploaded_by.
     */
    public static function onKnowledgebaseIconUploaded(): string
    {
        return 'featherpanel:admin:knowledgebase:icon:uploaded';
    }

    /**
     * Callback: array article, array attachment, array uploaded_by.
     */
    public static function onKnowledgebaseAttachmentUploaded(): string
    {
        return 'featherpanel:admin:knowledgebase:attachment:uploaded';
    }

    /**
     * Callback: array article, array attachments.
     */
    public static function onKnowledgebaseAttachmentsRetrieved(): string
    {
        return 'featherpanel:admin:knowledgebase:attachments:retrieved';
    }

    /**
     * Callback: array article, array attachment, array deleted_by.
     */
    public static function onKnowledgebaseAttachmentDeleted(): string
    {
        return 'featherpanel:admin:knowledgebase:attachment:deleted';
    }

    // ==================== ADMIN - TAGS ====================

    /**
     * Callback: array article, array tags.
     */
    public static function onKnowledgebaseTagsRetrieved(): string
    {
        return 'featherpanel:admin:knowledgebase:tags:retrieved';
    }

    /**
     * Callback: array article, array tag, array created_by.
     */
    public static function onKnowledgebaseTagCreated(): string
    {
        return 'featherpanel:admin:knowledgebase:tag:created';
    }

    /**
     * Callback: array article, array tag, array deleted_by.
     */
    public static function onKnowledgebaseTagDeleted(): string
    {
        return 'featherpanel:admin:knowledgebase:tag:deleted';
    }

    // ==================== USER - KNOWLEDGEBASE ====================

    /**
     * Callback: array categories, array pagination.
     */
    public static function onUserKnowledgebaseCategoriesRetrieved(): string
    {
        return 'featherpanel:user:knowledgebase:categories:retrieved';
    }

    /**
     * Callback: array category.
     */
    public static function onUserKnowledgebaseCategoryRetrieved(): string
    {
        return 'featherpanel:user:knowledgebase:category:retrieved';
    }

    /**
     * Callback: array articles, array pagination.
     */
    public static function onUserKnowledgebaseArticlesRetrieved(): string
    {
        return 'featherpanel:user:knowledgebase:articles:retrieved';
    }

    /**
     * Callback: array article, array attachments, array tags, array|null user.
     */
    public static function onUserKnowledgebaseArticleRetrieved(): string
    {
        return 'featherpanel:user:knowledgebase:article:retrieved';
    }

    /**
     * Callback: array category, array articles, array pagination.
     */
    public static function onUserKnowledgebaseCategoryArticlesRetrieved(): string
    {
        return 'featherpanel:user:knowledgebase:category:articles:retrieved';
    }
}
