# Plugin PHP Events: Complete List

Every event a plugin can listen to, taken from `backend/app/Plugins/Events/Events/*Event.php`. Each static method returns the event id string. The generated catalog at [../events/](../events/) (`../events/all.json` for RAG) adds the payload keys and the files that emit each event.

`backend/tests/Plugins/EventsDocTest.php` fails when an event class gains an event that is missing from this page, so add new events here when you add them to core.

## Listening to an event

Register listeners in `processEvents()` of your entry class. It runs once per request while the plugin loads.

```php
<?php

namespace App\Addons\myplugin;

use App\App;
use App\Plugins\AppPlugin;
use App\Plugins\PluginEvents;
use App\Plugins\Events\Events\UserEvent;
use App\Plugins\Events\Events\ServerEvent;

class MyPlugin implements AppPlugin
{
    public static function processEvents(PluginEvents $event): void
    {
        $event->on(UserEvent::onUserCreated(), function ($user = null, ...$rest): void {
            if (!is_array($user)) {
                return;
            }
            App::getInstance(true)->getLogger()->info('myplugin: new user ' . ($user['username'] ?? '?'));
        });

        $event->on(ServerEvent::onServerDeleted(), function (...$args): void {
            // inspect $args while developing, then name the parameters you need
        });
    }

    public static function pluginInstall(): void
    {
    }

    public static function pluginUpdate(?string $oldVersion, ?string $newVersion): void
    {
    }

    public static function pluginUninstall(): void
    {
    }
}
```

How arguments arrive:

- Core emits with `$eventManager->emit(UserEvent::onUserCreated(), ['user' => $data, 'user_id' => $id, ...])`.
- `PluginEvents::emit()` drops the array keys and calls each listener with the values in order (`$listener(...array_values($arguments))`). Your parameter names do not matter, only their position.
- Some events are emitted from more than one place with different payloads (for example `onUserCreated` from the admin users controller and from the Pterodactyl importer). Give parameters defaults or use `...$args`, and check the "data keys" and "source files" for the event in the [generated catalog](../events/).
- A few methods in different classes return the same id (for example `ServerEvent::onServerBackupCreated()` and `ServerBackupEvent::onServerBackupCreated()` both return `featherpanel:user:server:backup:created`). Listening to either one receives both.
- Listeners run inside the request. Keep them fast and catch your own exceptions.

## Emitting your own events

```php
global $eventManager;
if (isset($eventManager)) {
    $eventManager->emit('myplugin:invoice:paid', ['invoice' => $invoice]);
}
```

Prefix custom ids with your plugin identifier and list them in your plugin README.

## All events

There are 465 events in 59 classes.

