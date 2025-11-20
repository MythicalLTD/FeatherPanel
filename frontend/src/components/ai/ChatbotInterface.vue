<script setup lang="ts">
// MIT License
//
// Copyright (c) 2025 MythicalSystems
// Copyright (c) 2025 Cassian Gherman (NaysKutzu)
// Copyright (c) 2025 FeatherPanel Contributors
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { ref, computed, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Send, Loader2, X, Bot, Power, AlertTriangle, Plus, Trash2, MessageSquare, Clock } from 'lucide-vue-next';
import { useToast } from 'vue-toastification';
import { useSessionStore } from '@/stores/session';
import { useRouter } from 'vue-router';
import {
    sendChatMessage,
    getConversations,
    getConversationMessages,
    deleteConversation,
    type PageContext,
    type Conversation,
} from '@/services/chatbotService';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useServerContext } from '@/composables/useServerContext';
import {
    parseActionCommands,
    executeServerPowerAction,
    executeServerCommand,
    findServerUuidByName,
    findServerNameByUuid,
} from '@/services/chatbotActions';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

const props = defineProps<{
    open: boolean;
}>();

const emit = defineEmits<{
    'update:open': [value: boolean];
}>();

const { t } = useI18n();
const toast = useToast();
const router = useRouter();
const sessionStore = useSessionStore();
const messages = ref<Message[]>([]);
const inputMessage = ref('');
const isLoading = ref(false);
const messagesEndRef = ref<HTMLElement | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const chatModelName = ref('FeatherPanel AI');
const aiControlMode = ref(false);

// Conversation management
const conversations = ref<Conversation[]>([]);
const currentConversationId = ref<number | null>(null);
const loadingConversations = ref(false);
const showConversationsSidebar = ref(true);

// Confirmation dialog state
const showConfirmDialog = ref(false);
const confirmDialog = ref<{
    title: string;
    description: string;
    confirmText: string;
    variant: 'default' | 'destructive';
    action: () => Promise<void>;
}>({
    title: '',
    description: '',
    confirmText: '',
    variant: 'default',
    action: async () => {},
});
const confirmLoading = ref(false);

// Action notification state (custom box instead of toast)
const pendingActions = ref<Array<{ id: string; message: string; type: 'pending' | 'success' | 'error' }>>([]);

// Server context for current page
const { currentServer } = useServerContext();

// User data from session
const user = computed(() => ({
    username: sessionStore.user?.username || 'User',
    avatar: sessionStore.user?.avatar || '',
    avatarAlt: sessionStore.user?.username?.charAt(0).toUpperCase() || 'U',
}));

// FeatherPanel logo URL
const aiAvatarUrl = 'https://cdn.mythical.systems/featherpanel/logo.png';

const isOpen = computed({
    get: () => props.open,
    set: (value) => emit('update:open', value),
});

const scrollToBottom = () => {
    nextTick(() => {
        if (messagesEndRef.value) {
            messagesEndRef.value.scrollIntoView({ behavior: 'smooth' });
        }
    });
};

watch(
    () => messages.value.length,
    () => {
        scrollToBottom();
    },
);

// Load conversations when chat opens
watch(
    () => props.open,
    async (newValue) => {
        if (newValue) {
            await loadConversations();
            // If no current conversation, show welcome message
            if (!currentConversationId.value && messages.value.length === 0) {
                messages.value.push({
                    id: 'welcome',
                    role: 'assistant',
                    content: t('chatbot.welcome'),
                    timestamp: new Date(),
                });
            }
            nextTick(() => {
                scrollToBottom();
                setTimeout(() => {
                    if (textareaRef.value) {
                        textareaRef.value.focus();
                    }
                }, 100);
            });
        }
    },
);

// Load conversations
const loadConversations = async () => {
    loadingConversations.value = true;
    try {
        conversations.value = await getConversations();
    } catch (error) {
        console.error('Failed to load conversations:', error);
        toast.error(t('chatbot.failedToLoadConversations'));
    } finally {
        loadingConversations.value = false;
    }
};

// Create new conversation
const createNewConversation = () => {
    currentConversationId.value = null;
    messages.value = [];
    messages.value.push({
        id: 'welcome',
        role: 'assistant',
        content: t('chatbot.welcome'),
        timestamp: new Date(),
    });
    inputMessage.value = '';
    nextTick(() => {
        scrollToBottom();
        if (textareaRef.value) {
            textareaRef.value.focus();
        }
    });
};

// Load conversation
const loadConversation = async (conversationId: number) => {
    try {
        const data = await getConversationMessages(conversationId);
        currentConversationId.value = conversationId;
        messages.value = data.messages.map((msg) => ({
            id: `msg-${msg.id}`,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.created_at),
        }));
        if (data.messages.length > 0) {
            const lastMessage = data.messages[data.messages.length - 1];
            if (lastMessage && lastMessage.model) {
                chatModelName.value = lastMessage.model || 'FeatherPanel AI';
            }
        }
        nextTick(() => {
            scrollToBottom();
            if (textareaRef.value) {
                textareaRef.value.focus();
            }
        });
    } catch (error) {
        console.error('Failed to load conversation:', error);
        toast.error(t('chatbot.failedToLoadConversation'));
    }
};

