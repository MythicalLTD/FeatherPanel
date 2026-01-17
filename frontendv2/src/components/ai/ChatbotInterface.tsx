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

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Send, Loader2, X, Bot, MessageSquare, Clock, Trash2, Plus, AlertTriangle, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from '@/contexts/TranslationContext';
import {
    sendChatMessage,
    getConversations,
    getConversationMessages,
    deleteConversation,
    type Conversation,
    type PageContext,
} from '@/lib/api/chatbotService';
import {
    parseActionCommands,
    executeServerPowerAction,
    executeServerCommand,
    findServerUuidByName,
    findServerNameByUuid,
} from '@/lib/api/chatbotActions';
import { useServer } from '@/contexts/ServerContext';
import { useSession } from '@/contexts/SessionContext';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface PendingAction {
    id: string;
    message: string;
    type: 'pending' | 'success' | 'error';
}

interface ConfirmDialogState {
    title: string;
    description: string;
    confirmText: string;
    variant: 'default' | 'destructive';
    action: () => Promise<void>;
}

interface ChatbotInterfaceProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isDialog?: boolean;
}

export default function ChatbotInterface({ open, onOpenChange, isDialog = false }: ChatbotInterfaceProps) {
    const { t } = useTranslation();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
    const [loadingConversations, setLoadingConversations] = useState(false);
    const [showConversationsSidebar, setShowConversationsSidebar] = useState(false);
    const [chatModelName, setChatModelName] = useState('FeatherPanel AI');
    const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
        title: '',
        description: '',
        confirmText: '',
        variant: 'default',
        action: async () => {},
    });
    const [confirmLoading, setConfirmLoading] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const pathname = usePathname();
    const router = useRouter();
    const { server } = useServer();
    const { user } = useSession();

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (open) {
            loadConversationsList();
            if (!currentConversationId && messages.length === 0) {
                const userName = user?.first_name || user?.username || 'there';
                setMessages([
                    {
                        id: 'welcome',
                        role: 'assistant',
                        content: t('chatbot.welcome', { name: userName }),
                        timestamp: new Date(),
                    },
                ]);
            }
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 100);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const loadConversationsList = async () => {
        setLoadingConversations(true);
        try {
            const convs = await getConversations();
            setConversations(convs);
        } catch (error) {
            console.error('Failed to load conversations:', error);
            toast.error(t('chatbot.failedToLoadConversations'));
        } finally {
            setLoadingConversations(false);
        }
    };

    const createNewConversation = () => {
        setCurrentConversationId(null);
        const userName = user?.first_name || user?.username || 'there';
        setMessages([
            {
                id: 'welcome',
                role: 'assistant',
                content: t('chatbot.welcome', { name: userName }),
                timestamp: new Date(),
            },
        ]);
        setInputMessage('');
        setShowConversationsSidebar(false);
        setTimeout(() => {
            textareaRef.current?.focus();
        }, 100);
    };

    const loadConversation = async (conversationId: number) => {
        try {
            const data = await getConversationMessages(conversationId);
            setCurrentConversationId(conversationId);
            setMessages(
                data.messages.map((msg) => ({
                    id: `msg-${msg.id}`,
                    role: msg.role,
                    content: msg.content,
                    timestamp: new Date(msg.created_at),
                })),
            );
            if (data.messages.length > 0) {
                const lastMessage = data.messages[data.messages.length - 1];
                if (lastMessage?.model) {
                    setChatModelName(lastMessage.model || 'FeatherPanel AI');
                }
            }
            setShowConversationsSidebar(false);
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
            await deleteConversation(conversationId);
            if (currentConversationId === conversationId) {
                createNewConversation();
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
        const actionId = `action-${Date.now()}-${Math.random()}`;

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
        setConfirmDialog({ title, description, confirmText, variant, action });
        setShowConfirmDialog(true);
    };

    const handleConfirm = async () => {
        setConfirmLoading(true);
        try {
            await confirmDialog.action();
        } finally {
            setConfirmLoading(false);
            setShowConfirmDialog(false);
        }
    };

    const executeAIActions = async (responseText: string) => {
        const commands = parseActionCommands(responseText);

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
                            command.action.charAt(0).toUpperCase() + command.action.slice(1),
                            'destructive',
                            async () => {
                                try {
                                    const result = await executeServerPowerAction(command.action!, serverUuid!);
                                    if (result.success) {
                                        showActionNotification(
                                            `Server ${serverName || serverUuid} ${command.action}ed successfully`,
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
                            showActionNotification('Failed to execute action', 'error');
                        }
                    }
                } else {
                    showActionNotification(
                        `Could not find server: ${command.serverName || command.serverUuid || 'unknown'}`,
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
                        `Could not find server: ${command.serverName || command.serverUuid || 'unknown'}`,
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

    const sendMessage = async () => {
        const messageText = inputMessage.trim();
        if (!messageText || isLoading) return;

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: messageText,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setInputMessage('');
        scrollToBottom();

        setTimeout(() => {
            textareaRef.current?.focus();
        }, 100);

        setIsLoading(true);
        const loadingMessage: Message = {
            id: `loading-${Date.now()}`,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, loadingMessage]);
        scrollToBottom();

        try {
            const pageContext: PageContext = {
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

            const result = await sendChatMessage(
                messageText,
                messages.slice(0, -1),
                pageContext,
                currentConversationId || undefined,
            );

            if (result.model) {
                setChatModelName(result.model);
            }

            if (result.conversationId && !currentConversationId) {
                setCurrentConversationId(result.conversationId);
                await loadConversationsList();
            }

            if (result.toolExecutions && result.toolExecutions.length > 0) {
                for (const toolExec of result.toolExecutions) {
                    if (toolExec.success) {
                        showActionNotification(
                            toolExec.message || `Action '${toolExec.action_type}' completed successfully`,
                            'success',
                        );
                    } else {
                        showActionNotification(toolExec.error || `Action '${toolExec.action_type}' failed`, 'error');
                    }
                }
            }

            setMessages((prev) => prev.filter((m) => m.id !== loadingMessage.id));

            const isErrorResponse =
                result.model?.includes('(Error)') || result.response.toLowerCase().startsWith('error');

            if (isErrorResponse) {
                toast.error(t('chatbot.connectionError'));
                console.error('AI service error:', result.response);
                setMessages((prev) => [
                    ...prev,
                    {
                        id: `error-${Date.now()}`,
                        role: 'assistant',
                        content: t('chatbot.connectionError'),
                        timestamp: new Date(),
                    },
                ]);
                return;
            }

            const cleanedResponse = result.response
                .replace(/ACTION:\s*[^\n]+/gi, '')
                .replace(/\n\n+/g, '\n\n')
                .trim();
            const hasActions = /ACTION:\s*[^\n]+/gi.test(result.response);
            const messageContent =
                cleanedResponse ||
                (hasActions
                    ? t('chatbot.executingAction')
                    : t('chatbot.welcome', { name: user?.first_name || 'there' }));

            setMessages((prev) => [
                ...prev,
                {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: messageContent,
                    timestamp: new Date(),
                },
            ]);
            scrollToBottom();

            await executeAIActions(result.response);
        } catch (error) {
            setMessages((prev) => prev.filter((m) => m.id !== loadingMessage.id));
            toast.error(t('chatbot.connectionError'));
            console.error('Chat error:', error);
            setMessages((prev) => [
                ...prev,
                {
                    id: `error-${Date.now()}`,
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

    // User avatar component
    const UserAvatar = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
        const sizeClasses = {
            sm: 'h-8 w-8 text-xs',
            md: 'h-10 w-10 text-sm',
            lg: 'h-12 w-12 text-base',
        };

        if (user?.avatar) {
            return (
                <Image
                    src={user.avatar}
                    alt={user.username}
                    width={size === 'sm' ? 32 : size === 'md' ? 40 : 48}
                    height={size === 'sm' ? 32 : size === 'md' ? 40 : 48}
                    className={`${sizeClasses[size]} rounded-full object-cover`}
                />
            );
        }

        return (
            <div
                className={`${sizeClasses[size]} rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold`}
            >
                {user?.first_name?.charAt(0) || user?.username?.charAt(0)}
            </div>
        );
    };

    const content = (
        <div className='flex h-full flex-col md:flex-row'>
            {/* Conversations Sidebar - Mobile Overlay / Desktop Sidebar */}
            {showConversationsSidebar && (
                <>
                    {/* Mobile backdrop */}
                    <div
                        className='fixed inset-0 bg-black/50 z-40 md:hidden'
                        onClick={() => setShowConversationsSidebar(false)}
                    />
                    {/* Sidebar */}
                    <div className='fixed md:relative inset-y-0 left-0 z-50 w-72 md:w-64 border-r border-border bg-background flex flex-col shrink-0 md:z-0'>
                        <div className='px-3 py-3 border-b border-border flex items-center justify-between'>
                            <h3 className='font-semibold text-sm'>{t('chatbot.conversations')}</h3>
                            <Button
                                variant='ghost'
                                size='icon'
                                className='h-8 w-8 md:hidden'
                                onClick={() => setShowConversationsSidebar(false)}
                            >
                                <X className='h-4 w-4' />
                            </Button>
                        </div>

                        <div className='px-3 py-2 border-b border-border'>
                            <Button variant='default' size='sm' className='w-full' onClick={createNewConversation}>
                                <Plus className='h-4 w-4 mr-2' />
                                {t('chatbot.newChat')}
                            </Button>
                        </div>

                        <div className='flex-1 overflow-y-auto px-2 py-2'>
                            {loadingConversations ? (
                                <div className='flex flex-col items-center justify-center py-8'>
                                    <Loader2 className='h-5 w-5 animate-spin text-muted-foreground mb-2' />
                                    <p className='text-sm text-muted-foreground'>{t('chatbot.loading')}</p>
                                </div>
                            ) : conversations.length === 0 ? (
                                <div className='flex flex-col items-center justify-center py-8 px-4'>
                                    <MessageSquare className='h-8 w-8 text-muted-foreground/40 mb-3' />
                                    <p className='text-sm font-medium text-foreground mb-1'>
                                        {t('chatbot.noConversations')}
                                    </p>
                                    <p className='text-xs text-muted-foreground text-center'>
                                        {t('chatbot.noConversationsDescription')}
                                    </p>
                                </div>
                            ) : (
                                <div className='space-y-1'>
                                    {conversations.map((conv) => (
                                        <button
                                            key={conv.id}
                                            className={`group relative w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                                                currentConversationId === conv.id
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'hover:bg-muted text-foreground'
                                            }`}
                                            onClick={() => loadConversation(conv.id)}
                                        >
                                            <MessageSquare className='h-4 w-4 shrink-0' />
                                            <div className='flex-1 min-w-0 text-left'>
                                                <div className='font-medium truncate'>
                                                    {conv.title || t('chatbot.newConversation')}
                                                </div>
                                                <div className='flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground'>
                                                    <Clock className='h-3 w-3 shrink-0' />
                                                    <span className='truncate'>{formatDate(conv.updated_at)}</span>
                                                    {conv.message_count && conv.message_count > 0 && (
                                                        <span className='ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted'>
                                                            {conv.message_count}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <Button
                                                variant='ghost'
                                                size='icon'
                                                className='h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:bg-destructive/10 hover:text-destructive'
                                                onClick={(e) => handleDeleteConversation(conv.id, e)}
                                            >
                                                <Trash2 className='h-3.5 w-3.5' />
                                            </Button>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Main Chat Area */}
            <div className='flex-1 flex flex-col min-w-0'>
                {/* Header */}
                <div className='px-4 py-3 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 flex items-center justify-between sticky top-0 z-10'>
                    <div className='flex items-center gap-3 min-w-0 flex-1'>
                        <Button
                            variant='ghost'
                            size='icon'
                            className='h-9 w-9 shrink-0'
                            onClick={() => setShowConversationsSidebar(!showConversationsSidebar)}
                        >
                            <Menu className='h-5 w-5' />
                        </Button>
                        <div className='h-9 w-9 rounded-full bg-linear-to-br from-primary to-primary/60 flex items-center justify-center shrink-0'>
                            <Bot className='h-5 w-5 text-primary-foreground' />
                        </div>
                        <div className='min-w-0 flex-1'>
                            <h2 className='text-sm font-semibold text-foreground'>{t('chatbot.title')}</h2>
                            <p className='text-xs text-muted-foreground truncate'>{chatModelName}</p>
                        </div>
                    </div>
                    {!isDialog && (
                        <Button
                            variant='ghost'
                            size='icon'
                            className='h-9 w-9 shrink-0'
                            onClick={() => onOpenChange(false)}
                        >
                            <X className='h-5 w-5' />
                        </Button>
                    )}
                </div>

                {/* Messages Container */}
                <div className='flex-1 overflow-y-auto px-4 py-4 space-y-4'>
                    {/* Action Notifications */}
                    {pendingActions.length > 0 && (
                        <div className='space-y-2'>
                            {pendingActions.map((action) => (
                                <div
                                    key={action.id}
                                    className={`rounded-lg border px-3 py-2 text-sm shadow-sm ${
                                        action.type === 'pending'
                                            ? 'bg-primary/10 border-primary/30 text-primary'
                                            : action.type === 'success'
                                              ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400'
                                              : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                                    }`}
                                >
                                    <div className='flex items-center gap-2'>
                                        {action.type === 'pending' && (
                                            <Loader2 className='h-4 w-4 animate-spin shrink-0' />
                                        )}
                                        {action.type === 'success' && <div className='h-4 w-4 shrink-0'>✅</div>}
                                        {action.type === 'error' && <div className='h-4 w-4 shrink-0'>❌</div>}
                                        <span className='font-medium'>{action.message}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Messages */}
                    {messages.length === 0 && !isLoading ? (
                        <div className='flex flex-col items-center justify-center h-full py-12'>
                            <div className='text-center max-w-md px-4'>
                                <div className='h-16 w-16 rounded-full bg-linear-to-br from-primary to-primary/60 flex items-center justify-center mx-auto mb-4'>
                                    <Bot className='h-8 w-8 text-primary-foreground' />
                                </div>
                                <h3 className='text-lg font-semibold text-foreground mb-2'>{t('chatbot.title')}</h3>
                                <p className='text-sm text-muted-foreground'>{t('chatbot.description')}</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                                >
                                    {/* Avatar */}
                                    {message.role === 'assistant' ? (
                                        <div className='h-8 w-8 md:h-10 md:w-10 rounded-full bg-linear-to-br from-primary to-primary/60 flex items-center justify-center shrink-0'>
                                            <Bot className='h-4 w-4 md:h-5 md:w-5 text-primary-foreground' />
                                        </div>
                                    ) : (
                                        <UserAvatar size='md' />
                                    )}

                                    {/* Message Bubble */}
                                    <div className='flex-1 min-w-0 max-w-[85%] md:max-w-[75%]'>
                                        <div className='flex items-center gap-2 mb-1'>
                                            <span className='text-xs font-medium text-foreground'>
                                                {message.role === 'assistant'
                                                    ? t('chatbot.title')
                                                    : user?.first_name || user?.username || 'You'}
                                            </span>
                                        </div>
                                        <div
                                            className={`rounded-2xl px-4 py-2.5 ${
                                                message.role === 'user'
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted text-foreground'
                                            }`}
                                        >
                                            {message.content ? (
                                                <div className='text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0'>
                                                    <ReactMarkdown>{message.content}</ReactMarkdown>
                                                </div>
                                            ) : (
                                                <div className='flex items-center gap-2'>
                                                    <Loader2 className='h-4 w-4 animate-spin' />
                                                    <span className='text-sm'>{t('chatbot.thinking')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Container */}
                <div className='border-t border-border bg-background p-4 sticky bottom-0'>
                    <div className='flex gap-2 items-end max-w-4xl mx-auto'>
                        <textarea
                            ref={textareaRef}
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={t('chatbot.placeholder')}
                            disabled={isLoading}
                            rows={1}
                            className='flex-1 min-h-[44px] max-h-32 resize-none rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50'
                            style={{
                                height: 'auto',
                                minHeight: '44px',
                            }}
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                            }}
                        />

                        <Button
                            disabled={isLoading || !inputMessage.trim()}
                            size='icon'
                            className='h-11 w-11 rounded-full shrink-0'
                            onClick={sendMessage}
                        >
                            {isLoading ? <Loader2 className='h-5 w-5 animate-spin' /> : <Send className='h-5 w-5' />}
                        </Button>
                    </div>
                    <p className='text-xs text-muted-foreground text-center mt-2'>{t('chatbot.pressEnterToSend')}</p>
                </div>
            </div>
        </div>
    );

    if (isDialog) {
        return (
            <>
                {content}
                <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                    <DialogContent className='sm:max-w-md'>
                        <DialogHeader>
                            <DialogTitle className='flex items-center gap-2'>
                                <div
                                    className={`h-10 w-10 rounded-lg flex items-center justify-center ${confirmDialog.variant === 'destructive' ? 'bg-destructive/10' : 'bg-primary/10'}`}
                                >
                                    {confirmDialog.variant === 'destructive' ? (
                                        <AlertTriangle className='h-5 w-5 text-destructive' />
                                    ) : (
                                        <Bot className='h-5 w-5 text-primary' />
                                    )}
                                </div>
                                <span>{confirmDialog.title}</span>
                            </DialogTitle>
                            <DialogDescription className='text-sm whitespace-pre-line'>
                                {confirmDialog.description}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className='gap-2'>
                            <Button
                                variant='outline'
                                size='sm'
                                disabled={confirmLoading}
                                onClick={() => setShowConfirmDialog(false)}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button
                                variant={confirmDialog.variant}
                                size='sm'
                                disabled={confirmLoading}
                                onClick={handleConfirm}
                            >
                                {confirmLoading && <Loader2 className='h-4 w-4 mr-2 animate-spin' />}
                                {confirmDialog.confirmText}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
        );
    }

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent
                    side='right'
                    className='w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl flex flex-col p-0 bg-background border-l border-border [&>button]:hidden'
                >
                    {content}
                </SheetContent>
            </Sheet>

            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent className='sm:max-w-md'>
                    <DialogHeader>
                        <DialogTitle className='flex items-center gap-2'>
                            <div
                                className={`h-10 w-10 rounded-lg flex items-center justify-center ${confirmDialog.variant === 'destructive' ? 'bg-destructive/10' : 'bg-primary/10'}`}
                            >
                                {confirmDialog.variant === 'destructive' ? (
                                    <AlertTriangle className='h-5 w-5 text-destructive' />
                                ) : (
                                    <Bot className='h-5 w-5 text-primary' />
                                )}
                            </div>
                            <span>{confirmDialog.title}</span>
                        </DialogTitle>
                        <DialogDescription className='text-sm whitespace-pre-line'>
                            {confirmDialog.description}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className='gap-2'>
                        <Button
                            variant='outline'
                            size='sm'
                            disabled={confirmLoading}
                            onClick={() => setShowConfirmDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant={confirmDialog.variant}
                            size='sm'
                            disabled={confirmLoading}
                            onClick={handleConfirm}
                        >
                            {confirmLoading && <Loader2 className='h-4 w-4 mr-2 animate-spin' />}
                            {confirmDialog.confirmText}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