[AllocationsEvent](#allocationsevent) · [AppEvent](#appevent) · [AuthEvent](#authevent) · [BackupPolicyEvent](#backuppolicyevent) · [ChatbotEvent](#chatbotevent) · [CloudManagementEvent](#cloudmanagementevent) · [CloudPluginsEvent](#cloudpluginsevent) · [ConsoleEvent](#consoleevent) · [DatabaseManagementEvent](#databasemanagementevent) · [DatabaseSnapshotsEvent](#databasesnapshotsevent) · [DatabasesEvent](#databasesevent) · [DnsHostsEvent](#dnshostsevent) · [FeatherZeroTrustEvent](#featherzerotrustevent) · [FileManagerEvent](#filemanagerevent) · [HostingPackagesEvent](#hostingpackagesevent) · [ImagesEvent](#imagesevent) · [KnowledgebaseEvent](#knowledgebaseevent) · [LdapProvidersEvent](#ldapprovidersevent) · [LocationsEvent](#locationsevent) · [LogViewerEvent](#logviewerevent) · [MailHostsEvent](#mailhostsevent) · [MailTemplatesEvent](#mailtemplatesevent) · [MountsEvent](#mountsevent) · [NodesEvent](#nodesevent) · [NotificationsEvent](#notificationsevent) · [OidcProvidersEvent](#oidcprovidersevent) · [PasskeysEvent](#passkeysevent) · [PermissionsEvent](#permissionsevent) · [PluginManagerEvent](#pluginmanagerevent) · [PluginUiEvent](#pluginuievent) · [PluginsSettingsEvent](#pluginssettingsevent) · [QuilldEvent](#quilldevent) · [RateLimiterEvent](#ratelimiterevent) · [RealmsEvent](#realmsevent) · [RedirectLinksEvent](#redirectlinksevent) · [RolesEvent](#rolesevent) · [ServerAllocationEvent](#serverallocationevent) · [ServerBackupEvent](#serverbackupevent) · [ServerDatabaseEvent](#serverdatabaseevent) · [ServerEvent](#serverevent) · [ServerFilesEvent](#serverfilesevent) · [ServerProxyEvent](#serverproxyevent) · [ServerScheduleEvent](#serverscheduleevent) · [ServerSubuserEvent](#serversubuserevent) · [ServerTaskEvent](#servertaskevent) · [ServerUserEvent](#serveruserevent) · [SettingsEvent](#settingsevent) · [SpellsEvent](#spellsevent) · [SubdomainsEvent](#subdomainsevent) · [TicketEvent](#ticketevent) · [UserApiClientEvent](#userapiclientevent) · [UserEvent](#userevent) · [UserSshKeyEvent](#usersshkeyevent) · [VdsEvent](#vdsevent) · [VdsNodeEvent](#vdsnodeevent) · [WebNodeEvent](#webnodeevent) · [WebPlatesEvent](#webplatesevent) · [WebSpaceEvent](#webspaceevent) · [WingsEvent](#wingsevent)

### AllocationsEvent

7 events. Payload keys and emit sites: [../events/allocations.html](../events/allocations.html)

| Method | Event id |
| --- | --- |
| `AllocationsEvent::onAllocationCreated()` | `featherpanel:admin:allocations:allocation:created` |
| `AllocationsEvent::onAllocationDeleted()` | `featherpanel:admin:allocations:allocation:deleted` |
| `AllocationsEvent::onAllocationNotFound()` | `featherpanel:admin:allocations:allocation:not:found` |
| `AllocationsEvent::onAllocationRetrieved()` | `featherpanel:admin:allocations:allocation:retrieved` |
| `AllocationsEvent::onAllocationsError()` | `featherpanel:admin:allocations:error` |
| `AllocationsEvent::onAllocationsRetrieved()` | `featherpanel:admin:allocations:retrieved` |
| `AllocationsEvent::onAllocationUpdated()` | `featherpanel:admin:allocations:allocation:updated` |

### AppEvent

1 events. Payload keys and emit sites: [../events/app.html](../events/app.html)

| Method | Event id |
| --- | --- |
| `AppEvent::onRouterReady()` | `router::Ready` |

### AuthEvent

18 events. Payload keys and emit sites: [../events/auth.html](../events/auth.html)

| Method | Event id |
| --- | --- |
| `AuthEvent::onAuth2FAEnabled()` | `featherpanel:auth:2fa:enabled` |
| `AuthEvent::onAuth2FAFailed()` | `featherpanel:auth:2fa:failed` |
| `AuthEvent::onAuth2FASetup()` | `featherpanel:auth:2fa:setup` |
| `AuthEvent::onAuth2FAVerified()` | `featherpanel:auth:2fa:verified` |
| `AuthEvent::onAuthAccountLocked()` | `featherpanel:auth:account:locked` |
| `AuthEvent::onAuthAccountUnlocked()` | `featherpanel:auth:account:unlocked` |
| `AuthEvent::onAuthEmailChanged()` | `featherpanel:auth:email:changed` |
| `AuthEvent::onAuthEmailLoginCodeRequested()` | `featherpanel:auth:email:login:code:requested` |
| `AuthEvent::onAuthForgotPassword()` | `featherpanel:auth:forgot:password` |
| `AuthEvent::onAuthForgotPasswordFailed()` | `featherpanel:auth:forgot:password:failed` |
| `AuthEvent::onAuthLoginFailed()` | `featherpanel:auth:login:failed` |
| `AuthEvent::onAuthLoginSuccess()` | `featherpanel:auth:login:success` |
| `AuthEvent::onAuthLogout()` | `featherpanel:auth:logout` |
| `AuthEvent::onAuthPasswordChanged()` | `featherpanel:auth:password:changed` |
| `AuthEvent::onAuthPasswordResetFailed()` | `featherpanel:auth:password:reset:failed` |
| `AuthEvent::onAuthRegisterSuccess()` | `featherpanel:auth:register:success` |
| `AuthEvent::onAuthRegistrationFailed()` | `featherpanel:auth:registration:failed` |
| `AuthEvent::onAuthResetPasswordSuccess()` | `featherpanel:auth:reset:password:success` |

### BackupPolicyEvent

5 events. Payload keys and emit sites: [../events/backup-policy.html](../events/backup-policy.html)

| Method | Event id |
| --- | --- |
| `BackupPolicyEvent::onBackupPolicyCreated()` | `featherpanel:admin:backup_policy:created` |
| `BackupPolicyEvent::onBackupPolicyDeleted()` | `featherpanel:admin:backup_policy:deleted` |
| `BackupPolicyEvent::onBackupPolicyRunCompleted()` | `featherpanel:admin:backup_policy:run:completed` |
| `BackupPolicyEvent::onBackupPolicyRunStarted()` | `featherpanel:admin:backup_policy:run:started` |
| `BackupPolicyEvent::onBackupPolicyUpdated()` | `featherpanel:admin:backup_policy:updated` |

### ChatbotEvent

2 events. Payload keys and emit sites: [../events/chatbot.html](../events/chatbot.html)

| Method | Event id |
| --- | --- |
| `ChatbotEvent::onConversationDeleted()` | `featherpanel:chatbot:conversation:delete` |
| `ChatbotEvent::onConversationMemoryUpdated()` | `featherpanel:chatbot:conversation:memory:update` |

### CloudManagementEvent

5 events. Payload keys and emit sites: [../events/cloud-management.html](../events/cloud-management.html)

| Method | Event id |
| --- | --- |
| `CloudManagementEvent::onCloudCredentialsRetrieved()` | `featherpanel:admin:cloud:credentials:retrieved` |
| `CloudManagementEvent::onCloudCredentialsRotated()` | `featherpanel:admin:cloud:credentials:rotated` |
| `CloudManagementEvent::onCloudCredentialsStored()` | `featherpanel:admin:cloud:cloud:credentials:stored` |
| `CloudManagementEvent::onCloudManagementError()` | `featherpanel:admin:cloud:error` |
| `CloudManagementEvent::onPanelCredentialsStored()` | `featherpanel:admin:cloud:panel:credentials:stored` |

### CloudPluginsEvent

2 events. Payload keys and emit sites: [../events/cloud-plugins.html](../events/cloud-plugins.html)

| Method | Event id |
| --- | --- |
| `CloudPluginsEvent::onPluginInstalled()` | `featherpanel:cloud:plugin:installed` |
| `CloudPluginsEvent::onPluginUninstalled()` | `featherpanel:cloud:plugin:uninstalled` |

### ConsoleEvent

3 events. Payload keys and emit sites: [../events/console.html](../events/console.html)

| Method | Event id |
| --- | --- |
| `ConsoleEvent::onCommandExecuted()` | `featherpanel:admin:console:command:executed` |
| `ConsoleEvent::onConsoleError()` | `featherpanel:admin:console:error` |
| `ConsoleEvent::onSystemInfoRetrieved()` | `featherpanel:admin:console:system_info:retrieved` |

### DatabaseManagementEvent

3 events. Payload keys and emit sites: [../events/database-management.html](../events/database-management.html)

| Method | Event id |
| --- | --- |
| `DatabaseManagementEvent::onDatabaseManagementError()` | `featherpanel:admin:database_management:error` |
| `DatabaseManagementEvent::onMigrationsExecuted()` | `featherpanel:admin:database_management:migrations:executed` |
| `DatabaseManagementEvent::onStatusRetrieved()` | `featherpanel:admin:database_management:status:retrieved` |

### DatabaseSnapshotsEvent

4 events. Payload keys and emit sites: [../events/database-snapshots.html](../events/database-snapshots.html)

| Method | Event id |
| --- | --- |
| `DatabaseSnapshotsEvent::onSnapshotCreated()` | `featherpanel:database:snapshot:created` |
| `DatabaseSnapshotsEvent::onSnapshotDeleted()` | `featherpanel:database:snapshot:deleted` |
| `DatabaseSnapshotsEvent::onSnapshotDownloaded()` | `featherpanel:database:snapshot:downloaded` |
| `DatabaseSnapshotsEvent::onSnapshotRestored()` | `featherpanel:database:snapshot:restored` |

### DatabasesEvent

11 events. Payload keys and emit sites: [../events/databases.html](../events/databases.html)

| Method | Event id |
| --- | --- |
| `DatabasesEvent::onDatabaseConnectionError()` | `featherpanel:admin:databases:database:connection:error` |
| `DatabasesEvent::onDatabaseConnectionTested()` | `featherpanel:admin:databases:connection:tested` |
| `DatabasesEvent::onDatabaseCreated()` | `featherpanel:admin:databases:database:created` |
| `DatabasesEvent::onDatabaseDeleted()` | `featherpanel:admin:databases:database:deleted` |
| `DatabasesEvent::onDatabaseHealthChecked()` | `featherpanel:admin:databases:database:health:checked` |
| `DatabasesEvent::onDatabaseNotFound()` | `featherpanel:admin:databases:database:not:found` |
| `DatabasesEvent::onDatabaseRetrieved()` | `featherpanel:admin:databases:database:retrieved` |
| `DatabasesEvent::onDatabasesByNodeRetrieved()` | `featherpanel:admin:databases:by:node:retrieved` |
| `DatabasesEvent::onDatabasesError()` | `featherpanel:admin:databases:error` |
| `DatabasesEvent::onDatabasesRetrieved()` | `featherpanel:admin:databases:retrieved` |
| `DatabasesEvent::onDatabaseUpdated()` | `featherpanel:admin:databases:database:updated` |

### DnsHostsEvent

3 events. Payload keys and emit sites: [../events/dns-hosts.html](../events/dns-hosts.html)

| Method | Event id |
| --- | --- |
| `DnsHostsEvent::onDnsHostCreated()` | `featherpanel:admin:dns_hosts:host:created` |
| `DnsHostsEvent::onDnsHostDeleted()` | `featherpanel:admin:dns_hosts:host:deleted` |
| `DnsHostsEvent::onDnsHostUpdated()` | `featherpanel:admin:dns_hosts:host:updated` |

### FeatherZeroTrustEvent

7 events. Payload keys and emit sites: [../events/feather-zero-trust.html](../events/feather-zero-trust.html)

| Method | Event id |
| --- | --- |
| `FeatherZeroTrustEvent::onFeatherZeroTrustConfigRetrieved()` | `featherpanel:admin:featherzerotrust:config:retrieved` |
| `FeatherZeroTrustEvent::onFeatherZeroTrustConfigUpdated()` | `featherpanel:admin:featherzerotrust:config:updated` |
| `FeatherZeroTrustEvent::onFeatherZeroTrustError()` | `featherpanel:admin:featherzerotrust:error` |
| `FeatherZeroTrustEvent::onFeatherZeroTrustLogsRetrieved()` | `featherpanel:admin:featherzerotrust:logs:retrieved` |
| `FeatherZeroTrustEvent::onFeatherZeroTrustScanCompleted()` | `featherpanel:admin:featherzerotrust:scan:completed` |
| `FeatherZeroTrustEvent::onFeatherZeroTrustScanError()` | `featherpanel:admin:featherzerotrust:scan:error` |
| `FeatherZeroTrustEvent::onFeatherZeroTrustScanStarted()` | `featherpanel:admin:featherzerotrust:scan:started` |

### FileManagerEvent

6 events. Payload keys and emit sites: [../events/file-manager.html](../events/file-manager.html)

| Method | Event id |
| --- | --- |
| `FileManagerEvent::onDirectoryBrowsed()` | `featherpanel:admin:file_manager:directory:browsed` |
| `FileManagerEvent::onFileCreated()` | `featherpanel:admin:file_manager:file:created` |
| `FileManagerEvent::onFileDeleted()` | `featherpanel:admin:file_manager:file:deleted` |
| `FileManagerEvent::onFileManagerError()` | `featherpanel:admin:file_manager:error` |
| `FileManagerEvent::onFileRead()` | `featherpanel:admin:file_manager:file:read` |
| `FileManagerEvent::onFileSaved()` | `featherpanel:admin:file_manager:file:saved` |

### HostingPackagesEvent

3 events. Payload keys and emit sites: [../events/hosting-packages.html](../events/hosting-packages.html)

| Method | Event id |
| --- | --- |
| `HostingPackagesEvent::onHostingPackageCreated()` | `featherpanel:admin:hosting_packages:package:created` |
| `HostingPackagesEvent::onHostingPackageDeleted()` | `featherpanel:admin:hosting_packages:package:deleted` |
| `HostingPackagesEvent::onHostingPackageUpdated()` | `featherpanel:admin:hosting_packages:package:updated` |

### ImagesEvent

7 events. Payload keys and emit sites: [../events/images.html](../events/images.html)

| Method | Event id |
| --- | --- |
| `ImagesEvent::onImageCreated()` | `featherpanel:admin:images:image:created` |
| `ImagesEvent::onImageDeleted()` | `featherpanel:admin:images:image:deleted` |
| `ImagesEvent::onImageNotFound()` | `featherpanel:admin:images:image:not:found` |
| `ImagesEvent::onImageRetrieved()` | `featherpanel:admin:images:image:retrieved` |
| `ImagesEvent::onImagesError()` | `featherpanel:admin:images:error` |
| `ImagesEvent::onImagesRetrieved()` | `featherpanel:admin:images:retrieved` |
| `ImagesEvent::onImageUpdated()` | `featherpanel:admin:images:image:updated` |

### KnowledgebaseEvent

23 events. Payload keys and emit sites: [../events/knowledgebase.html](../events/knowledgebase.html)

| Method | Event id |
| --- | --- |
| `KnowledgebaseEvent::onKnowledgebaseArticleCreated()` | `featherpanel:admin:knowledgebase:article:created` |
| `KnowledgebaseEvent::onKnowledgebaseArticleDeleted()` | `featherpanel:admin:knowledgebase:article:deleted` |
| `KnowledgebaseEvent::onKnowledgebaseArticleRetrieved()` | `featherpanel:admin:knowledgebase:article:retrieved` |
| `KnowledgebaseEvent::onKnowledgebaseArticlesReordered()` | `featherpanel:admin:knowledgebase:articles:reordered` |
| `KnowledgebaseEvent::onKnowledgebaseArticlesRetrieved()` | `featherpanel:admin:knowledgebase:articles:retrieved` |
| `KnowledgebaseEvent::onKnowledgebaseArticleUpdated()` | `featherpanel:admin:knowledgebase:article:updated` |
| `KnowledgebaseEvent::onKnowledgebaseAttachmentDeleted()` | `featherpanel:admin:knowledgebase:attachment:deleted` |
| `KnowledgebaseEvent::onKnowledgebaseAttachmentsRetrieved()` | `featherpanel:admin:knowledgebase:attachments:retrieved` |
| `KnowledgebaseEvent::onKnowledgebaseAttachmentUploaded()` | `featherpanel:admin:knowledgebase:attachment:uploaded` |
| `KnowledgebaseEvent::onKnowledgebaseCategoriesRetrieved()` | `featherpanel:admin:knowledgebase:categories:retrieved` |
| `KnowledgebaseEvent::onKnowledgebaseCategoryCreated()` | `featherpanel:admin:knowledgebase:category:created` |
| `KnowledgebaseEvent::onKnowledgebaseCategoryDeleted()` | `featherpanel:admin:knowledgebase:category:deleted` |
| `KnowledgebaseEvent::onKnowledgebaseCategoryRetrieved()` | `featherpanel:admin:knowledgebase:category:retrieved` |
| `KnowledgebaseEvent::onKnowledgebaseCategoryUpdated()` | `featherpanel:admin:knowledgebase:category:updated` |
| `KnowledgebaseEvent::onKnowledgebaseIconUploaded()` | `featherpanel:admin:knowledgebase:icon:uploaded` |
| `KnowledgebaseEvent::onKnowledgebaseTagCreated()` | `featherpanel:admin:knowledgebase:tag:created` |
| `KnowledgebaseEvent::onKnowledgebaseTagDeleted()` | `featherpanel:admin:knowledgebase:tag:deleted` |
| `KnowledgebaseEvent::onKnowledgebaseTagsRetrieved()` | `featherpanel:admin:knowledgebase:tags:retrieved` |
| `KnowledgebaseEvent::onUserKnowledgebaseArticleRetrieved()` | `featherpanel:user:knowledgebase:article:retrieved` |
| `KnowledgebaseEvent::onUserKnowledgebaseArticlesRetrieved()` | `featherpanel:user:knowledgebase:articles:retrieved` |
| `KnowledgebaseEvent::onUserKnowledgebaseCategoriesRetrieved()` | `featherpanel:user:knowledgebase:categories:retrieved` |
| `KnowledgebaseEvent::onUserKnowledgebaseCategoryArticlesRetrieved()` | `featherpanel:user:knowledgebase:category:articles:retrieved` |
| `KnowledgebaseEvent::onUserKnowledgebaseCategoryRetrieved()` | `featherpanel:user:knowledgebase:category:retrieved` |

### LdapProvidersEvent

3 events. Payload keys and emit sites: [../events/ldap-providers.html](../events/ldap-providers.html)

| Method | Event id |
| --- | --- |
| `LdapProvidersEvent::onLdapProviderCreated()` | `featherpanel:ldap:provider:create` |
| `LdapProvidersEvent::onLdapProviderDeleted()` | `featherpanel:ldap:provider:delete` |
| `LdapProvidersEvent::onLdapProviderUpdated()` | `featherpanel:ldap:provider:update` |

### LocationsEvent

7 events. Payload keys and emit sites: [../events/locations.html](../events/locations.html)

| Method | Event id |
| --- | --- |
| `LocationsEvent::onLocationCreated()` | `featherpanel:admin:locations:location:created` |
| `LocationsEvent::onLocationDeleted()` | `featherpanel:admin:locations:location:deleted` |
| `LocationsEvent::onLocationNotFound()` | `featherpanel:admin:locations:location:not:found` |
| `LocationsEvent::onLocationRetrieved()` | `featherpanel:admin:locations:location:retrieved` |
| `LocationsEvent::onLocationsError()` | `featherpanel:admin:locations:error` |
| `LocationsEvent::onLocationsRetrieved()` | `featherpanel:admin:locations:retrieved` |
| `LocationsEvent::onLocationUpdated()` | `featherpanel:admin:locations:location:updated` |

### LogViewerEvent

4 events. Payload keys and emit sites: [../events/log-viewer.html](../events/log-viewer.html)

| Method | Event id |
| --- | --- |
| `LogViewerEvent::onLogCleared()` | `featherpanel:admin:log_viewer:cleared` |
| `LogViewerEvent::onLogsUploaded()` | `featherpanel:admin:log_viewer:uploaded` |
| `LogViewerEvent::onLogViewed()` | `featherpanel:admin:log_viewer:viewed` |
| `LogViewerEvent::onLogViewerError()` | `featherpanel:admin:log_viewer:error` |

### MailHostsEvent

3 events. Payload keys and emit sites: [../events/mail-hosts.html](../events/mail-hosts.html)

| Method | Event id |
| --- | --- |
| `MailHostsEvent::onMailHostCreated()` | `featherpanel:admin:mail_hosts:host:created` |
| `MailHostsEvent::onMailHostDeleted()` | `featherpanel:admin:mail_hosts:host:deleted` |
| `MailHostsEvent::onMailHostUpdated()` | `featherpanel:admin:mail_hosts:host:updated` |

### MailTemplatesEvent

7 events. Payload keys and emit sites: [../events/mail-templates.html](../events/mail-templates.html)

| Method | Event id |
| --- | --- |
| `MailTemplatesEvent::onMailTemplateCreated()` | `featherpanel:admin:mail_templates:template:created` |
| `MailTemplatesEvent::onMailTemplateDeleted()` | `featherpanel:admin:mail_templates:template:deleted` |
| `MailTemplatesEvent::onMailTemplateNotFound()` | `featherpanel:admin:mail_templates:template:not:found` |
| `MailTemplatesEvent::onMailTemplateRetrieved()` | `featherpanel:admin:mail_templates:template:retrieved` |
| `MailTemplatesEvent::onMailTemplatesError()` | `featherpanel:admin:mail_templates:error` |
| `MailTemplatesEvent::onMailTemplatesRetrieved()` | `featherpanel:admin:mail_templates:retrieved` |
| `MailTemplatesEvent::onMailTemplateUpdated()` | `featherpanel:admin:mail_templates:template:updated` |

### MountsEvent

3 events. Payload keys and emit sites: [../events/mounts.html](../events/mounts.html)

| Method | Event id |
| --- | --- |
| `MountsEvent::onMountCreated()` | `featherpanel:admin:mounts:mount:created` |
| `MountsEvent::onMountDeleted()` | `featherpanel:admin:mounts:mount:deleted` |
| `MountsEvent::onMountUpdated()` | `featherpanel:admin:mounts:mount:updated` |

### NodesEvent

9 events. Payload keys and emit sites: [../events/nodes.html](../events/nodes.html)

| Method | Event id |
| --- | --- |
| `NodesEvent::onNodeConnectionError()` | `featherpanel:admin:nodes:node:connection:error` |
| `NodesEvent::onNodeCreated()` | `featherpanel:admin:nodes:node:created` |
| `NodesEvent::onNodeDeleted()` | `featherpanel:admin:nodes:node:deleted` |
| `NodesEvent::onNodeKeyReset()` | `featherpanel:admin:nodes:node:key:reset` |
| `NodesEvent::onNodeNotFound()` | `featherpanel:admin:nodes:node:not:found` |
| `NodesEvent::onNodeRetrieved()` | `featherpanel:admin:nodes:node:retrieved` |
| `NodesEvent::onNodesError()` | `featherpanel:admin:nodes:error` |
| `NodesEvent::onNodesRetrieved()` | `featherpanel:admin:nodes:retrieved` |
| `NodesEvent::onNodeUpdated()` | `featherpanel:admin:nodes:node:updated` |

### NotificationsEvent

8 events. Payload keys and emit sites: [../events/notifications.html](../events/notifications.html)

| Method | Event id |
| --- | --- |
| `NotificationsEvent::onNotificationCreated()` | `featherpanel:admin:notifications:notification:created` |
| `NotificationsEvent::onNotificationDeleted()` | `featherpanel:admin:notifications:notification:deleted` |
| `NotificationsEvent::onNotificationDismissed()` | `featherpanel:user:notifications:notification:dismissed` |
| `NotificationsEvent::onNotificationNotFound()` | `featherpanel:admin:notifications:notification:not:found` |
| `NotificationsEvent::onNotificationRetrieved()` | `featherpanel:admin:notifications:notification:retrieved` |
| `NotificationsEvent::onNotificationsError()` | `featherpanel:admin:notifications:error` |
| `NotificationsEvent::onNotificationsRetrieved()` | `featherpanel:admin:notifications:retrieved` |
| `NotificationsEvent::onNotificationUpdated()` | `featherpanel:admin:notifications:notification:updated` |

### OidcProvidersEvent

3 events. Payload keys and emit sites: [../events/oidc-providers.html](../events/oidc-providers.html)

| Method | Event id |
| --- | --- |
| `OidcProvidersEvent::onOidcProviderCreated()` | `featherpanel:oidc:provider:create` |
| `OidcProvidersEvent::onOidcProviderDeleted()` | `featherpanel:oidc:provider:delete` |
| `OidcProvidersEvent::onOidcProviderUpdated()` | `featherpanel:oidc:provider:update` |

### PasskeysEvent

5 events. Payload keys and emit sites: [../events/passkeys.html](../events/passkeys.html)

| Method | Event id |
| --- | --- |
| `PasskeysEvent::onPasskeyAuthenticationFailed()` | `featherpanel:auth:passkey:authentication:failed` |
| `PasskeysEvent::onPasskeyAuthenticationSuccess()` | `featherpanel:auth:passkey:authentication:success` |
| `PasskeysEvent::onPasskeyDeleted()` | `featherpanel:auth:passkey:deleted` |
| `PasskeysEvent::onPasskeyRegistered()` | `featherpanel:auth:passkey:registered` |
| `PasskeysEvent::onPasskeyUpdated()` | `featherpanel:auth:passkey:updated` |

### PermissionsEvent

7 events. Payload keys and emit sites: [../events/permissions.html](../events/permissions.html)

| Method | Event id |
| --- | --- |
| `PermissionsEvent::onPermissionCreated()` | `featherpanel:admin:permissions:permission:created` |
| `PermissionsEvent::onPermissionDeleted()` | `featherpanel:admin:permissions:permission:deleted` |
| `PermissionsEvent::onPermissionNotFound()` | `featherpanel:admin:permissions:permission:not:found` |
| `PermissionsEvent::onPermissionRetrieved()` | `featherpanel:admin:permissions:permission:retrieved` |
| `PermissionsEvent::onPermissionsError()` | `featherpanel:admin:permissions:error` |
| `PermissionsEvent::onPermissionsRetrieved()` | `featherpanel:admin:permissions:retrieved` |
| `PermissionsEvent::onPermissionUpdated()` | `featherpanel:admin:permissions:permission:updated` |

### PluginManagerEvent

5 events. Payload keys and emit sites: [../events/plugin-manager.html](../events/plugin-manager.html)

| Method | Event id |
| --- | --- |
| `PluginManagerEvent::onPluginCreated()` | `featherpanel:admin:plugin_manager:plugin:created` |
| `PluginManagerEvent::onPluginFileCreated()` | `featherpanel:admin:plugin_manager:file:created` |
| `PluginManagerEvent::onPluginManagerError()` | `featherpanel:admin:plugin_manager:error` |
| `PluginManagerEvent::onPluginSettingsUpdated()` | `featherpanel:admin:plugin_manager:settings:updated` |
| `PluginManagerEvent::onPluginUpdated()` | `featherpanel:admin:plugin_manager:plugin:updated` |

### PluginUiEvent

7 events. Payload keys and emit sites: [../events/plugin-ui.html](../events/plugin-ui.html)

| Method | Event id |
| --- | --- |
| `PluginUiEvent::onOverridesRetrieved()` | `featherpanel:system:plugins:ui:overrides:retrieved` |
| `PluginUiEvent::onPublicPagesRetrieved()` | `featherpanel:system:plugins:ui:public-pages:retrieved` |
| `PluginUiEvent::onSidebarRetrieved()` | `featherpanel:system:plugins:ui:sidebar:retrieved` |
| `PluginUiEvent::onThemesRetrieved()` | `featherpanel:system:plugins:ui:themes:retrieved` |
| `PluginUiEvent::onUiError()` | `featherpanel:system:plugins:ui:error` |
| `PluginUiEvent::onUiPacksRetrieved()` | `featherpanel:system:plugins:ui:packs:retrieved` |
| `PluginUiEvent::onWidgetsRetrieved()` | `featherpanel:system:plugins:ui:widgets:retrieved` |

### PluginsSettingsEvent

2 events. Payload keys and emit sites: [../events/plugins-settings.html](../events/plugins-settings.html)

| Method | Event id |
| --- | --- |
| `PluginsSettingsEvent::onPluginSettingDelete()` | `plugins:settings:delete` |
| `PluginsSettingsEvent::onPluginSettingUpdate()` | `plugins:settings:update` |

### QuilldEvent

8 events. Payload keys and emit sites: [../events/quilld.html](../events/quilld.html)

| Method | Event id |
| --- | --- |
| `QuilldEvent::onQuilldActivityLogged()` | `featherpanel:quilld:activity:logged` |
| `QuilldEvent::onQuilldConfigRetrieved()` | `featherpanel:quilld:config:retrieved` |
| `QuilldEvent::onQuilldInstallCompleted()` | `featherpanel:quilld:install:completed` |
| `QuilldEvent::onQuilldInstallRetrieved()` | `featherpanel:quilld:install:retrieved` |
| `QuilldEvent::onQuilldSftpAuthenticated()` | `featherpanel:quilld:sftp:authenticated` |
| `QuilldEvent::onQuilldTransferStatusReported()` | `featherpanel:quilld:transfer:status` |
| `QuilldEvent::onQuilldWebSpaceRetrieved()` | `featherpanel:quilld:webspace:retrieved` |
| `QuilldEvent::onQuilldWebSpaceUpdated()` | `featherpanel:quilld:webspace:updated` |

### RateLimiterEvent

4 events. Payload keys and emit sites: [../events/rate-limiter.html](../events/rate-limiter.html)

| Method | Event id |
| --- | --- |
| `RateLimiterEvent::onRateLimiterBulkUpdated()` | `featherpanel:rate-limiter:bulk:update` |
| `RateLimiterEvent::onRateLimiterDeleted()` | `featherpanel:rate-limiter:delete` |
| `RateLimiterEvent::onRateLimiterGlobalUpdated()` | `featherpanel:rate-limiter:global:update` |
| `RateLimiterEvent::onRateLimiterUpdated()` | `featherpanel:rate-limiter:update` |

### RealmsEvent

7 events. Payload keys and emit sites: [../events/realms.html](../events/realms.html)

| Method | Event id |
| --- | --- |
| `RealmsEvent::onRealmCreated()` | `featherpanel:admin:realms:realm:created` |
| `RealmsEvent::onRealmDeleted()` | `featherpanel:admin:realms:realm:deleted` |
| `RealmsEvent::onRealmNotFound()` | `featherpanel:admin:realms:realm:not:found` |
| `RealmsEvent::onRealmRetrieved()` | `featherpanel:admin:realms:realm:retrieved` |
| `RealmsEvent::onRealmsError()` | `featherpanel:admin:realms:error` |
| `RealmsEvent::onRealmsRetrieved()` | `featherpanel:admin:realms:retrieved` |
| `RealmsEvent::onRealmUpdated()` | `featherpanel:admin:realms:realm:updated` |

### RedirectLinksEvent

7 events. Payload keys and emit sites: [../events/redirect-links.html](../events/redirect-links.html)

| Method | Event id |
| --- | --- |
| `RedirectLinksEvent::onRedirectLinkCreated()` | `featherpanel:admin:redirect_links:link:created` |
| `RedirectLinksEvent::onRedirectLinkDeleted()` | `featherpanel:admin:redirect_links:link:deleted` |
| `RedirectLinksEvent::onRedirectLinkNotFound()` | `featherpanel:admin:redirect_links:link:not:found` |
| `RedirectLinksEvent::onRedirectLinkRetrieved()` | `featherpanel:admin:redirect_links:link:retrieved` |
| `RedirectLinksEvent::onRedirectLinksError()` | `featherpanel:admin:redirect_links:error` |
| `RedirectLinksEvent::onRedirectLinksRetrieved()` | `featherpanel:admin:redirect_links:retrieved` |
| `RedirectLinksEvent::onRedirectLinkUpdated()` | `featherpanel:admin:redirect_links:link:updated` |

### RolesEvent

7 events. Payload keys and emit sites: [../events/roles.html](../events/roles.html)

| Method | Event id |
| --- | --- |
| `RolesEvent::onRoleCreated()` | `featherpanel:admin:roles:role:created` |
| `RolesEvent::onRoleDeleted()` | `featherpanel:admin:roles:role:deleted` |
| `RolesEvent::onRoleNotFound()` | `featherpanel:admin:roles:role:not:found` |
| `RolesEvent::onRoleRetrieved()` | `featherpanel:admin:roles:role:retrieved` |
| `RolesEvent::onRolesError()` | `featherpanel:admin:roles:error` |
| `RolesEvent::onRolesRetrieved()` | `featherpanel:admin:roles:retrieved` |
| `RolesEvent::onRoleUpdated()` | `featherpanel:admin:roles:role:updated` |

### ServerAllocationEvent

3 events. Payload keys and emit sites: [../events/server-allocation.html](../events/server-allocation.html)

| Method | Event id |
| --- | --- |
| `ServerAllocationEvent::onServerAllocationDeleted()` | `featherpanel:user:server:allocation:deleted` |
| `ServerAllocationEvent::onServerAllocationError()` | `featherpanel:user:server:allocation:error` |
| `ServerAllocationEvent::onServerAllocationSetPrimary()` | `featherpanel:user:server:allocation:set_primary` |

### ServerBackupEvent

5 events. Payload keys and emit sites: [../events/server-backup.html](../events/server-backup.html)

| Method | Event id |
| --- | --- |
| `ServerBackupEvent::onServerBackupCreated()` | `featherpanel:user:server:backup:created` |
| `ServerBackupEvent::onServerBackupDeleted()` | `featherpanel:user:server:backup:deleted` |
| `ServerBackupEvent::onServerBackupDownloaded()` | `featherpanel:user:server:backup:downloaded` |
| `ServerBackupEvent::onServerBackupError()` | `featherpanel:user:server:backup:error` |
| `ServerBackupEvent::onServerBackupRestored()` | `featherpanel:user:server:backup:restored` |

### ServerDatabaseEvent

4 events. Payload keys and emit sites: [../events/server-database.html](../events/server-database.html)

| Method | Event id |
| --- | --- |
| `ServerDatabaseEvent::onServerDatabaseCreated()` | `featherpanel:user:server:database:created` |
| `ServerDatabaseEvent::onServerDatabaseDeleted()` | `featherpanel:user:server:database:deleted` |
| `ServerDatabaseEvent::onServerDatabaseError()` | `featherpanel:user:server:database:error` |
| `ServerDatabaseEvent::onServerDatabaseUpdated()` | `featherpanel:user:server:database:updated` |

### ServerEvent

51 events. Payload keys and emit sites: [../events/server.html](../events/server.html)

| Method | Event id |
| --- | --- |
| `ServerEvent::onServerAllocationCreated()` | `featherpanel:server:allocation:create` |
| `ServerEvent::onServerAllocationDeleted()` | `featherpanel:user:server:allocation:deleted` |
| `ServerEvent::onServerAllocationUpdated()` | `featherpanel:server:allocation:update` |
| `ServerEvent::onServerBackupCreated()` | `featherpanel:user:server:backup:created` |
| `ServerEvent::onServerBackupDeleted()` | `featherpanel:user:server:backup:deleted` |
| `ServerEvent::onServerBackupLocked()` | `featherpanel:server:backup:lock` |
| `ServerEvent::onServerBackupRestored()` | `featherpanel:user:server:backup:restored` |
| `ServerEvent::onServerBackupUnlocked()` | `featherpanel:server:backup:unlock` |
| `ServerEvent::onServerCreated()` | `featherpanel:server:created` |
| `ServerEvent::onServerDatabaseCreated()` | `featherpanel:user:server:database:created` |
| `ServerEvent::onServerDatabaseDeleted()` | `featherpanel:user:server:database:deleted` |
| `ServerEvent::onServerDatabaseUpdated()` | `featherpanel:user:server:database:updated` |
| `ServerEvent::onServerDeleted()` | `featherpanel:server:delete` |
| `ServerEvent::onServerDirectoryCreated()` | `featherpanel:user:server:directory:created` |
| `ServerEvent::onServerFileCompressed()` | `featherpanel:server:file:compress` |
| `ServerEvent::onServerFileDecompressed()` | `featherpanel:server:file:decompress` |
| `ServerEvent::onServerFilePermissionsChanged()` | `featherpanel:server:file:permissions` |
| `ServerEvent::onServerFileRenamed()` | `featherpanel:user:server:file:renamed` |
| `ServerEvent::onServerFilesCopied()` | `featherpanel:server:files:copy` |
| `ServerEvent::onServerFilesDeleted()` | `featherpanel:user:server:files:deleted` |
| `ServerEvent::onServerFileUploaded()` | `featherpanel:user:server:file:uploaded` |
| `ServerEvent::onServerFileWritten()` | `featherpanel:user:server:file:saved` |
| `ServerEvent::onServerLifecycleHookCompleted()` | `featherpanel:server:lifecycle-hook:completed` |
| `ServerEvent::onServerLifecycleHookFailed()` | `featherpanel:server:lifecycle-hook:failed` |
| `ServerEvent::onServerLifecycleHookStarted()` | `featherpanel:server:lifecycle-hook:started` |
| `ServerEvent::onServerLifecycleHookStepCompleted()` | `featherpanel:server:lifecycle-hook:step:completed` |
| `ServerEvent::onServerLifecycleHookStepFailed()` | `featherpanel:server:lifecycle-hook:step:failed` |
| `ServerEvent::onServerLifecycleHookStepStarted()` | `featherpanel:server:lifecycle-hook:step:started` |
| `ServerEvent::onServerPowerAction()` | `featherpanel:server:power:action` |
| `ServerEvent::onServerPullProcessDeleted()` | `featherpanel:user:server:pull:deleted` |
| `ServerEvent::onServerReinstalled()` | `featherpanel:server:reinstall` |
| `ServerEvent::onServerScheduleCreated()` | `featherpanel:user:server:schedule:created` |
| `ServerEvent::onServerScheduleDeleted()` | `featherpanel:user:server:schedule:deleted` |
| `ServerEvent::onServerScheduleStatusToggled()` | `featherpanel:server:schedule:status:toggle` |
| `ServerEvent::onServerScheduleUpdated()` | `featherpanel:user:server:schedule:updated` |
| `ServerEvent::onServerSubuserCreated()` | `featherpanel:user:server:subuser:created` |
| `ServerEvent::onServerSubuserDeleted()` | `featherpanel:user:server:subuser:deleted` |
| `ServerEvent::onServerSubuserUpdated()` | `featherpanel:user:server:subuser:updated` |
| `ServerEvent::onServerSuspended()` | `featherpanel:server:suspended` |
| `ServerEvent::onServerTaskCreated()` | `featherpanel:user:server:task:created` |
| `ServerEvent::onServerTaskDeleted()` | `featherpanel:user:server:task:deleted` |
| `ServerEvent::onServerTaskSequenceUpdated()` | `featherpanel:user:server:task:sequence:updated` |
| `ServerEvent::onServerTaskStatusToggled()` | `featherpanel:server:task:status:toggle` |
| `ServerEvent::onServerTaskUpdated()` | `featherpanel:user:server:task:updated` |
| `ServerEvent::onServerTransferCancelled()` | `featherpanel:server:transfer:cancelled` |
| `ServerEvent::onServerTransferCompleted()` | `featherpanel:server:transfer:completed` |
| `ServerEvent::onServerTransferFailed()` | `featherpanel:server:transfer:failed` |
| `ServerEvent::onServerTransferInitiated()` | `featherpanel:server:transfer:initiated` |
| `ServerEvent::onServerTransferred()` | `featherpanel:server:transferred` |
| `ServerEvent::onServerUnsuspended()` | `featherpanel:server:unsuspended` |
| `ServerEvent::onServerUpdated()` | `featherpanel:server:update` |

### ServerFilesEvent

7 events. Payload keys and emit sites: [../events/server-files.html](../events/server-files.html)

| Method | Event id |
| --- | --- |
| `ServerFilesEvent::onServerDirectoryCreated()` | `featherpanel:user:server:directory:created` |
| `ServerFilesEvent::onServerFileRenamed()` | `featherpanel:user:server:file:renamed` |
| `ServerFilesEvent::onServerFileSaved()` | `featherpanel:user:server:file:saved` |
| `ServerFilesEvent::onServerFilesDeleted()` | `featherpanel:user:server:files:deleted` |
| `ServerFilesEvent::onServerFilesError()` | `featherpanel:user:server:files:error` |
| `ServerFilesEvent::onServerFileUploaded()` | `featherpanel:user:server:file:uploaded` |
| `ServerFilesEvent::onServerPullProcessDeleted()` | `featherpanel:user:server:pull:deleted` |

### ServerProxyEvent

2 events. Payload keys and emit sites: [../events/server-proxy.html](../events/server-proxy.html)

| Method | Event id |
| --- | --- |
| `ServerProxyEvent::onServerProxyCreated()` | `featherpanel:server:proxy:create` |
| `ServerProxyEvent::onServerProxyDeleted()` | `featherpanel:server:proxy:delete` |

### ServerScheduleEvent

5 events. Payload keys and emit sites: [../events/server-schedule.html](../events/server-schedule.html)

| Method | Event id |
| --- | --- |
| `ServerScheduleEvent::onServerScheduleCreated()` | `featherpanel:user:server:schedule:created` |
| `ServerScheduleEvent::onServerScheduleDeleted()` | `featherpanel:user:server:schedule:deleted` |
| `ServerScheduleEvent::onServerScheduleError()` | `featherpanel:user:server:schedule:error` |
| `ServerScheduleEvent::onServerScheduleTriggered()` | `featherpanel:user:server:schedule:triggered` |
| `ServerScheduleEvent::onServerScheduleUpdated()` | `featherpanel:user:server:schedule:updated` |

### ServerSubuserEvent

4 events. Payload keys and emit sites: [../events/server-subuser.html](../events/server-subuser.html)

| Method | Event id |
| --- | --- |
| `ServerSubuserEvent::onServerSubuserCreated()` | `featherpanel:user:server:subuser:created` |
| `ServerSubuserEvent::onServerSubuserDeleted()` | `featherpanel:user:server:subuser:deleted` |
| `ServerSubuserEvent::onServerSubuserError()` | `featherpanel:user:server:subuser:error` |
| `ServerSubuserEvent::onServerSubuserUpdated()` | `featherpanel:user:server:subuser:updated` |

### ServerTaskEvent

5 events. Payload keys and emit sites: [../events/server-task.html](../events/server-task.html)

| Method | Event id |
| --- | --- |
| `ServerTaskEvent::onServerTaskCreated()` | `featherpanel:user:server:task:created` |
| `ServerTaskEvent::onServerTaskDeleted()` | `featherpanel:user:server:task:deleted` |
| `ServerTaskEvent::onServerTaskError()` | `featherpanel:user:server:task:error` |
| `ServerTaskEvent::onServerTaskSequenceUpdated()` | `featherpanel:user:server:task:sequence:updated` |
| `ServerTaskEvent::onServerTaskUpdated()` | `featherpanel:user:server:task:updated` |

### ServerUserEvent

3 events. Payload keys and emit sites: [../events/server-user.html](../events/server-user.html)

| Method | Event id |
| --- | --- |
| `ServerUserEvent::onServerUserDeleted()` | `featherpanel:user:server:deleted` |
| `ServerUserEvent::onServerUserError()` | `featherpanel:user:server:error` |
| `ServerUserEvent::onServerUserUpdated()` | `featherpanel:user:server:updated` |

### SettingsEvent

7 events. Payload keys and emit sites: [../events/settings.html](../events/settings.html)

| Method | Event id |
| --- | --- |
| `SettingsEvent::onSettingRetrieved()` | `featherpanel:admin:settings:setting:retrieved` |
| `SettingsEvent::onSettingsByCategoryRetrieved()` | `featherpanel:admin:settings:category:retrieved` |
| `SettingsEvent::onSettingsError()` | `featherpanel:admin:settings:error` |
| `SettingsEvent::onSettingsRetrieved()` | `featherpanel:admin:settings:retrieved` |
| `SettingsEvent::onSettingsUpdated()` | `featherpanel:admin:settings:updated` |
| `SettingsEvent::onSettingUpdated()` | `featherpanel:admin:settings:setting:updated` |
| `SettingsEvent::onSettingValidationError()` | `featherpanel:admin:settings:validation:error` |

### SpellsEvent

15 events. Payload keys and emit sites: [../events/spells.html](../events/spells.html)

| Method | Event id |
| --- | --- |
| `SpellsEvent::onSpellCreated()` | `featherpanel:admin:spells:spell:created` |
| `SpellsEvent::onSpellDeleted()` | `featherpanel:admin:spells:spell:deleted` |
| `SpellsEvent::onSpellExported()` | `featherpanel:admin:spells:spell:exported` |
| `SpellsEvent::onSpellNotFound()` | `featherpanel:admin:spells:spell:not:found` |
| `SpellsEvent::onSpellRetrieved()` | `featherpanel:admin:spells:spell:retrieved` |
| `SpellsEvent::onSpellsByRealmRetrieved()` | `featherpanel:admin:spells:by:realm:retrieved` |
| `SpellsEvent::onSpellsError()` | `featherpanel:admin:spells:error` |
| `SpellsEvent::onSpellsImported()` | `featherpanel:admin:spells:spells:imported` |
| `SpellsEvent::onSpellsReordered()` | `featherpanel:admin:spells:reordered` |
| `SpellsEvent::onSpellsRetrieved()` | `featherpanel:admin:spells:retrieved` |
| `SpellsEvent::onSpellUpdated()` | `featherpanel:admin:spells:spell:updated` |
| `SpellsEvent::onSpellVariableCreated()` | `featherpanel:admin:spells:variable:created` |
| `SpellsEvent::onSpellVariableDeleted()` | `featherpanel:admin:spells:variable:deleted` |
| `SpellsEvent::onSpellVariablesRetrieved()` | `featherpanel:admin:spells:variables:retrieved` |
| `SpellsEvent::onSpellVariableUpdated()` | `featherpanel:admin:spells:variable:updated` |

### SubdomainsEvent

10 events. Payload keys and emit sites: [../events/subdomains.html](../events/subdomains.html)

| Method | Event id |
| --- | --- |
| `SubdomainsEvent::onSubdomainCreated()` | `featherpanel:user:subdomain:created` |
| `SubdomainsEvent::onSubdomainDeleted()` | `featherpanel:user:subdomain:deleted` |
| `SubdomainsEvent::onSubdomainDomainCreated()` | `featherpanel:admin:subdomains:domain:created` |
| `SubdomainsEvent::onSubdomainDomainDeleted()` | `featherpanel:admin:subdomains:domain:deleted` |
| `SubdomainsEvent::onSubdomainDomainNotFound()` | `featherpanel:admin:subdomains:domain:not:found` |
| `SubdomainsEvent::onSubdomainDomainRetrieved()` | `featherpanel:admin:subdomains:domain:retrieved` |
| `SubdomainsEvent::onSubdomainDomainsRetrieved()` | `featherpanel:admin:subdomains:domains:retrieved` |
| `SubdomainsEvent::onSubdomainDomainUpdated()` | `featherpanel:admin:subdomains:domain:updated` |
| `SubdomainsEvent::onSubdomainsError()` | `featherpanel:admin:subdomains:error` |
| `SubdomainsEvent::onSubdomainSettingsUpdated()` | `featherpanel:admin:subdomains:settings:updated` |

### TicketEvent

21 events. Payload keys and emit sites: [../events/ticket.html](../events/ticket.html)

| Method | Event id |
| --- | --- |
| `TicketEvent::onTicketAttachmentCreated()` | `featherpanel:ticket:attachment:created` |
| `TicketEvent::onTicketAttachmentDeleted()` | `featherpanel:ticket:attachment:deleted` |
| `TicketEvent::onTicketAttachmentUpdated()` | `featherpanel:ticket:attachment:updated` |
| `TicketEvent::onTicketCategoryCreated()` | `featherpanel:ticket:category:created` |
| `TicketEvent::onTicketCategoryDeleted()` | `featherpanel:ticket:category:deleted` |
| `TicketEvent::onTicketCategoryUpdated()` | `featherpanel:ticket:category:updated` |
| `TicketEvent::onTicketClosed()` | `featherpanel:ticket:closed` |
| `TicketEvent::onTicketCreated()` | `featherpanel:ticket:created` |
| `TicketEvent::onTicketDeleted()` | `featherpanel:ticket:deleted` |
| `TicketEvent::onTicketMessageCreated()` | `featherpanel:ticket:message:created` |
| `TicketEvent::onTicketMessageDeleted()` | `featherpanel:ticket:message:deleted` |
| `TicketEvent::onTicketMessageUpdated()` | `featherpanel:ticket:message:updated` |
| `TicketEvent::onTicketPriorityCreated()` | `featherpanel:ticket:priority:created` |
| `TicketEvent::onTicketPriorityDeleted()` | `featherpanel:ticket:priority:deleted` |
| `TicketEvent::onTicketPriorityUpdated()` | `featherpanel:ticket:priority:updated` |
| `TicketEvent::onTicketReopened()` | `featherpanel:ticket:reopened` |
| `TicketEvent::onTicketStatusChanged()` | `featherpanel:ticket:status:changed` |
| `TicketEvent::onTicketStatusCreated()` | `featherpanel:ticket:status:created` |
| `TicketEvent::onTicketStatusDeleted()` | `featherpanel:ticket:status:deleted` |
| `TicketEvent::onTicketStatusUpdated()` | `featherpanel:ticket:status:updated` |
| `TicketEvent::onTicketUpdated()` | `featherpanel:ticket:updated` |

### UserApiClientEvent

4 events. Payload keys and emit sites: [../events/user-api-client.html](../events/user-api-client.html)

| Method | Event id |
| --- | --- |
| `UserApiClientEvent::onUserApiClientCreated()` | `featherpanel:user:api_client:created` |
| `UserApiClientEvent::onUserApiClientDeleted()` | `featherpanel:user:api_client:deleted` |
| `UserApiClientEvent::onUserApiClientError()` | `featherpanel:user:api_client:error` |
| `UserApiClientEvent::onUserApiClientUpdated()` | `featherpanel:user:api_client:updated` |

### UserEvent

10 events. Payload keys and emit sites: [../events/user.html](../events/user.html)

| Method | Event id |
| --- | --- |
| `UserEvent::onUserApiKeyCreated()` | `featherpanel:user:api_client:created` |
| `UserEvent::onUserApiKeyDeleted()` | `featherpanel:user:api_client:deleted` |
| `UserEvent::onUserApiKeyUpdated()` | `featherpanel:user:api_client:updated` |
| `UserEvent::onUserCreated()` | `featherpanel:user:created` |
| `UserEvent::onUserDeleted()` | `featherpanel:user:deleted` |
| `UserEvent::onUserSshKeyCreated()` | `featherpanel:user:ssh_key:created` |
| `UserEvent::onUserSshKeyDeleted()` | `featherpanel:user:ssh_key:deleted` |
| `UserEvent::onUserSshKeyUpdated()` | `featherpanel:user:ssh_key:updated` |
| `UserEvent::onUserUpdate()` | `featherpanel:user:update` |
| `UserEvent::onUserUpdated()` | `featherpanel:user:updated` |

### UserSshKeyEvent

4 events. Payload keys and emit sites: [../events/user-ssh-key.html](../events/user-ssh-key.html)

| Method | Event id |
| --- | --- |
| `UserSshKeyEvent::onUserSshKeyCreated()` | `featherpanel:user:ssh_key:created` |
| `UserSshKeyEvent::onUserSshKeyDeleted()` | `featherpanel:user:ssh_key:deleted` |
| `UserSshKeyEvent::onUserSshKeyError()` | `featherpanel:user:ssh_key:error` |
| `UserSshKeyEvent::onUserSshKeyUpdated()` | `featherpanel:user:ssh_key:updated` |

### VdsEvent

17 events. Payload keys and emit sites: [../events/vds.html](../events/vds.html)

| Method | Event id |
| --- | --- |
| `VdsEvent::onVdsBackupCreated()` | `featherpanel:vds:backup:create` |
| `VdsEvent::onVdsBackupDeleted()` | `featherpanel:vds:backup:delete` |
| `VdsEvent::onVdsBackupRestored()` | `featherpanel:vds:backup:restore` |
| `VdsEvent::onVdsConsoleAccessed()` | `featherpanel:vds:console:access` |
| `VdsEvent::onVdsCreated()` | `featherpanel:vds:created` |
| `VdsEvent::onVdsDeleted()` | `featherpanel:vds:deleted` |
| `VdsEvent::onVdsIsoMounted()` | `featherpanel:vds:iso:mount` |
| `VdsEvent::onVdsIsoUnmounted()` | `featherpanel:vds:iso:unmount` |
| `VdsEvent::onVdsNetworkUpdated()` | `featherpanel:vds:network:update` |
| `VdsEvent::onVdsPowerAction()` | `featherpanel:vds:power:action` |
| `VdsEvent::onVdsQemuHardwareUpdated()` | `featherpanel:vds:qemu:hardware:update` |
| `VdsEvent::onVdsReinstalled()` | `featherpanel:vds:reinstall` |
| `VdsEvent::onVdsSubuserCreated()` | `featherpanel:vds:subuser:create` |
| `VdsEvent::onVdsSubuserDeleted()` | `featherpanel:vds:subuser:delete` |
| `VdsEvent::onVdsSuspended()` | `featherpanel:vds:suspended` |
| `VdsEvent::onVdsUnsuspended()` | `featherpanel:vds:unsuspended` |
| `VdsEvent::onVdsUpdated()` | `featherpanel:vds:updated` |

### VdsNodeEvent

10 events. Payload keys and emit sites: [../events/vds-node.html](../events/vds-node.html)

| Method | Event id |
| --- | --- |
| `VdsNodeEvent::onVdsNodeCreated()` | `featherpanel:vds:node:create` |
| `VdsNodeEvent::onVdsNodeDeleted()` | `featherpanel:vds:node:delete` |
| `VdsNodeEvent::onVdsNodeIpCreated()` | `featherpanel:vds:node:ip:create` |
| `VdsNodeEvent::onVdsNodeIpDeleted()` | `featherpanel:vds:node:ip:delete` |
| `VdsNodeEvent::onVdsNodeIpPrimarySet()` | `featherpanel:vds:node:ip:primary` |
| `VdsNodeEvent::onVdsNodeIpUpdated()` | `featherpanel:vds:node:ip:update` |
| `VdsNodeEvent::onVdsNodeUpdated()` | `featherpanel:vds:node:update` |
| `VdsNodeEvent::onVdsTemplateCreated()` | `featherpanel:vds:template:create` |
| `VdsNodeEvent::onVdsTemplateDeleted()` | `featherpanel:vds:template:delete` |
| `VdsNodeEvent::onVdsTemplateUpdated()` | `featherpanel:vds:template:update` |

### WebNodeEvent

4 events. Payload keys and emit sites: [../events/web-node.html](../events/web-node.html)

| Method | Event id |
| --- | --- |
| `WebNodeEvent::onWebNodeCreated()` | `featherpanel:web:node:create` |
| `WebNodeEvent::onWebNodeDeleted()` | `featherpanel:web:node:delete` |
| `WebNodeEvent::onWebNodeKeyReset()` | `featherpanel:web:node:key:reset` |
| `WebNodeEvent::onWebNodeUpdated()` | `featherpanel:web:node:update` |

### WebPlatesEvent

3 events. Payload keys and emit sites: [../events/web-plates.html](../events/web-plates.html)

| Method | Event id |
| --- | --- |
| `WebPlatesEvent::onWebPlateCreated()` | `featherpanel:admin:web_plates:plate:created` |
| `WebPlatesEvent::onWebPlateDeleted()` | `featherpanel:admin:web_plates:plate:deleted` |
| `WebPlatesEvent::onWebPlateUpdated()` | `featherpanel:admin:web_plates:plate:updated` |

### WebSpaceEvent

33 events. Payload keys and emit sites: [../events/web-space.html](../events/web-space.html)

| Method | Event id |
| --- | --- |
| `WebSpaceEvent::onWebSpaceAppInstalled()` | `featherpanel:webspace:app:installed` |
| `WebSpaceEvent::onWebSpaceAppUpdated()` | `featherpanel:webspace:app:updated` |
| `WebSpaceEvent::onWebSpaceBackupCreated()` | `featherpanel:webspace:backup:create` |
| `WebSpaceEvent::onWebSpaceBackupDeleted()` | `featherpanel:webspace:backup:delete` |
| `WebSpaceEvent::onWebSpaceBackupRestored()` | `featherpanel:webspace:backup:restore` |
| `WebSpaceEvent::onWebSpaceConsoleAccessed()` | `featherpanel:webspace:console:access` |
| `WebSpaceEvent::onWebSpaceCreated()` | `featherpanel:webspace:created` |
| `WebSpaceEvent::onWebSpaceDatabaseCreated()` | `featherpanel:webspace:database:create` |
| `WebSpaceEvent::onWebSpaceDatabaseDeleted()` | `featherpanel:webspace:database:delete` |
| `WebSpaceEvent::onWebSpaceDeleted()` | `featherpanel:webspace:deleted` |
| `WebSpaceEvent::onWebSpaceDirectoryCreated()` | `featherpanel:webspace:directory:create` |
| `WebSpaceEvent::onWebSpaceDnsRecordCreated()` | `featherpanel:webspace:dns:record:created` |
| `WebSpaceEvent::onWebSpaceDnsRecordDeleted()` | `featherpanel:webspace:dns:record:deleted` |
| `WebSpaceEvent::onWebSpaceDnsRecordUpdated()` | `featherpanel:webspace:dns:record:updated` |
| `WebSpaceEvent::onWebSpaceDnsZoneLinked()` | `featherpanel:webspace:dns:zone:linked` |
| `WebSpaceEvent::onWebSpaceDnsZoneUnlinked()` | `featherpanel:webspace:dns:zone:unlinked` |
| `WebSpaceEvent::onWebSpaceFilesDeleted()` | `featherpanel:webspace:files:delete` |
| `WebSpaceEvent::onWebSpaceMailboxCreated()` | `featherpanel:webspace:mailbox:create` |
| `WebSpaceEvent::onWebSpaceMailboxDeleted()` | `featherpanel:webspace:mailbox:delete` |
| `WebSpaceEvent::onWebSpaceReinstalled()` | `featherpanel:webspace:reinstall` |
| `WebSpaceEvent::onWebSpaceScheduleCreated()` | `featherpanel:webspace:schedule:create` |
| `WebSpaceEvent::onWebSpaceScheduleDeleted()` | `featherpanel:webspace:schedule:delete` |
| `WebSpaceEvent::onWebSpaceScheduleUpdated()` | `featherpanel:webspace:schedule:update` |
| `WebSpaceEvent::onWebSpaceSftpAccountCreated()` | `featherpanel:webspace:sftp:account:created` |
| `WebSpaceEvent::onWebSpaceSftpAccountDeleted()` | `featherpanel:webspace:sftp:account:deleted` |
| `WebSpaceEvent::onWebSpaceSftpAccountUpdated()` | `featherpanel:webspace:sftp:account:updated` |
| `WebSpaceEvent::onWebSpaceSftpPasswordReset()` | `featherpanel:webspace:sftp:password:reset` |
| `WebSpaceEvent::onWebSpaceSubuserCreated()` | `featherpanel:webspace:subuser:create` |
| `WebSpaceEvent::onWebSpaceSubuserDeleted()` | `featherpanel:webspace:subuser:delete` |
| `WebSpaceEvent::onWebSpaceSubuserUpdated()` | `featherpanel:webspace:subuser:update` |
| `WebSpaceEvent::onWebSpaceSuspended()` | `featherpanel:webspace:suspended` |
| `WebSpaceEvent::onWebSpaceUnsuspended()` | `featherpanel:webspace:unsuspended` |
| `WebSpaceEvent::onWebSpaceUpdated()` | `featherpanel:webspace:updated` |

### WingsEvent

22 events. Payload keys and emit sites: [../events/wings.html](../events/wings.html)

| Method | Event id |
| --- | --- |
| `WingsEvent::onWingsActivityLogged()` | `featherpanel:wings:activity:logged` |
| `WingsEvent::onWingsBackupCompletionReported()` | `featherpanel:wings:backup:completion:reported` |
| `WingsEvent::onWingsBackupRestorationReported()` | `featherpanel:wings:backup:restoration:reported` |
| `WingsEvent::onWingsBackupUploadInfoRetrieved()` | `featherpanel:wings:backup:upload:info:retrieved` |
| `WingsEvent::onWingsDockerDiskUsageRetrieved()` | `featherpanel:wings:docker:disk:usage:retrieved` |
| `WingsEvent::onWingsDockerPruneCompleted()` | `featherpanel:wings:docker:prune:completed` |
| `WingsEvent::onWingsError()` | `featherpanel:wings:error` |
| `WingsEvent::onWingsNodeConnectionStatus()` | `featherpanel:wings:node:connection:status` |
| `WingsEvent::onWingsNodeError()` | `featherpanel:wings:node:error` |
| `WingsEvent::onWingsNodeIpsRetrieved()` | `featherpanel:wings:node:ips:retrieved` |
| `WingsEvent::onWingsNodeSystemInfoRetrieved()` | `featherpanel:wings:node:system:info:retrieved` |
| `WingsEvent::onWingsNodeUtilizationRetrieved()` | `featherpanel:wings:node:utilization:retrieved` |
| `WingsEvent::onWingsRemoteServersRetrieved()` | `featherpanel:wings:servers:remote:retrieved` |
| `WingsEvent::onWingsServerConnectionStatus()` | `featherpanel:wings:server:connection:status` |
| `WingsEvent::onWingsServerError()` | `featherpanel:wings:server:error` |
| `WingsEvent::onWingsServerInfoRetrieved()` | `featherpanel:wings:server:info:retrieved` |
| `WingsEvent::onWingsServerInstallCompleted()` | `featherpanel:wings:server:install:completed` |
| `WingsEvent::onWingsServerInstallRetrieved()` | `featherpanel:wings:server:install:retrieved` |
| `WingsEvent::onWingsServersResetCompleted()` | `featherpanel:wings:servers:reset:completed` |
| `WingsEvent::onWingsServerStatusRetrieved()` | `featherpanel:wings:server:status:retrieved` |
| `WingsEvent::onWingsServerStatusUpdated()` | `featherpanel:wings:server:status:updated` |
| `WingsEvent::onWingsSftpAuthentication()` | `featherpanel:wings:sftp:authentication` |
