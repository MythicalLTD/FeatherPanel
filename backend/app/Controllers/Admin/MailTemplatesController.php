<?php

/*
 * This file is part of FeatherPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Controllers\Admin;

use App\Chat\User;
use App\Chat\Activity;
use App\Chat\MailList;
use App\Chat\MailQueue;
use App\Chat\MailTemplate;
use App\Helpers\ApiResponse;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class MailTemplatesController
{
    public function index(Request $request): Response
    {
        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 10);
        $search = $request->query->get('search', '');
        $includeDeleted = $request->query->get('include_deleted', 'false') === 'true';

        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 10;
        }
        if ($limit > 100) {
            $limit = 100;
        }

        $templates = MailTemplate::getAll($includeDeleted);

        // Apply search filter
        if (!empty($search)) {
            $templates = array_filter($templates, function ($template) use ($search) {
                return stripos($template['name'], $search) !== false
                    || stripos($template['subject'], $search) !== false;
            });
        }

        // Apply pagination
        $total = count($templates);
        $totalPages = ceil($total / $limit);
        $offset = ($page - 1) * $limit;
        $templates = array_slice($templates, $offset, $limit);

        $from = ($page - 1) * $limit + 1;
        $to = min($from + $limit - 1, $total);

        return ApiResponse::success([
            'templates' => $templates,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $total,
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1,
                'from' => $from,
                'to' => $to,
            ],
            'search' => [
                'query' => $search,
                'has_results' => count($templates) > 0,
            ],
        ], 'Mail templates fetched successfully', 200);
    }

    public function show(Request $request, int $id): Response
    {
        $template = MailTemplate::getById($id);
        if (!$template) {
            return ApiResponse::error('Mail template not found', 'TEMPLATE_NOT_FOUND', 404);
        }

        return ApiResponse::success(['template' => $template], 'Mail template fetched successfully', 200);
    }

    public function create(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);

        if (empty($data)) {
            return ApiResponse::error('No data provided', 'NO_DATA_PROVIDED', 400);
        }

        // Required fields validation
        $requiredFields = ['name', 'subject', 'body'];
        $missingFields = [];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                $missingFields[] = $field;
            }
        }

        if (!empty($missingFields)) {
            return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS', 400);
        }

        // Validate data types and length
        $validationRules = [
            'name' => ['string', 1, 255],
            'subject' => ['string', 1, 255],
            'body' => ['string', 1, 65535],
        ];

        foreach ($validationRules as $field => [$type, $minLength, $maxLength]) {
            if (!is_string($data[$field])) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a string', 'INVALID_DATA_TYPE', 400);
            }

            $length = strlen($data[$field]);
            if ($length < $minLength) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be at least $minLength characters long", 'INVALID_DATA_LENGTH', 400);
            }
            if ($length > $maxLength) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be less than $maxLength characters long", 'INVALID_DATA_LENGTH', 400);
            }
        }

        // Check if template name already exists
        $existingTemplate = MailTemplate::getByName($data['name']);
        if ($existingTemplate) {
            return ApiResponse::error('Template name already exists', 'TEMPLATE_NAME_EXISTS', 409);
        }

        // Set default values
        $data['deleted'] = 'false';
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['updated_at'] = date('Y-m-d H:i:s');

        $templateId = MailTemplate::create($data);
        if (!$templateId) {
            return ApiResponse::error('Failed to create mail template', 'FAILED_TO_CREATE_TEMPLATE', 500);
        }

        // Log activity
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'] ?? null,
            'name' => 'create_mail_template',
            'context' => 'Created mail template: ' . $data['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['template_id' => $templateId], 'Mail template created successfully', 201);
    }

    public function update(Request $request, int $id): Response
    {
        $template = MailTemplate::getById($id);
        if (!$template) {
            return ApiResponse::error('Mail template not found', 'TEMPLATE_NOT_FOUND', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (empty($data)) {
            return ApiResponse::error('No data provided', 'NO_DATA_PROVIDED', 400);
        }

        // Remove fields that shouldn't be updated
        unset($data['id'], $data['created_at']);

        // Validate data types and length for provided fields
        $validationRules = [
            'name' => ['string', 1, 255],
            'subject' => ['string', 1, 255],
            'body' => ['string', 1, 65535],
        ];

        foreach ($data as $field => $value) {
            if (isset($validationRules[$field])) {
                [$type, $minLength, $maxLength] = $validationRules[$field];

                if (!is_string($value)) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a string', 'INVALID_DATA_TYPE', 400);
                }

                $length = strlen($value);
                if ($length < $minLength) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be at least $minLength characters long", 'INVALID_DATA_LENGTH', 400);
                }
                if ($length > $maxLength) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be less than $maxLength characters long", 'INVALID_DATA_LENGTH', 400);
                }
            }
        }

        // Check if template name already exists (excluding current template)
        if (isset($data['name'])) {
            $existingTemplate = MailTemplate::getByName($data['name']);
            if ($existingTemplate && $existingTemplate['id'] != $id) {
                return ApiResponse::error('Template name already exists', 'TEMPLATE_NAME_EXISTS', 409);
            }
        }

        // Add updated timestamp
        $data['updated_at'] = date('Y-m-d H:i:s');

        $updated = MailTemplate::update($id, $data);
        if (!$updated) {
            return ApiResponse::error('Failed to update mail template', 'FAILED_TO_UPDATE_TEMPLATE', 500);
        }

        // Log activity
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'] ?? null,
            'name' => 'update_mail_template',
            'context' => 'Updated mail template: ' . ($data['name'] ?? $template['name']),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Mail template updated successfully', 200);
    }

    public function delete(Request $request, int $id): Response
    {
        $template = MailTemplate::getById($id);
        if (!$template) {
            return ApiResponse::error('Mail template not found', 'TEMPLATE_NOT_FOUND', 404);
        }

        if ($id >= 1 && $id <= 10) {
            return ApiResponse::error('Cannot delete system mail templates', 'SYSTEM_TEMPLATE_DELETE_FAILED', 400);
        }

        $deleted = MailTemplate::softDelete($id);
        if (!$deleted) {
            return ApiResponse::error('Failed to delete mail template', 'FAILED_TO_DELETE_TEMPLATE', 500);
        }

        // Log activity
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'] ?? null,
            'name' => 'delete_mail_template',
            'context' => 'Deleted mail template: ' . $template['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Mail template deleted successfully', 200);
    }

    public function restore(Request $request, int $id): Response
    {
        $template = MailTemplate::getById($id);
        if (!$template) {
            return ApiResponse::error('Mail template not found', 'TEMPLATE_NOT_FOUND', 404);
        }

        $restored = MailTemplate::restore($id);
        if (!$restored) {
            return ApiResponse::error('Failed to restore mail template', 'FAILED_TO_RESTORE_TEMPLATE', 500);
        }

        // Log activity
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'] ?? null,
            'name' => 'restore_mail_template',
            'context' => 'Restored mail template: ' . $template['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Mail template restored successfully', 200);
    }

    public function hardDelete(Request $request, int $id): Response
    {
        $template = MailTemplate::getById($id);
        if (!$template) {
            return ApiResponse::error('Mail template not found', 'TEMPLATE_NOT_FOUND', 404);
        }

        $deleted = MailTemplate::hardDelete($id);
        if (!$deleted) {
            return ApiResponse::error('Failed to permanently delete mail template', 'FAILED_TO_DELETE_TEMPLATE', 500);
        }

        // Log activity
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'] ?? null,
            'name' => 'hard_delete_mail_template',
            'context' => 'Permanently deleted mail template: ' . $template['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Mail template permanently deleted successfully', 200);
    }

    /**
     * Send mass email to all users with valid email addresses.
     *
     * This endpoint queues emails for delivery to all active users.
     * The emails will be processed by the mail sender cron job.
     */
    public function sendMassEmail(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);

        if (empty($data)) {
            return ApiResponse::error('No data provided', 'NO_DATA_PROVIDED', 400);
        }

        // Required fields validation
        $requiredFields = ['subject', 'body'];
        $missingFields = [];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                $missingFields[] = $field;
            }
        }

        if (!empty($missingFields)) {
            return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS', 400);
        }

        // Validate data types and length
        $validationRules = [
            'subject' => ['string', 1, 255],
            'body' => ['string', 1, 65535],
        ];

        foreach ($validationRules as $field => [$type, $minLength, $maxLength]) {
            if (!is_string($data[$field])) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a string', 'INVALID_DATA_TYPE', 400);
            }

            $length = strlen($data[$field]);
            if ($length < $minLength) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be at least $minLength characters long", 'INVALID_DATA_LENGTH', 400);
            }
            if ($length > $maxLength) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be less than $maxLength characters long", 'INVALID_DATA_LENGTH', 400);
            }
        }

        // Get all active users with valid emails
        $users = User::getAllUsers(false);
        $validUsers = array_filter($users, function ($user) {
            return !empty($user['email']) && filter_var($user['email'], FILTER_VALIDATE_EMAIL);
        });

        if (empty($validUsers)) {
            return ApiResponse::error('No valid users found to send emails to', 'NO_VALID_USERS', 400);
        }

        $queuedCount = 0;
        $failedCount = 0;

        // Queue emails for each valid user
        foreach ($validUsers as $user) {
            // Create mail queue entry
            $queueData = [
                'user_uuid' => $user['uuid'],
                'subject' => $data['subject'],
                'body' => $data['body'],
                'status' => 'pending',
                'locked' => 'false',
                'created_at' => date('Y-m-d H:i:s'),
                'deleted' => 'false',
            ];

            $queueId = MailQueue::create($queueData);

            if ($queueId) {
                // Create mail list entry
                $listData = [
                    'queue_id' => $queueId,
                    'user_uuid' => $user['uuid'],
                    'created_at' => date('Y-m-d H:i:s'),
                    'deleted' => 'false',
                ];

                if (MailList::create($listData)) {
                    ++$queuedCount;
                } else {
                    ++$failedCount;
                }
            } else {
                ++$failedCount;
            }
        }

        // Log activity
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'] ?? null,
            'name' => 'send_mass_email',
            'context' => "Sent mass email to $queuedCount users. Subject: " . $data['subject'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        $message = "Mass email queued successfully. $queuedCount emails queued for delivery.";
        if ($failedCount > 0) {
            $message .= " $failedCount emails failed to queue.";
        }

        return ApiResponse::success([
            'queued_count' => $queuedCount,
            'failed_count' => $failedCount,
            'total_users' => count($validUsers),
        ], $message, 200);
    }
}
