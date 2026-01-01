/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import axios from 'axios';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface PageContext {
    route?: string;
    routeName?: string;
    page?: string;
    server?: {
        name: string;
        uuidShort: string;
        status?: string;
        description?: string;
        node?: { name?: string };
        spell?: { name?: string };
    };
    contextItems?: Array<{
        type: 'server' | 'page' | 'file';
        id: string;
        name: string;
    }>;
}

export interface ChatRequest {
    message: string;
    history?: ChatMessage[];
    pageContext?: PageContext;
}

export interface ToolExecution {
    success: boolean;
    action_type: string;
    error?: string;
    message?: string;
    is_destructive?: boolean;
    [key: string]: unknown;
}

export interface ChatResponse {
    success: boolean;
    data?: {
        response: string;
        model?: string;
        conversation_id?: number;
        tool_executions?: ToolExecution[];
    };
    error?: boolean;
    error_message?: string;
}

export interface Conversation {
    id: number;
    user_uuid: string;
    title: string | null;
    memory?: string | null;
    message_count?: number;
    created_at: string;
    updated_at: string;
}

export interface ConversationMessage {
    id: number;
    conversation_id: number;
    role: 'user' | 'assistant';
    content: string;
    model: string | null;
    created_at: string;
}

/**
 * Send a chat message to the AI assistant
 */
export async function sendChatMessage(
    message: string,
    history: ChatMessage[] = [],
    pageContext?: PageContext,
    conversationId?: number,
): Promise<{ response: string; model?: string; conversationId?: number; toolExecutions?: ToolExecution[] }> {
    try {
        const response = await axios.post<ChatResponse>('/api/user/chatbot/chat', {
            message,
            history: history.map((msg) => ({
                role: msg.role,
                content: msg.content,
            })),
            pageContext: pageContext || undefined,
            conversation_id: conversationId || undefined,
        });

        if (response.data && response.data.success && response.data.data) {
            return {
                response: response.data.data.response,
                model: response.data.data.model,
                conversationId: response.data.data.conversation_id,
                toolExecutions: response.data.data.tool_executions,
            };
        }

        throw new Error(response.data.error_message || 'Failed to get response from AI');
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const errorMessage = error.response?.data?.error_message || error.message || 'Failed to send message';
            throw new Error(errorMessage);
        }
        throw error;
    }
}

/**
 * Get all conversations for the current user
 */
export async function getConversations(): Promise<Conversation[]> {
    try {
        const response = await axios.get<{ success: boolean; data: { conversations: Conversation[] } }>(
            '/api/user/chatbot/conversations',
        );

        if (response.data && response.data.success && response.data.data) {
            return response.data.data.conversations;
        }

        return [];
    } catch (error) {
        console.error('Failed to get conversations:', error);
        return [];
    }
}

/**
 * Get conversation messages
 */
export async function getConversationMessages(conversationId: number): Promise<{
    conversation: Conversation;
    messages: ConversationMessage[];
}> {
    try {
        const response = await axios.get<{
            success: boolean;
            data: { conversation: Conversation; messages: ConversationMessage[] };
        }>(`/api/user/chatbot/conversations/${conversationId}`);

        if (response.data && response.data.success && response.data.data) {
            return response.data.data;
        }

        throw new Error('Failed to get conversation messages');
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const errorMessage = error.response?.data?.error_message || error.message || 'Failed to get messages';
            throw new Error(errorMessage);
        }
        throw error;
    }
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: number): Promise<void> {
    try {
        await axios.delete(`/api/user/chatbot/conversations/${conversationId}`);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const errorMessage =
                error.response?.data?.error_message || error.message || 'Failed to delete conversation';
            throw new Error(errorMessage);
        }
        throw error;
    }
}

/**
 * Update conversation memory
 */
export async function updateConversationMemory(conversationId: number, memory: string): Promise<void> {
    try {
        await axios.patch(`/api/user/chatbot/conversations/${conversationId}/memory`, { memory });
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const errorMessage = error.response?.data?.error_message || error.message || 'Failed to update memory';
            throw new Error(errorMessage);
        }
        throw error;
    }
}
