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
 * Static capability matrix for node daemon types (FeatherWings vs wings-rs).
 */
class DaemonCapabilities
{
    public const TYPE_FEATHERWINGS = 'featherwings';
    public const TYPE_WINGS_RS = 'wings_rs';

    public const FEATURE_CORE = 'core';
    public const FEATURE_MODULES = 'modules';
    public const FEATURE_LIVE_CONFIG = 'live_config';
    public const FEATURE_HOST_TERMINAL = 'host_terminal';
    public const FEATURE_SELF_UPDATE = 'self_update';
    public const FEATURE_TRASH = 'trash';
    public const FEATURE_FIREWALL = 'firewall';
    public const FEATURE_FASTDL = 'fastdl';
    public const FEATURE_DIAGNOSTICS = 'diagnostics';
    public const FEATURE_DOCKER = 'docker';
    public const FEATURE_DOCKER_DISK = 'docker_disk';
    public const FEATURE_PROXY = 'proxy';
    public const FEATURE_IMPORT = 'import';
    public const FEATURE_SHARE = 'share';
    public const FEATURE_ARCHIVE_BROWSE = 'archive_browse';
    public const FEATURE_FILE_SEARCH = 'file_search';
    public const FEATURE_RECONCILE = 'reconcile';
    public const FEATURE_DEAUTHORIZE = 'deauthorize';
    public const FEATURE_CONTAINER_EXEC = 'container_exec';
    public const FEATURE_SYSTEM_LOGS = 'system_logs';
    public const FEATURE_INSTALL_ABORT = 'install_abort';
    public const FEATURE_DIRECTORY_DOWNLOAD = 'directory_download';
    public const FEATURE_FILE_OP_PROGRESS = 'file_op_progress';
    public const FEATURE_BACKUP_BROWSE = 'backup_browse';
    public const FEATURE_SERVER_SCRIPT = 'server_script';
    public const FEATURE_WS_LIVE_PERMISSIONS = 'ws_live_permissions';
    public const FEATURE_FILE_FINGERPRINTS = 'file_fingerprints';
    public const FEATURE_PAGINATED_FILE_LIST = 'paginated_file_list';
    public const FEATURE_TRANSFER_BACKUPS = 'transfer_backups';
    public const FEATURE_COMPRESS_7Z = 'compress_7z';
    public const FEATURE_FILE_HISTORY = 'file_history';
    public const FEATURE_FILE_COLLABORATION = 'file_collaboration';

    /** @var list<string> */
    public const VALID_TYPES = [
        self::TYPE_FEATHERWINGS,
        self::TYPE_WINGS_RS,
    ];

    /** @var list<string> */
    public const ALL_FEATURES = [
        self::FEATURE_CORE,
        self::FEATURE_MODULES,
        self::FEATURE_LIVE_CONFIG,
        self::FEATURE_HOST_TERMINAL,
        self::FEATURE_SELF_UPDATE,
        self::FEATURE_TRASH,
        self::FEATURE_FIREWALL,
        self::FEATURE_FASTDL,
        self::FEATURE_DIAGNOSTICS,
        self::FEATURE_DOCKER,
        self::FEATURE_DOCKER_DISK,
        self::FEATURE_PROXY,
        self::FEATURE_IMPORT,
        self::FEATURE_SHARE,
        self::FEATURE_ARCHIVE_BROWSE,
        self::FEATURE_FILE_SEARCH,
        self::FEATURE_RECONCILE,
        self::FEATURE_DEAUTHORIZE,
        self::FEATURE_CONTAINER_EXEC,
        self::FEATURE_SYSTEM_LOGS,
        self::FEATURE_INSTALL_ABORT,
        self::FEATURE_DIRECTORY_DOWNLOAD,
        self::FEATURE_FILE_OP_PROGRESS,
        self::FEATURE_BACKUP_BROWSE,
        self::FEATURE_SERVER_SCRIPT,
        self::FEATURE_WS_LIVE_PERMISSIONS,
        self::FEATURE_FILE_FINGERPRINTS,
        self::FEATURE_PAGINATED_FILE_LIST,
        self::FEATURE_TRANSFER_BACKUPS,
        self::FEATURE_COMPRESS_7Z,
        self::FEATURE_FILE_HISTORY,
        self::FEATURE_FILE_COLLABORATION,
    ];

