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

'use client';

import { Fragment, memo, useState, useEffect, useRef, useContext, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Send, Loader2, X, Bot, MessageSquare, Clock, Trash2, Plus, AlertTriangle, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from '@/contexts/TranslationContext';
import {
    streamChatMessage,
    getConversations,
    getConversationMessages,
    deleteConversation,
    getVdsConversations,
    getVdsConversationMessages,
    deleteVdsConversation,
    type Conversation,
    type TokenUsage,
    type ToolActivity,
    type PageContext,
} from '@/lib/api/chatbotService';
import {
    parseActionCommands,
    executeServerPowerAction,
    executeServerCommand,
    findServerUuidByName,
    findServerNameByUuid,
} from '@/lib/api/chatbotActions';
import { ServerContext } from '@/contexts/ServerContext';
import { useSession } from '@/contexts/SessionContext';
import { type VmInstance } from '@/contexts/VmInstanceContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useTheme } from '@/contexts/ThemeContext';

const CHATBOT_COMMANDS = [
    {
        command: '/help',
        titleKey: 'chatbot.commandHelpTitle',
        descriptionKey: 'chatbot.commandHelpDescription',
    },
    {
        command: '/context',
        titleKey: 'chatbot.commandContextTitle',
        descriptionKey: 'chatbot.commandContextDescription',
    },
    {
        command: '/compact',
        titleKey: 'chatbot.commandCompactTitle',
        descriptionKey: 'chatbot.commandCompactDescription',
    },
    {
        command: '/clear',
        titleKey: 'chatbot.commandClearTitle',
        descriptionKey: 'chatbot.commandClearDescription',
    },
];

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    fullContent?: string;
    isTyping?: boolean;
    timestamp: Date;
    model?: string | null;
    usage?: TokenUsage | null;
    toolActivity?: ToolActivity[] | null;
    status?: string | null;
}

interface PendingAction {
    id: string;
    message: string;
    type: 'pending' | 'success' | 'error';
}

interface ConfirmDialogState {
    open: boolean;
    title: string;
    description: string;
    confirmText: string;
    variant: 'default' | 'destructive';
    action: () => Promise<void>;
}

interface ChatbotContainerProps {
    open: boolean;
    onClose: () => void;
    mode?: 'server' | 'vds' | 'dashboard';
    vdsInstance?: VmInstance | null;
}

interface UserAvatarProps {
    avatar?: string | null;
    username?: string | null;
    firstName?: string | null;
    size?: 'sm' | 'md';
}

const UserAvatar = memo(function UserAvatar({ avatar, username, firstName, size = 'md' }: UserAvatarProps) {
    const sizeClasses = {
        sm: 'h-8 w-8 text-xs',
        md: 'h-9 w-9 text-sm',
    };

    if (avatar) {
        return (
            <Image
                src={avatar}
                alt={username || 'User'}
                width={size === 'sm' ? 32 : 36}
                height={size === 'sm' ? 32 : 36}
                unoptimized
                className={`${sizeClasses[size]} rounded-full object-cover`}
            />
        );
    }

    return (
        <div
            className={`${sizeClasses[size]} bg-primary text-primary-foreground flex items-center justify-center rounded-full font-semibold`}
        >
            {firstName?.charAt(0) || username?.charAt(0)}
        </div>
    );
});

