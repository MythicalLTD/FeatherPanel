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
    name: "Subdomains",
    events: [
  {
    "method": "onSubdomainCreated",
    "name": "featherpanel:user:subdomain:created",
    "callback": "string subdomain uuid, array subdomain data, array server data.",
    "category": "Subdomains",
    "actualData": [
      "server_data",
      "subdomain_data",
      "subdomain_uuid",
      "user"
    ],
    "sourceFiles": [
      "backend/app/Controllers/User/Server/SubdomainController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\SubdomainsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(SubdomainsEvent::onSubdomainCreated(), function ($serverData, $subdomainData, $subdomainUuid, $user) {\n        // Handle featherpanel:user:subdomain:created\n        // Data keys: server_data, subdomain_data, subdomain_uuid, user\n    });\n}"
  },
  {
    "method": "onSubdomainDeleted",
    "name": "featherpanel:user:subdomain:deleted",
    "callback": "string subdomain uuid, array subdomain data, array server data.",
    "category": "Subdomains",
    "actualData": [
      "server_data",
      "subdomain_data",
      "subdomain_uuid",
      "user"
    ],
    "sourceFiles": [
      "backend/app/Controllers/User/Server/SubdomainController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\SubdomainsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(SubdomainsEvent::onSubdomainDeleted(), function ($serverData, $subdomainData, $subdomainUuid, $user) {\n        // Handle featherpanel:user:subdomain:deleted\n        // Data keys: server_data, subdomain_data, subdomain_uuid, user\n    });\n}"
  },
  {
    "method": "onSubdomainDomainCreated",
    "name": "featherpanel:admin:subdomains:domain:created",
    "callback": "array domain data.",
    "category": "Subdomains",
    "actualData": [
      "created_by",
      "domain_data"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/SubdomainsController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\SubdomainsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(SubdomainsEvent::onSubdomainDomainCreated(), function ($createdBy, $domainData) {\n        // Handle featherpanel:admin:subdomains:domain:created\n        // Data keys: created_by, domain_data\n    });\n}"
  },
  {
    "method": "onSubdomainDomainDeleted",
    "name": "featherpanel:admin:subdomains:domain:deleted",
    "callback": "string domain uuid, array domain data.",
    "category": "Subdomains",
    "actualData": [
      "deleted_by",
      "domain_data",
      "domain_uuid"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/SubdomainsController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\SubdomainsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(SubdomainsEvent::onSubdomainDomainDeleted(), function ($deletedBy, $domainData, $domainUuid) {\n        // Handle featherpanel:admin:subdomains:domain:deleted\n        // Data keys: deleted_by, domain_data, domain_uuid\n    });\n}"
  },
  {
    "method": "onSubdomainDomainNotFound",
    "name": "featherpanel:admin:subdomains:domain:not:found",
    "callback": "string domain uuid, string error message.",
    "category": "Subdomains",
    "actualData": [
      "domain_uuid",
      "error_message"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/SubdomainsController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\SubdomainsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(SubdomainsEvent::onSubdomainDomainNotFound(), function ($domainUuid, $errorMessage) {\n        // Handle featherpanel:admin:subdomains:domain:not:found\n        // Data keys: domain_uuid, error_message\n    });\n}"
  },
  {
    "method": "onSubdomainDomainRetrieved",
    "name": "featherpanel:admin:subdomains:domain:retrieved",
    "callback": "string domain uuid, array domain data.",
    "category": "Subdomains",
    "actualData": [
      "domain_data",
      "domain_uuid"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/SubdomainsController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\SubdomainsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(SubdomainsEvent::onSubdomainDomainRetrieved(), function ($domainData, $domainUuid) {\n        // Handle featherpanel:admin:subdomains:domain:retrieved\n        // Data keys: domain_data, domain_uuid\n    });\n}"
  },
  {
    "method": "onSubdomainDomainsRetrieved",
    "name": "featherpanel:admin:subdomains:domains:retrieved",
    "callback": "array domains list.",
    "category": "Subdomains",
    "actualData": [
      "domains",
      "filters",
      "includeInactive",
      "limit",
      "page",
      "pagination",
      "search",
      "total"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/SubdomainsController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\SubdomainsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(SubdomainsEvent::onSubdomainDomainsRetrieved(), function ($domains, $filters, $includeInactive, $limit, $page, $pagination, $search, $total) {\n        // Handle featherpanel:admin:subdomains:domains:retrieved\n        // Data keys: domains, filters, includeInactive, limit, page, pagination, search, total\n    });\n}"
  },
  {
    "method": "onSubdomainDomainUpdated",
    "name": "featherpanel:admin:subdomains:domain:updated",
    "callback": "string domain uuid, array old data, array new data.",
    "category": "Subdomains",
    "actualData": [
      "domain_uuid",
      "new_data",
      "old_data",
      "updated_by"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/SubdomainsController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\SubdomainsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(SubdomainsEvent::onSubdomainDomainUpdated(), function ($domainUuid, $newData, $oldData, $updatedBy) {\n        // Handle featherpanel:admin:subdomains:domain:updated\n        // Data keys: domain_uuid, new_data, old_data, updated_by\n    });\n}"
  },
  {
    "method": "onSubdomainsError",
    "name": "featherpanel:admin:subdomains:error",
    "callback": "string error message, array context.",
    "category": "Subdomains",
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\SubdomainsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(SubdomainsEvent::onSubdomainsError(), function ($message, $context) {\n        // Handle featherpanel:admin:subdomains:error\n        // Parameters: string error message, array context.\n    });\n}"
  },
  {
    "method": "onSubdomainSettingsUpdated",
    "name": "featherpanel:admin:subdomains:settings:updated",
    "callback": "array settings data.",
    "category": "Subdomains",
    "actualData": [
      "cloudflare_api_key_set",
      "cloudflare_email",
      "max_subdomains_per_server",
      "settings",
      "updated_by"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/SubdomainsController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\SubdomainsEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(SubdomainsEvent::onSubdomainSettingsUpdated(), function ($cloudflareApiKeySet, $cloudflareEmail, $maxSubdomainsPerServer, $settings, $updatedBy) {\n        // Handle featherpanel:admin:subdomains:settings:updated\n        // Data keys: cloudflare_api_key_set, cloudflare_email, max_subdomains_per_server, settings, updated_by\n    });\n}"
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
