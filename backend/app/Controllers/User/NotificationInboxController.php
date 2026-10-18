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

namespace App\Controllers\User;

use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Chat\UserNotification;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The notification centre: the user's own inbox (ticket replies, backups, crashes) merged
 * with admin announcements, each with read state.
 *
 * Items carry a key like "inbox:12" or "announcement:3" so one endpoint can mark both read.
 */
class NotificationInboxController
{
    private const LIST_LIMIT = 30;

    private const ANNOUNCEMENT_LIMIT = 20;

    private const MAX_READ_IDS = 100;

    #[OA\Get(
        path: '/api/user/notifications/inbox',
        summary: 'Notification centre',
        description: 'Inbox items and announcements, newest first, with the unread count.',
        tags: ['User - Notifications'],
        responses: [
            new OA\Response(response: 200, description: 'Notifications retrieved'),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function index(Request $request): Response
    {
        $userId = self::userId($request);
        if ($userId === null) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        $items = [];
        foreach (UserNotification::listForUser($userId, self::LIST_LIMIT) as $row) {
            $items[] = [
                'key' => 'inbox:' . $row['id'],
                'source' => 'inbox',
                'kind' => $row['kind'],
                'data' => (object) $row['data'],
                'link' => $row['link'],
                'count' => $row['count'],
                'read' => $row['read'],
                'created_at' => $row['created_at'],
            ];
        }
        foreach (UserNotification::announcementsForUser($userId, self::ANNOUNCEMENT_LIMIT) as $row) {
            $items[] = [
                'key' => 'announcement:' . $row['id'],
                'source' => 'announcement',
                'kind' => 'announcement',
                'data' => (object) [
                    'title' => $row['title'],
                    'excerpt' => self::excerpt($row['message']),
                    'type' => $row['type'],
                ],
                'link' => null,
                'count' => 1,
                'read' => $row['read'],
                'created_at' => $row['created_at'],
            ];
        }
        usort($items, static fn (array $a, array $b): int => strcmp($b['created_at'], $a['created_at']));

        $unread = 0;
        foreach ($items as $item) {
            if (!$item['read']) {
                ++$unread;
            }
        }
        // The list is capped; the badge counts every unread inbox item.
        $inboxUnread = UserNotification::unreadCount($userId);
        $listedInboxUnread = count(array_filter($items, static fn (array $i): bool => $i['source'] === 'inbox' && !$i['read']));
        $unread += max(0, $inboxUnread - $listedInboxUnread);

        return ApiResponse::success(['items' => $items, 'unread_count' => $unread], 'Notifications retrieved', 200);
    }

    #[OA\Post(
        path: '/api/user/notifications/inbox/read',
        summary: 'Mark notifications read',
        description: 'Mark the given item keys read, or everything with {"all": true}.',
        tags: ['User - Notifications'],
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'keys', type: 'array', items: new OA\Items(type: 'string')),
                    new OA\Property(property: 'all', type: 'boolean'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Marked read'),
            new OA\Response(response: 400, description: 'Invalid request'),
        ]
    )]
    public function markRead(Request $request): Response
    {
        $userId = self::userId($request);
        if ($userId === null) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return ApiResponse::error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
        }

        if (($body['all'] ?? false) === true) {
            UserNotification::markRead($userId, null);
            $visible = array_map(static fn (array $a): int => $a['id'], UserNotification::announcementsForUser($userId, self::ANNOUNCEMENT_LIMIT));
            UserNotification::markAnnouncementsRead($userId, $visible);

            return ApiResponse::success(['unread_count' => 0], 'Marked read', 200);
        }

        $keys = $body['keys'] ?? null;
        if (!is_array($keys) || $keys === [] || count($keys) > self::MAX_READ_IDS) {
            return ApiResponse::error('Pass up to 100 notification keys, or all: true', 'INVALID_NOTIFICATION_KEYS', 400);
        }

        $inboxIds = [];
        $announcementIds = [];
        foreach ($keys as $key) {
            if (!is_string($key) || !preg_match('/^(inbox|announcement):(\d{1,19})$/', $key, $m)) {
                return ApiResponse::error('Pass up to 100 notification keys, or all: true', 'INVALID_NOTIFICATION_KEYS', 400);
            }
            if ($m[1] === 'inbox') {
                $inboxIds[] = (int) $m[2];
            } else {
                $announcementIds[] = (int) $m[2];
            }
        }

        UserNotification::markRead($userId, $inboxIds);
        if ($announcementIds !== []) {
            // Only announcements the user can actually see.
            $visible = array_map(static fn (array $a): int => $a['id'], UserNotification::announcementsForUser($userId, 50));
            UserNotification::markAnnouncementsRead($userId, array_values(array_intersect($announcementIds, $visible)));
        }

        return ApiResponse::success(null, 'Marked read', 200);
    }

    private static function userId(Request $request): ?int
    {
        $user = $request->attributes->get('user');

        return $user && !empty($user['id']) ? (int) $user['id'] : null;
    }

    /** Plain text preview of the announcement markdown. */
    private static function excerpt(string $markdown): string
    {
        $text = preg_replace('/!\[[^\]]*\]\([^)]*\)/', '', $markdown) ?? $markdown;
        $text = preg_replace('/\[([^\]]*)\]\([^)]*\)/', '$1', $text) ?? $text;
        $text = preg_replace('/[#>*_`~|-]+/', ' ', $text) ?? $text;
        $text = trim(preg_replace('/\s+/', ' ', $text) ?? $text);

        return mb_strlen($text) > 180 ? rtrim(mb_substr($text, 0, 177)) . '...' : $text;
    }
}