export default function ChatbotContainer({ open, onClose, mode = 'server', vdsInstance }: ChatbotContainerProps) {
    const { t } = useTranslation();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
    const [loadingConversations, setLoadingConversations] = useState(false);
    const [showSidebar, setShowSidebar] = useState(false);
    const [expandedActivityMessages, setExpandedActivityMessages] = useState<string[]>([]);
    const [chatModelName, setChatModelName] = useState('FeatherPanel AI');
    const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
        open: false,
        title: '',
        description: '',
        confirmText: '',
        variant: 'default',
        action: async () => {},
    });
    const [confirmLoading, setConfirmLoading] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const localIdRef = useRef(0);
    const pathname = usePathname();
    const router = useRouter();
    const serverCtx = useContext(ServerContext);
    const server = serverCtx?.server ?? null;
    const { user } = useSession();
    const { settings } = useSettings();
    const { theme } = useTheme();
    const lastConversationStorageKey = `featherpanel_chatbot_last_conversation_${mode}`;
    const logoUrl = theme === 'dark' ? settings?.app_logo_dark || '/logo.png' : settings?.app_logo_white || '/logo.png';
    const slashQuery = inputMessage.startsWith('/') ? inputMessage.trim().toLowerCase() : '';
    const commandSuggestions = useMemo(() => {
        if (!slashQuery) return [];

        return CHATBOT_COMMANDS.filter((command) => command.command.startsWith(slashQuery));
    }, [slashQuery]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const nextLocalId = (prefix: string) => {
        localIdRef.current += 1;
        return `${prefix}-${localIdRef.current}`;
    };

    const selectCommandSuggestion = (command: string) => {
        setInputMessage(command);
        setTimeout(() => {
            textareaRef.current?.focus();
            const length = command.length;
            textareaRef.current?.setSelectionRange(length, length);
        }, 0);
    };

    const toggleActivityDetails = (messageId: string) => {
        setExpandedActivityMessages((prev) =>
            prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId],
        );
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const typingMessage = messages.find(
            (message) =>
                message.role === 'assistant' &&
                message.isTyping &&
                message.fullContent &&
                message.content.length < message.fullContent.length,
        );

        if (!typingMessage?.fullContent) {
            return;
        }

        const timeout = window.setTimeout(() => {
            setMessages((prev) =>
                prev.map((message) => {
                    if (message.id !== typingMessage.id || !message.fullContent) {
                        return message;
                    }

                    const nextContent = message.fullContent.slice(0, message.content.length + 8);
                    return {
                        ...message,
                        content: nextContent,
                        isTyping: nextContent.length < message.fullContent.length,
                    };
                }),
            );
        }, 18);

        return () => window.clearTimeout(timeout);
    }, [messages]);

    const getWelcomeMessage = (userName: string) => {
        if (mode === 'dashboard') {
            return t('chatbot.welcomeDashboard', { name: userName });
        }

        if (mode === 'vds') {
            return t('chatbot.welcomeVds', { name: userName });
        }
        return t('chatbot.welcome', { name: userName });
    };

    useEffect(() => {
        if (open) {
            loadConversationsList().then((convs) => {
                if (currentConversationId || messages.length > 0) return;

                const storedConversationId =
                    typeof window !== 'undefined' ? window.localStorage.getItem(lastConversationStorageKey) : null;
                const conversationToRestore =
                    (storedConversationId && convs.find((conv) => conv.id === Number(storedConversationId))) ||
                    convs[0];

                if (conversationToRestore) {
                    loadConversation(conversationToRestore.id);
                    return;
                }

                const userName = user?.first_name || user?.username || 'there';
                setMessages([
                    {
                        id: 'welcome',
                        role: 'assistant',
                        content: getWelcomeMessage(userName),
                        timestamp: new Date(),
                    },
                ]);
            });
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 100);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const loadConversationsList = async () => {
        setLoadingConversations(true);
        try {
            const convs = mode === 'vds' ? await getVdsConversations() : await getConversations();
            setConversations(convs);
            return convs;
        } catch (error) {
            console.error('Failed to load conversations:', error);
            toast.error(t('chatbot.failedToLoadConversations'));
            return [];
        } finally {
            setLoadingConversations(false);
        }
    };

    const createNewConversation = () => {
        setCurrentConversationId(null);
        if (typeof window !== 'undefined') {
            window.localStorage.removeItem(lastConversationStorageKey);
        }
        const userName = user?.first_name || user?.username || 'there';
        setMessages([
            {
                id: 'welcome',
                role: 'assistant',
                content: getWelcomeMessage(userName),
                timestamp: new Date(),
            },
        ]);
        setInputMessage('');
        setShowSidebar(false);
        setTimeout(() => {
            textareaRef.current?.focus();
        }, 100);
    };

    const loadConversation = async (conversationId: number) => {
        try {
            const data =
                mode === 'vds'
                    ? await getVdsConversationMessages(conversationId)
                    : await getConversationMessages(conversationId);
            setCurrentConversationId(conversationId);
            setMessages(
                data.messages.map((msg) => ({
                    id: `msg-${msg.id}`,
                    role: msg.role,
                    content: msg.content,
                    timestamp: new Date(msg.created_at),
                    model: msg.model,
                    usage: {
                        input_tokens: msg.input_tokens,
                        output_tokens: msg.output_tokens,
                        total_tokens: msg.total_tokens,
                        source: msg.token_source,
                    },
                    toolActivity: msg.tool_activity,
                })),
            );
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(lastConversationStorageKey, String(conversationId));
            }
            if (data.messages.length > 0) {
                const lastMessage = data.messages[data.messages.length - 1];
                if (lastMessage?.model) {
                    setChatModelName(lastMessage.model || 'FeatherPanel AI');
                }
            }
            setShowSidebar(false);
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 100);
        } catch (error) {
            console.error('Failed to load conversation:', error);
            toast.error(t('chatbot.failedToLoadConversation'));
        }
    };

    const handleDeleteConversation = async (conversationId: number, event: React.MouseEvent) => {
        event.stopPropagation();
        try {
            if (mode === 'vds') {
                await deleteVdsConversation(conversationId);
            } else {
                await deleteConversation(conversationId);
            }
            if (currentConversationId === conversationId) {
                createNewConversation();
            } else if (
                typeof window !== 'undefined' &&
                window.localStorage.getItem(lastConversationStorageKey) === String(conversationId)
            ) {
                window.localStorage.removeItem(lastConversationStorageKey);
            }
            await loadConversationsList();
            toast.success(t('chatbot.conversationDeleted'));
        } catch (error) {
            console.error('Failed to delete conversation:', error);
            toast.error(t('chatbot.failedToDeleteConversation'));
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return t('chatbot.today');
        if (days === 1) return t('chatbot.yesterday');
        if (days < 7) return t('chatbot.daysAgo', { days: days.toString() });
        return date.toLocaleDateString();
    };

    const showActionNotification = (message: string, type: 'success' | 'error' | 'pending' = 'pending') => {
        const actionId = nextLocalId('action');

        if (type === 'pending') {
            setPendingActions((prev) => [...prev, { id: actionId, message, type: 'pending' }]);
            setTimeout(() => {
                setPendingActions((prev) => {
                    const action = prev.find((a) => a.id === actionId);
                    if (action && action.type === 'pending') {
                        return prev.filter((a) => a.id !== actionId);
                    }
                    return prev;
                });
            }, 5000);
        } else {
            setPendingActions((prev) => {
                const existingIndex = prev.findIndex((a) => a.type === 'pending');
                if (existingIndex !== -1) {
                    const newActions = [...prev];
                    newActions[existingIndex] = { id: prev[existingIndex]!.id, message, type };
                    setTimeout(() => {
                        setPendingActions((p) => p.filter((a) => a.id !== newActions[existingIndex]!.id));
                    }, 3000);
                    return newActions;
                }
                const newAction = { id: actionId, message, type };
                setTimeout(() => {
                    setPendingActions((p) => p.filter((a) => a.id !== actionId));
                }, 3000);
                return [...prev, newAction];
            });
        }
    };

    const showConfirmation = (
        title: string,
        description: string,
        confirmText: string,
        variant: 'default' | 'destructive',
        action: () => Promise<void>,
    ) => {
        setConfirmDialog({ open: true, title, description, confirmText, variant, action });
    };

    const handleConfirm = async () => {
        setConfirmLoading(true);
        try {
            await confirmDialog.action();
        } finally {
            setConfirmLoading(false);
            setConfirmDialog((prev) => ({ ...prev, open: false }));
        }
    };

    const isPowerActionAllowedByLatestMessage = (
        action: 'start' | 'stop' | 'restart' | 'kill',
        latestMessage: string,
    ) => {
        const normalized = latestMessage.toLowerCase();
        const patterns: Record<typeof action, RegExp> = {
            start: /\b(start|boot|turn\s+on|power\s+on)\b/,
            stop: /\b(stop|shut\s*down|shutdown|turn\s+off|power\s+off)\b/,
            restart: /\b(restart|reboot)\b/,
            kill: /\b(kill|force\s+stop|terminate)\b/,
        };

        return patterns[action].test(normalized);
    };

    const filterAuthorizedCommands = (commands: ReturnType<typeof parseActionCommands>, latestMessage: string) =>
        commands.filter((command) => {
            if (command.type === 'server_power' && command.action) {
                return isPowerActionAllowedByLatestMessage(command.action, latestMessage);
            }

            return true;
        });

    const executeAIActions = async (responseText: string, latestMessage: string) => {
        const commands = filterAuthorizedCommands(parseActionCommands(responseText), latestMessage);

        // --- VDS-specific action patterns ---
        // VDS power and backup actions are handled entirely by backend tools (TOOL_CALL).
        // The frontend only handles navigation ACTION commands for VDS.
        // ACTION: navigate vds [instance_id] to [page_name]
        const vdsNavigatePattern = /ACTION:\s*navigate\s+vds\s+(\d+)\s+to\s+(\w+)/gi;

        const vdsPageMap: Record<string, string> = {
            console: '',
            activities: 'activities',
            backups: 'backups',
            network: 'network',
            settings: 'settings',
            users: 'users',
        };

        if (mode === 'vds') {
            let vdsNavMatch: RegExpExecArray | null;
            vdsNavigatePattern.lastIndex = 0;
            while ((vdsNavMatch = vdsNavigatePattern.exec(responseText)) !== null) {
                const vdsNavInstanceId = vdsNavMatch[1]!;
                const vdsPageName = vdsNavMatch[2]!.toLowerCase();
                const pageSegment = vdsPageMap[vdsPageName] ?? vdsPageName;
                const navUrl = pageSegment ? `/vds/${vdsNavInstanceId}/${pageSegment}` : `/vds/${vdsNavInstanceId}`;
                router.push(navUrl);
                showActionNotification(t('chatbot.navigatingToServerPage'), 'success');
            }
        }

        for (const command of commands) {
            if (command.type === 'server_power' && command.action) {
                let serverUuid: string | null = command.serverUuid || null;
                let serverName: string | null = command.serverName || null;

                if (!serverUuid && command.serverName) {
                    const foundUuid = await findServerUuidByName(command.serverName);
                    if (foundUuid) {
                        serverUuid = foundUuid;
                        serverName = command.serverName;
                    }
                } else if (serverUuid && !serverName) {
                    const foundName = await findServerNameByUuid(serverUuid);
                    if (foundName) {
                        serverName = foundName;
                    }
                }

                if (serverUuid) {
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
                                        const actionKey = `${command.action}edServer`;
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
                            showActionNotification(t('chatbot.failedToExecuteAction'), 'error');
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

                if (!serverUuid && command.serverName) {
                    const foundUuid = await findServerUuidByName(command.serverName);
                    if (foundUuid) {
                        serverUuid = foundUuid;
                        serverName = command.serverName;
                    }
                } else if (serverUuid && !serverName) {
                    const foundName = await findServerNameByUuid(serverUuid);
                    if (foundName) {
                        serverName = foundName;
                    }
                }

                if (serverUuid) {
                    showConfirmation(
                        t('chatbot.confirmCommandExecution'),
                        t('chatbot.confirmCommandExecutionDescription', {
                            command: command.command,
                            server: serverName || serverUuid,
                        }),
                        t('chatbot.sendCommand'),
                        'destructive',
                        async () => {
                            showActionNotification(
                                t('chatbot.sendingCommand', { server: serverName || serverUuid }),
                                'pending',
                            );
                            try {
                                const result = await executeServerCommand(serverUuid!, command.command!);
                                if (result.success) {
                                    showActionNotification(
                                        t('chatbot.sentCommand', { server: serverName || serverUuid }),
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
                let finalUrl = command.url;

                const urlMatch = finalUrl.match(/\/server\/([^/]+)/);
                if (urlMatch && urlMatch[1]) {
                    const serverIdentifier = urlMatch[1];
                    const isUuid = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$|^[a-z0-9]{8}$/i.test(serverIdentifier);

                    if (!isUuid) {
                        const foundUuid = await findServerUuidByName(serverIdentifier);
                        if (foundUuid) {
                            finalUrl = finalUrl.replace(/\/server\/[^/]+/, `/server/${foundUuid}`);
                        } else {
                            showActionNotification(
                                t('chatbot.couldNotFindServer', { server: serverIdentifier }),
                                'error',
                            );
                            continue;
                        }
                    }
                }

                router.push(finalUrl);
                showActionNotification(t('chatbot.navigatingToServerPage'), 'success');
            }
        }
    };

    const estimateInputUsage = (text: string): TokenUsage => {
        const inputTokens = Math.max(1, Math.ceil(text.trim().length / 4));
        return {
            input_tokens: inputTokens,
            total_tokens: inputTokens,
            source: 'estimated',
        };
    };

    const formatUsageLabel = (usage?: TokenUsage | null, role?: Message['role']) => {
        if (!usage) return null;
        const input = usage.input_tokens ?? 0;
        const output = usage.output_tokens ?? 0;
        const total = usage.total_tokens ?? input + output;

        if (!input && !output && !total) return null;

        if (role === 'assistant') {
            return t('chatbot.tokenUsageAssistant', {
                input: String(input),
                output: String(output),
                total: String(total),
            });
        }

        return t('chatbot.tokenUsageUser', { count: String(input || total) });
    };

    const formatUsageTitle = (usage?: TokenUsage | null, role?: Message['role']) => {
        if (!usage) return undefined;
        const input = usage.input_tokens ?? 0;
        const output = usage.output_tokens ?? 0;
        const total = usage.total_tokens ?? input + output;
        if (!input && !output && !total) return undefined;

        return role === 'assistant'
            ? t('chatbot.tokenUsageAssistantDetails', {
                  input: String(input),
                  output: String(output),
                  total: String(total),
              })
            : t('chatbot.tokenUsageUserDetails', { count: String(input || total) });
    };

    const getActionLabel = (command: ReturnType<typeof parseActionCommands>[number]) => {
        if (command.type === 'server_power' && command.action) {
            const actionKey = `chatbot.action${command.action.charAt(0).toUpperCase()}${command.action.slice(1)}Server`;
            return t(actionKey);
        }

        if (command.type === 'server_command') {
            return t('chatbot.actionSendCommand');
        }

        return t('chatbot.actionNavigate');
    };

    const getActionSummary = (command: ReturnType<typeof parseActionCommands>[number]) => {
        if (command.type === 'server_power') {
            return command.serverName || command.serverUuid || t('chatbot.plannedAction');
        }

        if (command.type === 'server_command') {
            return command.command || t('chatbot.plannedAction');
        }

        return command.url || t('chatbot.plannedAction');
    };

    const cleanAssistantResponse = (responseText: string) =>
        responseText
            .replace(/ACTION:\s*[^\n]+/gi, '')
            .replace(/TOOL_CALL:\s*[^\n]+/gi, '')
            .split('\n')
            .map((line) => line.trimEnd())
            .filter((line) => !/^\s*(\*\*|__|\*|_)\s*$/.test(line))
            .join('\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

    const buildActionActivity = (responseText: string, latestMessage: string): ToolActivity[] =>
        filterAuthorizedCommands(parseActionCommands(responseText), latestMessage).map((command, index) => ({
            tool: `${t('chatbot.plannedAction')}: ${getActionLabel(command)}`,
            success: undefined,
            summary: getActionSummary(command),
            iteration: index + 1,
        }));

    const sendMessage = async () => {
        const messageText = inputMessage.trim();
        if (!messageText || isLoading) return;

        if (messageText.startsWith('/')) {
            const command = messageText.toLowerCase();
            setInputMessage('');

            if (command === '/help' || command === '/commands') {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: nextLocalId('command'),
                        role: 'assistant',
                        content: t('chatbot.availableCommands'),
                        timestamp: new Date(),
                    },
                ]);
                return;
            }

            if (command === '/context') {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: nextLocalId('command'),
                        role: 'assistant',
                        content: t('chatbot.contextCommand', {
                            mode,
                            route: pathname || 'unknown',
                        }),
                        timestamp: new Date(),
                    },
                ]);
                return;
            }

            if (command === '/compact') {
                setMessages([
                    {
                        id: nextLocalId('compact'),
                        role: 'assistant',
                        content: t('chatbot.compactCommand'),
                        timestamp: new Date(),
                    },
                ]);
                return;
            }

            if (command === '/clear') {
                createNewConversation();
                return;
            }

            setMessages((prev) => [
                ...prev,
                {
                    id: nextLocalId('command'),
                    role: 'assistant',
                    content: t('chatbot.unknownCommand', { command: messageText }),
                    timestamp: new Date(),
                },
            ]);
            return;
        }

        const userMessage: Message = {
            id: nextLocalId('user'),
            role: 'user',
            content: messageText,
            timestamp: new Date(),
            usage: estimateInputUsage(messageText),
        };
        setMessages((prev) => [...prev, userMessage]);
        setInputMessage('');
        scrollToBottom();

        setTimeout(() => {
            textareaRef.current?.focus();
        }, 100);

        setIsLoading(true);
        const loadingMessage: Message = {
            id: nextLocalId('loading'),
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            status: 'Preparing...',
            toolActivity: [],
        };
        setMessages((prev) => [...prev, loadingMessage]);
        scrollToBottom();

        try {
            const pageContext: PageContext = {
                mode,
                route: pathname || '',
                routeName: pathname || '',
                page: pathname || '',
                contextItems: [],
            };

            if (server && pathname?.startsWith('/server/')) {
                pageContext.server = {
                    name: server.name || 'Unknown Server',
                    uuidShort: server.uuidShort || '',
                    status: server.status,
                    description: server.description,
                    node: server.node ? { name: server.node.name } : undefined,
                    spell: server.spell ? { name: server.spell.name } : undefined,
                };
            }

            if (mode === 'vds' && vdsInstance && pathname?.startsWith('/vds/')) {
                pageContext.vdsInstance = {
                    id: vdsInstance.id,
                    hostname: vdsInstance.hostname,
                    status: vdsInstance.status,
                    vm_type: vdsInstance.vm_type,
                    ip_address: vdsInstance.ip_address,
                    memory: vdsInstance.memory,
                    cpus: vdsInstance.cpus,
                    disk_gb: vdsInstance.disk_gb,
                    node_name: vdsInstance.node_name,
                };
            }

            const result = await streamChatMessage(
                mode,
                messageText,
                messages.slice(0, -1),
                pageContext,
                currentConversationId || undefined,
                (event) => {
                    if (event.type === 'conversation') {
                        if (event.conversation_id && !currentConversationId) {
                            setCurrentConversationId(event.conversation_id);
                            if (typeof window !== 'undefined') {
                                window.localStorage.setItem(lastConversationStorageKey, String(event.conversation_id));
                            }
                        }
                        if (event.user_usage) {
                            setMessages((prev) =>
                                prev.map((message) =>
                                    message.id === userMessage.id ? { ...message, usage: event.user_usage } : message,
                                ),
                            );
                        }
                    }

                    if (event.type === 'status') {
                        setMessages((prev) =>
                            prev.map((message) =>
                                message.id === loadingMessage.id ? { ...message, status: event.message } : message,
                            ),
                        );
                    }

                    if (event.type === 'tool_call') {
                        const pendingActivity: ToolActivity = {
                            tool: event.tool,
                            params: event.params,
                            success: undefined,
                            summary: t('chatbot.toolRunningSummary'),
                            iteration: event.iteration,
                        };
                        setMessages((prev) =>
                            prev.map((message) =>
                                message.id === loadingMessage.id
                                    ? {
                                          ...message,
                                          status: t('chatbot.callingTool', { tool: event.tool }),
                                          toolActivity: [...(message.toolActivity || []), pendingActivity],
                                      }
                                    : message,
                            ),
                        );
                    }

                    if (event.type === 'tool_result') {
                        setMessages((prev) =>
                            prev.map((message) => {
                                if (message.id !== loadingMessage.id) return message;
                                const current = [...(message.toolActivity || [])];
                                const index = current.findIndex(
                                    (activity) =>
                                        activity.tool === event.tool &&
                                        activity.iteration === event.iteration &&
                                        activity.success === undefined,
                                );
                                if (index >= 0) {
                                    current[index] = event;
                                } else {
                                    current.push(event);
                                }

                                return {
                                    ...message,
                                    status: event.success
                                        ? t('chatbot.toolFinished', { tool: event.tool })
                                        : t('chatbot.toolFailed', { tool: event.tool }),
                                    toolActivity: current,
                                };
                            }),
                        );
                    }

                    if (event.type === 'usage') {
                        setMessages((prev) =>
                            prev.map((message) =>
                                message.id === loadingMessage.id ? { ...message, usage: event.usage } : message,
                            ),
                        );
                    }
                },
            );

            setMessages((prev) =>
                prev.map((message) =>
                    message.id === loadingMessage.id ? { ...message, status: t('chatbot.typing') } : message,
                ),
            );

            if (result.model) {
                setChatModelName(result.model);
            }

            if (result.conversation_id && !currentConversationId) {
                setCurrentConversationId(result.conversation_id);
                if (typeof window !== 'undefined') {
                    window.localStorage.setItem(lastConversationStorageKey, String(result.conversation_id));
                }
                await loadConversationsList();
            }

            if (result.tool_executions && result.tool_executions.length > 0) {
                for (const toolExec of result.tool_executions) {
                    if (toolExec.success) {
                        showActionNotification(
                            toolExec.message || t('chatbot.toolActionSuccess', { action: toolExec.action_type }),
                            'success',
                        );
                    } else {
                        showActionNotification(
                            toolExec.error || t('chatbot.toolActionFailed', { action: toolExec.action_type }),
                            'error',
                        );
                    }
                }
            }

            const isErrorResponse =
                result.model?.includes('(Error)') || result.response.toLowerCase().startsWith('error');

            if (isErrorResponse) {
                toast.error(t('chatbot.connectionError'));
                console.error('AI service error:', result.response);
                setMessages((prev) =>
                    prev.map((message) =>
                        message.id === loadingMessage.id
                            ? { ...message, content: t('chatbot.connectionError'), status: null }
                            : message,
                    ),
                );
                return;
            }

            setMessages((prev) =>
                prev.map((message) =>
                    message.id === loadingMessage.id ? { ...message, status: t('chatbot.checkingActions') } : message,
                ),
            );

            const cleanedResponse = cleanAssistantResponse(result.response);
            const hasActions = /ACTION:\s*[^\n]+/gi.test(result.response);
            const messageContent =
                cleanedResponse ||
                (hasActions
                    ? t('chatbot.executingAction')
                    : t('chatbot.welcome', { name: user?.first_name || 'there' }));
            const actionActivity = buildActionActivity(result.response, messageText);
            const messageToolActivity =
                result.tool_activity !== undefined && result.tool_activity !== null
                    ? result.tool_activity
                    : loadingMessage.toolActivity || [];

            setMessages((prev) =>
                prev.map((message) => {
                    if (message.id !== loadingMessage.id) return message;

                    const finalToolActivity =
                        result.tool_activity !== undefined && result.tool_activity !== null
                            ? messageToolActivity
                            : message.toolActivity || [];

                    return {
                        ...message,
                        id: result.message_id ? `msg-${result.message_id}` : nextLocalId('assistant'),
                        content: '',
                        fullContent: messageContent,
                        isTyping: true,
                        timestamp: new Date(),
                        model: result.model,
                        usage: result.usage,
                        toolActivity: [...finalToolActivity, ...actionActivity],
                        status: null,
                    };
                }),
            );
            scrollToBottom();

            await executeAIActions(result.response, messageText);
        } catch (error) {
            setMessages((prev) => prev.filter((m) => m.id !== loadingMessage.id));
            toast.error(t('chatbot.connectionError'));
            console.error('Chat error:', error);
            setMessages((prev) => [
                ...prev,
                {
                    id: nextLocalId('error'),
                    role: 'assistant',
                    content: t('chatbot.connectionError'),
                    timestamp: new Date(),
                },
            ]);
        } finally {
            setIsLoading(false);
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 100);
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    };

    return (
        <>
            <Transition appear show={open} as={Fragment}>
                <Dialog as='div' className='relative z-50' onClose={onClose}>
                    <Transition.Child
                        as={Fragment}
                        enter='ease-out duration-300'
                        enterFrom='opacity-0'
                        enterTo='opacity-100'
                        leave='ease-in duration-200'
                        leaveFrom='opacity-100'
                        leaveTo='opacity-0'
                    >
                        <div className='fixed inset-0 bg-black/25 backdrop-blur-sm' />
                    </Transition.Child>

                    <div className='fixed inset-0 overflow-hidden'>
                        <div className='absolute inset-0 overflow-hidden'>
                            <div className='pointer-events-none fixed inset-y-0 right-0 flex max-w-full'>
                                <Transition.Child
                                    as={Fragment}
                                    enter='transform transition ease-in-out duration-300'
                                    enterFrom='translate-x-full'
                                    enterTo='translate-x-0'
                                    leave='transform transition ease-in-out duration-300'
                                    leaveFrom='translate-x-0'
                                    leaveTo='translate-x-full'
                                >
                                    <Dialog.Panel className='pointer-events-auto w-screen max-w-full md:max-w-2xl lg:max-w-3xl'>
                                        <div className='bg-background/98 ring-border/70 dark:bg-background flex h-full flex-col shadow-2xl ring-1'>
                                            <div className='border-border/70 bg-card/95 supports-backdrop-filter:bg-card/85 flex items-center justify-between border-b px-4 py-3 shadow-sm backdrop-blur'>
                                                <div className='flex min-w-0 flex-1 items-center gap-3'>
                                                    <Button
                                                        variant='ghost'
                                                        size='icon'
                                                        className='h-9 w-9 shrink-0'
                                                        onClick={() => setShowSidebar(!showSidebar)}
                                                    >
                                                        <Menu className='h-5 w-5' />
                                                        <span className='sr-only'>{t('chatbot.toggleSidebar')}</span>
                                                    </Button>
                                                    <div className='bg-background ring-primary/15 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl p-1.5 shadow-sm ring-1'>
                                                        <Image
                                                            src={logoUrl}
                                                            alt={settings?.app_name || t('chatbot.title')}
                                                            width={28}
                                                            height={28}
                                                            className='h-7 w-7 object-contain'
                                                            unoptimized
                                                        />
                                                    </div>
                                                    <div className='min-w-0 flex-1'>
                                                        <h2 className='text-foreground text-sm font-semibold'>
                                                            {t('chatbot.title')}
                                                        </h2>
                                                        {chatModelName && chatModelName !== t('chatbot.title') && (
                                                            <p className='text-muted-foreground truncate text-xs'>
                                                                {chatModelName}
                                                            </p>
                                                        )}
                                                        <div className='mt-1 flex items-center gap-1.5'>
                                                            <span className='h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.14)]' />
                                                            <span className='text-muted-foreground text-[11px]'>
                                                                {t('chatbot.readyToHelp')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant='ghost'
                                                    size='icon'
                                                    className='h-9 w-9 shrink-0'
                                                    onClick={onClose}
                                                >
                                                    <X className='h-5 w-5' />
                                                    <span className='sr-only'>{t('chatbot.closeChat')}</span>
                                                </Button>
                                            </div>

                                            <div className='flex flex-1 overflow-hidden'>
                                                {showSidebar && (
                                                    <>
                                                        <div
                                                            className='fixed inset-0 z-40 bg-black/50 md:hidden'
                                                            onClick={() => setShowSidebar(false)}
                                                        />

                                                        <div className='border-border/70 bg-card fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col border-r shadow-xl md:relative md:z-0 md:w-64 md:shadow-none'>
                                                            <div className='border-border/70 flex items-center justify-between border-b px-3 py-3'>
                                                                <h3 className='text-sm font-semibold'>
                                                                    {t('chatbot.conversations')}
                                                                </h3>
                                                                <Button
                                                                    variant='ghost'
                                                                    size='icon'
                                                                    className='h-8 w-8 md:hidden'
                                                                    onClick={() => setShowSidebar(false)}
                                                                >
                                                                    <X className='h-4 w-4' />
                                                                </Button>
                                                            </div>

                                                            <div className='border-border/70 bg-muted/20 border-b px-3 py-2'>
                                                                <Button
                                                                    variant='default'
                                                                    size='sm'
                                                                    className='w-full'
                                                                    onClick={createNewConversation}
                                                                >
                                                                    <Plus className='mr-2 h-4 w-4' />
                                                                    {t('chatbot.newChat')}
                                                                </Button>
                                                            </div>

                                                            <div className='flex-1 overflow-y-auto px-2 py-2'>
                                                                {loadingConversations ? (
                                                                    <div className='flex flex-col items-center justify-center py-8'>
                                                                        <Loader2 className='text-muted-foreground mb-2 h-5 w-5 animate-spin' />
                                                                        <p className='text-muted-foreground text-sm'>
                                                                            {t('chatbot.loading')}
                                                                        </p>
                                                                    </div>
                                                                ) : conversations.length === 0 ? (
                                                                    <div className='flex flex-col items-center justify-center px-4 py-8'>
                                                                        <MessageSquare className='text-muted-foreground/40 mb-3 h-8 w-8' />
                                                                        <p className='text-foreground mb-1 text-sm font-medium'>
                                                                            {t('chatbot.noConversations')}
                                                                        </p>
                                                                        <p className='text-muted-foreground text-center text-xs'>
                                                                            {t('chatbot.noConversationsDescription')}
                                                                        </p>
                                                                    </div>
                                                                ) : (
                                                                    <div className='space-y-1'>
                                                                        {conversations.map((conv) => (
                                                                            <div
                                                                                key={conv.id}
                                                                                role='button'
                                                                                tabIndex={0}
                                                                                className={`group relative flex w-full cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                                                                                    currentConversationId === conv.id
                                                                                        ? 'border-primary/25 bg-primary/10 text-primary shadow-sm'
                                                                                        : 'text-foreground hover:border-border/70 hover:bg-muted/60 border-transparent'
                                                                                }`}
                                                                                onClick={() =>
                                                                                    loadConversation(conv.id)
                                                                                }
                                                                                onKeyDown={(e) =>
                                                                                    e.key === 'Enter' &&
                                                                                    loadConversation(conv.id)
                                                                                }
                                                                            >
                                                                                <MessageSquare className='h-4 w-4 shrink-0' />
                                                                                <div className='min-w-0 flex-1 text-left'>
                                                                                    <div className='truncate font-medium'>
                                                                                        {conv.title ||
                                                                                            t(
                                                                                                'chatbot.newConversation',
                                                                                            )}
                                                                                    </div>
                                                                                    <div className='text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs'>
                                                                                        <Clock className='h-3 w-3 shrink-0' />
                                                                                        <span className='truncate'>
                                                                                            {formatDate(
                                                                                                conv.updated_at,
                                                                                            )}
                                                                                        </span>
                                                                                        {conv.message_count &&
                                                                                            conv.message_count > 0 && (
                                                                                                <span className='bg-background text-muted-foreground ml-auto rounded-md px-1.5 py-0.5 text-[10px] font-medium shadow-sm'>
                                                                                                    {conv.message_count}
                                                                                                </span>
                                                                                            )}
                                                                                    </div>
                                                                                </div>
                                                                                <Button
                                                                                    variant='ghost'
                                                                                    size='icon'
                                                                                    className='hover:bg-destructive/10 hover:text-destructive h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100'
                                                                                    onClick={(e) =>
                                                                                        handleDeleteConversation(
                                                                                            conv.id,
                                                                                            e,
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <Trash2 className='h-3.5 w-3.5' />
                                                                                </Button>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}

                                                <div className='flex min-w-0 flex-1 flex-col'>
                                                    <div className='bg-muted/20 flex-1 space-y-4 overflow-y-auto px-4 py-4 dark:bg-transparent'>
                                                        {pendingActions.length > 0 && (
                                                            <div className='space-y-2'>
                                                                {pendingActions.map((action) => (
                                                                    <div
                                                                        key={action.id}
                                                                        className={`rounded-lg border px-3 py-2 text-sm shadow-sm ${
                                                                            action.type === 'pending'
                                                                                ? 'bg-primary/10 border-primary/30 text-primary'
                                                                                : action.type === 'success'
                                                                                  ? 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400'
                                                                                  : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
                                                                        }`}
                                                                    >
                                                                        <div className='flex items-center gap-2'>
                                                                            {action.type === 'pending' && (
                                                                                <Loader2 className='h-4 w-4 shrink-0 animate-spin' />
                                                                            )}
                                                                            {action.type === 'success' && (
                                                                                <div className='h-4 w-4 shrink-0'>
                                                                                    ✅
                                                                                </div>
                                                                            )}
                                                                            {action.type === 'error' && (
                                                                                <div className='h-4 w-4 shrink-0'>
                                                                                    ❌
                                                                                </div>
                                                                            )}
                                                                            <span className='font-medium'>
                                                                                {action.message}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {messages.length === 0 && !isLoading ? (
                                                            <div className='flex h-full flex-col items-center justify-center py-12'>
                                                                <div className='border-border/70 bg-card/80 max-w-md rounded-3xl border px-6 py-8 text-center shadow-sm'>
                                                                    <div className='bg-background ring-primary/15 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl p-3 shadow-sm ring-1'>
                                                                        <Image
                                                                            src={logoUrl}
                                                                            alt={
                                                                                settings?.app_name || t('chatbot.title')
                                                                            }
                                                                            width={40}
                                                                            height={40}
                                                                            className='h-10 w-10 object-contain'
                                                                            unoptimized
                                                                        />
                                                                    </div>
                                                                    <h3 className='text-foreground mb-2 text-lg font-semibold'>
                                                                        {t('chatbot.title')}
                                                                    </h3>
                                                                    <p className='text-muted-foreground text-sm'>
                                                                        {t('chatbot.description')}
                                                                    </p>
                                                                    <div className='border-border/70 bg-background/70 text-muted-foreground mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs'>
                                                                        <span className='h-1.5 w-1.5 rounded-full bg-emerald-500' />
                                                                        {t('chatbot.online')}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {messages.map((message) => (
                                                                    <div
                                                                        key={message.id}
                                                                        className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                                                                    >
                                                                        {message.role === 'assistant' ? (
                                                                            <div className='bg-background ring-primary/15 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl p-1.5 shadow-sm ring-1'>
                                                                                <Image
                                                                                    src={logoUrl}
                                                                                    alt={
                                                                                        settings?.app_name ||
                                                                                        t('chatbot.title')
                                                                                    }
                                                                                    width={24}
                                                                                    height={24}
                                                                                    className='h-6 w-6 object-contain'
                                                                                    unoptimized
                                                                                />
                                                                            </div>
                                                                        ) : (
                                                                            <UserAvatar
                                                                                avatar={user?.avatar}
                                                                                username={user?.username}
                                                                                firstName={user?.first_name}
                                                                                size='md'
                                                                            />
                                                                        )}

                                                                        <div className='max-w-[85%] min-w-0 flex-1 md:max-w-[75%]'>
                                                                            <div className='mb-1 flex items-center gap-2'>
                                                                                <span className='text-foreground text-xs font-medium'>
                                                                                    {message.role === 'assistant'
                                                                                        ? t('chatbot.assistant')
                                                                                        : user?.first_name ||
                                                                                          user?.username ||
                                                                                          t('chatbot.you')}
                                                                                </span>
                                                                            </div>
                                                                            <div
                                                                                className={`rounded-2xl px-4 py-2.5 shadow-sm ring-1 ${
                                                                                    message.role === 'user'
                                                                                        ? 'bg-primary text-primary-foreground shadow-primary/20 ring-primary/20'
                                                                                        : 'bg-card text-foreground ring-border/70 dark:bg-card/95'
                                                                                }`}
                                                                            >
                                                                                {message.content || message.isTyping ? (
                                                                                    <div
                                                                                        className={`prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 ${
                                                                                            message.role === 'user'
                                                                                                ? 'prose-p:text-primary-foreground prose-li:text-primary-foreground prose-strong:text-primary-foreground prose-a:text-primary-foreground prose-headings:text-primary-foreground'
                                                                                                : 'prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-a:text-primary prose-headings:text-foreground'
                                                                                        }`}
                                                                                    >
                                                                                        <ReactMarkdown
                                                                                            remarkPlugins={[remarkGfm]}
                                                                                            components={{
                                                                                                pre: ({ children }) => (
                                                                                                    <pre className='my-3 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-100 shadow-inner'>
                                                                                                        {children}
                                                                                                    </pre>
                                                                                                ),
                                                                                                code: ({
                                                                                                    className,
                                                                                                    children,
                                                                                                    ...props
                                                                                                }) => {
                                                                                                    const isBlock =
                                                                                                        className?.startsWith(
                                                                                                            'language-',
                                                                                                        );

                                                                                                    return (
                                                                                                        <code
                                                                                                            className={
                                                                                                                isBlock
                                                                                                                    ? `font-mono text-slate-100 ${className ?? ''}`
                                                                                                                    : `rounded-md px-1.5 py-0.5 font-mono text-[0.9em] ${
                                                                                                                          message.role ===
                                                                                                                          'user'
                                                                                                                              ? 'text-primary-foreground bg-white/15'
                                                                                                                              : 'bg-muted text-foreground'
                                                                                                                      }`
                                                                                                            }
                                                                                                            {...props}
                                                                                                        >
                                                                                                            {children}
                                                                                                        </code>
                                                                                                    );
                                                                                                },
                                                                                                table: ({
                                                                                                    children,
                                                                                                }) => (
                                                                                                    <div className='border-border/70 my-3 overflow-x-auto rounded-xl border'>
                                                                                                        <table className='w-full border-collapse text-sm'>
                                                                                                            {children}
                                                                                                        </table>
                                                                                                    </div>
                                                                                                ),
                                                                                                thead: ({
                                                                                                    children,
                                                                                                }) => (
                                                                                                    <thead className='bg-muted/70'>
                                                                                                        {children}
                                                                                                    </thead>
                                                                                                ),
                                                                                                tbody: ({
                                                                                                    children,
                                                                                                }) => (
                                                                                                    <tbody className='divide-border/70 divide-y'>
                                                                                                        {children}
                                                                                                    </tbody>
                                                                                                ),
                                                                                                th: ({ children }) => (
                                                                                                    <th className='text-foreground px-3 py-2 text-left font-semibold'>
                                                                                                        {children}
                                                                                                    </th>
                                                                                                ),
                                                                                                td: ({ children }) => (
                                                                                                    <td className='text-foreground px-3 py-2'>
                                                                                                        {children}
                                                                                                    </td>
                                                                                                ),
                                                                                            }}
                                                                                        >
                                                                                            {message.content}
                                                                                        </ReactMarkdown>
                                                                                        {message.isTyping && (
                                                                                            <span className='bg-primary ml-0.5 inline-block h-4 w-1 animate-pulse rounded-full align-[-2px]' />
                                                                                        )}
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className='space-y-3'>
                                                                                        <div className='flex items-center gap-2'>
                                                                                            <Loader2 className='h-4 w-4 animate-spin' />
                                                                                            <span className='text-sm'>
                                                                                                {message.status ||
                                                                                                    t(
                                                                                                        'chatbot.thinking',
                                                                                                    )}
                                                                                            </span>
                                                                                            <span className='flex gap-1'>
                                                                                                <span className='bg-muted-foreground/60 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.2s]' />
                                                                                                <span className='bg-muted-foreground/60 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.1s]' />
                                                                                                <span className='bg-muted-foreground/60 h-1.5 w-1.5 animate-bounce rounded-full' />
                                                                                            </span>
                                                                                        </div>
                                                                                        {(message.toolActivity
                                                                                            ?.length || 0) > 0 && (
                                                                                            <div className='space-y-2'>
                                                                                                {message.toolActivity?.map(
                                                                                                    (
                                                                                                        activity,
                                                                                                        index,
                                                                                                    ) => (
                                                                                                        <div
                                                                                                            key={`${activity.tool}-${activity.iteration}-${index}`}
                                                                                                            className='bg-muted/50 border-border/70 rounded-lg border px-3 py-2 text-xs'
                                                                                                        >
                                                                                                            <div className='flex items-center justify-between gap-2'>
                                                                                                                <span className='font-medium'>
                                                                                                                    {
                                                                                                                        activity.tool
                                                                                                                    }
                                                                                                                </span>
                                                                                                                <span
                                                                                                                    className={
                                                                                                                        activity.success ===
                                                                                                                        false
                                                                                                                            ? 'text-red-500'
                                                                                                                            : activity.success
                                                                                                                              ? 'text-green-600 dark:text-green-400'
                                                                                                                              : 'text-muted-foreground'
                                                                                                                    }
                                                                                                                >
                                                                                                                    {activity.success ===
                                                                                                                    false
                                                                                                                        ? t(
                                                                                                                              'chatbot.toolFailedShort',
                                                                                                                          )
                                                                                                                        : activity.success
                                                                                                                          ? t(
                                                                                                                                'chatbot.toolDone',
                                                                                                                            )
                                                                                                                          : t(
                                                                                                                                'chatbot.toolRunning',
                                                                                                                            )}
                                                                                                                </span>
                                                                                                            </div>
                                                                                                            {activity.summary && (
                                                                                                                <p className='text-muted-foreground mt-1 line-clamp-2'>
                                                                                                                    {
                                                                                                                        activity.summary
                                                                                                                    }
                                                                                                                </p>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    ),
                                                                                                )}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            {(message.toolActivity?.length || 0) > 0 &&
                                                                                message.content && (
                                                                                    <div className='border-border/70 bg-muted/20 mt-2 rounded-xl border text-xs'>
                                                                                        <button
                                                                                            type='button'
                                                                                            className='flex w-full items-center justify-between gap-2 px-3 py-2 text-left'
                                                                                            onClick={() =>
                                                                                                toggleActivityDetails(
                                                                                                    message.id,
                                                                                                )
                                                                                            }
                                                                                        >
                                                                                            <span className='text-foreground font-medium'>
                                                                                                {t('chatbot.moreInfo')}
                                                                                            </span>
                                                                                            <span className='text-muted-foreground'>
                                                                                                {expandedActivityMessages.includes(
                                                                                                    message.id,
                                                                                                )
                                                                                                    ? t(
                                                                                                          'chatbot.hideDetails',
                                                                                                      )
                                                                                                    : t(
                                                                                                          'chatbot.showDetails',
                                                                                                      )}
                                                                                            </span>
                                                                                        </button>
                                                                                        {expandedActivityMessages.includes(
                                                                                            message.id,
                                                                                        ) && (
                                                                                            <div className='border-border/70 border-t px-3 py-2'>
                                                                                                <div className='text-muted-foreground mb-2 text-[11px] font-semibold tracking-wide uppercase'>
                                                                                                    {t(
                                                                                                        'chatbot.toolsUsed',
                                                                                                    )}
                                                                                                </div>
                                                                                                <div className='space-y-1.5'>
                                                                                                    {message.toolActivity?.map(
                                                                                                        (
                                                                                                            activity,
                                                                                                            index,
                                                                                                        ) => (
                                                                                                            <div
                                                                                                                key={`${activity.tool}-${activity.iteration}-${index}`}
                                                                                                                className='bg-background/70 ring-border/60 rounded-lg px-3 py-2 ring-1'
                                                                                                            >
                                                                                                                <div className='flex items-center justify-between gap-2'>
                                                                                                                    <span className='text-foreground font-medium'>
                                                                                                                        {
                                                                                                                            activity.tool
                                                                                                                        }
                                                                                                                    </span>
                                                                                                                    <span
                                                                                                                        className={
                                                                                                                            activity.success ===
                                                                                                                            false
                                                                                                                                ? 'text-red-500'
                                                                                                                                : activity.success
                                                                                                                                  ? 'text-green-600 dark:text-green-400'
                                                                                                                                  : 'text-muted-foreground'
                                                                                                                        }
                                                                                                                    >
                                                                                                                        {activity.success ===
                                                                                                                        false
                                                                                                                            ? t(
                                                                                                                                  'chatbot.toolFailedShort',
                                                                                                                              )
                                                                                                                            : activity.success
                                                                                                                              ? t(
                                                                                                                                    'chatbot.toolDone',
                                                                                                                                )
                                                                                                                              : t(
                                                                                                                                    'chatbot.waitingForConfirmation',
                                                                                                                                )}
                                                                                                                    </span>
                                                                                                                </div>
                                                                                                                {activity.summary && (
                                                                                                                    <p className='text-muted-foreground mt-1 line-clamp-2'>
                                                                                                                        {
                                                                                                                            activity.summary
                                                                                                                        }
                                                                                                                    </p>
                                                                                                                )}
                                                                                                            </div>
                                                                                                        ),
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            {formatUsageLabel(
                                                                                message.usage,
                                                                                message.role,
                                                                            ) && (
                                                                                <div
                                                                                    className={`text-muted-foreground mt-1 flex flex-wrap items-center gap-1 text-[11px] ${
                                                                                        message.role === 'user'
                                                                                            ? 'justify-end'
                                                                                            : 'justify-start'
                                                                                    }`}
                                                                                >
                                                                                    <span
                                                                                        className='bg-muted/70 rounded-full px-2 py-0.5'
                                                                                        title={formatUsageTitle(
                                                                                            message.usage,
                                                                                            message.role,
                                                                                        )}
                                                                                    >
                                                                                        {formatUsageLabel(
                                                                                            message.usage,
                                                                                            message.role,
                                                                                        )}
                                                                                    </span>
                                                                                    {message.model &&
                                                                                        message.model !==
                                                                                            t('chatbot.title') && (
                                                                                            <span className='bg-muted/70 rounded-full px-2 py-0.5'>
                                                                                                {message.model}
                                                                                            </span>
                                                                                        )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </>
                                                        )}
                                                        <div ref={messagesEndRef} />
                                                    </div>

                                                    <div className='border-border/70 bg-card border-t p-4 shadow-[0_-8px_24px_-20px_rgba(0,0,0,0.35)]'>
                                                        {inputMessage.startsWith('/') && (
                                                            <div className='border-border/70 bg-popover/95 ring-primary/10 mx-auto mb-3 max-w-4xl overflow-hidden rounded-2xl border shadow-xl ring-1 backdrop-blur'>
                                                                <div className='border-border/70 bg-muted/40 flex items-center justify-between border-b px-3 py-2'>
                                                                    <span className='text-foreground text-xs font-semibold'>
                                                                        {t('chatbot.slashCommands')}
                                                                    </span>
                                                                    <span className='text-muted-foreground text-[11px]'>
                                                                        {t('chatbot.commandsHint')}
                                                                    </span>
                                                                </div>
                                                                <div className='max-h-56 overflow-y-auto p-1.5'>
                                                                    {commandSuggestions.length > 0 ? (
                                                                        commandSuggestions.map((command) => (
                                                                            <button
                                                                                key={command.command}
                                                                                type='button'
                                                                                className='hover:bg-muted/70 focus:bg-muted/70 flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus:outline-none'
                                                                                onMouseDown={(event) =>
                                                                                    event.preventDefault()
                                                                                }
                                                                                onClick={() =>
                                                                                    selectCommandSuggestion(
                                                                                        command.command,
                                                                                    )
                                                                                }
                                                                            >
                                                                                <span className='bg-primary/10 text-primary ring-primary/15 mt-0.5 rounded-lg px-2 py-1 font-mono text-xs font-semibold ring-1'>
                                                                                    {command.command}
                                                                                </span>
                                                                                <span className='min-w-0 flex-1'>
                                                                                    <span className='text-foreground block text-sm font-medium'>
                                                                                        {t(command.titleKey)}
                                                                                    </span>
                                                                                    <span className='text-muted-foreground block text-xs'>
                                                                                        {t(command.descriptionKey)}
                                                                                    </span>
                                                                                </span>
                                                                            </button>
                                                                        ))
                                                                    ) : (
                                                                        <div className='text-muted-foreground px-3 py-4 text-center text-sm'>
                                                                            {t('chatbot.commandNoMatches')}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className='mx-auto flex max-w-4xl items-end gap-2'>
                                                            <textarea
                                                                ref={textareaRef}
                                                                value={inputMessage}
                                                                onChange={(e) => setInputMessage(e.target.value)}
                                                                onKeyDown={handleKeyDown}
                                                                placeholder={`${t('chatbot.placeholder')} ${t('chatbot.commandsHint')}`}
                                                                disabled={isLoading}
                                                                rows={1}
                                                                className='border-border/70 bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-primary max-h-32 min-h-11 flex-1 resize-none overflow-y-hidden rounded-2xl border px-4 py-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50'
                                                                style={{
                                                                    height: 'auto',
                                                                    minHeight: '44px',
                                                                }}
                                                                onInput={(e) => {
                                                                    const target = e.target as HTMLTextAreaElement;
                                                                    target.style.height = 'auto';
                                                                    const nextHeight = Math.min(
                                                                        target.scrollHeight,
                                                                        128,
                                                                    );
                                                                    target.style.height = `${nextHeight}px`;
                                                                    target.style.overflowY =
                                                                        target.scrollHeight > 128 ? 'auto' : 'hidden';
                                                                }}
                                                            />

                                                            <Button
                                                                disabled={isLoading || !inputMessage.trim()}
                                                                size='icon'
                                                                className='h-11 w-11 shrink-0 rounded-full'
                                                                onClick={sendMessage}
                                                            >
                                                                {isLoading ? (
                                                                    <Loader2 className='h-5 w-5 animate-spin' />
                                                                ) : (
                                                                    <Send className='h-5 w-5' />
                                                                )}
                                                                <span className='sr-only'>
                                                                    {t('chatbot.sendMessage')}
                                                                </span>
                                                            </Button>
                                                        </div>
                                                        <p className='text-muted-foreground mt-2 text-center text-xs'>
                                                            {t('chatbot.pressEnterToSend')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Dialog.Panel>
                                </Transition.Child>
                            </div>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            <Transition appear show={confirmDialog.open} as={Fragment}>
                <Dialog
                    as='div'
                    className='relative z-50'
                    onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
                >
                    <Transition.Child
                        as={Fragment}
                        enter='ease-out duration-300'
                        enterFrom='opacity-0'
                        enterTo='opacity-100'
                        leave='ease-in duration-200'
                        leaveFrom='opacity-100'
                        leaveTo='opacity-0'
                    >
                        <div className='fixed inset-0 bg-black/25' />
                    </Transition.Child>

                    <div className='fixed inset-0 overflow-y-auto'>
                        <div className='flex min-h-full items-center justify-center p-4 text-center'>
                            <Transition.Child
                                as={Fragment}
                                enter='ease-out duration-300'
                                enterFrom='opacity-0 scale-95'
                                enterTo='opacity-100 scale-100'
                                leave='ease-in duration-200'
                                leaveFrom='opacity-100 scale-100'
                                leaveTo='opacity-0 scale-95'
                            >
                                <Dialog.Panel className='bg-background w-full max-w-md transform overflow-hidden rounded-2xl p-6 text-left align-middle shadow-xl transition-all'>
                                    <Dialog.Title as='div' className='mb-4 flex items-center gap-3'>
                                        <div
                                            className={`flex h-10 w-10 items-center justify-center rounded-lg ${confirmDialog.variant === 'destructive' ? 'bg-destructive/10' : 'bg-primary/10'}`}
                                        >
                                            {confirmDialog.variant === 'destructive' ? (
                                                <AlertTriangle className='text-destructive h-5 w-5' />
                                            ) : (
                                                <Bot className='text-primary h-5 w-5' />
                                            )}
                                        </div>
                                        <span className='text-foreground text-lg font-medium'>
                                            {confirmDialog.title}
                                        </span>
                                    </Dialog.Title>
                                    <Dialog.Description className='text-muted-foreground mb-6 text-sm whitespace-pre-line'>
                                        {confirmDialog.description}
                                    </Dialog.Description>

                                    <div className='flex justify-end gap-3'>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            disabled={confirmLoading}
                                            onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
                                        >
                                            {t('common.cancel')}
                                        </Button>
                                        <Button
                                            variant={confirmDialog.variant}
                                            size='sm'
                                            disabled={confirmLoading}
                                            onClick={handleConfirm}
                                        >
                                            {confirmLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                                            {confirmDialog.confirmText}
                                        </Button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </>
    );
}
