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
    name: 'Server',
    events: [
        {
            method: 'onServerAllocationCreated',
            name: 'featherpanel:server:allocation:create',
            callback: 'string user uuid, string server uuid, int allocation id.',
            category: 'Server',
            actualData: ['allocation_id', 'server_uuid', 'user_uuid'],
            sourceFiles: ['backend/app/Controllers/User/Server/ServerAllocationController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerAllocationCreated(), function ($allocationId, $serverUuid, $userUuid) {\n        // Handle featherpanel:server:allocation:create\n        // Data keys: allocation_id, server_uuid, user_uuid\n    });\n}',
        },
        {
            method: 'onServerAllocationDeleted',
            name: 'featherpanel:server:allocation:delete',
            callback: 'string user uuid, string server uuid, int allocation id.',
            category: 'Server',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerAllocationDeleted(), function ($uuid, $uuid, $id) {\n        // Handle featherpanel:server:allocation:delete\n        // Parameters: string user uuid, string server uuid, int allocation id.\n    });\n}',
        },
        {
            method: 'onServerAllocationUpdated',
            name: 'featherpanel:server:allocation:update',
            callback: 'string user uuid, string server uuid, int allocation id.',
            category: 'Server',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerAllocationUpdated(), function ($uuid, $uuid, $id) {\n        // Handle featherpanel:server:allocation:update\n        // Parameters: string user uuid, string server uuid, int allocation id.\n    });\n}',
        },
        {
            method: 'onServerBackupCreated',
            name: 'featherpanel:server:backup:create',
            callback: 'string user uuid, string server uuid, string backup uuid.',
            category: 'Server',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerBackupCreated(), function ($uuid, $uuid, $uuid) {\n        // Handle featherpanel:server:backup:create\n        // Parameters: string user uuid, string server uuid, string backup uuid.\n    });\n}',
        },
        {
            method: 'onServerBackupDeleted',
            name: 'featherpanel:server:backup:delete',
            callback: 'string user uuid, string server uuid, string backup uuid.',
            category: 'Server',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerBackupDeleted(), function ($uuid, $uuid, $uuid) {\n        // Handle featherpanel:server:backup:delete\n        // Parameters: string user uuid, string server uuid, string backup uuid.\n    });\n}',
        },
        {
            method: 'onServerBackupLocked',
            name: 'featherpanel:server:backup:lock',
            callback: 'string user uuid, string server uuid, string backup uuid.',
            category: 'Server',
            actualData: ['backup_uuid', 'server_uuid', 'user_uuid'],
            sourceFiles: ['backend/app/Controllers/User/Server/ServerBackupController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerBackupLocked(), function ($backupUuid, $serverUuid, $userUuid) {\n        // Handle featherpanel:server:backup:lock\n        // Data keys: backup_uuid, server_uuid, user_uuid\n    });\n}',
        },
        {
            method: 'onServerBackupRestored',
            name: 'featherpanel:server:backup:restore',
            callback: 'string user uuid, string server uuid, string backup uuid.',
            category: 'Server',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerBackupRestored(), function ($uuid, $uuid, $uuid) {\n        // Handle featherpanel:server:backup:restore\n        // Parameters: string user uuid, string server uuid, string backup uuid.\n    });\n}',
        },
        {
            method: 'onServerBackupUnlocked',
            name: 'featherpanel:server:backup:unlock',
            callback: 'string user uuid, string server uuid, string backup uuid.',
            category: 'Server',
            actualData: ['backup_uuid', 'server_uuid', 'user_uuid'],
            sourceFiles: ['backend/app/Controllers/User/Server/ServerBackupController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerBackupUnlocked(), function ($backupUuid, $serverUuid, $userUuid) {\n        // Handle featherpanel:server:backup:unlock\n        // Data keys: backup_uuid, server_uuid, user_uuid\n    });\n}',
        },
        {
            method: 'onServerCreated',
            name: 'featherpanel:server:created',
            callback: 'int server id, array server data, array created by.',
            category: 'Server',
            actualData: ['created_by', 'server_data', 'server_id'],
            sourceFiles: [
                'backend/app/Controllers/Admin/PterodactylImporterController.php',
                'backend/app/Controllers/Admin/ServersController.php',
            ],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerCreated(), function ($createdBy, $serverData, $serverId) {\n        // Handle featherpanel:server:created\n        // Data keys: created_by, server_data, server_id\n    });\n}',
        },
        {
            method: 'onServerDatabaseCreated',
            name: 'featherpanel:server:database:create',
            callback: 'string user uuid, string server uuid, int database id.',
            category: 'Server',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerDatabaseCreated(), function ($uuid, $uuid, $id) {\n        // Handle featherpanel:server:database:create\n        // Parameters: string user uuid, string server uuid, int database id.\n    });\n}',
        },
        {
            method: 'onServerDatabaseDeleted',
            name: 'featherpanel:server:database:delete',
            callback: 'string user uuid, string server uuid, int database id.',
            category: 'Server',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerDatabaseDeleted(), function ($uuid, $uuid, $id) {\n        // Handle featherpanel:server:database:delete\n        // Parameters: string user uuid, string server uuid, int database id.\n    });\n}',
        },
        {
            method: 'onServerDatabaseUpdated',
            name: 'featherpanel:server:database:update',
            callback: 'string user uuid, string server uuid, int database id.',
            category: 'Server',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerDatabaseUpdated(), function ($uuid, $uuid, $id) {\n        // Handle featherpanel:server:database:update\n        // Parameters: string user uuid, string server uuid, int database id.\n    });\n}',
        },
        {
            method: 'onServerDeleted',
            name: 'featherpanel:server:delete',
            callback: 'string user uuid, string server uuid.',
            category: 'Server',
            actualData: ['deleted_by', 'hard_delete', 'server'],
            sourceFiles: [
                'backend/app/Controllers/Admin/ServersController.php',
                'backend/app/Controllers/User/Server/ServerUserController.php',
            ],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerDeleted(), function ($deletedBy, $hardDelete, $server) {\n        // Handle featherpanel:server:delete\n        // Data keys: deleted_by, hard_delete, server\n    });\n}',
        },
        {
            method: 'onServerDirectoryCreated',
            name: 'featherpanel:server:directory:create',
            callback: 'string user uuid, string server uuid, string directory path.',
            category: 'Server',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerDirectoryCreated(), function ($uuid, $uuid, $path) {\n        // Handle featherpanel:server:directory:create\n        // Parameters: string user uuid, string server uuid, string directory path.\n    });\n}',
        },
        {
            method: 'onServerFileCompressed',
            name: 'featherpanel:server:file:compress',
            callback: 'string user uuid, string server uuid, string file path.',
            category: 'Server',
            actualData: ['file_path', 'server_uuid', 'user_uuid'],
            sourceFiles: ['backend/app/Controllers/User/Server/Files/ServerFilesController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerFileCompressed(), function ($filePath, $serverUuid, $userUuid) {\n        // Handle featherpanel:server:file:compress\n        // Data keys: file_path, server_uuid, user_uuid\n    });\n}',
        },
        {
            method: 'onServerFileDecompressed',
            name: 'featherpanel:server:file:decompress',
            callback: 'string user uuid, string server uuid, string file path.',
            category: 'Server',
            actualData: ['file_path', 'server_uuid', 'user_uuid'],
            sourceFiles: ['backend/app/Controllers/User/Server/Files/ServerFilesController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerFileDecompressed(), function ($filePath, $serverUuid, $userUuid) {\n        // Handle featherpanel:server:file:decompress\n        // Data keys: file_path, server_uuid, user_uuid\n    });\n}',
        },
        {
            method: 'onServerFilePermissionsChanged',
            name: 'featherpanel:server:file:permissions',
            callback: 'string user uuid, string server uuid, string file path, string permissions.',
            category: 'Server',
            actualData: ['file_path', 'permissions', 'server_uuid', 'user_uuid'],
            sourceFiles: ['backend/app/Controllers/User/Server/Files/ServerFilesController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerFilePermissionsChanged(), function ($filePath, $permissions, $serverUuid, $userUuid) {\n        // Handle featherpanel:server:file:permissions\n        // Data keys: file_path, permissions, server_uuid, user_uuid\n    });\n}',
        },
        {
            method: 'onServerFileRenamed',
            name: 'featherpanel:server:file:rename',
            callback: 'string user uuid, string server uuid, string old path, string new path.',
            category: 'Server',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerFileRenamed(), function ($uuid, $uuid, $path, $path) {\n        // Handle featherpanel:server:file:rename\n        // Parameters: string user uuid, string server uuid, string old path, string new path.\n    });\n}',
        },
        {
            method: 'onServerFilesCopied',
            name: 'featherpanel:server:files:copy',
            callback: 'string user uuid, string server uuid, array file paths.',
            category: 'Server',
            actualData: ['file_paths', 'server_uuid', 'user_uuid'],
            sourceFiles: ['backend/app/Controllers/User/Server/Files/ServerFilesController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerFilesCopied(), function ($filePaths, $serverUuid, $userUuid) {\n        // Handle featherpanel:server:files:copy\n        // Data keys: file_paths, server_uuid, user_uuid\n    });\n}',
        },
        {
            method: 'onServerFilesDeleted',
            name: 'featherpanel:server:files:delete',
            callback: 'string user uuid, string server uuid.',
            category: 'Server',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerFilesDeleted(), function ($uuid, $uuid) {\n        // Handle featherpanel:server:files:delete\n        // Parameters: string user uuid, string server uuid.\n    });\n}',
        },
        {
            method: 'onServerFileUploaded',
            name: 'featherpanel:server:file:upload',
            callback: 'string user uuid, string server uuid, string file path.',
            category: 'Server',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerFileUploaded(), function ($uuid, $uuid, $path) {\n        // Handle featherpanel:server:file:upload\n        // Parameters: string user uuid, string server uuid, string file path.\n    });\n}',
        },
        {
            method: 'onServerFileWritten',
            name: 'featherpanel:server:file:write',
            callback: 'string user uuid, string server uuid, string file path.',
            category: 'Server',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerFileWritten(), function ($uuid, $uuid, $path) {\n        // Handle featherpanel:server:file:write\n        // Parameters: string user uuid, string server uuid, string file path.\n    });\n}',
        },
        {
            method: 'onServerPowerAction',
            name: 'featherpanel:server:power:action',
            callback: 'string user uuid, string server uuid, string action.',
            category: 'Server',
            actualData: ['action', 'server_uuid', 'user_uuid'],
            sourceFiles: ['backend/app/Controllers/User/Server/Power/ServerPowerController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerPowerAction(), function ($action, $serverUuid, $userUuid) {\n        // Handle featherpanel:server:power:action\n        // Data keys: action, server_uuid, user_uuid\n    });\n}',
        },
        {
            method: 'onServerPullProcessDeleted',
            name: 'featherpanel:server:pull:delete',
            callback: 'string user uuid, string server uuid, string pull id.',
            category: 'Server',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerPullProcessDeleted(), function ($uuid, $uuid, $id) {\n        // Handle featherpanel:server:pull:delete\n        // Parameters: string user uuid, string server uuid, string pull id.\n    });\n}',
        },
        {
            method: 'onServerReinstalled',
            name: 'featherpanel:server:reinstall',
            callback: 'string user uuid, string server uuid.',
            category: 'Server',
            actualData: ['server', 'server_uuid', 'updated_by', 'user_uuid'],
            sourceFiles: [
                'backend/app/Controllers/Admin/ServersController.php',
                'backend/app/Controllers/User/Server/ServerUserController.php',
            ],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerReinstalled(), function ($server, $serverUuid, $updatedBy, $userUuid) {\n        // Handle featherpanel:server:reinstall\n        // Data keys: server, server_uuid, updated_by, user_uuid\n    });\n}',
        },
        {
            method: 'onServerScheduleCreated',
            name: 'featherpanel:server:schedule:create',
            callback: 'string user uuid, string server uuid, int schedule id.',
            category: 'Server',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerScheduleCreated(), function ($uuid, $uuid, $id) {\n        // Handle featherpanel:server:schedule:create\n        // Parameters: string user uuid, string server uuid, int schedule id.\n    });\n}',
        },
        {
            method: 'onServerScheduleDeleted',
            name: 'featherpanel:server:schedule:delete',
            callback: 'string user uuid, string server uuid, int schedule id.',
            category: 'Server',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerScheduleDeleted(), function ($uuid, $uuid, $id) {\n        // Handle featherpanel:server:schedule:delete\n        // Parameters: string user uuid, string server uuid, int schedule id.\n    });\n}',
        },
        {
            method: 'onServerScheduleStatusToggled',
            name: 'featherpanel:server:schedule:status:toggle',
            callback: 'string user uuid, string server uuid, int schedule id.',
            category: 'Server',
            actualData: ['schedule_id', 'server_uuid', 'user_uuid'],
            sourceFiles: ['backend/app/Controllers/User/Server/ServerScheduleController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerScheduleStatusToggled(), function ($scheduleId, $serverUuid, $userUuid) {\n        // Handle featherpanel:server:schedule:status:toggle\n        // Data keys: schedule_id, server_uuid, user_uuid\n    });\n}',
        },
        {
            method: 'onServerScheduleUpdated',
            name: 'featherpanel:server:schedule:update',
            callback: 'string user uuid, string server uuid, int schedule id.',
            category: 'Server',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerScheduleUpdated(), function ($uuid, $uuid, $id) {\n        // Handle featherpanel:server:schedule:update\n        // Parameters: string user uuid, string server uuid, int schedule id.\n    });\n}',
        },
        {
            method: 'onServerSubuserCreated',
            name: 'featherpanel:server:subuser:create',
            callback: 'string user uuid, string server uuid, int subuser id.',
            category: 'Server',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerSubuserCreated(), function ($uuid, $uuid, $id) {\n        // Handle featherpanel:server:subuser:create\n        // Parameters: string user uuid, string server uuid, int subuser id.\n    });\n}',
        },
        {
            method: 'onServerSubuserDeleted',
            name: 'featherpanel:server:subuser:delete',
            callback: 'string user uuid, string server uuid, int subuser id.',
            category: 'Server',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerSubuserDeleted(), function ($uuid, $uuid, $id) {\n        // Handle featherpanel:server:subuser:delete\n        // Parameters: string user uuid, string server uuid, int subuser id.\n    });\n}',
        },
        {
            method: 'onServerSubuserUpdated',
            name: 'featherpanel:server:subuser:update',
            callback: 'string user uuid, string server uuid, int subuser id.',
            category: 'Server',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerSubuserUpdated(), function ($uuid, $uuid, $id) {\n        // Handle featherpanel:server:subuser:update\n        // Parameters: string user uuid, string server uuid, int subuser id.\n    });\n}',
        },
        {
            method: 'onServerSuspended',
            name: 'featherpanel:server:suspended',
            callback: 'array server data, array suspended by.',
            category: 'Server',
            actualData: ['server', 'suspended_by'],
            sourceFiles: ['backend/app/Controllers/Admin/ServersController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerSuspended(), function ($server, $suspendedBy) {\n        // Handle featherpanel:server:suspended\n        // Data keys: server, suspended_by\n    });\n}',
        },
        {
            method: 'onServerTaskCreated',
            name: 'featherpanel:server:task:create',
            callback: 'string user uuid, string server uuid, int schedule id, int task id.',
            category: 'Server',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerTaskCreated(), function ($uuid, $uuid, $id, $id) {\n        // Handle featherpanel:server:task:create\n        // Parameters: string user uuid, string server uuid, int schedule id, int task id.\n    });\n}',
        },
        {
            method: 'onServerTaskDeleted',
            name: 'featherpanel:server:task:delete',
            callback: 'string user uuid, string server uuid, int schedule id, int task id.',
            category: 'Server',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerTaskDeleted(), function ($uuid, $uuid, $id, $id) {\n        // Handle featherpanel:server:task:delete\n        // Parameters: string user uuid, string server uuid, int schedule id, int task id.\n    });\n}',
        },
        {
            method: 'onServerTaskSequenceUpdated',
            name: 'featherpanel:server:task:sequence:update',
            callback: 'string user uuid, string server uuid, int schedule id, int task id.',
            category: 'Server',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerTaskSequenceUpdated(), function ($uuid, $uuid, $id, $id) {\n        // Handle featherpanel:server:task:sequence:update\n        // Parameters: string user uuid, string server uuid, int schedule id, int task id.\n    });\n}',
        },
        {
            method: 'onServerTaskStatusToggled',
            name: 'featherpanel:server:task:status:toggle',
            callback: 'string user uuid, string server uuid, int schedule id, int task id.',
            category: 'Server',
            actualData: ['schedule_id', 'server_uuid', 'task_id', 'user_uuid'],
            sourceFiles: ['backend/app/Controllers/User/Server/TaskController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerTaskStatusToggled(), function ($scheduleId, $serverUuid, $taskId, $userUuid) {\n        // Handle featherpanel:server:task:status:toggle\n        // Data keys: schedule_id, server_uuid, task_id, user_uuid\n    });\n}',
        },
        {
            method: 'onServerTaskUpdated',
            name: 'featherpanel:server:task:update',
            callback: 'string user uuid, string server uuid, int schedule id, int task id.',
            category: 'Server',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerTaskUpdated(), function ($uuid, $uuid, $id, $id) {\n        // Handle featherpanel:server:task:update\n        // Parameters: string user uuid, string server uuid, int schedule id, int task id.\n    });\n}',
        },
        {
            method: 'onServerTransferCancelled',
            name: 'featherpanel:server:transfer:cancelled',
            callback: 'array server data, array cancelled_by.',
            category: 'Server',
            actualData: ['cancelled_by', 'server'],
            sourceFiles: ['backend/app/Controllers/Admin/ServersController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerTransferCancelled(), function ($cancelledBy, $server) {\n        // Handle featherpanel:server:transfer:cancelled\n        // Data keys: cancelled_by, server\n    });\n}',
        },
        {
            method: 'onServerTransferCompleted',
            name: 'featherpanel:server:transfer:completed',
            callback: 'array server data, bool successful, int|null destination_node_id.',
            category: 'Server',
            actualData: ['destination_node_id', 'old_node_id', 'server', 'successful'],
            sourceFiles: ['backend/app/Controllers/Wings/Transfer/WingsTransferStatusController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerTransferCompleted(), function ($destinationNodeId, $oldNodeId, $server, $successful) {\n        // Handle featherpanel:server:transfer:completed\n        // Data keys: destination_node_id, old_node_id, server, successful\n    });\n}',
        },
        {
            method: 'onServerTransferFailed',
            name: 'featherpanel:server:transfer:failed',
            callback: 'array server data, bool successful, string|null error.',
            category: 'Server',
            actualData: ['error', 'server', 'source_node_id', 'successful'],
            sourceFiles: ['backend/app/Controllers/Wings/Transfer/WingsTransferStatusController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerTransferFailed(), function ($error, $server, $sourceNodeId, $successful) {\n        // Handle featherpanel:server:transfer:failed\n        // Data keys: error, server, source_node_id, successful\n    });\n}',
        },
        {
            method: 'onServerTransferInitiated',
            name: 'featherpanel:server:transfer:initiated',
            callback: 'array server data, array source_node, array destination_node, array initiated_by.',
            category: 'Server',
            actualData: ['destination_node', 'initiated_by', 'server', 'source_node'],
            sourceFiles: ['backend/app/Controllers/Admin/ServersController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerTransferInitiated(), function ($destinationNode, $initiatedBy, $server, $sourceNode) {\n        // Handle featherpanel:server:transfer:initiated\n        // Data keys: destination_node, initiated_by, server, source_node\n    });\n}',
        },
        {
            method: 'onServerTransferred',
            name: 'featherpanel:server:transferred',
            callback: 'array server data, array transferred by.',
            category: 'Server',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerTransferred(), function ($data, $by) {\n        // Handle featherpanel:server:transferred\n        // Parameters: array server data, array transferred by.\n    });\n}',
        },
        {
            method: 'onServerUnsuspended',
            name: 'featherpanel:server:unsuspended',
            callback: 'array server data, array unsuspended by.',
            category: 'Server',
            actualData: ['server', 'unsuspended_by'],
            sourceFiles: ['backend/app/Controllers/Admin/ServersController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerUnsuspended(), function ($server, $unsuspendedBy) {\n        // Handle featherpanel:server:unsuspended\n        // Data keys: server, unsuspended_by\n    });\n}',
        },
        {
            method: 'onServerUpdated',
            name: 'featherpanel:server:update',
            callback: 'string user uuid, string server uuid.',
            category: 'Server',
            actualData: ['server', 'updated_by', 'updated_data'],
            sourceFiles: ['backend/app/Controllers/Admin/ServersController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\ServerEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(ServerEvent::onServerUpdated(), function ($server, $updatedBy, $updatedData) {\n        // Handle featherpanel:server:update\n        // Data keys: server, updated_by, updated_data\n    });\n}',
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