// Delete conversation
const handleDeleteConversation = async (conversationId: number, event: Event) => {
    event.stopPropagation();
    try {
        await deleteConversation(conversationId);
        if (currentConversationId.value === conversationId) {
            createNewConversation();
        }
        await loadConversations();
        toast.success(t('chatbot.conversationDeleted'));
    } catch (error) {
        console.error('Failed to delete conversation:', error);
        toast.error(t('chatbot.failedToDeleteConversation'));
    }
};

// Format date for display
const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
        return t('chatbot.today');
    } else if (days === 1) {
        return t('chatbot.yesterday');
    } else if (days < 7) {
        return t('chatbot.daysAgo', { days });
    } else {
        return date.toLocaleDateString();
    }
};

// Show action notification (custom box)
const showActionNotification = (message: string, type: 'success' | 'error' | 'info' | 'pending' = 'info') => {
    const actionId = `action-${Date.now()}-${Math.random()}`;

    if (type === 'pending') {
        // Add pending action
        pendingActions.value.push({
            id: actionId,
            message,
            type: 'pending',
        });

        // Auto-remove after 5 seconds if not updated
        setTimeout(() => {
            const index = pendingActions.value.findIndex((a) => a.id === actionId);
            const action = pendingActions.value[index];
            if (index !== -1 && action && action.type === 'pending') {
                pendingActions.value.splice(index, 1);
            }
        }, 5000);
    } else {
        // Update existing pending action or add new one
        const existingIndex = pendingActions.value.findIndex((a) => a.type === 'pending');
        if (existingIndex !== -1) {
            const existingAction = pendingActions.value[existingIndex];
            if (existingAction) {
                pendingActions.value[existingIndex] = {
                    id: existingAction.id,
                    message,
                    type: type === 'success' ? 'success' : 'error',
                };
                // Remove after 3 seconds
                setTimeout(() => {
                    const index = pendingActions.value.findIndex((a) => a.id === existingAction.id);
                    if (index !== -1) {
                        pendingActions.value.splice(index, 1);
                    }
                }, 3000);
            }
        } else {
            // Add new action notification
            pendingActions.value.push({
                id: actionId,
                message,
                type: type === 'success' ? 'success' : 'error',
            });
            // Remove after 3 seconds
            setTimeout(() => {
                const index = pendingActions.value.findIndex((a) => a.id === actionId);
                if (index !== -1) {
                    pendingActions.value.splice(index, 1);
                }
            }, 3000);
        }
    }
};

// Show confirmation dialog for destructive actions
const showConfirmation = (
    title: string,
    description: string,
    confirmText: string,
    variant: 'default' | 'destructive',
    action: () => Promise<void>,
) => {
    confirmDialog.value = { title, description, confirmText, variant, action };
    showConfirmDialog.value = true;
};

// Handle confirmation
const handleConfirm = async () => {
    confirmLoading.value = true;
    try {
        await confirmDialog.value.action();
    } finally {
        confirmLoading.value = false;
        showConfirmDialog.value = false;
    }
};

