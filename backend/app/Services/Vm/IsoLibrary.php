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

namespace App\Services\Vm;

use App\App;
use App\Chat\VmIso;
use App\Chat\VmNode;
use App\Config\ConfigInterface;
use App\Services\Proxmox\Proxmox;

/**
 * ISO policy for VDS users: which ISOs a VDS may mount (provider library / allowed storages)
 * and the rules for user supplied ISOs (storage, size, quota, URL domains, approval).
 */
class IsoLibrary
{
    public const MODES = ['provider', 'provider_user', 'disabled'];

    /** Prefix of user ISO file names so they are never listed as provider ISOs. */
    public const USER_FILE_PREFIX = 'fpu-';

    /** Effective mode for a VDS: per-VDS override, else the panel setting. */
    public static function mode(array $vmInstance): string
    {
        $own = (string) ($vmInstance['iso_mode'] ?? '');
        if (in_array($own, self::MODES, true)) {
            return $own;
        }
        $global = self::setting(ConfigInterface::VDS_ISO_MODE, '');
        if ($global === '') {
            // Upgrade path: honour the former on/off toggle until the new mode is saved.
            $global = self::setting('vds_iso_mount_enabled', 'true') === 'false' ? 'disabled' : 'provider';
        }

        return in_array($global, self::MODES, true) ? $global : 'provider';
    }

    /**
     * Proxmox storage that receives user ISOs for a node.
     * Prefers the node column; falls back to the legacy global setting.
     *
     * @param array<string, mixed>|null $vmNode
     */
    public static function userStorage(?array $vmNode = null): string
    {
        $fromNode = is_array($vmNode) ? trim((string) ($vmNode['storage_iso_user'] ?? '')) : '';
        if ($fromNode !== '') {
            return $fromNode;
        }

        return trim(self::setting(ConfigInterface::VDS_ISO_USER_STORAGE, ''));
    }

    /**
     * Resolve the VM node row for an instance (cached only for the caller's convenience).
     *
     * @param array<string, mixed> $vmInstance
     *
     * @return array<string, mixed>|null
     */
    public static function nodeForInstance(array $vmInstance): ?array
    {
        $id = (int) ($vmInstance['vm_node_id'] ?? 0);

        return $id > 0 ? VmNode::getVmNodeById($id) : null;
    }

    /**
     * Comma-separated allowlist of ISO storages for a node (empty = all ISO storages).
     *
     * @param array<string, mixed>|null $vmNode
     *
     * @return string[]
     */
    public static function allowedStorages(?array $vmNode = null): array
    {
        $fromNode = is_array($vmNode) ? trim((string) ($vmNode['storage_iso_allowed'] ?? '')) : '';
        if ($fromNode !== '') {
            return self::csv($fromNode);
        }

        return self::csv(self::setting(ConfigInterface::VDS_ISO_ALLOWED_STORAGES, ''));
    }

    /**
     * Rescue ISO volid for a node (empty = rescue unavailable even when globally enabled).
     *
     * @param array<string, mixed>|null $vmNode
     */
    public static function rescueIso(?array $vmNode = null): string
    {
        $fromNode = is_array($vmNode) ? trim((string) ($vmNode['rescue_iso'] ?? '')) : '';
        if ($fromNode !== '') {
            return $fromNode;
        }

        return trim(self::setting(ConfigInterface::VDS_RESCUE_ISO, ''));
    }

    /** True when the VDS may receive user supplied ISOs (mode allows it and a storage is configured). */
    public static function userIsosAllowed(array $vmInstance, ?array $vmNode = null): bool
    {
        $node = $vmNode ?? self::nodeForInstance($vmInstance);

        return self::mode($vmInstance) === 'provider_user' && self::userStorage($node) !== '';
    }

    /** @return array{upload_enabled: bool, url_enabled: bool, max_size_mb: int, max_per_user: int, require_approval: bool, url_domains: string[]} */
    public static function userRules(): array
    {
        return [
            'upload_enabled' => self::setting(ConfigInterface::VDS_ISO_USER_UPLOAD_ENABLED, 'true') === 'true',
            'url_enabled' => self::setting(ConfigInterface::VDS_ISO_USER_URL_ENABLED, 'true') === 'true',
            'max_size_mb' => max(1, (int) self::setting(ConfigInterface::VDS_ISO_USER_MAX_SIZE_MB, '4096')),
            'max_per_user' => max(0, (int) self::setting(ConfigInterface::VDS_ISO_USER_MAX_PER_USER, '3')),
            'require_approval' => self::setting(ConfigInterface::VDS_ISO_USER_REQUIRE_APPROVAL, 'false') === 'true',
            'url_domains' => self::csv(self::setting(ConfigInterface::VDS_ISO_USER_URL_DOMAINS, '')),
        ];
    }

