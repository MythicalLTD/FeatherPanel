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
 * FeatherTail host-agent defaults and setup command builder.
 */
class FeatherTailCapabilities
{
    /**
     * @return array{config_dir: string, config_path: string, systemd_unit: string, display_name: string, default_port: int, github_owner: string, github_repo: string}
     */
    public static function defaults(): array
    {
        return [
            'config_dir' => '/etc/feathertail',
            'config_path' => '/etc/feathertail/feathertail.toml',
            'systemd_unit' => 'feathertail',
            'display_name' => 'FeatherTail',
            'default_port' => 8686,
            'github_owner' => 'mythicalltd',
            'github_repo' => 'feathertail',
        ];
    }

    /**
     * Build install + config setup shell commands for FeatherTail on a Proxmox node.
     *
     * @return array{install_command: string, setup_command: string, config_path_hint: string, notes: list<string>}
     */
    public static function buildSetupCommands(string $agentToken, string $agentUrl, string $bind = '0.0.0.0:8686'): array
    {
        $defaults = self::defaults();
        $configPath = $defaults['config_path'];
        $unit = $defaults['systemd_unit'];

        $escapedToken = str_replace("'", "'\"'\"'", $agentToken);
        $escapedBind = str_replace("'", "'\"'\"'", $bind);

        $installCommand = "curl -sSL https://get.featherpanel.com/installer.sh | env FP_COMPONENT=feathertail FP_ACTION=install FP_TAIL_SKIP_CONFIRM=true FP_TAIL_TOKEN='{$escapedToken}' FP_TAIL_BIND='{$escapedBind}' bash";

        $setupCommand = "FP_TAIL_TOKEN='{$escapedToken}' FP_TAIL_BIND='{$escapedBind}' "
            . 'bash -c \''
            . 'set -euo pipefail; '
            . 'mkdir -p /etc/feathertail /var/lib/feathertail; '
            . 'CFG=' . $configPath . '; '
            . 'if [ ! -f "$CFG" ]; then '
            . 'printf "%s\\n" "[daemon]" "name = \\"feathertail-proxmox\\"" "poll_interval_secs = 15" "log_level = \\"info\\"" "" "[proxmox]" "pvesh_bin = \\"pvesh\\"" "pct_bin = \\"pct\\"" "" "[api]" "bind = \\"${FP_TAIL_BIND}\\"" "" "[auth]" "api_token = \\"${FP_TAIL_TOKEN}\\"" "" "[dhcp]" "enabled = false" "bind = \\"0.0.0.0:67\\"" "server_ip = \\"10.0.0.1\\"" "lease_time_secs = 86400" "database_path = \\"/var/lib/feathertail/dhcp.sqlite3\\"" "firewall_mode = \\"off\\"" > "$CFG"; '
            . 'else '
            . 'if grep -qE "^[[:space:]]*api_token[[:space:]]*=" "$CFG"; then '
            . 'sed -i "s|^[[:space:]]*api_token[[:space:]]*=.*|api_token = \\"${FP_TAIL_TOKEN}\\"|" "$CFG"; '
            . 'else printf "\\n[auth]\\napi_token = \\"${FP_TAIL_TOKEN}\\"\\n" >> "$CFG"; fi; '
            . 'if grep -qE "^[[:space:]]*bind[[:space:]]*=" "$CFG"; then '
            . 'sed -i "0,/^[[:space:]]*bind[[:space:]]*=.*/s|^[[:space:]]*bind[[:space:]]*=.*|bind = \\"${FP_TAIL_BIND}\\"|" "$CFG"; '
            . 'fi; '
            . 'fi; '
            . 'systemctl daemon-reload; systemctl enable --now ' . $unit . '; systemctl restart ' . $unit
            . '\'';

        return [
            'install_command' => $installCommand,
            'setup_command' => $setupCommand,
            'config_path_hint' => $configPath,
            'notes' => [
                'Run these commands on the Proxmox VE node (requires pve-manager).',
                'FeatherTail Depends on pve-manager — apt will refuse install on non-Proxmox hosts.',
                'Allow the panel host to reach ' . $agentUrl . ' (default TCP ' . $defaults['default_port'] . ').',
                'FeatherTail installs noVNC helper assets under /usr/share/novnc-pve; no separate VNC agent package is required.',
                'Enable DHCP in ' . $configPath . ' only after you intend this node to serve DHCP on the chosen bridge/VLAN.',
            ],
        ];
    }
}
