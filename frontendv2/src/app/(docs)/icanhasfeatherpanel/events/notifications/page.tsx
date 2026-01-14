// @ts-nocheck
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
'use client';

import Link from 'next/link';
import { ArrowLeft, Zap, Code } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const categoryData = {
    name: "Notifications",
    events: [
  {
    "method": "onNotificationCreated",
    "name": "featherpanel:admin:notifications:notification:created",
    "callback": "array notification data.",
    "category": "Notifications",
    "actualData": [
      "created_by",
      "notification_data",
      "notification_id"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/NotificationsController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\NotificationsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(NotificationsEvent::onNotificationCreated(), function ($createdBy, $notificationData, $notificationId) {\n        // Handle featherpanel:admin:notifications:notification:created\n        // Data keys: created_by, notification_data, notification_id\n    });\n}"
  },
  {
    "method": "onNotificationDeleted",
    "name": "featherpanel:admin:notifications:notification:deleted",
    "callback": "int notification id, array notification data.",
    "category": "Notifications",
    "actualData": [
      "deleted_by",
      "notification_data",
      "notification_id"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/NotificationsController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\NotificationsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(NotificationsEvent::onNotificationDeleted(), function ($deletedBy, $notificationData, $notificationId) {\n        // Handle featherpanel:admin:notifications:notification:deleted\n        // Data keys: deleted_by, notification_data, notification_id\n    });\n}"
  },
  {
    "method": "onNotificationDismissed",
    "name": "featherpanel:user:notifications:notification:dismissed",
    "callback": "int notification id, int user id.",
    "category": "Notifications",
    "actualData": [
      "notification_id",
      "user",
      "user_id"
    ],
    "sourceFiles": [
      "backend/app/Controllers/User/NotificationController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\NotificationsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(NotificationsEvent::onNotificationDismissed(), function ($notificationId, $user, $userId) {\n        // Handle featherpanel:user:notifications:notification:dismissed\n        // Data keys: notification_id, user, user_id\n    });\n}"
  },
  {
    "method": "onNotificationNotFound",
    "name": "featherpanel:admin:notifications:notification:not:found",
    "callback": "int notification id, string error message.",
    "category": "Notifications",
    "actualData": [
      "error_message",
      "notification_id"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/NotificationsController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\NotificationsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(NotificationsEvent::onNotificationNotFound(), function ($errorMessage, $notificationId) {\n        // Handle featherpanel:admin:notifications:notification:not:found\n        // Data keys: error_message, notification_id\n    });\n}"
  },
  {
    "method": "onNotificationRetrieved",
    "name": "featherpanel:admin:notifications:notification:retrieved",
    "callback": "int notification id, array notification data.",
    "category": "Notifications",
    "actualData": [
      "notification_data",
      "notification_id"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/NotificationsController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\NotificationsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(NotificationsEvent::onNotificationRetrieved(), function ($notificationData, $notificationId) {\n        // Handle featherpanel:admin:notifications:notification:retrieved\n        // Data keys: notification_data, notification_id\n    });\n}"
  },
  {
    "method": "onNotificationsError",
    "name": "featherpanel:admin:notifications:error",
    "callback": "string error message, array context.",
    "category": "Notifications",
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\NotificationsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(NotificationsEvent::onNotificationsError(), function ($message, $context) {\n        // Handle featherpanel:admin:notifications:error\n        // Parameters: string error message, array context.\n    });\n}"
  },
  {
    "method": "onNotificationsRetrieved",
    "name": "featherpanel:admin:notifications:retrieved",
    "callback": "array notifications list.",
    "category": "Notifications",
    "actualData": [
      "filters",
      "limit",
      "notifications",
      "page",
      "pagination",
      "search",
      "total",
      "type"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/NotificationsController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\NotificationsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(NotificationsEvent::onNotificationsRetrieved(), function ($filters, $limit, $notifications, $page, $pagination, $search, $total, $type) {\n        // Handle featherpanel:admin:notifications:retrieved\n        // Data keys: filters, limit, notifications, page, pagination, search, total, type\n    });\n}"
  },
  {
    "method": "onNotificationUpdated",
    "name": "featherpanel:admin:notifications:notification:updated",
    "callback": "int notification id, array old data, array new data.",
    "category": "Notifications",
    "actualData": [
      "new_data",
      "notification_id",
      "old_data",
      "updated_by"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/NotificationsController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\NotificationsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(NotificationsEvent::onNotificationUpdated(), function ($newData, $notificationId, $oldData, $updatedBy) {\n        // Handle featherpanel:admin:notifications:notification:updated\n        // Data keys: new_data, notification_id, old_data, updated_by\n    });\n}"
  }
]
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
                                {categoryData.events.length} event{categoryData.events.length !== 1 ? 's' : ''} in this category
                            </p>
                        </div>
                    </div>
                </div>

                <div className='space-y-4'>
                    {categoryData.events.map((event) => (
                        <Card key={event.name} className='border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-colors'>
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
                                    <Badge variant='outline' className='text-xs font-mono bg-muted/30 border-border/50 text-foreground/80 flex-shrink-0'>
                                        {event.method}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className='space-y-4'>
                                {event.actualData && event.actualData.length > 0 && (
                                    <div className='p-4 rounded-lg bg-muted/30 border border-border/50 backdrop-blur-sm'>
                                        <h4 className='text-sm font-semibold text-foreground mb-2'>Event Data Structure</h4>
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
                                                        <code key={file} className='text-xs text-muted-foreground block truncate'>
                                                            {file}
                                                        </code>
                                                    ))}
                                                    {event.sourceFiles.length > 2 && (
                                                        <p className='text-xs text-muted-foreground italic'>
                                                            +{event.sourceFiles.length - 2} more location{event.sourceFiles.length - 2 !== 1 ? 's' : ''}
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