    /**
     * Provider ISOs a VDS may mount. Default (library only): visible Admin → VDS ISO library
     * entries that exist on the node. With library only off: scan allowed storages, enrich with
     * library metadata, and apply the allowlist. User ISO files are never included.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function providerIsos(Proxmox $client, string $node, array $vmInstance, ?string $excludeVolid = null): array
    {
        $library = [];
        foreach (VmIso::providerForNode((int) ($vmInstance['vm_node_id'] ?? 0)) as $row) {
            // Node-specific rows win over "all nodes" rows for the same volid.
            if (!isset($library[$row['volid']]) || $row['vm_node_id'] !== null) {
                $library[$row['volid']] = $row;
            }
        }
        $libraryOnly = self::setting(ConfigInterface::VDS_ISO_LIBRARY_ONLY, 'true') === 'true';

        $storagesRes = $client->getIsoStorages($node);
        $storages = $storagesRes['ok'] ? $storagesRes['storage'] : [];
        $vmNode = self::nodeForInstance($vmInstance);
        $allowedStorages = self::allowedStorages($vmNode);
        if ($allowedStorages !== []) {
            $storages = array_values(array_intersect($storages, $allowedStorages));
        }

        $onStorage = [];
        foreach (self::storageIsos($client, $node, $storages) as $item) {
            if (str_starts_with($item['name'], self::USER_FILE_PREFIX)) {
                continue;
            }
            $onStorage[$item['volid']] = $item;
        }

        $isos = [];
        if ($libraryOnly) {
            foreach ($library as $volid => $entry) {
                if ((int) $entry['visible'] !== 1 || $volid === $excludeVolid) {
                    continue;
                }
                $item = $onStorage[$volid] ?? null;
                if ($item === null) {
                    continue;
                }
                $isos[] = [
                    'volid' => $volid,
                    'name' => (string) $entry['name'],
                    'file' => $item['name'],
                    'storage' => $item['storage'],
                    'size' => $item['size'],
                    'description' => $entry['description'] ?? null,
                    'category' => $entry['category'] ?? self::guessCategory($item['name']),
                    'sort' => (int) $entry['sort_order'],
                    'source' => 'provider',
                ];
            }
        } else {
            $patterns = self::csv(self::setting(ConfigInterface::VDS_ISO_ALLOWED_ISOS, ''));
            foreach ($onStorage as $volid => $item) {
                if ($volid === $excludeVolid) {
                    continue;
                }
                $entry = $library[$volid] ?? null;
                if ($entry !== null && (int) $entry['visible'] !== 1) {
                    continue;
                }
                if ($entry === null && $patterns !== [] && !self::matchesAny($patterns, $volid, $item['name'])) {
                    continue;
                }
                $isos[] = [
                    'volid' => $volid,
                    'name' => $entry ? (string) $entry['name'] : $item['name'],
                    'file' => $item['name'],
                    'storage' => $item['storage'],
                    'size' => $item['size'],
                    'description' => $entry['description'] ?? null,
                    'category' => $entry['category'] ?? self::guessCategory($item['name']),
                    'sort' => $entry ? (int) $entry['sort_order'] : 1000,
                    'source' => 'provider',
                ];
            }
        }
        usort($isos, static fn ($a, $b) => [$a['sort'], strtolower($a['name'])] <=> [$b['sort'], strtolower($b['name'])]);

        return $isos;
    }

    /** @return array<int, array{volid: string, name: string, storage: string, size: int}> */
    public static function storageIsos(Proxmox $client, string $node, array $storages): array
    {
        $out = [];
        foreach ($storages as $storage) {
            $res = $client->apiGet(sprintf('/api2/json/nodes/%s/storage/%s/content', rawurlencode($node), rawurlencode((string) $storage)), ['content' => 'iso']);
            if (!$res['ok'] || !is_array($res['data'])) {
                continue;
            }
            foreach ($res['data'] as $item) {
                $volid = is_array($item) ? (string) ($item['volid'] ?? '') : '';
                if ($volid === '') {
                    continue;
                }
                $out[] = ['volid' => $volid, 'name' => self::fileName($volid), 'storage' => (string) $storage, 'size' => (int) ($item['size'] ?? 0)];
            }
        }

        return $out;
    }

    /** Updates pending user ISO rows from their Proxmox task. Returns the refreshed rows. */
    public static function refreshUserIsos(Proxmox $client, array $rows): array
    {
        foreach ($rows as $i => $row) {
            if ($row['status'] !== 'pending' || (string) ($row['upid'] ?? '') === '') {
                continue;
            }
            $task = $client->getTaskStatus((string) $row['pve_node'], (string) $row['upid']);
            if (!$task['ok'] || $task['status'] !== 'stopped') {
                continue;
            }
            $ok = $task['exitstatus'] === 'OK';
            $update = ['status' => $ok ? 'ready' : 'failed', 'error' => $ok ? null : mb_substr((string) ($task['exitstatus'] ?? 'Task failed'), 0, 500)];
            if ($ok && (int) $row['size_bytes'] === 0) {
                foreach (self::storageIsos($client, (string) $row['pve_node'], [(string) $row['storage']]) as $file) {
                    if ($file['volid'] === $row['volid']) {
                        $update['size_bytes'] = $file['size'];
                    }
                }
            }
            VmIso::update((int) $row['id'], $update);
            $rows[$i] = array_merge($row, $update);
        }

        return $rows;
    }

