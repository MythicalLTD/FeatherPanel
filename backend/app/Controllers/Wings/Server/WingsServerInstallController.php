<?php

/*
 * This file is part of MythicalPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Controllers\Wings\Server;

use App\Chat\Node;
use App\Chat\Spell;
use App\Chat\Server;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class WingsServerInstallController
{
    public function getServerInstall(Request $request, string $uuid): Response
    {
        // Get server by UUID
        $server = Server::getServerByUuid($uuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get Wings authentication attributes from request
        $tokenId = $request->attributes->get('wings_token_id');
        $tokenSecret = $request->attributes->get('wings_token_secret');

        if (!$tokenId || !$tokenSecret) {
            return ApiResponse::error('Invalid Wings authentication', 'INVALID_WINGS_AUTH', 403);
        }

        // Get node info
        $node = Node::getNodeByWingsAuth($tokenId, $tokenSecret);

        if (!$node) {
            return ApiResponse::error('Invalid Wings authentication', 'INVALID_WINGS_AUTH', 403);
        }

        // Get server info
        $server = Server::getServerByUuidAndNodeId($uuid, (int) $node['id']);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get spell information
        $spell = Spell::getSpellById($server['spell_id']);
        if (!$spell) {
            return ApiResponse::error('Spell not found', 'SPELL_NOT_FOUND', 404);
        }

        // Get docker image from spell or server
        $containerImage = $server['image']; // Use server.image as fallback
        if (!empty($spell['copy_script_container'])) {
            $containerImage = $spell['copy_script_container'];
        } elseif (!empty($spell['script_container'])) {
            $containerImage = $spell['script_container'];
        } elseif (!empty($spell['docker_images'])) {
            try {
                $dockerImages = json_decode($spell['docker_images'], true);
                if (is_array($dockerImages) && !empty($dockerImages)) {
                    // Use the first available image from spell or fallback to server image
                    $containerImage = $dockerImages[0] ?? $server['image'];
                }
            } catch (\Exception $e) {
                // If docker images parsing fails, use server image
            }
        }

        // Get installation script from spell
        $script = '';
        if (!empty($spell['copy_script_install'])) {
            $script = $spell['copy_script_install'];
        } elseif (!empty($spell['script_install'])) {
            $script = $spell['script_install'];
        }

        // Get entrypoint from spell or use default
        $entrypoint = '/bin/bash';
        if (!empty($spell['copy_script_entry'])) {
            $entrypoint = $spell['copy_script_entry'];
        } elseif (!empty($spell['script_entry'])) {
            $entrypoint = $spell['script_entry'];
        }

        // Build the installation configuration
        $installConfig = [
            'container_image' => $containerImage,
            'entrypoint' => $entrypoint,
            'script' => $script,
        ];

        return ApiResponse::sendManualResponse($installConfig, 200);
    }

    public function postServerInstall(Request $request, string $uuid): Response
    {
        // Get server by UUID
        $server = Server::getServerByUuid($uuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get Wings authentication attributes from request
        $tokenId = $request->attributes->get('wings_token_id');
        $tokenSecret = $request->attributes->get('wings_token_secret');

        if (!$tokenId || !$tokenSecret) {
            return ApiResponse::error('Invalid Wings authentication', 'INVALID_WINGS_AUTH', 403);
        }

        // Get node info
        $node = Node::getNodeByWingsAuth($tokenId, $tokenSecret);

        if (!$node) {
            return ApiResponse::error('Invalid Wings authentication', 'INVALID_WINGS_AUTH', 403);
        }

        // Get server info
        $server = Server::getServerByUuidAndNodeId($uuid, (int) $node['id']);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get request content
        $content = json_decode($request->getContent(), true);

        if (!$content) {
            return ApiResponse::error('Invalid JSON payload', 'INVALID_JSON', 400);
        }

        // Validate required fields
        if (!isset($content['successful'])) {
            return ApiResponse::error('Missing required field: successful', 'MISSING_FIELD', 400);
        }

        $successful = (bool) $content['successful'];
        $reinstall = (bool) ($content['reinstall'] ?? false);

        // Update server installation status
        try {
            $status = 'installed'; // Default to installed for successful installations
            $installedAt = new \DateTimeImmutable();

            // Make sure the type of failure is accurate
            if (!$successful) {
                $status = 'installation_failed';

                if ($reinstall) {
                    $status = 'reinstall_failed';
                }
            }

            // Keep the server suspended if it's already suspended
            if ($server['status'] === 'suspended') {
                $status = 'suspended';
            }

            // Update server status and installed_at timestamp
            Server::updateServerInstallationStatus($server['id'], $status, $installedAt);

            // TODO: Implement event system for installation notifications

            return ApiResponse::sendManualResponse([], 204);

        } catch (\Exception $e) {
            return ApiResponse::error('Failed to update installation status', 'UPDATE_FAILED', 500);
        }
    }
}
