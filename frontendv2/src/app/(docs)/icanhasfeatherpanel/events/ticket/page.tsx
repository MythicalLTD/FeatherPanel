// @ts-nocheck
'use client';

import Link from 'next/link';
import { ArrowLeft, Zap, Code } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const categoryData = {
    name: 'Ticket',
    events: [
        {
            method: 'onTicketAttachmentCreated',
            name: 'featherpanel:ticket:attachment:created',
            callback: 'array ticket data, array attachment data, int attachment id, string user uuid.',
            category: 'Ticket',
            actualData: ['attachment', 'attachment_id', 'ticket', 'user_uuid'],
            sourceFiles: ['backend/app/Controllers/Admin/TicketAttachmentsController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\TicketEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(TicketEvent::onTicketAttachmentCreated(), function ($attachment, $attachmentId, $ticket, $userUuid) {\n        // Handle featherpanel:ticket:attachment:created\n        // Data keys: attachment, attachment_id, ticket, user_uuid\n    });\n}',
        },
        {
            method: 'onTicketAttachmentDeleted',
            name: 'featherpanel:ticket:attachment:deleted',
            callback: 'array ticket data, int attachment id, string user uuid.',
            category: 'Ticket',
            actualData: ['attachment_id', 'ticket', 'user_uuid'],
            sourceFiles: ['backend/app/Controllers/Admin/TicketAttachmentsController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\TicketEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(TicketEvent::onTicketAttachmentDeleted(), function ($attachmentId, $ticket, $userUuid) {\n        // Handle featherpanel:ticket:attachment:deleted\n        // Data keys: attachment_id, ticket, user_uuid\n    });\n}',
        },
        {
            method: 'onTicketAttachmentUpdated',
            name: 'featherpanel:ticket:attachment:updated',
            callback:
                'array ticket data, array attachment data, array updated data, int attachment id, string user uuid.',
            category: 'Ticket',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\TicketEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(TicketEvent::onTicketAttachmentUpdated(), function ($data, $data, $data, $id, $uuid) {\n        // Handle featherpanel:ticket:attachment:updated\n        // Parameters: array ticket data, array attachment data, array updated data, int attachment id, string user uuid.\n    });\n}',
        },
        {
            method: 'onTicketCategoryCreated',
            name: 'featherpanel:ticket:category:created',
            callback: 'array category data, int category id, string user uuid.',
            category: 'Ticket',
            actualData: ['category', 'category_id', 'user_uuid'],
            sourceFiles: ['backend/app/Controllers/Admin/TicketCategoriesController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\TicketEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(TicketEvent::onTicketCategoryCreated(), function ($category, $categoryId, $userUuid) {\n        // Handle featherpanel:ticket:category:created\n        // Data keys: category, category_id, user_uuid\n    });\n}',
        },
        {
            method: 'onTicketCategoryDeleted',
            name: 'featherpanel:ticket:category:deleted',
            callback: 'array category data, int category id, string user uuid.',
            category: 'Ticket',
            actualData: ['category', 'category_id', 'user_uuid'],
            sourceFiles: ['backend/app/Controllers/Admin/TicketCategoriesController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\TicketEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(TicketEvent::onTicketCategoryDeleted(), function ($category, $categoryId, $userUuid) {\n        // Handle featherpanel:ticket:category:deleted\n        // Data keys: category, category_id, user_uuid\n    });\n}',
        },
        {
            method: 'onTicketCategoryUpdated',
            name: 'featherpanel:ticket:category:updated',
            callback: 'array category data, array updated data, int category id, string user uuid.',
            category: 'Ticket',
            actualData: ['category', 'category_id', 'updated_data', 'user_uuid'],
            sourceFiles: ['backend/app/Controllers/Admin/TicketCategoriesController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\TicketEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(TicketEvent::onTicketCategoryUpdated(), function ($category, $categoryId, $updatedData, $userUuid) {\n        // Handle featherpanel:ticket:category:updated\n        // Data keys: category, category_id, updated_data, user_uuid\n    });\n}',
        },
        {
            method: 'onTicketClosed',
            name: 'featherpanel:ticket:closed',
            callback: 'array ticket data, string user uuid.',
            category: 'Ticket',
            actualData: ['ticket', 'user_uuid'],
            sourceFiles: ['backend/app/Controllers/Admin/TicketsController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\TicketEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(TicketEvent::onTicketClosed(), function ($ticket, $userUuid) {\n        // Handle featherpanel:ticket:closed\n        // Data keys: ticket, user_uuid\n    });\n}',
        },
        {
            method: 'onTicketCreated',
            name: 'featherpanel:ticket:created',
            callback: 'array ticket data, int ticket id, string user uuid.',
            category: 'Ticket',
            actualData: ['ticket', 'ticket_id', 'user_uuid'],
            sourceFiles: [
                'backend/app/Controllers/Admin/TicketsController.php',
                'backend/app/Controllers/User/TicketsController.php',
            ],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\TicketEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(TicketEvent::onTicketCreated(), function ($ticket, $ticketId, $userUuid) {\n        // Handle featherpanel:ticket:created\n        // Data keys: ticket, ticket_id, user_uuid\n    });\n}',
        },
        {
            method: 'onTicketDeleted',
            name: 'featherpanel:ticket:deleted',
            callback: 'array ticket data, string user uuid.',
            category: 'Ticket',
            actualData: ['ticket', 'user_uuid'],
            sourceFiles: [
                'backend/app/Controllers/Admin/TicketsController.php',
                'backend/app/Controllers/User/TicketsController.php',
            ],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\TicketEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(TicketEvent::onTicketDeleted(), function ($ticket, $userUuid) {\n        // Handle featherpanel:ticket:deleted\n        // Data keys: ticket, user_uuid\n    });\n}',
        },
        {
            method: 'onTicketMessageCreated',
            name: 'featherpanel:ticket:message:created',
            callback: 'array ticket data, array message data, int message id, string user uuid.',
            category: 'Ticket',
            actualData: ['message', 'message_id', 'ticket', 'user_uuid'],
            sourceFiles: [
                'backend/app/Controllers/Admin/TicketMessagesController.php',
                'backend/app/Controllers/Admin/TicketsController.php',
                'backend/app/Controllers/User/TicketsController.php',
            ],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\TicketEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(TicketEvent::onTicketMessageCreated(), function ($message, $messageId, $ticket, $userUuid) {\n        // Handle featherpanel:ticket:message:created\n        // Data keys: message, message_id, ticket, user_uuid\n    });\n}',
        },
        {
            method: 'onTicketMessageDeleted',
            name: 'featherpanel:ticket:message:deleted',
            callback: 'array ticket data, int message id, string user uuid.',
            category: 'Ticket',
            actualData: ['message_id', 'ticket', 'user_uuid'],
            sourceFiles: [
                'backend/app/Controllers/Admin/TicketMessagesController.php',
                'backend/app/Controllers/User/TicketsController.php',
            ],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\TicketEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(TicketEvent::onTicketMessageDeleted(), function ($messageId, $ticket, $userUuid) {\n        // Handle featherpanel:ticket:message:deleted\n        // Data keys: message_id, ticket, user_uuid\n    });\n}',
        },
        {
            method: 'onTicketMessageUpdated',
            name: 'featherpanel:ticket:message:updated',
            callback: 'array ticket data, array message data, array updated data, int message id, string user uuid.',
            category: 'Ticket',
            actualData: ['message', 'message_id', 'ticket', 'updated_data', 'user_uuid'],
            sourceFiles: ['backend/app/Controllers/Admin/TicketMessagesController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\TicketEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(TicketEvent::onTicketMessageUpdated(), function ($message, $messageId, $ticket, $updatedData, $userUuid) {\n        // Handle featherpanel:ticket:message:updated\n        // Data keys: message, message_id, ticket, updated_data, user_uuid\n    });\n}',
        },
        {
            method: 'onTicketPriorityCreated',
            name: 'featherpanel:ticket:priority:created',
            callback: 'array priority data, int priority id, string user uuid.',
            category: 'Ticket',
            actualData: ['priority', 'priority_id', 'user_uuid'],
            sourceFiles: ['backend/app/Controllers/Admin/TicketPrioritiesController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\TicketEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(TicketEvent::onTicketPriorityCreated(), function ($priority, $priorityId, $userUuid) {\n        // Handle featherpanel:ticket:priority:created\n        // Data keys: priority, priority_id, user_uuid\n    });\n}',
        },
        {
            method: 'onTicketPriorityDeleted',
            name: 'featherpanel:ticket:priority:deleted',
            callback: 'array priority data, int priority id, string user uuid.',
            category: 'Ticket',
            actualData: ['priority', 'priority_id', 'user_uuid'],
            sourceFiles: ['backend/app/Controllers/Admin/TicketPrioritiesController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\TicketEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(TicketEvent::onTicketPriorityDeleted(), function ($priority, $priorityId, $userUuid) {\n        // Handle featherpanel:ticket:priority:deleted\n        // Data keys: priority, priority_id, user_uuid\n    });\n}',
        },
        {
            method: 'onTicketPriorityUpdated',
            name: 'featherpanel:ticket:priority:updated',
            callback: 'array priority data, array updated data, int priority id, string user uuid.',
            category: 'Ticket',
            actualData: ['priority', 'priority_id', 'updated_data', 'user_uuid'],
            sourceFiles: ['backend/app/Controllers/Admin/TicketPrioritiesController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\TicketEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(TicketEvent::onTicketPriorityUpdated(), function ($priority, $priorityId, $updatedData, $userUuid) {\n        // Handle featherpanel:ticket:priority:updated\n        // Data keys: priority, priority_id, updated_data, user_uuid\n    });\n}',
        },
        {
            method: 'onTicketReopened',
            name: 'featherpanel:ticket:reopened',
            callback: 'array ticket data, string user uuid.',
            category: 'Ticket',
            actualData: ['ticket', 'user_uuid'],
            sourceFiles: ['backend/app/Controllers/Admin/TicketsController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\TicketEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(TicketEvent::onTicketReopened(), function ($ticket, $userUuid) {\n        // Handle featherpanel:ticket:reopened\n        // Data keys: ticket, user_uuid\n    });\n}',
        },
        {
            method: 'onTicketStatusChanged',
            name: 'featherpanel:ticket:status:changed',
            callback: 'array ticket data, string old status, string new status, string user uuid.',
            category: 'Ticket',
            actualData: ['new_status', 'old_status', 'ticket', 'user_uuid'],
            sourceFiles: ['backend/app/Controllers/Admin/TicketsController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\TicketEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(TicketEvent::onTicketStatusChanged(), function ($newStatus, $oldStatus, $ticket, $userUuid) {\n        // Handle featherpanel:ticket:status:changed\n        // Data keys: new_status, old_status, ticket, user_uuid\n    });\n}',
        },
        {
            method: 'onTicketStatusCreated',
            name: 'featherpanel:ticket:status:created',
            callback: 'array status data, int status id, string user uuid.',
            category: 'Ticket',
            actualData: ['status', 'status_id', 'user_uuid'],
            sourceFiles: ['backend/app/Controllers/Admin/TicketStatusesController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\TicketEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(TicketEvent::onTicketStatusCreated(), function ($status, $statusId, $userUuid) {\n        // Handle featherpanel:ticket:status:created\n        // Data keys: status, status_id, user_uuid\n    });\n}',
        },
        {
            method: 'onTicketStatusDeleted',
            name: 'featherpanel:ticket:status:deleted',
            callback: 'array status data, int status id, string user uuid.',
            category: 'Ticket',
            actualData: ['status', 'status_id', 'user_uuid'],
            sourceFiles: ['backend/app/Controllers/Admin/TicketStatusesController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\TicketEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(TicketEvent::onTicketStatusDeleted(), function ($status, $statusId, $userUuid) {\n        // Handle featherpanel:ticket:status:deleted\n        // Data keys: status, status_id, user_uuid\n    });\n}',
        },
        {
            method: 'onTicketStatusUpdated',
            name: 'featherpanel:ticket:status:updated',
            callback: 'array status data, array updated data, int status id, string user uuid.',
            category: 'Ticket',
            actualData: ['status', 'status_id', 'updated_data', 'user_uuid'],
            sourceFiles: ['backend/app/Controllers/Admin/TicketStatusesController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\TicketEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(TicketEvent::onTicketStatusUpdated(), function ($status, $statusId, $updatedData, $userUuid) {\n        // Handle featherpanel:ticket:status:updated\n        // Data keys: status, status_id, updated_data, user_uuid\n    });\n}',
        },
        {
            method: 'onTicketUpdated',
            name: 'featherpanel:ticket:updated',
            callback: 'array ticket data, array updated data, string user uuid.',
            category: 'Ticket',
            actualData: ['ticket', 'updated_data', 'user_uuid'],
            sourceFiles: ['backend/app/Controllers/Admin/TicketsController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\TicketEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(TicketEvent::onTicketUpdated(), function ($ticket, $updatedData, $userUuid) {\n        // Handle featherpanel:ticket:updated\n        // Data keys: ticket, updated_data, user_uuid\n    });\n}',
        },
    ],
};

export default function CategoryEventsPage() {
    // Helper to unescape JSON-escaped strings
    const unescapeCode = (str: string) => {
        // Replace double backslashes (escaped in JSON) with single backslash
        // Replace escaped newlines with actual newlines
        return str.replace(/\\\\/g, '\\').replace(/\\n/g, '\n');
    };

    return (
        <div className='min-h-screen bg-background'>
            <div className='container mx-auto px-4 py-16 max-w-6xl'>
                <Link href='/icanhasfeatherpanel/events'>
                    <Button variant='ghost' className='mb-8 -ml-4'>
                        <ArrowLeft className='w-4 h-4 mr-2' />
                        Back to Events
                    </Button>
                </Link>

                <div className='mb-12 space-y-4'>
                    <div className='flex items-center gap-3'>
                        <div className='p-3 rounded-xl bg-primary/10 border border-primary/20 backdrop-blur-sm'>
                            <Zap className='w-6 h-6 text-primary' />
                        </div>
                        <div>
                            <h1 className='text-4xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent'>
                                {categoryData.name}
                            </h1>
                            <p className='text-muted-foreground mt-1'>
                                {categoryData.events.length} event{categoryData.events.length !== 1 ? 's' : ''} in this
                                category
                            </p>
                        </div>
                    </div>
                </div>

                <div className='space-y-4'>
                    {categoryData.events.map((event) => (
                        <Card
                            key={event.name}
                            className='border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-colors'
                        >
                            <CardHeader>
                                <div className='flex items-start justify-between gap-4 flex-wrap'>
                                    <div className='flex-1 min-w-0'>
                                        <div className='flex items-center gap-2 mb-2 flex-wrap'>
                                            <Code className='w-4 h-4 text-primary flex-shrink-0' />
                                            <CardTitle className='text-lg font-mono text-foreground break-all'>
                                                {event.name}
                                            </CardTitle>
                                        </div>
                                        <CardDescription className='text-muted-foreground mb-3'>
                                            <span className='font-semibold'>Callback parameters:</span> {event.callback}
                                        </CardDescription>
                                    </div>
                                    <Badge
                                        variant='outline'
                                        className='text-xs font-mono bg-muted/30 border-border/50 text-foreground/80 flex-shrink-0'
                                    >
                                        {event.method}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className='space-y-4'>
                                {event.actualData && event.actualData.length > 0 && (
                                    <div className='p-4 rounded-lg bg-muted/30 border border-border/50 backdrop-blur-sm'>
                                        <h4 className='text-sm font-semibold text-foreground mb-2'>
                                            Event Data Structure
                                        </h4>
                                        <p className='text-xs text-muted-foreground mb-3'>
                                            This event receives the following data when emitted:
                                        </p>
                                        <div className='flex flex-wrap gap-2'>
                                            {event.actualData.map((key) => (
                                                <Badge
                                                    key={key}
                                                    variant='outline'
                                                    className='text-xs font-mono bg-muted/50 border-border/50 text-foreground/80'
                                                >
                                                    {key}
                                                </Badge>
                                            ))}
                                        </div>
                                        {event.sourceFiles && event.sourceFiles.length > 0 && (
                                            <div className='mt-3 pt-3 border-t border-border/30'>
                                                <p className='text-xs text-muted-foreground mb-1'>Emitted from:</p>
                                                <div className='space-y-1'>
                                                    {event.sourceFiles.slice(0, 2).map((file) => (
                                                        <code
                                                            key={file}
                                                            className='text-xs text-muted-foreground block truncate'
                                                        >
                                                            {file}
                                                        </code>
                                                    ))}
                                                    {event.sourceFiles.length > 2 && (
                                                        <p className='text-xs text-muted-foreground italic'>
                                                            +{event.sourceFiles.length - 2} more location
                                                            {event.sourceFiles.length - 2 !== 1 ? 's' : ''}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className='p-4 rounded-lg bg-muted/30 border border-border/50 backdrop-blur-sm'>
                                    <h4 className='text-sm font-semibold text-foreground mb-2'>Usage Example</h4>
                                    <pre className='p-3 rounded-lg bg-muted/50 border border-border/50 overflow-x-auto'>
                                        <code className='text-xs font-mono text-foreground'>
                                            {unescapeCode(event.exampleCode)}
                                        </code>
                                    </pre>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
