<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

namespace App\Controllers\User;

use App\App;
use App\Chat\ChatMessage;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Chat\ChatConversation;
use App\Services\Chatbot\ChatbotService;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

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
        $currentUser = $request->get('user');

        if (!$currentUser || !isset($currentUser['id'])) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        $data = json_decode($request->getContent(), true);

        if (!isset($data['message']) || empty(trim($data['message']))) {
            return ApiResponse::error('Message is required', 'INVALID_REQUEST', 400);
        }

        $message = trim($data['message']);
        $history = $data['history'] ?? [];
        $pageContext = $data['pageContext'] ?? [];
        $conversationId = $data['conversation_id'] ?? null;

        try {
            // Get or create conversation
            $conversation = null;
            if ($conversationId) {
                $conversation = ChatConversation::getConversationById((int) $conversationId);
                // Verify conversation belongs to user
                if ($conversation && $conversation['user_uuid'] !== $currentUser['uuid']) {
                    return ApiResponse::error('Conversation not found', 'NOT_FOUND', 404);
                }
            }

            // Create new conversation if needed
            if (!$conversation) {
                $conversationId = ChatConversation::createConversation([
                    'user_uuid' => $currentUser['uuid'],
                    'title' => substr($message, 0, 255), // Use first message as title
                ]);
                if (!$conversationId) {
                    return ApiResponse::error('Failed to create conversation', 'SERVER_ERROR', 500);
                }
                $conversation = ChatConversation::getConversationById($conversationId);
            }

            // Load conversation history from database if not provided
            if (empty($history) && $conversation) {
                $dbMessages = ChatMessage::getMessagesByConversation($conversation['id'], 50);
                $history = array_map(function ($msg) {
                    return [
                        'role' => $msg['role'],
                        'content' => $msg['content'],
                    ];
                }, $dbMessages);
            }

            // Save user message to database
            ChatMessage::createMessage([
                'conversation_id' => $conversation['id'],
                'role' => 'user',
                'content' => $message,
            ]);

            // Get conversation memory
            $conversationMemory = $conversation['memory'] ?? '';
            $pageContext['conversation_memory'] = $conversationMemory;

            // Process message through AI
            $chatbotService = new ChatbotService();
            $result = $chatbotService->processMessage($message, $history, $currentUser, $pageContext);

            // Update message count
            $messageCount = ChatMessage::getMessageCount($conversation['id']);
            ChatConversation::updateConversation($conversation['id'], [
                'message_count' => $messageCount,
            ]);

            // Save AI response to database
            ChatMessage::createMessage([
                'conversation_id' => $conversation['id'],
                'role' => 'assistant',
                'content' => $result['response'],
                'model' => $result['model'] ?? null,
            ]);

            // Update conversation timestamp
            ChatConversation::updateConversation($conversation['id'], [
                'updated_at' => date('Y-m-d H:i:s'),
            ]);

            return ApiResponse::success([
                'response' => $result['response'],
                'model' => $result['model'] ?? 'FeatherPanel AI',
                'conversation_id' => $conversation['id'],
            ], 'Message processed successfully');
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Chatbot error: ' . $e->getMessage());

            return ApiResponse::error(
                'Failed to process message. Please try again.',
                'CHATBOT_ERROR',
                500
            );
        }
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
        $currentUser = $request->get('user');

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
        $currentUser = $request->get('user');

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
        $currentUser = $request->get('user');

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
        $currentUser = $request->get('user');

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

            return ApiResponse::success([], 'Memory updated successfully');
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to update memory: ' . $e->getMessage());

            return ApiResponse::error('Failed to update memory', 'SERVER_ERROR', 500);
        }
    }
}
