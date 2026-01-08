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
    name: "Wings",
    events: [
  {
    "method": "onWingsActivityLogged",
    "name": "featherpanel:wings:activity:logged",
    "callback": "array activity data.",
    "category": "Wings",
    "actualData": [
      "activities",
      "error_count",
      "errors",
      "node",
      "processed_count"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Wings/Activity/WingsActivityController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\WingsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(WingsEvent::onWingsActivityLogged(), function ($activities, $errorCount, $errors, $node, $processedCount) {\n        // Handle featherpanel:wings:activity:logged\n        // Data keys: activities, error_count, errors, node, processed_count\n    });\n}"
  },
  {
    "method": "onWingsBackupCompletionReported",
    "name": "featherpanel:wings:backup:completion:reported",
    "callback": "string backup uuid, array completion data.",
    "category": "Wings",
    "actualData": [
      "backup",
      "backup_uuid",
      "completion_data",
      "node",
      "server"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Wings/Backup/WingsBackupController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\WingsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(WingsEvent::onWingsBackupCompletionReported(), function ($backup, $backupUuid, $completionData, $node, $server) {\n        // Handle featherpanel:wings:backup:completion:reported\n        // Data keys: backup, backup_uuid, completion_data, node, server\n    });\n}"
  },
  {
    "method": "onWingsBackupRestorationReported",
    "name": "featherpanel:wings:backup:restoration:reported",
    "callback": "string backup uuid, array restoration data.",
    "category": "Wings",
    "actualData": [
      "backup",
      "backup_uuid",
      "node",
      "restoration_data",
      "server"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Wings/Backup/WingsBackupController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\WingsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(WingsEvent::onWingsBackupRestorationReported(), function ($backup, $backupUuid, $node, $restorationData, $server) {\n        // Handle featherpanel:wings:backup:restoration:reported\n        // Data keys: backup, backup_uuid, node, restoration_data, server\n    });\n}"
  },
  {
    "method": "onWingsBackupUploadInfoRetrieved",
    "name": "featherpanel:wings:backup:upload:info:retrieved",
    "callback": "string backup uuid, array upload info.",
    "category": "Wings",
    "actualData": [
      "backup",
      "backup_uuid",
      "node",
      "part_size",
      "parts",
      "server",
      "total_size",
      "upload_info"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Wings/Backup/WingsBackupController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\WingsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(WingsEvent::onWingsBackupUploadInfoRetrieved(), function ($backup, $backupUuid, $node, $partSize, $parts, $server, $totalSize, $uploadInfo) {\n        // Handle featherpanel:wings:backup:upload:info:retrieved\n        // Data keys: backup, backup_uuid, node, part_size, parts, server, total_size, upload_info\n    });\n}"
  },
  {
    "method": "onWingsDockerDiskUsageRetrieved",
    "name": "featherpanel:wings:docker:disk:usage:retrieved",
    "callback": "int node id, array disk usage data.",
    "category": "Wings",
    "actualData": [
      "docker_disk_usage",
      "node",
      "node_id"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Wings/WingsAdminController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\WingsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(WingsEvent::onWingsDockerDiskUsageRetrieved(), function ($dockerDiskUsage, $node, $nodeId) {\n        // Handle featherpanel:wings:docker:disk:usage:retrieved\n        // Data keys: docker_disk_usage, node, node_id\n    });\n}"
  },
  {
    "method": "onWingsDockerPruneCompleted",
    "name": "featherpanel:wings:docker:prune:completed",
    "callback": "int node id, array prune results.",
    "category": "Wings",
    "actualData": [
      "docker_prune",
      "node",
      "node_id"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Wings/WingsAdminController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\WingsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(WingsEvent::onWingsDockerPruneCompleted(), function ($dockerPrune, $node, $nodeId) {\n        // Handle featherpanel:wings:docker:prune:completed\n        // Data keys: docker_prune, node, node_id\n    });\n}"
  },
  {
    "method": "onWingsError",
    "name": "featherpanel:wings:error",
    "callback": "string error message, array context.",
    "category": "Wings",
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\WingsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(WingsEvent::onWingsError(), function ($message, $context) {\n        // Handle featherpanel:wings:error\n        // Parameters: string error message, array context.\n    });\n}"
  },
  {
    "method": "onWingsNodeConnectionStatus",
    "name": "featherpanel:wings:node:connection:status",
    "callback": "int node id, string status.",
    "category": "Wings",
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\WingsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(WingsEvent::onWingsNodeConnectionStatus(), function ($id, $status) {\n        // Handle featherpanel:wings:node:connection:status\n        // Parameters: int node id, string status.\n    });\n}"
  },
  {
    "method": "onWingsNodeError",
    "name": "featherpanel:wings:node:error",
    "callback": "int node id, string error message.",
    "category": "Wings",
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\WingsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(WingsEvent::onWingsNodeError(), function ($id, $message) {\n        // Handle featherpanel:wings:node:error\n        // Parameters: int node id, string error message.\n    });\n}"
  },
  {
    "method": "onWingsNodeIpsRetrieved",
    "name": "featherpanel:wings:node:ips:retrieved",
    "callback": "int node id, array ip addresses.",
    "category": "Wings",
    "actualData": [
      "ips",
      "node",
      "node_id"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Wings/WingsAdminController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\WingsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(WingsEvent::onWingsNodeIpsRetrieved(), function ($ips, $node, $nodeId) {\n        // Handle featherpanel:wings:node:ips:retrieved\n        // Data keys: ips, node, node_id\n    });\n}"
  },
  {
    "method": "onWingsNodeSystemInfoRetrieved",
    "name": "featherpanel:wings:node:system:info:retrieved",
    "callback": "int node id, array system info.",
    "category": "Wings",
    "actualData": [
      "node",
      "node_id",
      "system_info"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Wings/WingsAdminController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\WingsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(WingsEvent::onWingsNodeSystemInfoRetrieved(), function ($node, $nodeId, $systemInfo) {\n        // Handle featherpanel:wings:node:system:info:retrieved\n        // Data keys: node, node_id, system_info\n    });\n}"
  },
  {
    "method": "onWingsNodeUtilizationRetrieved",
    "name": "featherpanel:wings:node:utilization:retrieved",
    "callback": "int node id, array utilization data.",
    "category": "Wings",
    "actualData": [
      "node",
      "node_id",
      "utilization"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Wings/WingsAdminController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\WingsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(WingsEvent::onWingsNodeUtilizationRetrieved(), function ($node, $nodeId, $utilization) {\n        // Handle featherpanel:wings:node:utilization:retrieved\n        // Data keys: node, node_id, utilization\n    });\n}"
  },
  {
    "method": "onWingsRemoteServersRetrieved",
    "name": "featherpanel:wings:servers:remote:retrieved",
    "callback": "array servers list.",
    "category": "Wings",
    "actualData": [
      "node",
      "pagination",
      "servers",
      "total"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Wings/Server/WingsServerListController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\WingsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(WingsEvent::onWingsRemoteServersRetrieved(), function ($node, $pagination, $servers, $total) {\n        // Handle featherpanel:wings:servers:remote:retrieved\n        // Data keys: node, pagination, servers, total\n    });\n}"
  },
  {
    "method": "onWingsServerConnectionStatus",
    "name": "featherpanel:wings:server:connection:status",
    "callback": "string server uuid, string status.",
    "category": "Wings",
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\WingsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(WingsEvent::onWingsServerConnectionStatus(), function ($uuid, $status) {\n        // Handle featherpanel:wings:server:connection:status\n        // Parameters: string server uuid, string status.\n    });\n}"
  },
  {
    "method": "onWingsServerError",
    "name": "featherpanel:wings:server:error",
    "callback": "string server uuid, string error message.",
    "category": "Wings",
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\WingsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(WingsEvent::onWingsServerError(), function ($uuid, $message) {\n        // Handle featherpanel:wings:server:error\n        // Parameters: string server uuid, string error message.\n    });\n}"
  },
  {
    "method": "onWingsServerInfoRetrieved",
    "name": "featherpanel:wings:server:info:retrieved",
    "callback": "string server uuid, array server info.",
    "category": "Wings",
    "actualData": [
      "allocation",
      "node",
      "realm",
      "server",
      "server_uuid",
      "spell"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Wings/Server/WingsServerInfoController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\WingsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(WingsEvent::onWingsServerInfoRetrieved(), function ($allocation, $node, $realm, $server, $serverUuid, $spell) {\n        // Handle featherpanel:wings:server:info:retrieved\n        // Data keys: allocation, node, realm, server, server_uuid, spell\n    });\n}"
  },
  {
    "method": "onWingsServerInstallCompleted",
    "name": "featherpanel:wings:server:install:completed",
    "callback": "string server uuid, array install results.",
    "category": "Wings",
    "actualData": [
      "installed_at",
      "node",
      "reinstall",
      "server",
      "server_uuid",
      "status",
      "successful"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Wings/Server/WingsServerInstallController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\WingsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(WingsEvent::onWingsServerInstallCompleted(), function ($installedAt, $node, $reinstall, $server, $serverUuid, $status, $successful) {\n        // Handle featherpanel:wings:server:install:completed\n        // Data keys: installed_at, node, reinstall, server, server_uuid, status, successful\n    });\n}"
  },
  {
    "method": "onWingsServerInstallRetrieved",
    "name": "featherpanel:wings:server:install:retrieved",
    "callback": "string server uuid, array install data.",
    "category": "Wings",
    "actualData": [
      "install_config",
      "node",
      "server",
      "server_uuid",
      "spell"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Wings/Server/WingsServerInstallController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\WingsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(WingsEvent::onWingsServerInstallRetrieved(), function ($installConfig, $node, $server, $serverUuid, $spell) {\n        // Handle featherpanel:wings:server:install:retrieved\n        // Data keys: install_config, node, server, server_uuid, spell\n    });\n}"
  },
  {
    "method": "onWingsServersResetCompleted",
    "name": "featherpanel:wings:servers:reset:completed",
    "callback": "array reset results.",
    "category": "Wings",
    "actualData": [
      "node",
      "reset_result"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Wings/Server/WingsServersResetController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\WingsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(WingsEvent::onWingsServersResetCompleted(), function ($node, $resetResult) {\n        // Handle featherpanel:wings:servers:reset:completed\n        // Data keys: node, reset_result\n    });\n}"
  },
  {
    "method": "onWingsServerStatusRetrieved",
    "name": "featherpanel:wings:server:status:retrieved",
    "callback": "string server uuid, array status data.",
    "category": "Wings",
    "actualData": [
      "node",
      "server",
      "server_uuid",
      "state"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Wings/Server/WingsServerStatusController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\WingsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(WingsEvent::onWingsServerStatusRetrieved(), function ($node, $server, $serverUuid, $state) {\n        // Handle featherpanel:wings:server:status:retrieved\n        // Data keys: node, server, server_uuid, state\n    });\n}"
  },
  {
    "method": "onWingsServerStatusUpdated",
    "name": "featherpanel:wings:server:status:updated",
    "callback": "string server uuid, array status data.",
    "category": "Wings",
    "actualData": [
      "new_state",
      "node",
      "old_state",
      "server",
      "server_uuid",
      "update_data"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Wings/Server/WingsServerStatusController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\WingsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(WingsEvent::onWingsServerStatusUpdated(), function ($newState, $node, $oldState, $server, $serverUuid, $updateData) {\n        // Handle featherpanel:wings:server:status:updated\n        // Data keys: new_state, node, old_state, server, server_uuid, update_data\n    });\n}"
  },
  {
    "method": "onWingsSftpAuthentication",
    "name": "featherpanel:wings:sftp:authentication",
    "callback": "array auth data.",
    "category": "Wings",
    "actualData": [
      "auth_type",
      "client_version",
      "ip",
      "permissions",
      "server",
      "session_id",
      "user"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Wings/Sftp/SftpAuthController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\WingsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(WingsEvent::onWingsSftpAuthentication(), function ($authType, $clientVersion, $ip, $permissions, $server, $sessionId, $user) {\n        // Handle featherpanel:wings:sftp:authentication\n        // Data keys: auth_type, client_version, ip, permissions, server, session_id, user\n    });\n}"
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