    public static function isMountable(array $row): bool
    {
        return $row['status'] === 'ready' && $row['approval'] === 'approved';
    }

    /** Public view of a user ISO row. */
    public static function serializeUserIso(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'volid' => (string) $row['volid'],
            'name' => (string) $row['name'],
            'file' => self::fileName((string) $row['volid']),
            'size' => (int) $row['size_bytes'],
            'source' => (string) $row['source'],
            'status' => (string) $row['status'],
            'approval' => (string) $row['approval'],
            'error' => $row['error'] ?? null,
            'mountable' => self::isMountable($row),
            'created_at' => (string) $row['created_at'],
        ];
    }

    /** Proxmox file name for a user ISO: fpu-<user>-<random>-<safe name>.iso */
    public static function userFileName(int $userId, string $original): string
    {
        $base = strtolower(preg_replace('/\.iso$/i', '', basename($original)) ?? '');
        $base = trim((string) preg_replace('/[^a-z0-9._-]+/', '-', $base), '-.');
        $base = substr($base !== '' ? $base : 'image', 0, 60);

        return self::USER_FILE_PREFIX . $userId . '-' . bin2hex(random_bytes(3)) . '-' . $base . '.iso';
    }

    /**
     * Validates a user supplied download URL: http(s), allowed domain, and a public address
     * (the Proxmox node fetches it, so internal hosts must not be reachable through it).
     */
    public static function validateUrl(string $url, array $allowedDomains): ?string
    {
        if ($url === '' || strlen($url) > 2048 || !filter_var($url, FILTER_VALIDATE_URL)) {
            return 'The URL is invalid';
        }
        $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));
        if (!in_array($scheme, ['http', 'https'], true)) {
            return 'Only http and https URLs are allowed';
        }
        if (parse_url($url, PHP_URL_USER) !== null) {
            return 'URLs with credentials are not allowed';
        }
        $host = strtolower(trim((string) parse_url($url, PHP_URL_HOST), '[]'));
        if ($host === '') {
            return 'The URL is invalid';
        }
        if ($allowedDomains !== []) {
            $ok = false;
            foreach ($allowedDomains as $domain) {
                $domain = strtolower(ltrim($domain, '.*'));
                if ($domain !== '' && ($host === $domain || str_ends_with($host, '.' . $domain))) {
                    $ok = true;
                    break;
                }
            }
            if (!$ok) {
                return 'Downloads from this domain are not allowed';
            }
        }
        $ips = filter_var($host, FILTER_VALIDATE_IP) ? [$host] : array_merge(
            (array) @gethostbynamel($host),
            array_column((array) @dns_get_record($host, DNS_AAAA), 'ipv6')
        );
        $ips = array_filter($ips);
        if ($ips === []) {
            return 'The host could not be resolved';
        }
        foreach ($ips as $ip) {
            if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return 'Private or reserved addresses are not allowed';
            }
        }

        return null;
    }

    /** Deletes a volume from Proxmox storage. Missing volumes count as deleted. */
    public static function deleteVolume(Proxmox $client, string $node, string $volid): bool
    {
        $storage = str_contains($volid, ':') ? substr($volid, 0, (int) strpos($volid, ':')) : '';
        if ($storage === '' || $node === '') {
            return false;
        }
        $res = $client->apiDelete(sprintf('/api2/json/nodes/%s/storage/%s/content/%s', rawurlencode($node), rawurlencode($storage), rawurlencode($volid)));

        return $res['ok'] || str_contains((string) $res['error'], '404') || str_contains(strtolower((string) $res['error']), 'does not exist');
    }

    public static function fileName(string $volid): string
    {
        return basename(str_contains($volid, ':') ? substr($volid, (int) strpos($volid, ':') + 1) : $volid);
    }

    public static function guessCategory(string $name): string
    {
        $n = strtolower($name);

        return match (true) {
            (bool) preg_match('/win|windows|virtio/', $n) => str_contains($n, 'virtio') ? 'tools' : 'windows',
            (bool) preg_match('/rescue|gparted|clonezilla|memtest/', $n) => 'rescue',
            (bool) preg_match('/bsd|pfsense|opnsense/', $n) => 'bsd',
            (bool) preg_match('/debian|ubuntu|alma|rocky|centos|fedora|arch|alpine|suse|linux|mint|kali|proxmox|nixos|gentoo/', $n) => 'linux',
            default => 'other',
        };
    }

    /** @return string[] */
    public static function csv(string $value): array
    {
        return array_values(array_filter(array_map('trim', preg_split('/[,\n]+/', $value) ?: []), static fn ($v) => $v !== ''));
    }

    private static function matchesAny(array $patterns, string $volid, string $name): bool
    {
        foreach ($patterns as $p) {
            if (fnmatch($p, $volid) || fnmatch($p, $name)) {
                return true;
            }
        }

        return false;
    }

    private static function setting(string $key, string $default): string
    {
        return (string) App::getInstance(true)->getConfig()->getSetting($key, $default);
    }
}
