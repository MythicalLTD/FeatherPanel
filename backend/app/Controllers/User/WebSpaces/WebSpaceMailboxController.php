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

namespace App\Controllers\User\WebSpaces;

use App\Chat\MailHost;
use App\Helpers\ApiResponse;
use App\Chat\WebSpaceMailbox;
use App\Helpers\DnsProvisioner;
use App\Helpers\WebSpaceGateway;
use App\Chat\WebSpaceMailingList;
use App\Chat\WebSpaceMailForwarder;
use App\WebSpaceSubuserPermissions;
use App\Helpers\FeatherQuilldClient;
use App\Helpers\WebSpacePluginEvents;
use App\Helpers\RemoteMailProvisioner;
use App\Helpers\WebSpaceActivityLogger;
use App\Helpers\CheckWebSpacePermission;
use App\Helpers\MailDeliverabilityChecker;
use App\Plugins\Events\Events\WebSpaceEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class WebSpaceMailboxController
{
    public function index(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::MAIL_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $mailboxes = WebSpaceMailbox::listByWebSpaceId((int) $resolved['space']['id']);
        foreach ($mailboxes as &$row) {
            if (!$this->canViewPassword($resolved)) {
                $row['password'] = '[REDACTED]';
            }
        }
        unset($row);

        return ApiResponse::success(['data' => $mailboxes], 'OK', 200);
    }

    public function hosts(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::MAIL_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $webNodeId = (int) ($resolved['space']['web_node_id'] ?? 0);
        $hosts = MailHost::listForWebNode($webNodeId);
        $sanitized = array_map(static function (array $host): array {
            unset($host['provision_api_key'], $host['provision_url']);

            return $host;
        }, $hosts);

        return ApiResponse::success(['hosts' => $sanitized], 'OK', 200);
    }

    public function dns(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::MAIL_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $space = $resolved['space'];
        $domains = is_array($space['domains'] ?? null) ? $space['domains'] : [];
        $hosts = MailHost::listForWebNode((int) ($space['web_node_id'] ?? 0));
        $primary = $hosts[0] ?? null;
        $dnsContext = DnsProvisioner::resolveProvisionerContext($space);
        $zoneRecords = [];
        if ($dnsContext !== null && $primary && strtolower(trim((string) ($primary['provision_mode'] ?? ''))) === 'node') {
            try {
                $listed = $dnsContext['provider']->listRecords((string) $dnsContext['zone_id'], null, null, 1, 500);
                $zoneRecords = is_array($listed['records'] ?? null) ? $listed['records'] : [];
            } catch (\Throwable) {
                $zoneRecords = [];
            }
        }

        $records = [];
        foreach ($domains as $domain) {
            $domain = strtolower(trim((string) $domain));
            if ($domain === '') {
                continue;
            }

            $mxHost = $primary ? (string) ($primary['mx_host'] ?: $primary['hostname']) : 'mail.' . $domain;
            $spf = $primary && !empty($primary['spf_record'])
                ? (string) $primary['spf_record']
                : 'v=spf1 mx a:' . $mxHost . ' -all';
            $dkimReady = !empty($primary['dkim_selector']) && !empty($primary['dkim_record']);
            $dkimSelector = $primary ? (string) ($primary['dkim_selector'] ?? '') : '';
            $dkimRecord = $primary ? (string) ($primary['dkim_record'] ?? '') : '';
            $dmarc = 'v=DMARC1; p=none; rua=mailto:postmaster@' . $domain;

            if ($primary && strtolower(trim((string) ($primary['provision_mode'] ?? ''))) === 'node') {
                $webNode = \App\Chat\WebNode::getWebNodeById((int) ($space['web_node_id'] ?? 0));
                if ($webNode) {
                    $hints = FeatherQuilldClient::getMailDnsHints($webNode, $domain);
                    if ($hints['ok'] && is_array($hints['body'])) {
                        $dkimReady = !empty($hints['body']['dkim_ready']);
                        $dkimSelector = trim((string) ($hints['body']['dkim_selector'] ?? $dkimSelector));
                        $dkimRecord = trim((string) ($hints['body']['dkim_record'] ?? $dkimRecord));
                        $hintMx = trim((string) ($hints['body']['mx_host'] ?? ''));
                        if ($hintMx !== '') {
                            $mxHost = rtrim($hintMx, '.');
                        }
                        foreach (is_array($hints['body']['records'] ?? null) ? $hints['body']['records'] : [] as $hr) {
                            if (!is_array($hr)) {
                                continue;
                            }
                            if (
                                strtoupper((string) ($hr['type'] ?? '')) === 'TXT'
                                && trim((string) ($hr['name'] ?? '')) === '@'
                                && trim((string) ($hr['value'] ?? '')) !== ''
                            ) {
                                $spf = (string) $hr['value'];
                            }
                            if (
                                strtoupper((string) ($hr['type'] ?? '')) === 'TXT'
                                && trim((string) ($hr['name'] ?? '')) === '_dmarc'
                                && trim((string) ($hr['value'] ?? '')) !== ''
                            ) {
                                $dmarc = (string) $hr['value'];
                            }
                        }
                        $dmarcBody = trim((string) ($hints['body']['dmarc_record'] ?? ''));
                        if ($dmarcBody !== '') {
                            $dmarc = $dmarcBody;
                        }
                    }
                }
            }

            $hintRecords = array_values(array_filter([
                [
                    'type' => 'MX',
                    'name' => '@',
                    'value' => $mxHost,
                    'priority' => 10,
                ],
                [
                    'type' => 'TXT',
                    'name' => '@',
                    'value' => $spf,
                    'priority' => null,
                ],
                $dkimReady && $dkimSelector !== '' && $dkimRecord !== '' ? [
                    'type' => 'TXT',
                    'name' => $dkimSelector . '._domainkey',
                    'value' => $dkimRecord,
                    'priority' => null,
                ] : null,
                [
                    'type' => 'TXT',
                    'name' => '_dmarc',
                    'value' => $dmarc,
                    'priority' => null,
                ],
            ]));

            $records[] = [
                'domain' => $domain,
                'dkim_ready' => $dkimReady,
                'records' => array_map(static function (array $row) use ($zoneRecords, $domain): array {
                    $row['source'] = self::mailDnsRecordProvisioned($zoneRecords, $domain, $row) ? 'provisioned' : 'manual';

                    return $row;
                }, $hintRecords),
            ];
        }

        return ApiResponse::success([
            'domains' => $records,
            'can_provision' => $dnsContext !== null
                && $primary
                && strtolower(trim((string) ($primary['provision_mode'] ?? ''))) === 'node',
            'client_settings' => $primary ? [
                'imap_host' => $primary['imap_host'],
                'imap_port' => (int) $primary['imap_port'],
                'imap_encryption' => $primary['imap_encryption'],
                'smtp_host' => $primary['smtp_host'],
                'smtp_port' => (int) $primary['smtp_port'],
                'smtp_encryption' => $primary['smtp_encryption'],
                'pop_host' => $primary['pop_host'],
                'pop_port' => (int) ($primary['pop_port'] ?? 995),
            ] : null,
        ], 'OK', 200);
    }

    public function deliverability(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::MAIL_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $space = $resolved['space'];
        $domains = DnsProvisioner::collectProvisionDomains($space);
        $hosts = MailHost::listForWebNode((int) ($space['web_node_id'] ?? 0));
        $primary = $hosts[0] ?? null;
        $dnsContext = DnsProvisioner::resolveProvisionerContext($space);
        $zoneRecords = [];
        if ($dnsContext !== null && $primary && strtolower(trim((string) ($primary['provision_mode'] ?? ''))) === 'node') {
            try {
                $listed = $dnsContext['provider']->listRecords((string) $dnsContext['zone_id'], null, null, 1, 500);
                $zoneRecords = is_array($listed['records'] ?? null) ? $listed['records'] : [];
            } catch (\Throwable) {
                $zoneRecords = [];
            }
        }

        $webNode = \App\Chat\WebNode::getWebNodeById((int) ($space['web_node_id'] ?? 0));
        $daemonPayload = null;
        $publicIp = null;
        if ($webNode) {
            $ips = DnsProvisioner::resolveNodeIps($webNode);
            $publicIp = $ips[0] ?? null;
        }
        if ($webNode && $domains !== []) {
            $daemon = FeatherQuilldClient::getMailDeliverability($webNode, (string) $domains[0], $publicIp);
            if ($daemon['ok'] && is_array($daemon['body'])) {
                $daemonPayload = $daemon['body'];
            }
        }

        $results = [];
        foreach ($domains as $domain) {
            $domainDaemon = $daemonPayload;
            if ($webNode && $domain !== ($domains[0] ?? '')) {
                $daemon = FeatherQuilldClient::getMailDeliverability($webNode, (string) $domain, $publicIp ?? null);
                if ($daemon['ok'] && is_array($daemon['body'])) {
                    $domainDaemon = $daemon['body'];
                }
            }
            $results[] = MailDeliverabilityChecker::assessDomain(
                $space,
                (string) $domain,
                $primary,
                $zoneRecords,
                $domainDaemon,
            );
        }

        return ApiResponse::success([
            'domains' => $results,
            'can_provision' => $dnsContext !== null
                && $primary
                && strtolower(trim((string) ($primary['provision_mode'] ?? ''))) === 'node',
        ], 'OK', 200);
    }

    public function provisionDns(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::MAIL_CREATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $space = $resolved['space'];
        $body = json_decode($request->getContent(), true);
        $domain = is_array($body) ? strtolower(trim((string) ($body['domain'] ?? ''))) : '';
        if ($domain === '') {
            $domains = is_array($space['domains'] ?? null) ? $space['domains'] : [];
            $domain = strtolower(trim((string) ($domains[0] ?? '')));
        }
        if ($domain === '') {
            return ApiResponse::error('domain is required', 'VALIDATION_FAILED', 400);
        }

        $hosts = MailHost::listForWebNode((int) ($space['web_node_id'] ?? 0));
        $mailHost = null;
        foreach ($hosts as $host) {
            if (strtolower(trim((string) ($host['provision_mode'] ?? ''))) === 'node') {
                $mailHost = $host;
                break;
            }
        }
        if ($mailHost === null) {
            $mailHost = $hosts[0] ?? null;
        }
        if ($mailHost === null) {
            return ApiResponse::error('No mail host available', 'MAIL_HOST_NOT_FOUND', 404);
        }

        try {
            $result = DnsProvisioner::provisionMailRecords($space, $mailHost, $domain);
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to provision mail DNS: ' . $e->getMessage(), 'DNS_PROVISION_FAILED', 500);
        }

        if (empty($result['ok']) && empty($result['skipped'])) {
            return ApiResponse::error(
                $result['error'] ?? 'Mail DNS provision failed',
                'DNS_PROVISION_FAILED',
                502,
                ['result' => $result],
            );
        }

        return ApiResponse::success($result, empty($result['dkim_ready'])
            ? 'MX/SPF provisioned; DKIM still pending — retry shortly'
            : 'Mail DNS records provisioned', 200);
    }

    public function create(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::MAIL_CREATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $space = $resolved['space'];
        $spaceId = (int) $space['id'];
        $limit = (int) ($space['mailbox_limit'] ?? 0);
        if (\App\Helpers\WebSpaceLimits::isLimitReached($limit, WebSpaceMailbox::countByWebSpaceId($spaceId))) {
            return ApiResponse::error('Mailbox limit reached', 'MAILBOX_LIMIT_REACHED', 400);
        }

        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $hostId = (int) ($body['mail_host_id'] ?? 0);
        $localPart = strtolower(trim((string) ($body['local_part'] ?? '')));
        $domain = strtolower(trim((string) ($body['domain'] ?? '')));
        $quotaMb = max(0, (int) ($body['quota_mb'] ?? 1024));

        if ($hostId <= 0 || $localPart === '' || $domain === '') {
            return ApiResponse::error('mail_host_id, local_part, and domain are required', 'VALIDATION_FAILED', 400);
        }

        if (!preg_match('/^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/', $localPart)) {
            return ApiResponse::error('local_part is invalid', 'VALIDATION_FAILED', 400);
        }

        $spaceDomains = is_array($space['domains'] ?? null) ? $space['domains'] : [];
        $allowedDomains = array_map(static fn ($d) => strtolower(trim((string) $d)), $spaceDomains);
        if (!in_array($domain, $allowedDomains, true)) {
            return ApiResponse::error('domain must be one of the WebSpace domains', 'DOMAIN_NOT_ALLOWED', 400);
        }

        $mailHost = MailHost::getById($hostId);
        if (!$mailHost) {
            return ApiResponse::error('Mail host not found', 'MAIL_HOST_NOT_FOUND', 404);
        }

        if (!$this->hostAllowedForWebNode($mailHost, (int) $space['web_node_id'])) {
            return ApiResponse::error('Mail host is not available for this WebSpace node', 'MAIL_HOST_NODE_MISMATCH', 400);
        }

        $password = trim((string) ($body['password'] ?? ''));
        if ($password === '') {
            $password = RemoteMailProvisioner::generateRandomString(16);
        }

        $email = $localPart . '@' . $domain;

        try {
            RemoteMailProvisioner::create($mailHost, [
                'email' => $email,
                'password' => $password,
                'quota_mb' => $quotaMb,
                'enabled' => true,
            ]);
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to provision mailbox: ' . $e->getMessage(), 'CREATION_FAILED', 500);
        }

        try {
            DnsProvisioner::provisionMailRecords($space, $mailHost, $domain);
        } catch (\Throwable) {
            // DNS auto-provision is best-effort when a zone is linked
        }

        $recordId = WebSpaceMailbox::create([
            'webspace_id' => $spaceId,
            'mail_host_id' => $hostId,
            'local_part' => $localPart,
            'domain' => $domain,
            'password' => $password,
            'quota_mb' => $quotaMb,
            'enabled' => 1,
        ]);

        if (!$recordId) {
            try {
                RemoteMailProvisioner::delete($mailHost, ['email' => $email]);
            } catch (\Throwable) {
            }

            return ApiResponse::error('Failed to save mailbox record', 'CREATION_FAILED', 500);
        }

        WebSpaceActivityLogger::log($space, $resolved['user'], 'webspace.mailbox.created', [
            'mailbox_id' => $recordId,
            'email' => $email,
        ]);

        WebSpacePluginEvents::emit(WebSpaceEvent::onWebSpaceMailboxCreated(), WebSpacePluginEvents::basePayload(
            $resolved['user']['uuid'] ?? null,
            $space,
            [
                'mailbox_id' => (int) $recordId,
                'context' => ['source' => 'user'],
            ],
        ));

        return ApiResponse::success([
            'id' => $recordId,
            'email' => $email,
            'password' => $password,
            'quota_mb' => $quotaMb,
        ], 'Mailbox created', 201);
    }

    public function delete(Request $request, string $uuidShort, int $mailboxId): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::MAIL_DELETE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $record = WebSpaceMailbox::getById($mailboxId);
        if (!$record || (int) $record['webspace_id'] !== (int) $resolved['space']['id']) {
            return ApiResponse::error('Mailbox not found', 'NOT_FOUND', 404);
        }

        $mailHost = MailHost::getById((int) $record['mail_host_id']);
        if ($mailHost) {
            try {
                RemoteMailProvisioner::delete($mailHost, [
                    'email' => WebSpaceMailbox::emailAddress($record),
                ]);
            } catch (\Throwable $e) {
                return ApiResponse::error('Failed to delete mailbox on host: ' . $e->getMessage(), 'DELETE_FAILED', 500);
            }
        }

        WebSpaceMailbox::delete($mailboxId);
        WebSpaceActivityLogger::log($resolved['space'], $resolved['user'], 'webspace.mailbox.deleted', [
            'mailbox_id' => $mailboxId,
            'email' => WebSpaceMailbox::emailAddress($record),
        ]);

        WebSpacePluginEvents::emit(WebSpaceEvent::onWebSpaceMailboxDeleted(), WebSpacePluginEvents::basePayload(
            $resolved['user']['uuid'] ?? null,
            $resolved['space'],
            [
                'mailbox_id' => $mailboxId,
                'context' => ['source' => 'user'],
            ],
        ));

        return ApiResponse::success([], 'Deleted', 200);
    }

    public function resetPassword(Request $request, string $uuidShort, int $mailboxId): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::MAIL_UPDATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $record = WebSpaceMailbox::getById($mailboxId);
        if (!$record || (int) $record['webspace_id'] !== (int) $resolved['space']['id']) {
            return ApiResponse::error('Mailbox not found', 'NOT_FOUND', 404);
        }

        $mailHost = MailHost::getById((int) $record['mail_host_id']);
        if (!$mailHost) {
            return ApiResponse::error('Mail host not found', 'MAIL_HOST_NOT_FOUND', 404);
        }

        $password = RemoteMailProvisioner::generateRandomString(16);
        $email = WebSpaceMailbox::emailAddress($record);

        try {
            RemoteMailProvisioner::resetPassword($mailHost, [
                'email' => $email,
                'password' => $password,
            ]);
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to reset password: ' . $e->getMessage(), 'RESET_FAILED', 500);
        }

        WebSpaceMailbox::update($mailboxId, ['password' => $password]);
        WebSpaceActivityLogger::log($resolved['space'], $resolved['user'], 'webspace.mailbox.password_reset', [
            'mailbox_id' => $mailboxId,
            'email' => $email,
        ]);

        return ApiResponse::success(['password' => $password], 'Password reset', 200);
    }

    public function setEnabled(Request $request, string $uuidShort, int $mailboxId): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::MAIL_UPDATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $record = WebSpaceMailbox::getById($mailboxId);
        if (!$record || (int) $record['webspace_id'] !== (int) $resolved['space']['id']) {
            return ApiResponse::error('Mailbox not found', 'NOT_FOUND', 404);
        }

        $body = json_decode($request->getContent(), true);
        if (!is_array($body) || !array_key_exists('enabled', $body)) {
            return ApiResponse::error('enabled is required', 'VALIDATION_FAILED', 400);
        }

        $enabled = !empty($body['enabled']);
        $mailHost = MailHost::getById((int) $record['mail_host_id']);
        if ($mailHost) {
            try {
                RemoteMailProvisioner::setEnabled($mailHost, [
                    'email' => WebSpaceMailbox::emailAddress($record),
                    'enabled' => $enabled,
                ]);
            } catch (\Throwable $e) {
                return ApiResponse::error('Failed to update mailbox: ' . $e->getMessage(), 'UPDATE_FAILED', 500);
            }
        }

        WebSpaceMailbox::update($mailboxId, ['enabled' => $enabled ? 1 : 0]);
        WebSpaceActivityLogger::log($resolved['space'], $resolved['user'], 'webspace.mailbox.enabled_updated', [
            'mailbox_id' => $mailboxId,
            'enabled' => $enabled,
        ]);

        return ApiResponse::success(['enabled' => $enabled], 'Updated', 200);
    }

    public function checkWebmailInstalled(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::MAIL_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        try {
            \App\Helpers\Roundcube::ensureInstalled();
        } catch (\Throwable) {
            // check still reports installed=false
        }

        $hosts = MailHost::listForWebNode((int) ($resolved['space']['web_node_id'] ?? 0));
        $nodeWebmailUrl = null;
        foreach ($hosts as $host) {
            $url = trim((string) ($host['webmail_url'] ?? ''));
            if ($url !== '') {
                $nodeWebmailUrl = $url;
                break;
            }
        }

        return ApiResponse::success([
            'installed' => \App\Helpers\Roundcube::isInstalled() || $nodeWebmailUrl !== null,
            'panel_roundcube' => \App\Helpers\Roundcube::isInstalled(),
            'node_webmail_url' => $nodeWebmailUrl,
        ], 'OK', 200);
    }

    public function generateWebmailToken(Request $request, string $uuidShort, int $mailboxId): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::MAIL_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $record = WebSpaceMailbox::getById($mailboxId);
        if (!$record || (int) $record['webspace_id'] !== (int) $resolved['space']['id']) {
            return ApiResponse::error('Mailbox not found', 'NOT_FOUND', 404);
        }

        $mailHost = MailHost::getById((int) $record['mail_host_id']);
        if (!$mailHost) {
            return ApiResponse::error('Mail host not found', 'MAIL_HOST_NOT_FOUND', 404);
        }

        $nodeWebmailUrl = trim((string) ($mailHost['webmail_url'] ?? ''));
        if ($nodeWebmailUrl !== '') {
            return ApiResponse::success([
                'url' => $nodeWebmailUrl,
                'mode' => 'external',
            ], 'OK', 200);
        }

        try {
            \App\Helpers\Roundcube::ensureInstalled();
        } catch (\Throwable $e) {
            return ApiResponse::error('Webmail install failed: ' . $e->getMessage(), 'WEBMAIL_INSTALL_FAILED', 500);
        }

        if (!\App\Helpers\Roundcube::isInstalled()) {
            return ApiResponse::error('Webmail is not installed', 'WEBMAIL_NOT_INSTALLED', 404);
        }

        $app = \App\App::getInstance(true);
        $appUrl = $app->getConfig()->getSetting('APP_URL', 'https://featherpanel.mythical.systems');
        if (!preg_match('/^https?:\/\//', $appUrl)) {
            $appUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http')
                . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
        }

        $url = rtrim($appUrl, '/') . '/webmail/token.php?' . http_build_query([
            'user' => WebSpaceMailbox::emailAddress($record),
            'pass' => (string) $record['password'],
            'host' => (string) ($mailHost['imap_host'] ?? $mailHost['hostname']),
            'port' => (int) ($mailHost['imap_port'] ?? 993),
            'enc' => (string) ($mailHost['imap_encryption'] ?? 'ssl'),
        ]);

        return ApiResponse::success(['url' => $url, 'mode' => 'panel_roundcube'], 'OK', 200);
    }

    public function listForwarders(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::MAIL_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $rows = WebSpaceMailForwarder::listByWebSpaceId((int) $resolved['space']['id']);
        foreach ($rows as &$row) {
            $row['source'] = WebSpaceMailForwarder::sourceAddress($row);
            $row['is_catch_all'] = ($row['source_local'] ?? '') === '*';
        }
        unset($row);

        return ApiResponse::success(['data' => $rows], 'OK', 200);
    }

    public function createForwarder(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::MAIL_CREATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $space = $resolved['space'];
        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $hostId = (int) ($body['mail_host_id'] ?? 0);
        $sourceLocal = strtolower(trim((string) ($body['source_local'] ?? '')));
        $domain = strtolower(trim((string) ($body['domain'] ?? '')));
        $destination = trim((string) ($body['destination'] ?? ''));
        $enabled = !array_key_exists('enabled', $body) || !empty($body['enabled']);

        if ($hostId <= 0 || $sourceLocal === '' || $domain === '' || $destination === '') {
            return ApiResponse::error('mail_host_id, source_local, domain, and destination are required', 'VALIDATION_FAILED', 400);
        }

        if ($sourceLocal !== '*' && !preg_match('/^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/', $sourceLocal)) {
            return ApiResponse::error('source_local is invalid (use * for catch-all)', 'VALIDATION_FAILED', 400);
        }

        if (!filter_var($destination, FILTER_VALIDATE_EMAIL)) {
            return ApiResponse::error('destination must be a valid email address', 'VALIDATION_FAILED', 400);
        }

        $spaceDomains = is_array($space['domains'] ?? null) ? $space['domains'] : [];
        $allowedDomains = array_map(static fn ($d) => strtolower(trim((string) $d)), $spaceDomains);
        if (!in_array($domain, $allowedDomains, true)) {
            return ApiResponse::error('domain must be one of the WebSpace domains', 'DOMAIN_NOT_ALLOWED', 400);
        }

        $mailHost = MailHost::getById($hostId);
        if (!$mailHost) {
            return ApiResponse::error('Mail host not found', 'MAIL_HOST_NOT_FOUND', 404);
        }

        if (!$this->hostAllowedForWebNode($mailHost, (int) $space['web_node_id'])) {
            return ApiResponse::error('Mail host is not available for this WebSpace node', 'MAIL_HOST_NODE_MISMATCH', 400);
        }

        $source = $sourceLocal . '@' . $domain;

        try {
            RemoteMailProvisioner::setForward($mailHost, [
                'source' => $source,
                'destination' => $destination,
                'enabled' => $enabled,
            ]);
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to provision forwarder: ' . $e->getMessage(), 'CREATION_FAILED', 500);
        }

        $recordId = WebSpaceMailForwarder::create([
            'webspace_id' => (int) $space['id'],
            'mail_host_id' => $hostId,
            'source_local' => $sourceLocal,
            'domain' => $domain,
            'destination' => $destination,
            'enabled' => $enabled ? 1 : 0,
        ]);

        if (!$recordId) {
            try {
                RemoteMailProvisioner::deleteForward($mailHost, [
                    'source' => $source,
                    'destination' => $destination,
                ]);
            } catch (\Throwable) {
            }

            return ApiResponse::error('Failed to save forwarder record', 'CREATION_FAILED', 500);
        }

        WebSpaceActivityLogger::log($space, $resolved['user'], 'webspace.mail_forwarder.created', [
            'forwarder_id' => $recordId,
            'source' => $source,
            'destination' => $destination,
        ]);

        return ApiResponse::success([
            'id' => $recordId,
            'source' => $source,
            'destination' => $destination,
            'is_catch_all' => $sourceLocal === '*',
        ], 'Forwarder created', 201);
    }

    public function deleteForwarder(Request $request, string $uuidShort, int $forwarderId): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::MAIL_DELETE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $record = WebSpaceMailForwarder::getById($forwarderId);
        if (!$record || (int) $record['webspace_id'] !== (int) $resolved['space']['id']) {
            return ApiResponse::error('Forwarder not found', 'NOT_FOUND', 404);
        }

        $mailHost = MailHost::getById((int) $record['mail_host_id']);
        if ($mailHost) {
            try {
                RemoteMailProvisioner::deleteForward($mailHost, [
                    'source' => WebSpaceMailForwarder::sourceAddress($record),
                    'destination' => (string) $record['destination'],
                ]);
            } catch (\Throwable $e) {
                return ApiResponse::error('Failed to delete forwarder on host: ' . $e->getMessage(), 'DELETE_FAILED', 500);
            }
        }

        WebSpaceMailForwarder::delete($forwarderId);
        WebSpaceActivityLogger::log($resolved['space'], $resolved['user'], 'webspace.mail_forwarder.deleted', [
            'forwarder_id' => $forwarderId,
            'source' => WebSpaceMailForwarder::sourceAddress($record),
            'destination' => (string) $record['destination'],
        ]);

        return ApiResponse::success([], 'Deleted', 200);
    }

    public function setAutorespond(Request $request, string $uuidShort, int $mailboxId): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::MAIL_UPDATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $record = WebSpaceMailbox::getById($mailboxId);
        if (!$record || (int) $record['webspace_id'] !== (int) $resolved['space']['id']) {
            return ApiResponse::error('Mailbox not found', 'NOT_FOUND', 404);
        }

        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $enabled = !empty($body['enabled'] ?? $body['autorespond_enabled'] ?? false);
        $subject = array_key_exists('subject', $body)
            ? trim((string) $body['subject'])
            : (array_key_exists('autorespond_subject', $body) ? trim((string) $body['autorespond_subject']) : (string) ($record['autorespond_subject'] ?? ''));
        $message = array_key_exists('body', $body)
            ? (string) $body['body']
            : (array_key_exists('autorespond_body', $body) ? (string) $body['autorespond_body'] : (string) ($record['autorespond_body'] ?? ''));

        if ($enabled && $message === '') {
            return ApiResponse::error('Autorespond body is required when enabled', 'VALIDATION_FAILED', 400);
        }

        $mailHost = MailHost::getById((int) $record['mail_host_id']);
        $email = WebSpaceMailbox::emailAddress($record);
        if ($mailHost) {
            try {
                RemoteMailProvisioner::setAutorespond($mailHost, [
                    'email' => $email,
                    'enabled' => $enabled,
                    'subject' => $subject,
                    'body' => $message,
                ]);
            } catch (\Throwable $e) {
                return ApiResponse::error('Failed to update autorespond: ' . $e->getMessage(), 'UPDATE_FAILED', 500);
            }
        }

        WebSpaceMailbox::update($mailboxId, [
            'autorespond_enabled' => $enabled ? 1 : 0,
            'autorespond_subject' => $subject !== '' ? $subject : null,
            'autorespond_body' => $message !== '' ? $message : null,
        ]);

        WebSpaceActivityLogger::log($resolved['space'], $resolved['user'], 'webspace.mailbox.autorespond_updated', [
            'mailbox_id' => $mailboxId,
            'email' => $email,
            'enabled' => $enabled,
        ]);

        return ApiResponse::success([
            'autorespond_enabled' => $enabled,
            'autorespond_subject' => $subject !== '' ? $subject : null,
            'autorespond_body' => $message !== '' ? $message : null,
        ], 'Updated', 200);
    }

    public function getSpamFilter(Request $request, string $uuidShort, int $mailboxId): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::MAIL_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $record = WebSpaceMailbox::getById($mailboxId);
        if (!$record || (int) $record['webspace_id'] !== (int) $resolved['space']['id']) {
            return ApiResponse::error('Mailbox not found', 'NOT_FOUND', 404);
        }

        return ApiResponse::success([
            'spam_filter_enabled' => !array_key_exists('spam_filter_enabled', $record) || !empty($record['spam_filter_enabled']),
        ], 'OK', 200);
    }

    public function setSpamFilter(Request $request, string $uuidShort, int $mailboxId): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::MAIL_UPDATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $record = WebSpaceMailbox::getById($mailboxId);
        if (!$record || (int) $record['webspace_id'] !== (int) $resolved['space']['id']) {
            return ApiResponse::error('Mailbox not found', 'NOT_FOUND', 404);
        }

        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $enabled = !array_key_exists('enabled', $body) || !empty($body['enabled']);
        $mailHost = MailHost::getById((int) $record['mail_host_id']);
        $email = WebSpaceMailbox::emailAddress($record);
        if ($mailHost) {
            try {
                RemoteMailProvisioner::setSpamFilter($mailHost, [
                    'email' => $email,
                    'enabled' => $enabled,
                ]);
            } catch (\Throwable $e) {
                return ApiResponse::error('Failed to update spam filter: ' . $e->getMessage(), 'UPDATE_FAILED', 500);
            }
        }

        WebSpaceMailbox::update($mailboxId, ['spam_filter_enabled' => $enabled ? 1 : 0]);
        WebSpaceActivityLogger::log($resolved['space'], $resolved['user'], 'webspace.mailbox.spam_filter_updated', [
            'mailbox_id' => $mailboxId,
            'email' => $email,
            'enabled' => $enabled,
        ]);

        return ApiResponse::success(['spam_filter_enabled' => $enabled], 'Updated', 200);
    }

    public function listMailingLists(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::MAIL_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $rows = WebSpaceMailingList::listByWebSpaceId((int) $resolved['space']['id']);
        $grouped = [];
        foreach ($rows as $row) {
            $key = ($row['list_local'] ?? '') . '@' . ($row['domain'] ?? '');
            if (!isset($grouped[$key])) {
                $grouped[$key] = [
                    'list_local' => (string) ($row['list_local'] ?? ''),
                    'domain' => (string) ($row['domain'] ?? ''),
                    'address' => WebSpaceMailingList::listAddress($row),
                    'mail_host_id' => (int) ($row['mail_host_id'] ?? 0),
                    'members' => [],
                ];
            }
            $grouped[$key]['members'][] = [
                'id' => (int) ($row['id'] ?? 0),
                'email' => (string) ($row['member'] ?? ''),
                'enabled' => !empty($row['enabled']),
            ];
        }

        return ApiResponse::success(['data' => array_values($grouped)], 'OK', 200);
    }

    public function createMailingList(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::MAIL_CREATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $space = $resolved['space'];
        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $hostId = (int) ($body['mail_host_id'] ?? 0);
        $listLocal = strtolower(trim((string) ($body['list_local'] ?? '')));
        $domain = strtolower(trim((string) ($body['domain'] ?? '')));
        $members = is_array($body['members'] ?? null) ? $body['members'] : [];

        if ($hostId <= 0 || $listLocal === '' || $domain === '' || $members === []) {
            return ApiResponse::error('mail_host_id, list_local, domain, and members are required', 'VALIDATION_FAILED', 400);
        }

        $normalizedMembers = [];
        foreach ($members as $member) {
            $member = strtolower(trim((string) $member));
            if (!filter_var($member, FILTER_VALIDATE_EMAIL)) {
                return ApiResponse::error('Each member must be a valid email address', 'VALIDATION_FAILED', 400);
            }
            $normalizedMembers[] = $member;
        }

        $mailHost = MailHost::getById($hostId);
        if (!$mailHost || !$this->hostAllowedForWebNode($mailHost, (int) $space['web_node_id'])) {
            return ApiResponse::error('Mail host not found for this WebSpace', 'MAIL_HOST_NOT_FOUND', 404);
        }

        $address = $listLocal . '@' . $domain;
        try {
            RemoteMailProvisioner::createMailingList($mailHost, [
                'address' => $address,
                'members' => array_values(array_unique($normalizedMembers)),
            ]);
        } catch (\Throwable $e) {
            return ApiResponse::error('Failed to create mailing list: ' . $e->getMessage(), 'CREATION_FAILED', 500);
        }

        WebSpaceMailingList::deleteListMembers((int) $space['id'], $listLocal, $domain);
        foreach (array_unique($normalizedMembers) as $member) {
            WebSpaceMailingList::create([
                'webspace_id' => (int) $space['id'],
                'mail_host_id' => $hostId,
                'list_local' => $listLocal,
                'domain' => $domain,
                'member' => $member,
                'enabled' => 1,
            ]);
        }

        return ApiResponse::success(['address' => $address], 'Mailing list created', 201);
    }

    public function deleteMailingList(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::MAIL_DELETE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        $listLocal = strtolower(trim((string) ($body['list_local'] ?? '')));
        $domain = strtolower(trim((string) ($body['domain'] ?? '')));
        if ($listLocal === '' || $domain === '') {
            return ApiResponse::error('list_local and domain are required', 'VALIDATION_FAILED', 400);
        }

        $rows = array_filter(
            WebSpaceMailingList::listByWebSpaceId((int) $resolved['space']['id']),
            static fn (array $row): bool => ($row['list_local'] ?? '') === $listLocal && ($row['domain'] ?? '') === $domain,
        );
        if ($rows === []) {
            return ApiResponse::error('Mailing list not found', 'NOT_FOUND', 404);
        }

        $mailHost = MailHost::getById((int) ($rows[array_key_first($rows)]['mail_host_id'] ?? 0));
        $address = $listLocal . '@' . $domain;
        if ($mailHost) {
            try {
                RemoteMailProvisioner::deleteMailingList($mailHost, ['address' => $address]);
            } catch (\Throwable $e) {
                return ApiResponse::error('Failed to delete mailing list: ' . $e->getMessage(), 'DELETE_FAILED', 500);
            }
        }

        WebSpaceMailingList::deleteListMembers((int) $resolved['space']['id'], $listLocal, $domain);

        return ApiResponse::success([], 'Deleted', 200);
    }

    /**
     * @param list<mixed> $zoneRecords
     * @param array{type: string, name: string, value: string, priority?: int|null} $hint
     */
    private static function mailDnsRecordProvisioned(array $zoneRecords, string $domain, array $hint): bool
    {
        $type = strtoupper(trim((string) ($hint['type'] ?? '')));
        $name = trim((string) ($hint['name'] ?? '@'));
        $value = trim((string) ($hint['value'] ?? ''));
        $fqdn = $name === '@' ? $domain : ($name . '.' . $domain);

        foreach ($zoneRecords as $record) {
            if (!is_array($record)) {
                continue;
            }
            if (strtoupper((string) ($record['type'] ?? '')) !== $type) {
                continue;
            }
            $recordName = strtolower(rtrim((string) ($record['name'] ?? ''), '.'));
            if ($recordName !== strtolower(rtrim($fqdn, '.')) && $recordName !== strtolower(rtrim($domain, '.'))) {
                continue;
            }

            if ($type === 'MX') {
                $target = rtrim((string) ($record['content'] ?? ''), '.');
                if (rtrim($value, '.') === $target) {
                    return true;
                }
            } elseif ($type === 'TXT') {
                $content = trim((string) ($record['content'] ?? ''));
                if ($content === $value || str_contains($content, $value)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * @param array<string, mixed> $mailHost
     */
    private function hostAllowedForWebNode(array $mailHost, int $webNodeId): bool
    {
        $hostWebNodeId = $mailHost['web_node_id'] ?? null;
        if ($hostWebNodeId === null || $hostWebNodeId === '' || (int) $hostWebNodeId === 0) {
            return true;
        }

        return (int) $hostWebNodeId === $webNodeId;
    }

    /**
     * @param array{user: array<string, mixed>, space: array<string, mixed>} $resolved
     */
    private function canViewPassword(array $resolved): bool
    {
        return WebSpaceGateway::hasPermission(
            (string) $resolved['user']['uuid'],
            $resolved['space'],
            WebSpaceSubuserPermissions::MAIL_VIEW_PASSWORD,
        );
    }

    /**
     * @return array{user: array<string, mixed>, space: array<string, mixed>}|Response
     */
    private function resolve(Request $request, string $uuidShort, string $permission): array | Response
    {
        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'NOT_AUTHENTICATED', 401);
        }

        $space = WebSpaceGateway::resolveWebSpace($uuidShort);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        if (!WebSpaceGateway::canUserAccessWebSpace((string) $user['uuid'], (string) $space['uuid'])) {
            return ApiResponse::error('Access denied', 'FORBIDDEN', 403);
        }

        $denied = CheckWebSpacePermission::require($request, $space, $permission);
        if ($denied instanceof Response) {
            return $denied;
        }

        return ['user' => $user, 'space' => $space];
    }
}
