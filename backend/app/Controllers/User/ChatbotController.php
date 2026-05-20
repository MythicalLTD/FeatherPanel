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

use App\App;
use App\Chat\ChatMessage;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Chat\ChatConversation;
use App\Services\Chatbot\TokenUsage;
use App\Services\Chatbot\ChatbotService;
use App\Plugins\Events\Events\ChatbotEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

#[OA\Schema(
    schema: 'ChatbotRequest',
    type: 'object',
    required: ['message'],
    properties: [
        new OA\Property(property: 'message', type: 'string', description: 'User message'),
        new OA\Property(property: 'history', type: 'array', items: new OA\Items(type: 'object'), description: 'Chat history'),
    ]
)]
#[OA\Schema(
    schema: 'ChatbotResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'response', type: 'string', description: 'AI assistant response'),
    ]
)]
class ChatbotController
{
    #[OA\Post(
        path: '/api/user/chatbot/chat',
        summary: 'Send a message to the AI chatbot',
        description: 'Send a message to the AI assistant and receive a response. Optionally include chat history for context.',
        tags: ['User - Chatbot'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/ChatbotRequest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Chat response received successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'response', type: 'string'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Invalid request'),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function chat(Request $request): Response
    {
        try {
            $payload = $this->processChatRequest($request);

            return ApiResponse::success([
                'response' => $payload['response'],
                'model' => $payload['model'],
                'conversation_id' => $payload['conversation_id'],
                'message_id' => $payload['assistant_message_id'],
                'user_message_id' => $payload['user_message_id'],
                'usage' => $payload['usage'],
                'user_usage' => $payload['user_usage'],
                'tool_executions' => $payload['tool_executions'],
                'tool_activity' => $payload['tool_activity'],
            ], 'Message processed successfully');
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error($e->getMessage(), 'INVALID_REQUEST', 400);
        } catch (\RuntimeException $e) {
            $message = $e->getMessage();
            $code = $message === 'User not authenticated' ? 401 : ($message === 'Conversation not found' ? 404 : (str_contains($message, 'disabled') ? 403 : 500));
            $errorCode = $code === 401 ? 'UNAUTHORIZED' : ($code === 404 ? 'NOT_FOUND' : ($code === 403 ? 'CHATBOT_DISABLED' : 'CHATBOT_ERROR'));

            return ApiResponse::error($message, $errorCode, $code);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Chatbot error: ' . $e->getMessage());

            return ApiResponse::error(
                'Failed to process message. Please try again.',
                'CHATBOT_ERROR',
                500
            );
        }
    }

    public function streamChat(Request $request): Response
    {
        return new StreamedResponse(function () use ($request): void {
            $emit = function (string $type, array $payload = []): void {
                echo "event: {$type}\n";
                echo 'data: ' . json_encode($payload, JSON_UNESCAPED_SLASHES) . "\n\n";
                @ob_flush();
                flush();
            };

            try {
                $payload = $this->processChatRequest($request, $emit);
                $emit('final', $payload);
            } catch (\Exception $e) {
                App::getInstance(true)->getLogger()->error('Chatbot stream error: ' . $e->getMessage());
                $emit('error', [
                    'message' => 'Failed to process message. Please try again.',
                ]);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    #[OA\Get(
        path: '/api/user/chatbot/conversations',
        summary: 'Get user conversations',
        description: 'Retrieve all conversations for the authenticated user.',
        tags: ['User - Chatbot'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Conversations retrieved successfully',
                content: new OA\JsonContent(
                    type: 'object',
                    properties: [
                        new OA\Property(property: 'conversations', type: 'array', items: new OA\Items(type: 'object')),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
        ]
    )]
    public function getConversations(Request $request): Response
    {
        $currentUser = $request->attributes->get('user');

        if (!$currentUser || !isset($currentUser['uuid'])) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        try {
            $conversations = ChatConversation::getConversationsByUser($currentUser['uuid'], 50);

            return ApiResponse::success(['conversations' => $conversations], 'Conversations retrieved successfully');
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to get conversations: ' . $e->getMessage());

            return ApiResponse::error('Failed to retrieve conversations', 'SERVER_ERROR', 500);
        }
    }

    #[OA\Get(
        path: '/api/user/chatbot/conversations/{id}',
        summary: 'Get conversation messages',
        description: 'Retrieve all messages for a specific conversation.',
        tags: ['User - Chatbot'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Conversation ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Messages retrieved successfully',
                content: new OA\JsonContent(
                    type: 'object',
                    properties: [
                        new OA\Property(property: 'conversation', type: 'object'),
                        new OA\Property(property: 'messages', type: 'array', items: new OA\Items(type: 'object')),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 404, description: 'Conversation not found'),
        ]
    )]
    public function getConversation(Request $request, int $id): Response
    {
        $currentUser = $request->attributes->get('user');

        if (!$currentUser || !isset($currentUser['uuid'])) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        try {
            $conversation = ChatConversation::getConversationById($id);

            if (!$conversation) {
                return ApiResponse::error('Conversation not found', 'NOT_FOUND', 404);
            }

            // Verify conversation belongs to user
            if ($conversation['user_uuid'] !== $currentUser['uuid']) {
                return ApiResponse::error('Conversation not found', 'NOT_FOUND', 404);
            }

            $messages = ChatMessage::getMessagesByConversation($id, 100);

            return ApiResponse::success([
                'conversation' => $conversation,
                'messages' => $messages,
            ], 'Messages retrieved successfully');
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to get conversation: ' . $e->getMessage());

            return ApiResponse::error('Failed to retrieve conversation', 'SERVER_ERROR', 500);
        }
    }

    #[OA\Delete(
        path: '/api/user/chatbot/conversations/{id}',
        summary: 'Delete conversation',
        description: 'Delete a conversation and all its messages.',
        tags: ['User - Chatbot'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Conversation ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Conversation deleted successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 404, description: 'Conversation not found'),
        ]
    )]
    public function deleteConversation(Request $request, int $id): Response
    {
        $currentUser = $request->attributes->get('user');

        if (!$currentUser || !isset($currentUser['uuid'])) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        try {
            $conversation = ChatConversation::getConversationById($id);

            if (!$conversation) {
                return ApiResponse::error('Conversation not found', 'NOT_FOUND', 404);
            }

            // Verify conversation belongs to user
            if ($conversation['user_uuid'] !== $currentUser['uuid']) {
                return ApiResponse::error('Conversation not found', 'NOT_FOUND', 404);
            }

            $deleted = ChatConversation::deleteConversation($id);

            if (!$deleted) {
                return ApiResponse::error('Failed to delete conversation', 'SERVER_ERROR', 500);
            }

            self::emitEvent(ChatbotEvent::onConversationDeleted(), [
                'user_uuid' => $currentUser['uuid'],
                'conversation_id' => $id,
            ]);

            return ApiResponse::success([], 'Conversation deleted successfully');
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to delete conversation: ' . $e->getMessage());

            return ApiResponse::error('Failed to delete conversation', 'SERVER_ERROR', 500);
        }
    }

    #[OA\Patch(
        path: '/api/user/chatbot/conversations/{id}/memory',
        summary: 'Update conversation memory',
        description: 'Update the memory field for a conversation. This memory is included in the AI context for future messages.',
        tags: ['User - Chatbot'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'Conversation ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                type: 'object',
                properties: [
                    new OA\Property(property: 'memory', type: 'string', description: 'Memory content'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Memory updated successfully'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 404, description: 'Conversation not found'),
        ]
    )]
    public function updateMemory(Request $request, int $id): Response
    {
        $currentUser = $request->attributes->get('user');

        if (!$currentUser || !isset($currentUser['uuid'])) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        try {
            $conversation = ChatConversation::getConversationById($id);

            if (!$conversation) {
                return ApiResponse::error('Conversation not found', 'NOT_FOUND', 404);
            }

            // Verify conversation belongs to user
            if ($conversation['user_uuid'] !== $currentUser['uuid']) {
                return ApiResponse::error('Conversation not found', 'NOT_FOUND', 404);
            }

            $data = json_decode($request->getContent(), true);
            $memory = $data['memory'] ?? '';

            $updated = ChatConversation::updateConversation($id, [
                'memory' => $memory,
            ]);

            if (!$updated) {
                return ApiResponse::error('Failed to update memory', 'SERVER_ERROR', 500);
            }

            self::emitEvent(ChatbotEvent::onConversationMemoryUpdated(), [
                'user_uuid' => $currentUser['uuid'],
                'conversation_id' => $id,
                'memory' => $memory,
            ]);

            return ApiResponse::success([], 'Memory updated successfully');
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to update memory: ' . $e->getMessage());

            return ApiResponse::error('Failed to update memory', 'SERVER_ERROR', 500);
        }
    }

    private function processChatRequest(Request $request, ?callable $emit = null): array
    {
        $currentUser = $request->attributes->get('user');

        if (!$currentUser || !isset($currentUser['id'])) {
            throw new \RuntimeException('User not authenticated');
        }

        $app = App::getInstance(true);
        $config = $app->getConfig();
        $enabled = $config->getSetting(\App\Config\ConfigInterface::CHATBOT_ENABLED, 'true');
        if ($enabled !== 'true') {
            throw new \RuntimeException('The AI chatbot is currently disabled by the administrator.');
        }

        $data = json_decode($request->getContent(), true) ?: [];
        if (!isset($data['message']) || empty(trim($data['message']))) {
            throw new \InvalidArgumentException('Message is required');
        }

        $message = trim($data['message']);
        $history = $data['history'] ?? [];
        $pageContext = $data['pageContext'] ?? [];
        $conversationId = $data['conversation_id'] ?? null;

        $conversation = null;
        if ($conversationId) {
            $conversation = ChatConversation::getConversationById((int) $conversationId);
            if ($conversation && $conversation['user_uuid'] !== $currentUser['uuid']) {
                throw new \RuntimeException('Conversation not found');
            }
        }

        if (!$conversation) {
            $conversationId = ChatConversation::createConversation([
                'user_uuid' => $currentUser['uuid'],
                'title' => substr($message, 0, 255),
            ]);
            if (!$conversationId) {
                throw new \RuntimeException('Failed to create conversation');
            }
            $conversation = ChatConversation::getConversationById($conversationId);
        }

        $dbMessages = ChatMessage::getMessagesByConversation($conversation['id'], 50);
        if (empty($history) && $conversation) {
            $history = $this->buildCompactHistory($dbMessages, $conversation);
        } else {
            $history = array_slice($history, -6);
        }

        $userUsage = TokenUsage::estimate($message);
        $userMessageId = ChatMessage::createMessage([
            'conversation_id' => $conversation['id'],
            'role' => 'user',
            'content' => $message,
            'input_tokens' => $userUsage['input_tokens'],
            'total_tokens' => $userUsage['total_tokens'],
            'token_source' => $userUsage['source'],
        ]);

        if ($emit !== null) {
            $emit('conversation', [
                'conversation_id' => $conversation['id'],
                'user_message_id' => $userMessageId,
                'user_usage' => $userUsage,
            ]);
        }

        $summary = $this->refreshContextSummary($conversation, $dbMessages, $message);
        if ($emit !== null && $summary !== '') {
            $emit('status', ['message' => 'Compacting conversation context']);
        }
        $pageContext['conversation_memory'] = trim(($conversation['memory'] ?? '') . "\n\n" . $summary);

        $chatbotService = new ChatbotService();
        $result = $chatbotService->processMessage($message, $history, $currentUser, $pageContext, $emit);
        $usage = $result['usage'] ?? TokenUsage::estimate($message, $result['response'] ?? '');
        $toolActivity = $result['tool_activity'] ?? [];

        $assistantMessageId = ChatMessage::createMessage([
            'conversation_id' => $conversation['id'],
            'role' => 'assistant',
            'content' => $result['response'],
            'model' => $result['model'] ?? null,
            'input_tokens' => $usage['input_tokens'] ?? null,
            'output_tokens' => $usage['output_tokens'] ?? null,
            'total_tokens' => $usage['total_tokens'] ?? null,
            'token_source' => $usage['source'] ?? null,
            'tool_activity' => $toolActivity,
            'usage_json' => $usage,
        ]);

        $messageCount = ChatMessage::getMessageCount($conversation['id']);
        ChatConversation::updateConversation($conversation['id'], [
            'message_count' => $messageCount,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        return [
            'response' => $result['response'],
            'model' => $result['model'] ?? 'FeatherPanel AI',
            'conversation_id' => $conversation['id'],
            'user_message_id' => $userMessageId,
            'assistant_message_id' => $assistantMessageId,
            'usage' => $usage,
            'user_usage' => $userUsage,
            'tool_executions' => $result['tool_executions'] ?? [],
            'tool_activity' => $toolActivity,
        ];
    }

    private function buildCompactHistory(array $dbMessages, array $conversation): array
    {
        $summary = $conversation['context_summary'] ?? '';
        $recentMessages = array_slice($dbMessages, -6);
        $history = [];

        if ($summary !== '') {
            $history[] = [
                'role' => 'assistant',
                'content' => "Conversation context summary:\n{$summary}",
            ];
        }

        foreach ($recentMessages as $msg) {
            $content = $msg['content'];
            if (!empty($msg['tool_activity']) && is_array($msg['tool_activity'])) {
                $content .= "\n\n[Tool/activity results from this assistant turn]\n" . $this->formatToolActivityForHistory($msg['tool_activity']);
            }
            $history[] = [
                'role' => $msg['role'],
                'content' => $content,
            ];
        }

        return $history;
    }

    private function refreshContextSummary(array $conversation, array $dbMessages, string $latestMessage): string
    {
        $existing = trim((string) ($conversation['context_summary'] ?? ''));
        if (count($dbMessages) < 10 || !ChatConversation::hasColumn('context_summary')) {
            return $existing;
        }

        $olderMessages = array_slice($dbMessages, 0, -6);
        $lines = [];
        foreach ($olderMessages as $message) {
            $content = trim(preg_replace('/\s+/', ' ', (string) $message['content']));
            if (!empty($message['tool_activity']) && is_array($message['tool_activity'])) {
                $content .= ' Tool/activity: ' . preg_replace('/\s+/', ' ', $this->formatToolActivityForHistory($message['tool_activity']));
            }
            if ($content === '') {
                continue;
            }
            $lines[] = strtoupper((string) $message['role']) . ': ' . mb_substr($content, 0, 220);
        }

        $summary = trim($existing . "\n" . implode("\n", array_slice($lines, -12)));
        $summary = mb_substr($summary, -3500);
        $summary .= "\nLatest user message: " . mb_substr($latestMessage, 0, 300);

        ChatConversation::updateConversation((int) $conversation['id'], [
            'context_summary' => $summary,
            'context_summary_updated_at' => date('Y-m-d H:i:s'),
        ]);

        return $summary;
    }

    private function formatToolActivityForHistory(array $toolActivity): string
    {
        $lines = [];
        foreach ($toolActivity as $activity) {
            if (!is_array($activity)) {
                continue;
            }
            $status = ($activity['success'] ?? null) === false ? 'failed' : (($activity['success'] ?? null) ? 'completed' : 'planned');
            $summary = isset($activity['summary']) ? ' - ' . $activity['summary'] : '';
            $lines[] = ($activity['tool'] ?? 'unknown_tool') . ": {$status}{$summary}";
        }

        return implode("\n", $lines);
    }

    private static function emitEvent(string $eventName, array $payload): void
    {
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit($eventName, $payload);
        }
    }
}