// Execute AI action commands from response
const executeAIActions = async (responseText: string) => {
    const commands = parseActionCommands(responseText);

    // Execute commands sequentially
    for (const command of commands) {
        if (command.type === 'server_power' && command.action) {
            let serverUuid: string | null = command.serverUuid || null;
            let serverName: string | null = command.serverName || null;

            // If we have server name but not UUID, try to find it
            if (!serverUuid && command.serverName) {
                const foundUuid = await findServerUuidByName(command.serverName);
                if (foundUuid) {
                    serverUuid = foundUuid;
                    serverName = command.serverName;
                }
            } else if (serverUuid && !serverName) {
                // If we have UUID but not name, try to find the name
                const foundName = await findServerNameByUuid(serverUuid);
                if (foundName) {
                    serverName = foundName;
                }
            }

            if (serverUuid) {
                // Show confirmation for destructive actions
                const destructiveActions = ['stop', 'restart', 'kill'];
                if (destructiveActions.includes(command.action)) {
                    showConfirmation(
                        t('chatbot.confirmActionServer', { action: command.action }),
                        t('chatbot.confirmActionServerDescription', {
                            action: command.action,
                            server: serverName || serverUuid,
                        }),
                        t('chatbot.actionServer', {
                            action: command.action.charAt(0).toUpperCase() + command.action.slice(1),
                        }),
                        'destructive',
                        async () => {
                            try {
                                const result = await executeServerPowerAction(command.action!, serverUuid!);
                                if (result.success) {
                                    const actionKey =
                                        command.action === 'restart'
                                            ? 'restartedServer'
                                            : command.action === 'stop'
                                              ? 'stoppedServer'
                                              : command.action === 'kill'
                                                ? 'killedServer'
                                                : 'startedServer';
                                    showActionNotification(
                                        t(`chatbot.${actionKey}`, { server: serverName || serverUuid }),
                                        'success',
                                    );
                                } else {
                                    showActionNotification(result.message, 'error');
                                }
                            } catch (error) {
                                console.error('Failed to execute action:', error);
                                showActionNotification(t('chatbot.failedToExecuteAction'), 'error');
                            }
                        },
                    );
                } else {
                    // Non-destructive actions execute immediately
                    showActionNotification(
                        t('chatbot.startingServer', { server: serverName || serverUuid }),
                        'pending',
                    );
                    try {
                        const result = await executeServerPowerAction(command.action, serverUuid);
                        if (result.success) {
                            showActionNotification(
                                t('chatbot.startedServer', { server: serverName || serverUuid }),
                                'success',
                            );
                        } else {
                            showActionNotification(result.message, 'error');
                        }
                    } catch (error) {
                        console.error('Failed to execute action:', error);
                        showActionNotification('Failed to execute action', 'error');
                    }
                }
            } else {
                showActionNotification(
                    t('chatbot.couldNotFindServer', {
                        server: command.serverName || command.serverUuid || 'unknown',
                    }),
                    'error',
                );
            }
        } else if (command.type === 'server_command' && command.command) {
            let serverUuid: string | null = command.serverUuid || null;
            let serverName: string | null = command.serverName || null;

            // If we have server name but not UUID, try to find it
            if (!serverUuid && command.serverName) {
                const foundUuid = await findServerUuidByName(command.serverName);
                if (foundUuid) {
                    serverUuid = foundUuid;
                    serverName = command.serverName;
                }
            } else if (serverUuid && !serverName) {
                // If we have UUID but not name, try to find the name
                const foundName = await findServerNameByUuid(serverUuid);
                if (foundName) {
                    serverName = foundName;
                }
            }

            if (serverUuid) {
                // Always show confirmation for commands (they can be destructive)
                showConfirmation(
                    t('chatbot.confirmCommandExecution'),
                    t('chatbot.confirmCommandExecutionDescription', {
                        server: serverName || serverUuid,
                        command: command.command,
                    }),
                    t('chatbot.sendCommand'),
                    'destructive',
                    async () => {
                        showActionNotification(
                            t('chatbot.sendingCommand', {
                                server: serverName || serverUuid,
                                command: command.command,
                            }),
                            'pending',
                        );
                        try {
                            const result = await executeServerCommand(serverUuid!, command.command!);
                            if (result.success) {
                                showActionNotification(
                                    t('chatbot.sentCommand', {
                                        server: serverName || serverUuid,
                                        command: command.command,
                                    }),
                                    'success',
                                );
                            } else {
                                showActionNotification(result.message, 'error');
                            }
                        } catch (error) {
                            console.error('Failed to send command:', error);
                            showActionNotification(t('chatbot.failedToSendCommand'), 'error');
                        }
                    },
                );
            } else {
                showActionNotification(
                    t('chatbot.couldNotFindServer', {
                        server: command.serverName || command.serverUuid || 'unknown',
                    }),
                    'error',
                );
            }
        } else if (command.type === 'navigate' && command.url) {
            // If we have server name but not UUID in URL, try to find it
            let finalUrl = command.url;

            // Check if URL contains a server name (not UUID) and try to resolve it
            const urlMatch = finalUrl.match(/\/server\/([^/]+)/);
            if (urlMatch && urlMatch[1]) {
                const serverIdentifier = urlMatch[1];
                // Check if it's not a UUID (short or full)
                const isUuid = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$|^[a-z0-9]{8}$/i.test(serverIdentifier);

                if (!isUuid) {
                    // It's a server name, try to find the UUID
                    const foundUuid = await findServerUuidByName(serverIdentifier);
                    if (foundUuid) {
                        // Replace server name in URL with found UUID
                        finalUrl = finalUrl.replace(/\/server\/[^/]+/, `/server/${foundUuid}`);
                    } else {
                        showActionNotification(`Could not find server: ${serverIdentifier}`, 'error');
                        continue;
                    }
                }
            } else if (command.serverName && !command.serverUuid) {
                // Fallback: if we have serverName in command but not in URL
                const foundUuid = await findServerUuidByName(command.serverName);
                if (foundUuid) {
                    // Replace server identifier in URL with found UUID
                    finalUrl = finalUrl.replace(/\/server\/[^/]+/, `/server/${foundUuid}`);
                } else {
                    showActionNotification(`Could not find server: ${command.serverName}`, 'error');
                    continue;
                }
            }

            // Navigate to URL
            router.push(finalUrl);
            showActionNotification(t('chatbot.navigatingToServerPage'), 'info');
        }
    }
};

