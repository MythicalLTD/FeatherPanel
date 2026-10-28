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
    public const TOKEN_DISPLAY_PLACEHOLDER = '********';

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
     * Returns full commands (for clipboard) and masked variants (for on-screen display).
     *
     * @return array{
     *   install_command: string,
     *   setup_command: string,
     *   install_command_display: string,
     *   setup_command_display: string,
     *   config_path_hint: string,
     *   notes: list<string>
     * }
     */
    public static function buildSetupCommands(string $agentToken, string $agentUrl, string $bind = '0.0.0.0:8686'): array
    {
        $defaults = self::defaults();
        $configPath = $defaults['config_path'];
        $unit = $defaults['systemd_unit'];
        $port = (int) $defaults['default_port'];

        $installCommand = self::buildInstallCommand($agentToken, $bind);
        $setupCommand = self::buildReapplyTokenCommand($agentToken, $bind, $configPath, $unit);

        return [
            'install_command' => $installCommand,
            'setup_command' => $setupCommand,
            'install_command_display' => self::buildInstallCommand(self::TOKEN_DISPLAY_PLACEHOLDER, $bind),
            'setup_command_display' => self::buildReapplyTokenCommand(self::TOKEN_DISPLAY_PLACEHOLDER, $bind, $configPath, $unit),
            'config_path_hint' => $configPath,
            'notes' => [
                'Run as root on the Proxmox VE node (package Depends on pve-manager).',
                'Do not publish TCP ' . $port . ' on the public internet. Prefer a private VLAN / RFC1918 path between the panel and the node, or a Cloudflare Tunnel / private reverse proxy that only the panel can reach.',
                'Point the FeatherTail URL at that private address (e.g. http://10.x.x.x:' . $port . '), not a world-open hostname.',
                'Firewall: allow only the panel (or tunnel) to ' . $agentUrl . ' - token auth is not a substitute for network exposure control.',
                'FeatherTail installs noVNC helpers under /usr/share/novnc-pve; no separate VNC agent package is required.',
                'Leave DHCP disabled in ' . $configPath . ' until you intentionally serve leases on the guest bridge/VLAN.',
            ],
        ];
    }

    private static function shellSingleQuote(string $value): string
    {
        return "'" . str_replace("'", "'\"'\"'", $value) . "'";
    }

    private static function buildInstallCommand(string $token, string $bind): string
    {
        $tokenQ = self::shellSingleQuote($token);
        $bindQ = self::shellSingleQuote($bind);

        return implode("\n", [
            'curl -sSL https://get.featherpanel.com/installer.sh | \\',
            '  env \\',
            '    FP_COMPONENT=feathertail \\',
            '    FP_ACTION=install \\',
            '    FP_TAIL_SKIP_CONFIRM=true \\',
            "    FP_TAIL_TOKEN={$tokenQ} \\",
            "    FP_TAIL_BIND={$bindQ} \\",
            '  bash',
        ]);
    }

    private static function buildReapplyTokenCommand(string $token, string $bind, string $configPath, string $unit): string
    {
        $tokenQ = self::shellSingleQuote($token);
        $bindQ = self::shellSingleQuote($bind);
        $cfgQ = self::shellSingleQuote($configPath);

        // Readable multi-line script; token stays in env so it is not scattered mid-script.
        return implode("\n", [
            "export FP_TAIL_TOKEN={$tokenQ}",
            "export FP_TAIL_BIND={$bindQ}",
            'set -euo pipefail',
            'mkdir -p /etc/feathertail /var/lib/feathertail',
            "CFG={$cfgQ}",
            'if [ ! -f "$CFG" ]; then',
            '  cat > "$CFG" <<EOF',
            '[daemon]',
            'name = "feathertail-proxmox"',
            'poll_interval_secs = 15',
            'log_level = "info"',
            '',
            '[proxmox]',
            'pvesh_bin = "pvesh"',
            'pct_bin = "pct"',
            '',
            '[api]',
            'bind = "${FP_TAIL_BIND}"',
            '',
            '[auth]',
            'api_token = "${FP_TAIL_TOKEN}"',
            '',
            '[dhcp]',
            'enabled = false',
            'bind = "0.0.0.0:67"',
            'server_ip = "10.0.0.1"',
            'lease_time_secs = 86400',
            'database_path = "/var/lib/feathertail/dhcp.sqlite3"',
            'firewall_mode = "off"',
            'EOF',
            'else',
            '  if grep -qE "^[[:space:]]*api_token[[:space:]]*=" "$CFG"; then',
            '    sed -i "s|^[[:space:]]*api_token[[:space:]]*=.*|api_token = \\"${FP_TAIL_TOKEN}\\"|" "$CFG"',
            '  else',
            '    printf "\\n[auth]\\napi_token = \\"%s\\"\\n" "$FP_TAIL_TOKEN" >> "$CFG"',
            '  fi',
            '  if grep -qE "^[[:space:]]*bind[[:space:]]*=" "$CFG"; then',
            '    sed -i "0,/^[[:space:]]*bind[[:space:]]*=.*/s|^[[:space:]]*bind[[:space:]]*=.*|bind = \\"${FP_TAIL_BIND}\\"|" "$CFG"',
            '  fi',
            'fi',
            'systemctl daemon-reload',
            'systemctl enable --now ' . $unit,
            'systemctl restart ' . $unit,
            'unset FP_TAIL_TOKEN',
        ]);
    }
}
