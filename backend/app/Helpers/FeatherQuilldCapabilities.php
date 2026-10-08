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

namespace App\Helpers;

/**
 * FeatherQuilld daemon defaults and setup command builder (Calagopus-style join-data + Wings curl fallback).
 */
class FeatherQuilldCapabilities
{
    /**
     * @return array{daemon_base: string, config_dir: string, config_path: string, systemd_unit: string, display_name: string, github_owner: string, github_repo: string}
     */
    public static function defaults(): array
    {
        return [
            'daemon_base' => '/var/lib/featherquilld',
            'config_dir' => '/etc/featherquilld',
            'config_path' => '/etc/featherquilld/config.yml',
            'systemd_unit' => 'featherquilld',
            'display_name' => 'FeatherQuilld',
            'github_owner' => 'mythicalltd',
            'github_repo' => 'featherquilld',
        ];
    }

    /**
     * Build install + config setup shell commands for FeatherQuilld.
     *
     * Prefers Calagopus-style --join-data with minimal bootstrap YAML; daemon fetches runtime config from the panel.
     *
     * @return array{install_command: string, setup_command: string, config_path_hint: string, join_data?: string}
     */
    public static function buildSetupCommands(string $configUrl, string $bearer, ?string $configYaml = null): array
    {
        $defaults = self::defaults();
        $configDir = $defaults['config_dir'];
        $configPath = $defaults['config_path'];
        $unit = $defaults['systemd_unit'];

        $installCommand = 'curl -sSL https://get.featherpanel.com/installer.sh | bash -s -- featherquilld';

        $joinData = '';
        if ($configYaml !== null && $configYaml !== '') {
            $joinData = base64_encode($configYaml);
        }

        $setupCommand = $joinData !== ''
            ? 'featherquilld configure --join-data ' . escapeshellarg($joinData) . ' --override && systemctl enable --now ' . $unit
            : 'mkdir -p ' . $configDir
                . ' && curl -s -H "Authorization: Bearer ' . $bearer . '" "' . $configUrl . '" -o ' . $configPath
                . ' && systemctl enable --now ' . $unit;

        $payload = [
            'install_command' => $installCommand,
            'setup_command' => $setupCommand,
            'config_path_hint' => $configPath,
        ];

        if ($joinData !== '') {
            $payload['join_data'] = $joinData;
        }

        return $payload;
    }
}