// AI Control Mode - Browser automation (legacy)
const executeAIAction = (action: { type: string; target?: string; data?: unknown }) => {
    try {
        switch (action.type) {
            case 'click':
                if (action.target) {
                    const element = document.querySelector(action.target as string);
                    if (element) {
                        (element as HTMLElement).click();
                        return { success: true, message: `Clicked element: ${action.target}` };
                    }
                    return { success: false, message: `Element not found: ${action.target}` };
                }
                break;
            case 'navigate':
                if (action.data && typeof action.data === 'object' && 'path' in action.data && action.data.path) {
                    const path = action.data.path as string;
                    router.push(path);
                    return { success: true, message: `Navigated to: ${path}` };
                }
                break;
            case 'type':
                if (action.target && action.data) {
                    const element = document.querySelector(action.target as string) as
                        | HTMLInputElement
                        | HTMLTextAreaElement;
                    if (element) {
                        element.value = action.data as string;
                        element.dispatchEvent(new Event('input', { bubbles: true }));
                        return { success: true, message: `Typed into element: ${action.target}` };
                    }
                    return { success: false, message: `Element not found: ${action.target}` };
                }
                break;
            case 'scroll':
                if (action.data && typeof action.data === 'object' && 'direction' in action.data) {
                    const direction = action.data.direction as 'up' | 'down';
                    window.scrollBy(0, direction === 'down' ? 500 : -500);
                    return { success: true, message: `Scrolled ${direction}` };
                }
                break;
        }
        return { success: false, message: 'Unknown action type' };
    } catch (error) {
        return { success: false, message: `Error executing action: ${error}` };
    }
};

// Watch for AI control commands in messages
watch(
    () => messages.value,
    (newMessages) => {
        if (!aiControlMode.value) return;

        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage?.role === 'assistant' && lastMessage.content) {
            // Check for AI control commands in the response
            try {
                const controlMatch = lastMessage.content.match(/\[AI_CONTROL:(.*?)\]/);
                if (controlMatch && controlMatch[1]) {
                    const action = JSON.parse(controlMatch[1]);
                    const result = executeAIAction(action);
                    console.log('AI Control Action:', result);
                }
            } catch (error) {
                console.error('Failed to parse AI control command:', error);
            }
        }
    },
    { deep: true },
);

