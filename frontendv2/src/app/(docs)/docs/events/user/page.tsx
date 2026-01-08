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
    name: "User",
    events: [
  {
    "method": "onUserApiKeyCreated",
    "name": "featherpanel:user:api:create",
    "callback": "string user uuid, string api key id.",
    "category": "User",
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\UserEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(UserEvent::onUserApiKeyCreated(), function ($uuid, $id) {\n        // Handle featherpanel:user:api:create\n        // Parameters: string user uuid, string api key id.\n    });\n}"
  },
  {
    "method": "onUserApiKeyDeleted",
    "name": "featherpanel:user:api:delete",
    "callback": "string user uuid, string api key id.",
    "category": "User",
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\UserEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(UserEvent::onUserApiKeyDeleted(), function ($uuid, $id) {\n        // Handle featherpanel:user:api:delete\n        // Parameters: string user uuid, string api key id.\n    });\n}"
  },
  {
    "method": "onUserApiKeyUpdated",
    "name": "featherpanel:user:api:update",
    "callback": "string user uuid, string api key id.",
    "category": "User",
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\UserEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(UserEvent::onUserApiKeyUpdated(), function ($uuid, $id) {\n        // Handle featherpanel:user:api:update\n        // Parameters: string user uuid, string api key id.\n    });\n}"
  },
  {
    "method": "onUserCreated",
    "name": "featherpanel:user:created",
    "callback": "array user data, int user id, array created by.",
    "category": "User",
    "actualData": [
      "created_by",
      "user",
      "user_id"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/PterodactylImporterController.php",
      "backend/app/Controllers/Admin/UsersController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\UserEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(UserEvent::onUserCreated(), function ($createdBy, $user, $userId) {\n        // Handle featherpanel:user:created\n        // Data keys: created_by, user, user_id\n    });\n}"
  },
  {
    "method": "onUserDeleted",
    "name": "featherpanel:user:deleted",
    "callback": "array user data, array deleted by.",
    "category": "User",
    "actualData": [
      "deleted_by",
      "user"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/UsersController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\UserEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(UserEvent::onUserDeleted(), function ($deletedBy, $user) {\n        // Handle featherpanel:user:deleted\n        // Data keys: deleted_by, user\n    });\n}"
  },
  {
    "method": "onUserSshKeyCreated",
    "name": "featherpanel:user:ssh:create",
    "callback": "string user uuid, string ssh key id.",
    "category": "User",
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\UserEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(UserEvent::onUserSshKeyCreated(), function ($uuid, $id) {\n        // Handle featherpanel:user:ssh:create\n        // Parameters: string user uuid, string ssh key id.\n    });\n}"
  },
  {
    "method": "onUserSshKeyDeleted",
    "name": "featherpanel:user:ssh:delete",
    "callback": "string user uuid, string ssh key id.",
    "category": "User",
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\UserEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(UserEvent::onUserSshKeyDeleted(), function ($uuid, $id) {\n        // Handle featherpanel:user:ssh:delete\n        // Parameters: string user uuid, string ssh key id.\n    });\n}"
  },
  {
    "method": "onUserSshKeyUpdated",
    "name": "featherpanel:user:ssh:update",
    "callback": "string user uuid, string ssh key id.",
    "category": "User",
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\UserEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(UserEvent::onUserSshKeyUpdated(), function ($uuid, $id) {\n        // Handle featherpanel:user:ssh:update\n        // Parameters: string user uuid, string ssh key id.\n    });\n}"
  },
  {
    "method": "onUserUpdate",
    "name": "featherpanel:user:update",
    "callback": "string user uuid.",
    "category": "User",
    "actualData": [
      "user_uuid"
    ],
    "sourceFiles": [
      "backend/app/Controllers/User/User/SessionController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\UserEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(UserEvent::onUserUpdate(), function ($userUuid) {\n        // Handle featherpanel:user:update\n        // Data keys: user_uuid\n    });\n}"
  },
  {
    "method": "onUserUpdated",
    "name": "featherpanel:user:updated",
    "callback": "array user data, array updated data, array updated by.",
    "category": "User",
    "actualData": [
      "updated_by",
      "updated_data",
      "user"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/UsersController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\UserEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(UserEvent::onUserUpdated(), function ($updatedBy, $updatedData, $user) {\n        // Handle featherpanel:user:updated\n        // Data keys: updated_by, updated_data, user\n    });\n}"
  }
]
};

export default function CategoryEventsPage() {
    // Helper to unescape JSON-escaped strings
    const unescapeCode = (str) => {
        // Replace double backslashes (escaped in JSON) with single backslash
        // Replace escaped newlines with actual newlines
        return str.replace(/\\\\/g, '\\').replace(/\\n/g, '\n');
    };
    
    return (
        <div className='min-h-screen bg-background'>
            <div className='container mx-auto px-4 py-16 max-w-6xl'>
                <Link href='/docs/events'>
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
