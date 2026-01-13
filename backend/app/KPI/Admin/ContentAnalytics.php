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

namespace App\KPI\Admin;

use App\Chat\Database;

/**
 * Content Analytics and KPI service for realms, spells, images, and redirect links.
 */
class ContentAnalytics
{
    /**
     * Get realms overview statistics.
     *
     * @return array Realm statistics
     */
    public static function getRealmsOverview(): array
    {
        $pdo = Database::getPdoConnection();

        // Total realms
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_realms');
        $totalRealms = (int) $stmt->fetchColumn();

        // Realms with spells
        $stmt = $pdo->query('SELECT COUNT(DISTINCT realm_id) FROM featherpanel_spells');
        $realmsWithSpells = (int) $stmt->fetchColumn();

        // Realms with servers
        $stmt = $pdo->query('SELECT COUNT(DISTINCT realms_id) FROM featherpanel_servers');
        $realmsWithServers = (int) $stmt->fetchColumn();

        return [
            'total_realms' => $totalRealms,
            'with_spells' => $realmsWithSpells,
            'with_servers' => $realmsWithServers,
            'empty_realms' => $totalRealms - $realmsWithSpells,
        ];
    }

    /**
     * Get spells by realm distribution.
     *
     * @return array Spell distribution
     */
    public static function getSpellsByRealm(): array
    {
        $pdo = Database::getPdoConnection();

        $stmt = $pdo->query('
            SELECT 
                r.id as realm_id,
                r.name as realm_name,
                COUNT(s.id) as spell_count
            FROM featherpanel_realms r
            LEFT JOIN featherpanel_spells s ON r.id = s.realm_id
            GROUP BY r.id, r.name
            ORDER BY spell_count DESC
        ');
        $distribution = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($distribution as &$item) {
            $item['spell_count'] = (int) $item['spell_count'];
        }

        return [
            'realms' => $distribution,
        ];
    }

    /**
     * Get spells overview statistics.
     *
     * @return array Spell statistics
     */
    public static function getSpellsOverview(): array
    {
        $pdo = Database::getPdoConnection();

        // Total spells
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_spells');
        $totalSpells = (int) $stmt->fetchColumn();

        // Spells with servers
        $stmt = $pdo->query('SELECT COUNT(DISTINCT spell_id) FROM featherpanel_servers');
        $spellsInUse = (int) $stmt->fetchColumn();

        // Spells with variables
        $stmt = $pdo->query('SELECT COUNT(DISTINCT spell_id) FROM featherpanel_spell_variables');
        $spellsWithVariables = (int) $stmt->fetchColumn();

        // Spells with privileged scripts
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_spells WHERE script_is_privileged = 1');
        $privilegedScripts = (int) $stmt->fetchColumn();

        // Spells using config inheritance
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_spells WHERE config_from IS NOT NULL');
        $usingConfigInheritance = (int) $stmt->fetchColumn();

        return [
            'total_spells' => $totalSpells,
            'in_use' => $spellsInUse,
            'unused' => $totalSpells - $spellsInUse,
            'with_variables' => $spellsWithVariables,
            'privileged_scripts' => $privilegedScripts,
            'using_config_inheritance' => $usingConfigInheritance,
            'percentage_in_use' => $totalSpells > 0 ? round(($spellsInUse / $totalSpells) * 100, 2) : 0,
        ];
    }

    /**
     * Get spell variable statistics.
     *
     * @return array Variable statistics
     */
    public static function getSpellVariableStats(): array
    {
        $pdo = Database::getPdoConnection();

        // Total spell variables
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_spell_variables');
        $totalVariables = (int) $stmt->fetchColumn();

        // User viewable variables
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_spell_variables WHERE user_viewable = 1');
        $userViewable = (int) $stmt->fetchColumn();

        // User editable variables
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_spell_variables WHERE user_editable = 1');
        $userEditable = (int) $stmt->fetchColumn();

        // Average variables per spell
        $stmt = $pdo->query('
            SELECT AVG(var_count) as avg_vars
            FROM (
                SELECT spell_id, COUNT(*) as var_count
                FROM featherpanel_spell_variables
                GROUP BY spell_id
            ) as counts
        ');
        $avgVars = (float) $stmt->fetchColumn();

        // Variables by field type
        $stmt = $pdo->query('
            SELECT 
                field_type,
                COUNT(*) as count
            FROM featherpanel_spell_variables
            GROUP BY field_type
            ORDER BY count DESC
        ');
        $byFieldType = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($byFieldType as &$item) {
            $item['count'] = (int) $item['count'];
        }

        return [
            'total_variables' => $totalVariables,
            'user_viewable' => $userViewable,
            'user_editable' => $userEditable,
            'avg_per_spell' => round($avgVars, 2),
            'by_field_type' => $byFieldType,
        ];
    }

    /**
     * Get images overview statistics.
     *
     * @return array Image statistics
     */
    public static function getImagesOverview(): array
    {
        $pdo = Database::getPdoConnection();

        // Total images
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_images');
        $totalImages = (int) $stmt->fetchColumn();

        return [
            'total_images' => $totalImages,
        ];
    }

    /**
     * Get redirect links overview statistics.
     *
     * @return array Redirect link statistics
     */
    public static function getRedirectLinksOverview(): array
    {
        $pdo = Database::getPdoConnection();

        // Total redirect links
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_redirect_links');
        $totalLinks = (int) $stmt->fetchColumn();

        // Most recent links
        $stmt = $pdo->query('
            SELECT name, slug, url, created_at
            FROM featherpanel_redirect_links
            ORDER BY created_at DESC
            LIMIT 10
        ');
        $recentLinks = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        return [
            'total_links' => $totalLinks,
            'recent_links' => $recentLinks,
        ];
    }

    /**
     * Get mail templates overview.
     *
     * @return array Mail template statistics
     */
    public static function getMailTemplatesOverview(): array
    {
        $pdo = Database::getPdoConnection();

        // Total templates
        $stmt = $pdo->query('SELECT COUNT(*) FROM featherpanel_mail_templates');
        $totalTemplates = (int) $stmt->fetchColumn();

        return [
            'total_templates' => $totalTemplates,
        ];
    }

    /**
     * Get comprehensive content analytics dashboard.
     *
     * @return array Complete content statistics
     */
    public static function getContentDashboard(): array
    {
        return [
            'realms' => self::getRealmsOverview(),
            'spells' => self::getSpellsOverview(),
            'spells_by_realm' => self::getSpellsByRealm(),
            'spell_variables' => self::getSpellVariableStats(),
            'images' => self::getImagesOverview(),
            'redirect_links' => self::getRedirectLinksOverview(),
            'mail_templates' => self::getMailTemplatesOverview(),
        ];
    }
}