const sendMessage = async () => {
    const messageText = inputMessage.value.trim();
    if (!messageText || isLoading.value) {
        return;
    }

    // Use message as-is (no context items)
    const fullMessage = messageText;

    // Add user message
    const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: messageText,
        timestamp: new Date(),
    };
    messages.value.push(userMessage);
    inputMessage.value = '';
    scrollToBottom();

    // Keep focus on textarea immediately after clearing
    nextTick(() => {
        if (textareaRef.value) {
            textareaRef.value.focus();
        }
    });

    // Show loading state
    isLoading.value = true;
    const loadingMessage: Message = {
        id: `loading-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
    };
    messages.value.push(loadingMessage);
    scrollToBottom();

    try {
        // Build page context
        const pageContext: PageContext = {
            route: router.currentRoute.value.path,
            routeName: router.currentRoute.value.name?.toString(),
            page: router.currentRoute.value.name?.toString() || router.currentRoute.value.path,
            contextItems: [],
        };

        // Add server context if we're on a server page
        if (currentServer.value && router.currentRoute.value.path.startsWith('/server/')) {
            const server = currentServer.value as Record<string, unknown>;
            pageContext.server = {
                name: (server.name as string) || 'Unknown Server',
                uuidShort: (server.uuidShort as string) || '',
                status: (server.status as string) || undefined,
                description: (server.description as string) || undefined,
                node:
                    server.node && typeof server.node === 'object' && 'name' in server.node
                        ? { name: server.node.name as string }
                        : undefined,
                spell:
                    server.spell && typeof server.spell === 'object' && 'name' in server.spell
                        ? { name: server.spell.name as string }
                        : undefined,
            };
        }

        const result = await sendChatMessage(
            fullMessage,
            messages.value.slice(0, -1),
            pageContext,
            currentConversationId.value || undefined,
        );

        // Update model name if provided
        if (result.model) {
            chatModelName.value = result.model;
        }

        // Update current conversation ID if a new one was created
        if (result.conversationId && !currentConversationId.value) {
            currentConversationId.value = result.conversationId;
            await loadConversations();
        }

        // Remove loading message
        const loadingIndex = messages.value.findIndex((m) => m.id === loadingMessage.id);
        if (loadingIndex !== -1) {
            messages.value.splice(loadingIndex, 1);
        }

        // Check if the response is an error (from AI provider)
        const isErrorResponse = result.model?.includes('(Error)') || result.response.toLowerCase().startsWith('error');

        if (isErrorResponse) {
            // Show user-friendly error message
            toast.error(t('chatbot.connectionError'));
            console.error('AI service error:', result.response);

            // Add error message to chat
            const errorMessage: Message = {
                id: `error-${Date.now()}`,
                role: 'assistant',
                content: t('chatbot.connectionError'),
                timestamp: new Date(),
            };
            messages.value.push(errorMessage);
            scrollToBottom();
            return;
        }

        // Strip ACTION commands from the response before displaying
        // Keep the text before/after ACTION commands
        const cleanedResponse = result.response
            .replace(/ACTION:\s*[^\n]+/gi, '')
            .replace(/\n\n+/g, '\n\n') // Remove extra blank lines
            .trim();

        // Check if there are any actions in the response
        const hasActions = /ACTION:\s*[^\n]+/gi.test(result.response);

        // Always show a message - if cleaned response is empty but actions exist, show a default message
        const messageContent = cleanedResponse || (hasActions ? t('chatbot.executingAction') : t('chatbot.welcome'));

        const assistantMessage: Message = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: messageContent,
            timestamp: new Date(),
        };
        messages.value.push(assistantMessage);
        scrollToBottom();

        // Parse and execute action commands from AI response (original response with ACTION commands)
        await executeAIActions(result.response);
    } catch (error) {
        // Remove loading message
        const loadingIndex = messages.value.findIndex((m) => m.id === loadingMessage.id);
        if (loadingIndex !== -1) {
            messages.value.splice(loadingIndex, 1);
        }

        // Show user-friendly error message for connection failures
        toast.error(t('chatbot.connectionError'));
        console.error('Chat error:', error);

        // Add error message to chat
        const errorMessage: Message = {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: t('chatbot.connectionError'),
            timestamp: new Date(),
        };
        messages.value.push(errorMessage);
        scrollToBottom();
    } finally {
        isLoading.value = false;
        // Refocus textarea after sending - use setTimeout to ensure DOM is ready
        setTimeout(() => {
            if (textareaRef.value) {
                textareaRef.value.focus();
            }
        }, 100);
    }
};

const handleKeyPress = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        sendMessage();
    }
};

// Render markdown content
const renderMarkdown = (markdown: string): string => {
    if (!markdown) return '';
    try {
        marked.setOptions({
            breaks: true,
            gfm: true,
        });
        const html = marked.parse(markdown) as string;
        // Sanitize HTML using DOMPurify
        return DOMPurify.sanitize(html, {
            ALLOWED_TAGS: [
                'p',
                'br',
                'strong',
                'em',
                'u',
                's',
                'code',
                'pre',
                'blockquote',
                'h1',
                'h2',
                'h3',
                'h4',
                'h5',
                'h6',
                'ul',
                'ol',
                'li',
                'a',
                'img',
                'hr',
                'table',
                'thead',
                'tbody',
                'tr',
                'th',
                'td',
            ],
            ALLOWED_ATTR: ['href', 'title', 'alt', 'src', 'target', 'rel', 'class'],
            ALLOW_DATA_ATTR: false,
        });
    } catch (error) {
        console.error('Markdown parsing error:', error);
        return markdown;
    }
};
</script>

<template>
    <Sheet :open="isOpen" @update:open="isOpen = $event">
        <!-- AI Control Banner -->
        <div
            v-if="aiControlMode"
            class="fixed top-0 left-0 right-0 z-100 bg-linear-to-r from-primary/90 to-primary/80 text-primary-foreground px-4 py-2 flex items-center justify-center gap-2 shadow-lg border-b border-primary/20"
        >
            <Bot class="h-4 w-4 animate-pulse" />
            <span class="text-sm font-semibold">{{ $t('chatbot.windowControlled') }}</span>
            <Button
                variant="ghost"
                size="icon"
                class="h-6 w-6 ml-auto text-primary-foreground hover:bg-primary-foreground/20"
                @click="aiControlMode = false"
            >
                <X class="h-3 w-3" />
            </Button>
        </div>

        <SheetContent
            side="right"
            class="w-full sm:max-w-4xl flex flex-col p-0 bg-background border-l border-border [&>button]:hidden"
            :class="{ 'pt-12': aiControlMode }"
        >
            <div class="flex h-full">
                <!-- Conversations Sidebar -->
                <div
                    v-if="showConversationsSidebar"
                    class="w-64 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col shrink-0"
                >
                    <!-- Sidebar Header -->
                    <div class="px-3 py-2.5 border-b border-border">
                        <Button variant="default" size="sm" class="w-full" @click="createNewConversation">
                            <Plus class="h-4 w-4 mr-2" />
                            {{ $t('chatbot.newChat') }}
                        </Button>
                    </div>

                    <!-- Conversations List -->
                    <div class="flex-1 overflow-y-auto px-2 py-2">
                        <div v-if="loadingConversations" class="flex flex-col items-center justify-center py-8">
                            <Loader2 class="h-5 w-5 animate-spin text-muted-foreground mb-2" />
                            <p class="text-sm text-muted-foreground">{{ $t('chatbot.loading') }}</p>
                        </div>
                        <div
                            v-else-if="conversations.length === 0"
                            class="flex flex-col items-center justify-center py-8 px-4"
                        >
                            <MessageSquare class="h-8 w-8 text-muted-foreground/40 mb-3" />
                            <p class="text-sm font-medium text-foreground mb-1">{{ $t('chatbot.noConversations') }}</p>
                            <p class="text-xs text-muted-foreground text-center">
                                {{ $t('chatbot.noConversationsDescription') }}
                            </p>
                        </div>
                        <div v-else class="space-y-0.5">
                            <button
                                v-for="conv in conversations"
                                :key="conv.id"
                                class="group relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors cursor-pointer"
                                :class="
                                    currentConversationId === conv.id
                                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                        : 'hover:bg-sidebar-accent/50 text-sidebar-foreground/70 hover:text-sidebar-foreground'
                                "
                                @click="loadConversation(conv.id)"
                            >
                                <MessageSquare
                                    class="h-4 w-4 shrink-0"
                                    :class="
                                        currentConversationId === conv.id
                                            ? 'text-sidebar-accent-foreground'
                                            : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground'
                                    "
                                />
                                <div class="flex-1 min-w-0">
                                    <div
                                        class="font-medium truncate text-sm"
                                        :class="
                                            currentConversationId === conv.id
                                                ? 'text-sidebar-accent-foreground'
                                                : 'text-sidebar-foreground'
                                        "
                                    >
                                        {{ conv.title || $t('chatbot.newConversation') }}
                                    </div>
                                    <div class="flex items-center gap-1.5 mt-0.5 text-xs text-sidebar-foreground/50">
                                        <Clock class="h-3 w-3 shrink-0" />
                                        <span class="truncate">{{ formatDate(conv.updated_at) }}</span>
                                        <span
                                            v-if="conv.message_count && conv.message_count > 0"
                                            class="ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium"
                                            :class="
                                                currentConversationId === conv.id
                                                    ? 'bg-sidebar-accent-foreground/20 text-sidebar-accent-foreground'
                                                    : 'bg-sidebar-accent/30 text-sidebar-foreground/60'
                                            "
                                        >
                                            {{ conv.message_count }}
                                        </span>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    class="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:bg-destructive/10 hover:text-destructive"
                                    @click.stop="handleDeleteConversation(conv.id, $event)"
                                >
                                    <Trash2 class="h-3.5 w-3.5" />
                                </Button>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Main Chat Area -->
                <div class="flex-1 flex flex-col min-w-0">
                    <!-- Header -->
                    <div class="px-4 py-3 border-b border-border bg-background flex items-center justify-between">
                        <div class="flex items-center gap-3 min-w-0 flex-1">
                            <Avatar class="h-9 w-9 shrink-0">
                                <AvatarImage :src="aiAvatarUrl" alt="FeatherPanel AI" />
                                <AvatarFallback>
                                    <Bot class="h-5 w-5" />
                                </AvatarFallback>
                            </Avatar>
                            <div class="min-w-0 flex-1">
                                <h2 class="text-base font-semibold text-foreground">
                                    {{ $t('chatbot.title') }}
                                </h2>
                                <div class="flex items-center gap-2 mt-0.5">
                                    <p class="text-xs text-muted-foreground">
                                        {{ $t('chatbot.description') }}
                                    </p>
                                    <span
                                        class="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium shrink-0"
                                    >
                                        {{ chatModelName }}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                            <Button
                                variant="ghost"
                                size="icon"
                                class="h-8 w-8"
                                :class="{ 'bg-accent': showConversationsSidebar }"
                                @click="showConversationsSidebar = !showConversationsSidebar"
                            >
                                <MessageSquare class="h-4 w-4" />
                            </Button>
                            <Button
                                :variant="aiControlMode ? 'default' : 'outline'"
                                size="sm"
                                class="h-8 text-xs"
                                @click="aiControlMode = !aiControlMode"
                            >
                                <Power class="h-3.5 w-3.5 mr-1.5" :class="{ 'animate-pulse': aiControlMode }" />
                                {{ aiControlMode ? $t('chatbot.aiControlOn') : $t('chatbot.aiControl') }}
                            </Button>
                            <Button variant="ghost" size="icon" class="h-8 w-8" @click="emit('update:open', false)">
                                <X class="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <!-- Messages Container -->
                    <div class="flex-1 overflow-y-auto px-4 py-6 bg-muted/20">
                        <!-- Action Notifications -->
                        <TransitionGroup name="action" tag="div" class="space-y-2 mb-4">
                            <div
                                v-for="action in pendingActions"
                                :key="action.id"
                                class="rounded-lg border px-3 py-2 text-sm shadow-sm"
                                :class="
                                    action.type === 'pending'
                                        ? 'bg-primary/10 border-primary/30 text-primary'
                                        : action.type === 'success'
                                          ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400'
                                          : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                                "
                            >
                                <div class="flex items-center gap-2">
                                    <Loader2 v-if="action.type === 'pending'" class="h-4 w-4 animate-spin shrink-0" />
                                    <div v-else-if="action.type === 'success'" class="h-4 w-4 shrink-0">✅</div>
                                    <div v-else class="h-4 w-4 shrink-0">❌</div>
                                    <span class="font-medium">{{ action.message }}</span>
                                </div>
                            </div>
                        </TransitionGroup>

                        <!-- Empty State -->
                        <div
                            v-if="messages.length === 0 && !isLoading"
                            class="flex flex-col items-center justify-center h-full py-12"
                        >
                            <div class="text-center max-w-md">
                                <div
                                    class="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"
                                >
                                    <Bot class="h-8 w-8 text-primary" />
                                </div>
                                <h3 class="text-lg font-semibold text-foreground mb-2">
                                    {{ $t('chatbot.welcome') }}
                                </h3>
                                <p class="text-sm text-muted-foreground">
                                    {{ $t('chatbot.description') }}
                                </p>
                            </div>
                        </div>

                        <!-- Messages -->
                        <TransitionGroup v-else name="message" tag="div" class="space-y-4">
                            <div
                                v-for="message in messages"
                                :key="message.id"
                                class="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
                                :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
                            >
                                <!-- Assistant Avatar -->
                                <Avatar v-if="message.role === 'assistant'" class="shrink-0 h-9 w-9">
                                    <AvatarImage :src="aiAvatarUrl" alt="FeatherPanel AI" />
                                    <AvatarFallback class="bg-primary/10">
                                        <Bot class="h-5 w-5 text-primary" />
                                    </AvatarFallback>
                                </Avatar>

                                <!-- User Avatar -->
                                <Avatar v-if="message.role === 'user'" class="shrink-0 h-9 w-9 order-2">
                                    <AvatarImage :src="user.avatar" :alt="user.username" />
                                    <AvatarFallback class="bg-primary text-primary-foreground">
                                        {{ user.username.charAt(0).toUpperCase() }}
                                    </AvatarFallback>
                                </Avatar>

                                <!-- Message Bubble -->
                                <div
                                    class="group relative max-w-[85%] sm:max-w-[75%]"
                                    :class="message.role === 'user' ? 'order-1' : ''"
                                >
                                    <div
                                        class="rounded-lg px-4 py-2.5 shadow-sm border"
                                        :class="
                                            message.role === 'user'
                                                ? 'bg-primary text-primary-foreground border-primary/20'
                                                : 'bg-card text-card-foreground border-border'
                                        "
                                    >
                                        <div
                                            v-if="message.content"
                                            class="markdown-message text-sm leading-relaxed"
                                            :class="
                                                message.role === 'user' ? 'text-primary-foreground' : 'text-foreground'
                                            "
                                        >
                                            <!-- eslint-disable-next-line vue/no-v-html -->
                                            <div v-html="renderMarkdown(message.content)"></div>
                                        </div>
                                        <div v-else class="flex items-center gap-2">
                                            <Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
                                            <span class="text-sm text-muted-foreground">{{
                                                $t('chatbot.thinking')
                                            }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TransitionGroup>
                        <div ref="messagesEndRef" />
                    </div>

                    <!-- Input Container -->
                    <div class="border-t border-border bg-background">
                        <div class="px-4 py-3">
                            <div class="flex gap-2 items-center">
                                <!-- Textarea -->
                                <textarea
                                    ref="textareaRef"
                                    v-model="inputMessage"
                                    :placeholder="$t('chatbot.placeholder')"
                                    :disabled="isLoading"
                                    rows="1"
                                    class="flex-1 min-h-9 max-h-[200px] resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 overflow-y-auto scrollbar-none leading-normal"
                                    @keydown="handleKeyPress"
                                />

                                <!-- Send Button -->
                                <Button
                                    :disabled="isLoading || !inputMessage.trim()"
                                    size="icon"
                                    class="h-9 w-9 shrink-0"
                                    @click="sendMessage"
                                >
                                    <Send v-if="!isLoading" class="h-4 w-4" />
                                    <Loader2 v-else class="h-4 w-4 animate-spin" />
                                    <span class="sr-only">{{ $t('chatbot.sendMessage') }}</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </SheetContent>
    </Sheet>

    <!-- Confirmation Dialog -->
    <Dialog v-model:open="showConfirmDialog">
        <DialogContent class="sm:max-w-md">
            <DialogHeader>
                <DialogTitle class="flex items-center gap-2">
                    <div
                        class="h-10 w-10 rounded-lg flex items-center justify-center"
                        :class="[confirmDialog.variant === 'destructive' ? 'bg-destructive/10' : 'bg-primary/10']"
                    >
                        <AlertTriangle
                            v-if="confirmDialog.variant === 'destructive'"
                            class="h-5 w-5 text-destructive"
                        />
                        <Bot v-else class="h-5 w-5 text-primary" />
                    </div>
                    <span>{{ confirmDialog.title }}</span>
                </DialogTitle>
                <DialogDescription class="text-sm whitespace-pre-line">
                    {{ confirmDialog.description }}
                </DialogDescription>
            </DialogHeader>
            <DialogFooter class="gap-2">
                <Button variant="outline" size="sm" :disabled="confirmLoading" @click="showConfirmDialog = false">
                    {{ $t('common.cancel') }}
                </Button>
                <Button :variant="confirmDialog.variant" size="sm" :disabled="confirmLoading" @click="handleConfirm">
                    <Loader2 v-if="confirmLoading" class="h-4 w-4 mr-2 animate-spin" />
                    {{ confirmDialog.confirmText }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<style scoped>
/* Custom scrollbar styling */
:deep(.overflow-y-auto) {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent;
}

:deep(.overflow-y-auto)::-webkit-scrollbar {
    width: 8px;
}

:deep(.overflow-y-auto)::-webkit-scrollbar-track {
    background: transparent;
}

:deep(.overflow-y-auto)::-webkit-scrollbar-thumb {
    background-color: hsl(var(--muted-foreground) / 0.2);
    border-radius: 4px;
    border: 2px solid transparent;
    background-clip: padding-box;
}

:deep(.overflow-y-auto)::-webkit-scrollbar-thumb:hover {
    background-color: hsl(var(--muted-foreground) / 0.4);
}

/* Hide textarea scrollbar */
.scrollbar-none {
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE and Edge */
}

.scrollbar-none::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
}

/* Message animations */
.message-enter-active {
    transition: all 0.3s ease-out;
}

.message-enter-from {
    opacity: 0;
    transform: translateY(10px) scale(0.95);
}

.message-leave-active {
    transition: all 0.2s ease-in;
}

.message-leave-to {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
}

.message-move {
    transition: transform 0.3s ease;
}

/* Smooth fade-in for messages */
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-in {
    animation: fadeInUp 0.3s ease-out;
}

/* Action notification animations */
.action-enter-active,
.action-leave-active {
    transition: all 0.3s ease;
}

.action-enter-from {
    opacity: 0;
    transform: translateY(-10px);
}

.action-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

/* Markdown content styling for chatbot messages */
.markdown-message {
    line-height: 1.6;
}

.markdown-message :deep(p) {
    margin: 0 0 0.75em 0;
}

.markdown-message :deep(p:last-child) {
    margin-bottom: 0;
}

.markdown-message :deep(h1),
.markdown-message :deep(h2),
.markdown-message :deep(h3),
.markdown-message :deep(h4),
.markdown-message :deep(h5),
.markdown-message :deep(h6) {
    margin-top: 1em;
    margin-bottom: 0.5em;
    font-weight: 600;
    line-height: 1.25;
}

.markdown-message :deep(h1) {
    font-size: 1.5rem;
}

.markdown-message :deep(h2) {
    font-size: 1.25rem;
}

.markdown-message :deep(h3) {
    font-size: 1.125rem;
}

.markdown-message :deep(ul),
.markdown-message :deep(ol) {
    margin: 0.5em 0;
    padding-left: 1.5em;
}

.markdown-message :deep(li) {
    margin: 0.25em 0;
}

.markdown-message :deep(strong) {
    font-weight: 600;
}

.markdown-message :deep(em) {
    font-style: italic;
}

.markdown-message :deep(code) {
    background-color: rgba(0, 0, 0, 0.1);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.875em;
    font-family: 'Courier New', monospace;
}

.markdown-message :deep(pre) {
    background-color: rgba(0, 0, 0, 0.1);
    padding: 0.75rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin: 0.75em 0;
}

.markdown-message :deep(pre code) {
    background-color: transparent;
    padding: 0;
}

.markdown-message :deep(blockquote) {
    border-left: 3px solid currentColor;
    padding-left: 1em;
    margin: 0.75em 0;
    opacity: 0.8;
}

.markdown-message :deep(a) {
    text-decoration: underline;
    opacity: 0.9;
}

.markdown-message :deep(a:hover) {
    opacity: 1;
}

.markdown-message :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 0.75em 0;
}

.markdown-message :deep(th),
.markdown-message :deep(td) {
    border: 1px solid currentColor;
    padding: 0.5em;
    opacity: 0.7;
}

.markdown-message :deep(th) {
    font-weight: 600;
    opacity: 0.9;
}
</style>
