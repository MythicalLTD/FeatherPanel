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

namespace App\Controllers\Admin;

use App\Chat\Realm;
use App\Chat\Spell;
use App\Chat\Activity;
use App\Chat\SpellVariable;
use App\Helpers\ApiResponse;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class SpellsController
{
    public function index(Request $request): Response
    {
        // Validate and sanitize pagination parameters
        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 10);

        // Adjust page parameter if it's less than 1
        if ($page < 1) {
            $page = 1;
        }

        // Adjust limit parameter with reasonable bounds
        $maxLimit = 100; // Define maximum limit to prevent performance issues
        if ($limit < 1) {
            $limit = 10; // Default to 10 if limit is less than 1
        }
        if ($limit > $maxLimit) {
            $limit = $maxLimit; // Cap at maximum limit
        }

        $search = $request->query->get('search', '');
        $realmId = $request->query->get('realm_id');
        $realmId = $realmId ? (int) $realmId : null;

        $spells = Spell::searchSpells(
            page: $page,
            limit: $limit,
            search: $search,
            realmId: $realmId
        );
        $total = Spell::getSpellsCount($search, $realmId);

        return ApiResponse::success([
            'spells' => $spells,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
            ],
        ], 'Spells fetched successfully', 200);
    }

    public function show(Request $request, int $id): Response
    {
        $spell = Spell::getSpellWithRealm($id);
        if (!$spell) {
            return ApiResponse::error('Spell not found', 'SPELL_NOT_FOUND', 404);
        }

        return ApiResponse::success(['spell' => $spell], 'Spell fetched successfully', 200);
    }

    public function create(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        $requiredFields = ['realm_id', 'author', 'name'];
        $missingFields = [];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                $missingFields[] = $field;
            }
        }
        if (!empty($missingFields)) {
            return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS');
        }

        // Validate realm_id exists
        if (!Realm::getById($data['realm_id'])) {
            return ApiResponse::error('Realm not found', 'REALM_NOT_FOUND', 404);
        }

        // Validate string fields
        $stringFields = ['author', 'name', 'description', 'update_url', 'config_files', 'config_startup', 'config_logs', 'config_stop', 'startup', 'script_container', 'script_entry', 'script_install'];
        foreach ($stringFields as $field) {
            if (isset($data[$field]) && !is_string($data[$field])) {
                return ApiResponse::error("$field must be a string", 'INVALID_DATA_TYPE');
            }
        }

        // Validate JSON fields
        $jsonFields = ['features', 'docker_images', 'file_denylist'];
        foreach ($jsonFields as $field) {
            if (isset($data[$field]) && !empty($data[$field])) {
                if (!is_string($data[$field]) || !Spell::isValidJson($data[$field])) {
                    return ApiResponse::error("$field must be valid JSON", 'INVALID_JSON_FIELD');
                }
            }
        }

        // Validate boolean fields
        $booleanFields = ['script_is_privileged', 'force_outgoing_ip'];
        foreach ($booleanFields as $field) {
            if (isset($data[$field]) && !is_bool($data[$field]) && !in_array($data[$field], [0, 1, '0', '1'])) {
                return ApiResponse::error("$field must be a boolean", 'INVALID_DATA_TYPE');
            }
        }

        // Validate integer fields
        $integerFields = ['config_from', 'copy_script_from'];
        foreach ($integerFields as $field) {
            if (isset($data[$field]) && (!is_numeric($data[$field]) || (int) $data[$field] < 0)) {
                return ApiResponse::error("$field must be a positive integer", 'INVALID_DATA_TYPE');
            }
        }

        // Generate UUID if not provided
        if (!isset($data['uuid'])) {
            $data['uuid'] = Spell::generateUuid();
        } else {
            // Validate UUID format
            if (!preg_match('/^[a-f0-9\-]{36}$/i', $data['uuid'])) {
                return ApiResponse::error('Invalid UUID format', 'INVALID_UUID');
            }
        }

        // Check if UUID already exists
        if (Spell::getSpellByUuid($data['uuid'])) {
            return ApiResponse::error('Spell with this UUID already exists', 'UUID_ALREADY_EXISTS');
        }

        $spellId = Spell::createSpell($data);
        if (!$spellId) {
            return ApiResponse::error('Failed to create spell', 'SPELL_CREATE_FAILED', 400);
        }

        $spell = Spell::getSpellById($spellId);

        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'create_spell',
            'context' => 'Created spell: ' . $spell['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['spell' => $spell], 'Spell created successfully', 201);
    }

    public function update(Request $request, int $id): Response
    {
        $spell = Spell::getSpellById($id);
        if (!$spell) {
            return ApiResponse::error('Spell not found', 'SPELL_NOT_FOUND', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        if (empty($data)) {
            return ApiResponse::error('No data provided', 'NO_DATA_PROVIDED', 400);
        }

        if (isset($data['id'])) {
            unset($data['id']);
        }

        // Validate realm_id if provided
        if (isset($data['realm_id'])) {
            if (!Realm::getById($data['realm_id'])) {
                return ApiResponse::error('Realm not found', 'REALM_NOT_FOUND', 404);
            }
        }

        // Validate string fields
        $stringFields = ['author', 'name', 'description', 'update_url', 'config_files', 'config_startup', 'config_logs', 'config_stop', 'startup', 'script_container', 'script_entry', 'script_install'];
        foreach ($stringFields as $field) {
            if (isset($data[$field]) && !is_string($data[$field])) {
                return ApiResponse::error("$field must be a string", 'INVALID_DATA_TYPE');
            }
        }

        // Validate JSON fields
        $jsonFields = ['features', 'docker_images', 'file_denylist'];
        foreach ($jsonFields as $field) {
            if (isset($data[$field]) && !empty($data[$field])) {
                if (!is_string($data[$field]) || !Spell::isValidJson($data[$field])) {
                    return ApiResponse::error("$field must be valid JSON", 'INVALID_JSON_FIELD');
                }
            }
        }

        // Validate boolean fields
        $booleanFields = ['script_is_privileged', 'force_outgoing_ip'];
        foreach ($booleanFields as $field) {
            if (isset($data[$field]) && !is_bool($data[$field]) && !in_array($data[$field], [0, 1, '0', '1'])) {
                return ApiResponse::error("$field must be a boolean", 'INVALID_DATA_TYPE');
            }
        }

        // Validate integer fields
        $integerFields = ['config_from', 'copy_script_from'];
        foreach ($integerFields as $field) {
            if (isset($data[$field]) && (!is_numeric($data[$field]) || (int) $data[$field] < 0)) {
                return ApiResponse::error("$field must be a positive integer", 'INVALID_DATA_TYPE');
            }
        }

        // Validate UUID if provided
        if (isset($data['uuid'])) {
            if (!preg_match('/^[a-f0-9\-]{36}$/i', $data['uuid'])) {
                return ApiResponse::error('Invalid UUID format', 'INVALID_UUID');
            }
            // Check if UUID already exists (excluding current spell)
            $existingSpell = Spell::getSpellByUuid($data['uuid']);
            if ($existingSpell && $existingSpell['id'] !== $id) {
                return ApiResponse::error('Spell with this UUID already exists', 'UUID_ALREADY_EXISTS');
            }
        }

        $success = Spell::updateSpellById($id, $data);
        if (!$success) {
            return ApiResponse::error('Failed to update spell', 'SPELL_UPDATE_FAILED', 400);
        }

        $spell = Spell::getSpellById($id);

        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'update_spell',
            'context' => 'Updated spell: ' . $spell['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['spell' => $spell], 'Spell updated successfully', 200);
    }

    public function delete(Request $request, int $id): Response
    {
        $spell = Spell::getSpellById($id);
        if (!$spell) {
            return ApiResponse::error('Spell not found', 'SPELL_NOT_FOUND', 404);
        }

        // Check if spell is referenced by other spells
        $referencingSpells = Spell::getSpellsByConfigFrom($id);
        $referencingSpells = array_merge($referencingSpells, Spell::getSpellsByCopyScriptFrom($id));

        if (!empty($referencingSpells)) {
            return ApiResponse::error('Cannot delete spell: it is referenced by other spells', 'SPELL_REFERENCED', 400);
        }

        $success = Spell::hardDeleteSpell($id);
        if (!$success) {
            return ApiResponse::error('Failed to delete spell', 'SPELL_DELETE_FAILED', 400);
        }

        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'delete_spell',
            'context' => 'Deleted spell: ' . $spell['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Spell deleted successfully', 200);
    }

    public function getByRealm(Request $request, int $realmId): Response
    {
        // Validate realm exists
        $realm = Realm::getById($realmId);
        if (!$realm) {
            return ApiResponse::error('Realm not found', 'REALM_NOT_FOUND', 404);
        }

        // Validate and sanitize pagination parameters
        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 10);

        if ($page < 1) {
            $page = 1;
        }

        $maxLimit = 100;
        if ($limit < 1) {
            $limit = 10;
        }
        if ($limit > $maxLimit) {
            $limit = $maxLimit;
        }

        $search = $request->query->get('search', '');

        $spells = Spell::searchSpells(
            page: $page,
            limit: $limit,
            search: $search,
            realmId: $realmId
        );
        $total = Spell::getSpellsCount($search, $realmId);

        return ApiResponse::success([
            'spells' => $spells,
            'realm' => $realm,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
            ],
        ], 'Spells for realm fetched successfully', 200);
    }

    public function import(Request $request): Response
    {
        // Get realm_id from POST data
        $realmId = $request->request->get('realm_id');
        if (!$realmId || !is_numeric($realmId)) {
            return ApiResponse::error('Missing or invalid realm ID', 'INVALID_REALM_ID', 400);
        }

        // Validate realm exists
        $realm = Realm::getById((int) $realmId);
        if (!$realm) {
            return ApiResponse::error('Realm not found', 'REALM_NOT_FOUND', 404);
        }

        // Get uploaded file
        $files = $request->files->all();
        if (empty($files) || !isset($files['file'])) {
            return ApiResponse::error('No file uploaded', 'NO_FILE_UPLOADED', 400);
        }

        $file = $files['file'];
        if ($file->getError() !== UPLOAD_ERR_OK) {
            return ApiResponse::error('File upload error', 'FILE_UPLOAD_ERROR', 400);
        }

        // Read and parse JSON
        $jsonContent = file_get_contents($file->getPathname());
        if (!$jsonContent) {
            return ApiResponse::error('Could not read file', 'FILE_READ_ERROR', 400);
        }

        $jsonData = json_decode($jsonContent, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON format', 'INVALID_JSON', 400);
        }

        // Map JSON data to spell format
        $spellData = [
            'realm_id' => (int) $realmId,
            'uuid' => Spell::generateUuid(),
            'name' => $jsonData['name'] ?? 'Imported Spell',
            'author' => $jsonData['author'] ?? 'Unknown',
            'description' => $jsonData['description'] ?? '',
            'features' => isset($jsonData['features']) ? json_encode($jsonData['features']) : null,
            'docker_images' => isset($jsonData['docker_images']) ? json_encode($jsonData['docker_images']) : null,
            'file_denylist' => isset($jsonData['file_denylist']) ? json_encode($jsonData['file_denylist']) : null,
            'update_url' => $jsonData['meta']['update_url'] ?? null,
            'config_files' => $jsonData['config']['files'] ?? null,
            'config_startup' => $jsonData['config']['startup'] ?? null,
            'config_logs' => $jsonData['config']['logs'] ?? null,
            'config_stop' => $jsonData['config']['stop'] ?? null,
            'startup' => $jsonData['startup'] ?? null,
            'script_container' => $jsonData['scripts']['installation']['container'] ?? 'alpine:3.4',
            'script_entry' => $jsonData['scripts']['installation']['entrypoint'] ?? 'ash',
            'script_is_privileged' => true,
            'script_install' => $jsonData['scripts']['installation']['script'] ?? null,
            'force_outgoing_ip' => false,
        ];

        // Preserve original UUID if it exists in MythicalPanel metadata
        if (isset($jsonData['_mythicalpanel']['spell_metadata']['uuid'])) {
            $originalUuid = $jsonData['_mythicalpanel']['spell_metadata']['uuid'];
            // Check if UUID already exists
            $existingSpell = Spell::getSpellByUuid($originalUuid);
            if (!$existingSpell) {
                $spellData['uuid'] = $originalUuid;
            }
        }

        // Preserve original metadata if available
        $importMetadata = null;
        if (isset($jsonData['_mythicalpanel'])) {
            $importMetadata = [
                'original_export_info' => $jsonData['_mythicalpanel']['export_info'] ?? null,
                'original_spell_metadata' => $jsonData['_mythicalpanel']['spell_metadata'] ?? null,
                'import_info' => [
                    'imported_by' => $admin['username'] ?? 'Unknown',
                    'imported_at' => date('Y-m-d H:i:s'),
                    'panel_version' => '1.0.0',
                    'import_format_version' => '1.0',
                ],
            ];
        }

        // Create spell
        $spellId = Spell::createSpell($spellData);
        if (!$spellId) {
            return ApiResponse::error('Failed to create spell from import', 'IMPORT_CREATE_FAILED', 400);
        }

        // Import variables if present
        if (isset($jsonData['variables']) && is_array($jsonData['variables'])) {
            foreach ($jsonData['variables'] as $var) {
                $variableData = [
                    'spell_id' => $spellId,
                    'name' => $var['name'] ?? '',
                    'description' => $var['description'] ?? '',
                    'env_variable' => $var['env_variable'] ?? '',
                    'default_value' => $var['default_value'] ?? '',
                    'user_viewable' => isset($var['user_viewable']) ? ($var['user_viewable'] ? 'true' : 'false') : 'true',
                    'user_editable' => isset($var['user_editable']) ? ($var['user_editable'] ? 'true' : 'false') : 'true',
                    'rules' => $var['rules'] ?? '',
                    'field_type' => $var['field_type'] ?? 'text',
                ];
                SpellVariable::createVariable($variableData);
            }
        }

        $spell = Spell::getSpellById($spellId);

        // Log activity with metadata information
        $logContext = 'Imported spell: ' . $spell['name'];
        if ($importMetadata && isset($importMetadata['original_export_info']['exported_by'])) {
            $logContext .= ' (originally exported by: ' . $importMetadata['original_export_info']['exported_by'] . ')';
        }

        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'import_spell',
            'context' => $logContext,
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['spell' => $spell], 'Spell imported successfully', 201);
    }

    public function export(Request $request, int $id): Response
    {
        // Get spell with realm information
        $spell = Spell::getSpellWithRealm($id);
        if (!$spell) {
            return ApiResponse::error('Spell not found', 'SPELL_NOT_FOUND', 404);
        }

        // Get spell variables
        $variables = SpellVariable::getVariablesBySpellId($id);

        // Build export data structure matching the import format
        $exportData = [
            '_comment' => 'DO NOT EDIT: FILE GENERATED AUTOMATICALLY BY PANEL',
            'meta' => [
                'update_url' => $spell['update_url'],
                'version' => 'PTDL_v2',
            ],
            'exported_at' => date('c'), // ISO 8601 format
            'name' => $spell['name'],
            'author' => $spell['author'],
            'description' => $spell['description'],
            'features' => !empty($spell['features']) ? json_decode($spell['features'], true) : [],
            'docker_images' => !empty($spell['docker_images']) ? json_decode($spell['docker_images'], true) : [],
            'file_denylist' => !empty($spell['file_denylist']) ? json_decode($spell['file_denylist'], true) : [],
            'startup' => $spell['startup'],
            'config' => [
                'files' => $spell['config_files'] ?? '{}',
                'startup' => $spell['config_startup'] ?? '{}',
                'logs' => $spell['config_logs'] ?? '{}',
                'stop' => $spell['config_stop'] ?? 'stop',
            ],
            'scripts' => [
                'installation' => [
                    'container' => $spell['script_container'] ?? 'alpine:3.4',
                    'entrypoint' => $spell['script_entry'] ?? 'ash',
                    'script' => $spell['script_install'] ?? '',
                ],
            ],
            'variables' => [],
            // MythicalPanel-specific metadata (won't affect import compatibility)
            '_mythicalpanel' => [
                'export_info' => [
                    'exported_by' => $admin['username'] ?? 'Unknown',
                    'exported_at' => date('Y-m-d H:i:s'),
                    'panel_version' => '1.0.0', // You can make this dynamic
                    'export_format_version' => '1.0',
                ],
                'spell_metadata' => [
                    'uuid' => $spell['uuid'],
                    'realm_id' => $spell['realm_id'],
                    'realm_name' => $spell['realm_name'] ?? 'Unknown',
                    'created_at' => $spell['created_at'],
                    'updated_at' => $spell['updated_at'],
                    'script_is_privileged' => (bool) $spell['script_is_privileged'],
                    'force_outgoing_ip' => (bool) $spell['force_outgoing_ip'],
                    'config_from' => $spell['config_from'],
                    'copy_script_from' => $spell['copy_script_from'],
                ],
                'variables_count' => count($variables),
                'features_count' => !empty($spell['features']) ? count(json_decode($spell['features'], true)) : 0,
                'docker_images_count' => !empty($spell['docker_images']) ? count(json_decode($spell['docker_images'], true)) : 0,
            ],
        ];

        // Add variables to export data
        foreach ($variables as $variable) {
            $exportData['variables'][] = [
                'name' => $variable['name'],
                'description' => $variable['description'],
                'env_variable' => $variable['env_variable'],
                'default_value' => $variable['default_value'],
                'user_viewable' => (bool) $variable['user_viewable'],
                'user_editable' => (bool) $variable['user_editable'],
                'rules' => $variable['rules'],
                'field_type' => $variable['field_type'] ?? 'text',
            ];
        }

        // Generate filename
        $filename = strtolower(str_replace(' ', '-', $spell['name'])) . '.json';

        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'export_spell',
            'context' => 'Exported spell: ' . $spell['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        // Return JSON file as download
        $response = new Response(
            json_encode($exportData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
            200,
            [
                'Content-Type' => 'application/json',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ]
        );

        return $response;
    }

    // --- Spell Variables CRUD ---
    public function listVariables(Request $request, int $spellId): Response
    {
        $spell = Spell::getSpellById($spellId);
        if (!$spell) {
            return ApiResponse::error('Spell not found', 'SPELL_NOT_FOUND', 404);
        }
        $vars = SpellVariable::getVariablesBySpellId($spellId);

        return ApiResponse::success(['variables' => $vars], 'Variables fetched', 200);
    }

    public function createVariable(Request $request, int $spellId): Response
    {
        $spell = Spell::getSpellById($spellId);
        if (!$spell) {
            return ApiResponse::error('Spell not found', 'SPELL_NOT_FOUND', 404);
        }
        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }
        $data['spell_id'] = $spellId;
        $required = ['name', 'env_variable', 'description', 'default_value'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || trim((string) $data[$field]) === '') {
                return ApiResponse::error("$field is required", 'MISSING_REQUIRED_FIELD', 400);
            }
        }
        // Optional: user_viewable/user_editable/rules
        if (!isset($data['user_viewable'])) {
            $data['user_viewable'] = 1;
        }
        if (!isset($data['user_editable'])) {
            $data['user_editable'] = 1;
        }
        $varId = SpellVariable::createVariable($data);
        if (!$varId) {
            return ApiResponse::error('Failed to create variable', 'VARIABLE_CREATE_FAILED', 400);
        }
        $var = SpellVariable::getVariableById($varId);

        return ApiResponse::success(['variable' => $var], 'Variable created', 201);
    }

    public function updateVariable(Request $request, int $id): Response
    {
        $var = SpellVariable::getVariableById($id);
        if (!$var) {
            return ApiResponse::error('Variable not found', 'VARIABLE_NOT_FOUND', 404);
        }
        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }
        unset($data['id']);
        $success = SpellVariable::updateVariable($id, $data);
        if (!$success) {
            return ApiResponse::error('Failed to update variable', 'VARIABLE_UPDATE_FAILED', 400);
        }
        $var = SpellVariable::getVariableById($id);

        return ApiResponse::success(['variable' => $var], 'Variable updated', 200);
    }

    public function deleteVariable(Request $request, int $id): Response
    {
        $var = SpellVariable::getVariableById($id);
        if (!$var) {
            return ApiResponse::error('Variable not found', 'VARIABLE_NOT_FOUND', 404);
        }
        $success = SpellVariable::deleteVariable($id);
        if (!$success) {
            return ApiResponse::error('Failed to delete variable', 'VARIABLE_DELETE_FAILED', 400);
        }

        return ApiResponse::success([], 'Variable deleted', 200);
    }
}