    /** @var array<string, list<string>> */
    private const MATRIX = [
        self::TYPE_FEATHERWINGS => [
            self::FEATURE_CORE,
            self::FEATURE_MODULES,
            self::FEATURE_LIVE_CONFIG,
            self::FEATURE_HOST_TERMINAL,
            self::FEATURE_SELF_UPDATE,
            self::FEATURE_TRASH,
            self::FEATURE_FIREWALL,
            self::FEATURE_FASTDL,
            self::FEATURE_DIAGNOSTICS,
            self::FEATURE_DOCKER,
            self::FEATURE_DOCKER_DISK,
            self::FEATURE_PROXY,
            self::FEATURE_IMPORT,
            self::FEATURE_SHARE,
            self::FEATURE_ARCHIVE_BROWSE,
            self::FEATURE_FILE_SEARCH,
            self::FEATURE_RECONCILE,
            self::FEATURE_DEAUTHORIZE,
            self::FEATURE_CONTAINER_EXEC,
            self::FEATURE_FILE_HISTORY,
            self::FEATURE_FILE_COLLABORATION,
        ],
        self::TYPE_WINGS_RS => [
            self::FEATURE_CORE,
            self::FEATURE_DOCKER,
            self::FEATURE_FILE_SEARCH,
            self::FEATURE_DEAUTHORIZE,
            self::FEATURE_SELF_UPDATE,
            self::FEATURE_ARCHIVE_BROWSE,
            self::FEATURE_SYSTEM_LOGS,
            self::FEATURE_INSTALL_ABORT,
            self::FEATURE_DIRECTORY_DOWNLOAD,
            self::FEATURE_FILE_OP_PROGRESS,
            self::FEATURE_BACKUP_BROWSE,
            self::FEATURE_SERVER_SCRIPT,
            self::FEATURE_WS_LIVE_PERMISSIONS,
            self::FEATURE_FILE_FINGERPRINTS,
            self::FEATURE_PAGINATED_FILE_LIST,
            self::FEATURE_TRANSFER_BACKUPS,
            self::FEATURE_COMPRESS_7Z,
            self::FEATURE_FILE_HISTORY,
            self::FEATURE_FILE_COLLABORATION,
        ],
    ];

    private string $type;

    private function __construct(string $type)
    {
        $this->type = self::normalizeType($type);
    }

    public static function forType(string $type): self
    {
        return new self($type);
    }

    /**
     * @param array<string, mixed> $node
     */
    public static function fromNode(array $node): self
    {
        return new self((string) ($node['daemon_type'] ?? self::TYPE_FEATHERWINGS));
    }

    public static function isValidType(string $type): bool
    {
        return in_array($type, self::VALID_TYPES, true);
    }

    public static function normalizeType(string $type): string
    {
        return self::isValidType($type) ? $type : self::TYPE_FEATHERWINGS;
    }

    public function getType(): string
    {
        return $this->type;
    }

    public function isFeatherWings(): bool
    {
        return $this->type === self::TYPE_FEATHERWINGS;
    }

    public function isWingsRs(): bool
    {
        return $this->type === self::TYPE_WINGS_RS;
    }

    public function supports(string $feature): bool
    {
        return in_array($feature, self::MATRIX[$this->type] ?? [], true);
    }

    /**
     * @return list<string>
     */
    public function features(): array
    {
        return self::MATRIX[$this->type] ?? [];
    }

    /**
     * @return array<string, bool>
     */
    public function toArray(): array
    {
        $out = [];
        foreach (self::ALL_FEATURES as $feature) {
            $out[$feature] = $this->supports($feature);
        }

        return $out;
    }

