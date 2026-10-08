<?php

declare(strict_types=1);

namespace App\Addons\demostatus;

use App\Plugins\AppPlugin;
use App\Plugins\PluginEvents;

/**
 * Free example plugin for the public FeatherPanel demo.
 */
class DemoStatus implements AppPlugin
{
    public static function processEvents(PluginEvents $event): void
    {
    }

    public static function pluginInstall(): void
    {
    }

    public static function pluginUninstall(): void
    {
    }
}
