/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

import axios from 'axios';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    toolActivity?: ToolActivity[] | null;
}

export interface PageContext {
    mode?: 'server' | 'vds' | 'dashboard';
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
    vdsInstance?: {
        id: number;
        hostname: string | null;
        status: string;
        vm_type: string;
        ip_address: string | null;
        memory?: number | null;
        cpus?: number | null;
        disk_gb?: number | null;
        node_name?: string | null;
    };
    contextItems?: Array<{
        type: 'server' | 'page' | 'file';
        id: string;
        name: string;
    }>;
}

export interface ToolExecution {
    success: boolean;
    action_type: string;
    error?: string;
    message?: string;
    is_destructive?: boolean;
    [key: string]: unknown;
}

export interface TokenUsage {
    input_tokens?: number | null;
    output_tokens?: number | null;
    total_tokens?: number | null;
    source?: 'provider' | 'estimated' | 'unknown' | string | null;
}

export interface ToolActivity {
    tool: string;
    params?: unknown;
    success?: boolean;
    error?: string | null;
    summary?: string;
    iteration?: number;
}

function serializeChatHistoryMessage(msg: ChatMessage): ChatMessage {
    if (!msg.toolActivity?.length) {
        return {
            role: msg.role,
            content: msg.content,
        };
    }

    const toolSummary = msg.toolActivity
        .map((activity) => {
            const status = activity.success === false ? 'failed' : activity.success ? 'completed' : 'planned';
            const summary = activity.summary ? ` - ${activity.summary}` : '';
            return `${activity.tool}: ${status}${summary}`;
        })
        .join('\n');

    return {
        role: msg.role,
        content: `${msg.content}\n\n[Tool/activity results from this assistant turn]\n${toolSummary}`,
    };
}

export type ChatStreamEvent =
    | { type: 'conversation'; conversation_id: number; user_message_id?: number; user_usage?: TokenUsage }
    | { type: 'status'; message: string; iteration?: number }
    | { type: 'tool_call'; tool: string; params?: unknown; iteration?: number }
    | ({ type: 'tool_result' } & ToolActivity)
    | { type: 'usage'; usage: TokenUsage }
    | ChatStreamFinalEvent
    | { type: 'error'; message: string };

export interface ChatStreamFinalEvent {
    type: 'final';
    response: string;
    model?: string;
    conversation_id?: number;
    message_id?: number;
    user_message_id?: number;
    usage?: TokenUsage;
    user_usage?: TokenUsage;
    tool_executions?: ToolExecution[];
    tool_activity?: ToolActivity[];
}

