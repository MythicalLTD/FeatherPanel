<?php

declare(strict_types=1);

namespace App\Addons\demoshowcase;

use App\Plugins\AppPlugin;
use App\Plugins\PluginEvents;
use App\Plugins\PluginSettings;

/**
 * Demo showcase addon for the public FeatherPanel demo.
 *
 * Shows widgets on dashboard / admin / server pages, admin + server sidebar
 * pages, and uses PluginSettings for hide toggles + spell allow-lists.
 */
class DemoShowcase implements AppPlugin
{
    public static function processEvents(PluginEvents $event): void
    {
    }

    public static function pluginInstall(): void
    {
        // Defaults for visibility toggles (admins can flip these in plugin settings).
        PluginSettings::setSetting('demoshowcase', 'hide_dashboard_banner', 'false');
        PluginSettings::setSetting('demoshowcase', 'hide_admin_card', 'false');
        PluginSettings::setSetting('demoshowcase', 'hide_server_console_card', 'false');
        PluginSettings::setSetting(
            'demoshowcase',
            'tip_text',
            'This widget comes from the DemoShowcase addon. Toggle visibility under Admin → Plugins → DemoShowcase.'
        );
        // Empty spell allow-list = show server nav on all spells until seed-bloat sets demo spell IDs.
        PluginSettings::setSetting('demoshowcase', 'plugin-sidebar-server-allowedOnlyOnSpells', '[]');
    }

    public static function pluginUninstall(): void
    {
    }
}