    /**
     * Defaults used when creating a node of this daemon type.
     *
     * @return array{
     *     daemon_base: string,
     *     config_dir: string,
     *     config_path: string,
     *     systemd_unit: string,
     *     github_owner: string,
     *     github_repo: string,
     *     display_name: string
     * }
     */
    public function defaults(): array
    {
        if ($this->type === self::TYPE_WINGS_RS) {
            return [
                'daemon_base' => '/var/lib/calagopus-wings/volumes',
                'config_dir' => '/etc/calagopus-wings',
                'config_path' => '/etc/calagopus-wings/config.yml',
                'systemd_unit' => 'wings',
                'github_owner' => 'calagopus',
                'github_repo' => 'wings',
                'display_name' => 'Calagopus Wings',
            ];
        }

        return [
            'daemon_base' => '/var/lib/featherpanel/volumes',
            'config_dir' => '/etc/featherpanel',
            'config_path' => '/etc/featherpanel/config.yml',
            'systemd_unit' => 'featherwings',
            'github_owner' => 'mythicalltd',
            'github_repo' => 'featherwings',
            'display_name' => 'FeatherWings',
        ];
    }

    /**
     * Build install + config setup shell commands for this daemon type.
     *
     * @param string $panelUrl Panel base URL (for featherwings configure --panel-url)
     * @param string $configUrl Panel URL for GET /api/remote/config (FeatherWings curl flow)
     * @param string $bearer Wings bearer token (token_id.token)
     * @param string|null $configYaml Full config.yml content; required for Calagopus join-data setup
     * @param string|null $joinYaml Minimal bootstrap YAML for FeatherWings join-data setup
     *
     * @return array{install_command: string, setup_command: string, config_path_hint: string, join_data?: string}
     */
    public function buildSetupCommands(string $panelUrl, string $configUrl, string $bearer, ?string $configYaml = null, ?string $joinYaml = null): array
    {
        $defaults = $this->defaults();
        $configDir = $defaults['config_dir'];
        $configPath = $defaults['config_path'];
        $unit = $defaults['systemd_unit'];

        if ($this->type === self::TYPE_WINGS_RS) {
            $installCommand = 'curl -L "https://github.com/calagopus/wings/releases/latest/download/wings-rs-$(uname -m)-linux" -o /usr/local/bin/wings && chmod +x /usr/local/bin/wings && wings service-install';

            $joinData = '';
            if ($configYaml !== null && $configYaml !== '') {
                $joinData = base64_encode($configYaml);
            }

            // Calagopus expects base64-encoded YAML via --join-data (writes /etc/calagopus-wings/config.yml).
            $setupCommand = $joinData !== ''
                ? 'wings configure --join-data ' . escapeshellarg($joinData) . ' --override && systemctl enable --now ' . $unit
                : 'mkdir -p ' . $configDir
                    . ' && curl -s -H "Authorization: Bearer ' . $bearer . '" "' . $configUrl . '" -o ' . $configPath
                    . ' && systemctl enable --now ' . $unit;

            return [
                'install_command' => $installCommand,
                'setup_command' => $setupCommand,
                'config_path_hint' => $configPath,
                'join_data' => $joinData,
            ];
        }

        $installCommand = 'curl -sSL https://get.featherpanel.com/installer.sh | env FP_COMPONENT=wings FP_ACTION=install FP_WINGS_SKIP_CONFIGURE=true bash';
        $joinData = '';
        if ($joinYaml !== null && $joinYaml !== '') {
            $joinData = base64_encode($joinYaml);
        } elseif ($configYaml !== null && $configYaml !== '') {
            $joinData = base64_encode($configYaml);
        }

        if ($joinData !== '') {
            $setupCommand = 'featherwings configure --join-data ' . escapeshellarg($joinData) . ' --override --install-service';
        } else {
            $setupCommand = 'featherwings configure --panel-url ' . escapeshellarg($panelUrl) . ' --install-service';
        }

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

    /**
     * @param array<string, mixed> $node
     */
    public static function unsupportedResponse(array $node, string $feature): \Symfony\Component\HttpFoundation\Response
    {
        $caps = self::fromNode($node);
        $defaults = $caps->defaults();

        return ApiResponse::error(
            'This feature is not supported by ' . $defaults['display_name'] . ' on this node.',
            'DAEMON_FEATURE_UNSUPPORTED',
            501,
            [
                'feature' => $feature,
                'daemon_type' => $caps->getType(),
            ]
        );
    }
}