export interface ChatResponse {
    success: boolean;
    data?: {
        response: string;
        model?: string;
        conversation_id?: number;
        message_id?: number;
        user_message_id?: number;
        usage?: TokenUsage;
        user_usage?: TokenUsage;
        tool_executions?: ToolExecution[];
        tool_activity?: ToolActivity[];
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
    input_tokens?: number | null;
    output_tokens?: number | null;
    total_tokens?: number | null;
    token_source?: string | null;
    tool_activity?: ToolActivity[] | null;
    usage_json?: TokenUsage | null;
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
): Promise<{
    response: string;
    model?: string;
    conversationId?: number;
    messageId?: number;
    userMessageId?: number;
    usage?: TokenUsage;
    userUsage?: TokenUsage;
    toolExecutions?: ToolExecution[];
    toolActivity?: ToolActivity[];
}> {
    try {
        const response = await axios.post<ChatResponse>('/api/user/chatbot/chat', {
            message,
            history: history.map(serializeChatHistoryMessage),
            pageContext: pageContext || undefined,
            conversation_id: conversationId || undefined,
        });

        if (response.data && response.data.success && response.data.data) {
            return {
                response: response.data.data.response,
                model: response.data.data.model,
                conversationId: response.data.data.conversation_id,
                messageId: response.data.data.message_id,
                userMessageId: response.data.data.user_message_id,
                usage: response.data.data.usage,
                userUsage: response.data.data.user_usage,
                toolExecutions: response.data.data.tool_executions,
                toolActivity: response.data.data.tool_activity,
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

// ---------------------------------------------------------------------------
// VDS Chatbot API functions
// ---------------------------------------------------------------------------

/**
 * Send a chat message to the VDS AI assistant
 */
export async function sendVdsChatMessage(
    message: string,
    history: ChatMessage[] = [],
    pageContext?: PageContext,
    conversationId?: number,
): Promise<{
    response: string;
    model?: string;
    conversationId?: number;
    messageId?: number;
    userMessageId?: number;
    usage?: TokenUsage;
    userUsage?: TokenUsage;
    toolExecutions?: ToolExecution[];
    toolActivity?: ToolActivity[];
}> {
    try {
        const response = await axios.post<ChatResponse>('/api/user/vds-chatbot/chat', {
            message,
            history: history.map(serializeChatHistoryMessage),
            pageContext: pageContext || undefined,
            conversation_id: conversationId || undefined,
        });

        if (response.data && response.data.success && response.data.data) {
            return {
                response: response.data.data.response,
                model: response.data.data.model,
                conversationId: response.data.data.conversation_id,
                messageId: response.data.data.message_id,
                userMessageId: response.data.data.user_message_id,
                usage: response.data.data.usage,
                userUsage: response.data.data.user_usage,
                toolExecutions: response.data.data.tool_executions,
                toolActivity: response.data.data.tool_activity,
            };
        }

        throw new Error(response.data.error_message || 'Failed to get response from VDS AI');
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const errorMessage = error.response?.data?.error_message || error.message || 'Failed to send message';
            throw new Error(errorMessage);
        }
        throw error;
    }
}

/**
 * Get all VDS conversations for the current user
 */
export async function getVdsConversations(): Promise<Conversation[]> {
    try {
        const response = await axios.get<{ success: boolean; data: { conversations: Conversation[] } }>(
            '/api/user/vds-chatbot/conversations',
        );

        if (response.data && response.data.success && response.data.data) {
            return response.data.data.conversations;
        }

        return [];
    } catch (error) {
        console.error('Failed to get VDS conversations:', error);
        return [];
    }
}

/**
 * Get VDS conversation messages
 */
export async function getVdsConversationMessages(conversationId: number): Promise<{
    conversation: Conversation;
    messages: ConversationMessage[];
}> {
    try {
        const response = await axios.get<{
            success: boolean;
            data: { conversation: Conversation; messages: ConversationMessage[] };
        }>(`/api/user/vds-chatbot/conversations/${conversationId}`);

        if (response.data && response.data.success && response.data.data) {
            return response.data.data;
        }

        throw new Error('Failed to get VDS conversation messages');
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const errorMessage = error.response?.data?.error_message || error.message || 'Failed to get messages';
            throw new Error(errorMessage);
        }
        throw error;
    }
}

/**
 * Delete a VDS conversation
 */
export async function deleteVdsConversation(conversationId: number): Promise<void> {
    try {
        await axios.delete(`/api/user/vds-chatbot/conversations/${conversationId}`);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const errorMessage =
                error.response?.data?.error_message || error.message || 'Failed to delete VDS conversation';
            throw new Error(errorMessage);
        }
        throw error;
    }
}

export async function streamChatMessage(
    mode: 'server' | 'vds' | 'dashboard',
    message: string,
    history: ChatMessage[] = [],
    pageContext?: PageContext,
    conversationId?: number,
    onEvent?: (event: ChatStreamEvent) => void,
): Promise<ChatStreamFinalEvent> {
    const endpoint = mode === 'vds' ? '/api/user/vds-chatbot/chat/stream' : '/api/user/chatbot/chat/stream';
    const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
        },
        body: JSON.stringify({
            message,
            history: history.map(serializeChatHistoryMessage),
            pageContext: pageContext || undefined,
            conversation_id: conversationId || undefined,
        }),
    });

    if (!response.ok || !response.body) {
        throw new Error(`Failed to stream chat response (${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalEvent: ChatStreamFinalEvent | null = null;

    const processBlock = (block: string) => {
        const lines = block.split(/\r?\n/);
        const eventType =
            lines
                .find((line) => line.startsWith('event:'))
                ?.slice(6)
                .trim() || 'message';
        const dataLines = lines
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trim())
            .join('\n');

        if (!dataLines) return;

        const payload = JSON.parse(dataLines) as Record<string, unknown>;
        const event = { ...payload, type: eventType } as ChatStreamEvent;
        onEvent?.(event);

        if (event.type === 'error') {
            throw new Error(event.message);
        }

        if (event.type === 'final') {
            finalEvent = event;
        }
    };

    while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

        let separatorIndex = buffer.indexOf('\n\n');
        while (separatorIndex !== -1) {
            const block = buffer.slice(0, separatorIndex).trim();
            buffer = buffer.slice(separatorIndex + 2);
            if (block) processBlock(block);
            separatorIndex = buffer.indexOf('\n\n');
        }

        if (done) break;
    }

    if (buffer.trim()) {
        processBlock(buffer.trim());
    }

    if (!finalEvent) {
        throw new Error('Chat stream ended before a final response was received');
    }

    return finalEvent;
}
