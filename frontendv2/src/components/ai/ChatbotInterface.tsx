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

import { memo, useState, useEffect, useRef, useContext } from 'react';
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
import remarkGfm from 'remark-gfm';
import { useTranslation } from '@/contexts/TranslationContext';
import {
    sendChatMessage,
    sendVdsChatMessage,
    getConversations,
    getConversationMessages,
    deleteConversation,
    getVdsConversations,
    getVdsConversationMessages,
    deleteVdsConversation,
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
import { ServerContext } from '@/contexts/ServerContext';
import { useSession } from '@/contexts/SessionContext';
import { type VmInstance } from '@/contexts/VmInstanceContext';

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
    mode?: 'server' | 'vds' | 'dashboard';
    vdsInstance?: VmInstance | null;
}

interface UserAvatarProps {
    avatar?: string | null;
    username?: string | null;
    firstName?: string | null;
    size?: 'sm' | 'md' | 'lg';
}

const UserAvatar = memo(function UserAvatar({ avatar, username, firstName, size = 'md' }: UserAvatarProps) {
    const sizeClasses = {
        sm: 'h-8 w-8 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base',
    };

    if (avatar) {
        return (
            <Image
                src={avatar}
                alt={username || 'User'}
                width={size === 'sm' ? 32 : size === 'md' ? 40 : 48}
                height={size === 'sm' ? 32 : size === 'md' ? 40 : 48}
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

export default function ChatbotInterface({
    open,
    onOpenChange,
    isDialog = false,
    mode = 'server',
    vdsInstance,
}: ChatbotInterfaceProps) {
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
    const serverCtx = useContext(ServerContext);
    const server = serverCtx?.server ?? null;
    const { user } = useSession();
    const lastConversationStorageKey = `featherpanel_chatbot_last_conversation_${mode}`;

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    useEffect(() => {
        scrollToBottom();
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
        setShowConversationsSidebar(false);
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

            const result =
                mode === 'vds'
                    ? await sendVdsChatMessage(
                          messageText,
                          messages.slice(0, -1),
                          pageContext,
                          currentConversationId || undefined,
                      )
                    : await sendChatMessage(
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
                if (typeof window !== 'undefined') {
                    window.localStorage.setItem(lastConversationStorageKey, String(result.conversationId));
                }
                await loadConversationsList();
            }

            if (result.toolExecutions && result.toolExecutions.length > 0) {
                for (const toolExec of result.toolExecutions) {
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

    const content = (
        <div className='flex h-full flex-col md:flex-row'>
            {showConversationsSidebar && (
                <>
                    <div
                        className='fixed inset-0 z-40 bg-black/50 md:hidden'
                        onClick={() => setShowConversationsSidebar(false)}
                    />

                    <div className='border-border/70 bg-card fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col border-r shadow-xl md:relative md:z-0 md:w-64 md:shadow-none'>
                        <div className='border-border/70 flex items-center justify-between border-b px-3 py-3'>
                            <h3 className='text-sm font-semibold'>{t('chatbot.conversations')}</h3>
                            <Button
                                variant='ghost'
                                size='icon'
                                className='h-8 w-8 md:hidden'
                                onClick={() => setShowConversationsSidebar(false)}
                            >
                                <X className='h-4 w-4' />
                            </Button>
                        </div>

                        <div className='border-border/70 bg-muted/20 border-b px-3 py-2'>
                            <Button variant='default' size='sm' className='w-full' onClick={createNewConversation}>
                                <Plus className='mr-2 h-4 w-4' />
                                {t('chatbot.newChat')}
                            </Button>
                        </div>

                        <div className='flex-1 overflow-y-auto px-2 py-2'>
                            {loadingConversations ? (
                                <div className='flex flex-col items-center justify-center py-8'>
                                    <Loader2 className='text-muted-foreground mb-2 h-5 w-5 animate-spin' />
                                    <p className='text-muted-foreground text-sm'>{t('chatbot.loading')}</p>
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
                                            onClick={() => loadConversation(conv.id)}
                                            onKeyDown={(e) => e.key === 'Enter' && loadConversation(conv.id)}
                                        >
                                            <MessageSquare className='h-4 w-4 shrink-0' />
                                            <div className='min-w-0 flex-1 text-left'>
                                                <div className='truncate font-medium'>
                                                    {conv.title || t('chatbot.newConversation')}
                                                </div>
                                                <div className='text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs'>
                                                    <Clock className='h-3 w-3 shrink-0' />
                                                    <span className='truncate'>{formatDate(conv.updated_at)}</span>
                                                    {conv.message_count && conv.message_count > 0 && (
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
                                                onClick={(e) => handleDeleteConversation(conv.id, e)}
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
                <div className='border-border/70 bg-card/95 supports-backdrop-filter:bg-card/85 sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3 shadow-sm backdrop-blur'>
                    <div className='flex min-w-0 flex-1 items-center gap-3'>
                        <Button
                            variant='ghost'
                            size='icon'
                            className='h-9 w-9 shrink-0'
                            onClick={() => setShowConversationsSidebar(!showConversationsSidebar)}
                        >
                            <Menu className='h-5 w-5' />
                        </Button>
                        <div className='from-primary to-primary/60 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br'>
                            <Bot className='text-primary-foreground h-5 w-5' />
                        </div>
                        <div className='min-w-0 flex-1'>
                            <h2 className='text-foreground text-sm font-semibold'>{t('chatbot.title')}</h2>
                            <p className='text-muted-foreground truncate text-xs'>{chatModelName}</p>
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
                                        {action.type === 'success' && <div className='h-4 w-4 shrink-0'>✅</div>}
                                        {action.type === 'error' && <div className='h-4 w-4 shrink-0'>❌</div>}
                                        <span className='font-medium'>{action.message}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {messages.length === 0 && !isLoading ? (
                        <div className='flex h-full flex-col items-center justify-center py-12'>
                            <div className='max-w-md px-4 text-center'>
                                <div className='from-primary to-primary/60 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br'>
                                    <Bot className='text-primary-foreground h-8 w-8' />
                                </div>
                                <h3 className='text-foreground mb-2 text-lg font-semibold'>{t('chatbot.title')}</h3>
                                <p className='text-muted-foreground text-sm'>{t('chatbot.description')}</p>
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
                                        <div className='from-primary to-primary/60 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br md:h-10 md:w-10'>
                                            <Bot className='text-primary-foreground h-4 w-4 md:h-5 md:w-5' />
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
                                                    ? t('chatbot.title')
                                                    : user?.first_name || user?.username || t('chatbot.you')}
                                            </span>
                                        </div>
                                        <div
                                            className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                                                message.role === 'user'
                                                    ? 'bg-primary text-primary-foreground shadow-primary/20'
                                                    : 'border-border/70 bg-card text-foreground border'
                                            }`}
                                        >
                                            {message.content ? (
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
                                                            code: ({ className, children, ...props }) => {
                                                                const isBlock = className?.startsWith('language-');

                                                                return (
                                                                    <code
                                                                        className={
                                                                            isBlock
                                                                                ? `font-mono text-slate-100 ${className ?? ''}`
                                                                                : `rounded-md px-1.5 py-0.5 font-mono text-[0.9em] ${
                                                                                      message.role === 'user'
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
                                                            table: ({ children }) => (
                                                                <div className='border-border/70 my-3 overflow-x-auto rounded-xl border'>
                                                                    <table className='w-full border-collapse text-sm'>
                                                                        {children}
                                                                    </table>
                                                                </div>
                                                            ),
                                                            thead: ({ children }) => (
                                                                <thead className='bg-muted/70'>{children}</thead>
                                                            ),
                                                            tbody: ({ children }) => (
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

                <div className='border-border/70 bg-card sticky bottom-0 border-t p-4 shadow-[0_-8px_24px_-20px_rgba(0,0,0,0.35)]'>
                    <div className='mx-auto flex max-w-4xl items-end gap-2'>
                        <textarea
                            ref={textareaRef}
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={t('chatbot.placeholder')}
                            disabled={isLoading}
                            rows={1}
                            className='border-border/70 bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-primary max-h-11 max-h-32 flex-1 resize-none rounded-2xl border px-4 py-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50'
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
                            className='h-11 w-11 shrink-0 rounded-full'
                            onClick={sendMessage}
                        >
                            {isLoading ? <Loader2 className='h-5 w-5 animate-spin' /> : <Send className='h-5 w-5' />}
                        </Button>
                    </div>
                    <p className='text-muted-foreground mt-2 text-center text-xs'>{t('chatbot.pressEnterToSend')}</p>
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
                                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${confirmDialog.variant === 'destructive' ? 'bg-destructive/10' : 'bg-primary/10'}`}
                                >
                                    {confirmDialog.variant === 'destructive' ? (
                                        <AlertTriangle className='text-destructive h-5 w-5' />
                                    ) : (
                                        <Bot className='text-primary h-5 w-5' />
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
                                {confirmLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
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
                    className='bg-background border-border flex w-full flex-col border-l p-0 sm:max-w-2xl md:max-w-3xl lg:max-w-4xl [&>button]:hidden'
                >
                    {content}
                </SheetContent>
            </Sheet>

            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent className='sm:max-w-md'>
                    <DialogHeader>
                        <DialogTitle className='flex items-center gap-2'>
                            <div
                                className={`flex h-10 w-10 items-center justify-center rounded-lg ${confirmDialog.variant === 'destructive' ? 'bg-destructive/10' : 'bg-primary/10'}`}
                            >
                                {confirmDialog.variant === 'destructive' ? (
                                    <AlertTriangle className='text-destructive h-5 w-5' />
                                ) : (
                                    <Bot className='text-primary h-5 w-5' />
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
                            {confirmLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                            {confirmDialog.confirmText}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
