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
    name: "Knowledgebase",
    events: [
  {
    "method": "onKnowledgebaseArticleCreated",
    "name": "featherpanel:admin:knowledgebase:article:created",
    "callback": "array article, array created_by.",
    "category": "Knowledgebase",
    "actualData": [
      "article",
      "created_by"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/KnowledgebaseController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\KnowledgebaseEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(KnowledgebaseEvent::onKnowledgebaseArticleCreated(), function ($article, $createdBy) {\n        // Handle featherpanel:admin:knowledgebase:article:created\n        // Data keys: article, created_by\n    });\n}"
  },
  {
    "method": "onKnowledgebaseArticleDeleted",
    "name": "featherpanel:admin:knowledgebase:article:deleted",
    "callback": "array article, array deleted_by.",
    "category": "Knowledgebase",
    "actualData": [
      "article",
      "deleted_by"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/KnowledgebaseController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\KnowledgebaseEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(KnowledgebaseEvent::onKnowledgebaseArticleDeleted(), function ($article, $deletedBy) {\n        // Handle featherpanel:admin:knowledgebase:article:deleted\n        // Data keys: article, deleted_by\n    });\n}"
  },
  {
    "method": "onKnowledgebaseArticleRetrieved",
    "name": "featherpanel:admin:knowledgebase:article:retrieved",
    "callback": "array article.",
    "category": "Knowledgebase",
    "actualData": [
      "article"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/KnowledgebaseController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\KnowledgebaseEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(KnowledgebaseEvent::onKnowledgebaseArticleRetrieved(), function ($article) {\n        // Handle featherpanel:admin:knowledgebase:article:retrieved\n        // Data keys: article\n    });\n}"
  },
  {
    "method": "onKnowledgebaseArticlesRetrieved",
    "name": "featherpanel:admin:knowledgebase:articles:retrieved",
    "callback": "array articles, array pagination, array search.",
    "category": "Knowledgebase",
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\KnowledgebaseEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(KnowledgebaseEvent::onKnowledgebaseArticlesRetrieved(), function ($articles, $pagination, $search) {\n        // Handle featherpanel:admin:knowledgebase:articles:retrieved\n        // Parameters: array articles, array pagination, array search.\n    });\n}"
  },
  {
    "method": "onKnowledgebaseArticleUpdated",
    "name": "featherpanel:admin:knowledgebase:article:updated",
    "callback": "array article, array updated_by.",
    "category": "Knowledgebase",
    "actualData": [
      "article",
      "updated_by"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/KnowledgebaseController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\KnowledgebaseEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(KnowledgebaseEvent::onKnowledgebaseArticleUpdated(), function ($article, $updatedBy) {\n        // Handle featherpanel:admin:knowledgebase:article:updated\n        // Data keys: article, updated_by\n    });\n}"
  },
  {
    "method": "onKnowledgebaseAttachmentDeleted",
    "name": "featherpanel:admin:knowledgebase:attachment:deleted",
    "callback": "array article, array attachment, array deleted_by.",
    "category": "Knowledgebase",
    "actualData": [
      "article",
      "attachment",
      "deleted_by"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/KnowledgebaseController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\KnowledgebaseEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(KnowledgebaseEvent::onKnowledgebaseAttachmentDeleted(), function ($article, $attachment, $deletedBy) {\n        // Handle featherpanel:admin:knowledgebase:attachment:deleted\n        // Data keys: article, attachment, deleted_by\n    });\n}"
  },
  {
    "method": "onKnowledgebaseAttachmentsRetrieved",
    "name": "featherpanel:admin:knowledgebase:attachments:retrieved",
    "callback": "array article, array attachments.",
    "category": "Knowledgebase",
    "actualData": [
      "article",
      "attachments"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/KnowledgebaseController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\KnowledgebaseEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(KnowledgebaseEvent::onKnowledgebaseAttachmentsRetrieved(), function ($article, $attachments) {\n        // Handle featherpanel:admin:knowledgebase:attachments:retrieved\n        // Data keys: article, attachments\n    });\n}"
  },
  {
    "method": "onKnowledgebaseAttachmentUploaded",
    "name": "featherpanel:admin:knowledgebase:attachment:uploaded",
    "callback": "array article, array attachment, array uploaded_by.",
    "category": "Knowledgebase",
    "actualData": [
      "article",
      "attachment",
      "uploaded_by"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/KnowledgebaseController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\KnowledgebaseEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(KnowledgebaseEvent::onKnowledgebaseAttachmentUploaded(), function ($article, $attachment, $uploadedBy) {\n        // Handle featherpanel:admin:knowledgebase:attachment:uploaded\n        // Data keys: article, attachment, uploaded_by\n    });\n}"
  },
  {
    "method": "onKnowledgebaseCategoriesRetrieved",
    "name": "featherpanel:admin:knowledgebase:categories:retrieved",
    "callback": "array categories, array pagination, array search.",
    "category": "Knowledgebase",
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\KnowledgebaseEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(KnowledgebaseEvent::onKnowledgebaseCategoriesRetrieved(), function ($categories, $pagination, $search) {\n        // Handle featherpanel:admin:knowledgebase:categories:retrieved\n        // Parameters: array categories, array pagination, array search.\n    });\n}"
  },
  {
    "method": "onKnowledgebaseCategoryCreated",
    "name": "featherpanel:admin:knowledgebase:category:created",
    "callback": "array category, array created_by.",
    "category": "Knowledgebase",
    "actualData": [
      "category",
      "created_by"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/KnowledgebaseController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\KnowledgebaseEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(KnowledgebaseEvent::onKnowledgebaseCategoryCreated(), function ($category, $createdBy) {\n        // Handle featherpanel:admin:knowledgebase:category:created\n        // Data keys: category, created_by\n    });\n}"
  },
  {
    "method": "onKnowledgebaseCategoryDeleted",
    "name": "featherpanel:admin:knowledgebase:category:deleted",
    "callback": "array category, array deleted_by.",
    "category": "Knowledgebase",
    "actualData": [
      "category",
      "deleted_by"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/KnowledgebaseController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\KnowledgebaseEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(KnowledgebaseEvent::onKnowledgebaseCategoryDeleted(), function ($category, $deletedBy) {\n        // Handle featherpanel:admin:knowledgebase:category:deleted\n        // Data keys: category, deleted_by\n    });\n}"
  },
  {
    "method": "onKnowledgebaseCategoryRetrieved",
    "name": "featherpanel:admin:knowledgebase:category:retrieved",
    "callback": "array category.",
    "category": "Knowledgebase",
    "actualData": [
      "category"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/KnowledgebaseController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\KnowledgebaseEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(KnowledgebaseEvent::onKnowledgebaseCategoryRetrieved(), function ($category) {\n        // Handle featherpanel:admin:knowledgebase:category:retrieved\n        // Data keys: category\n    });\n}"
  },
  {
    "method": "onKnowledgebaseCategoryUpdated",
    "name": "featherpanel:admin:knowledgebase:category:updated",
    "callback": "array category, array updated_by.",
    "category": "Knowledgebase",
    "actualData": [
      "category",
      "updated_by"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/KnowledgebaseController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\KnowledgebaseEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(KnowledgebaseEvent::onKnowledgebaseCategoryUpdated(), function ($category, $updatedBy) {\n        // Handle featherpanel:admin:knowledgebase:category:updated\n        // Data keys: category, updated_by\n    });\n}"
  },
  {
    "method": "onKnowledgebaseIconUploaded",
    "name": "featherpanel:admin:knowledgebase:icon:uploaded",
    "callback": "string filename, string url, array uploaded_by.",
    "category": "Knowledgebase",
    "actualData": [
      "filename",
      "uploaded_by",
      "url"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/KnowledgebaseController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\KnowledgebaseEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(KnowledgebaseEvent::onKnowledgebaseIconUploaded(), function ($filename, $uploadedBy, $url) {\n        // Handle featherpanel:admin:knowledgebase:icon:uploaded\n        // Data keys: filename, uploaded_by, url\n    });\n}"
  },
  {
    "method": "onKnowledgebaseTagCreated",
    "name": "featherpanel:admin:knowledgebase:tag:created",
    "callback": "array article, array tag, array created_by.",
    "category": "Knowledgebase",
    "actualData": [
      "article",
      "created_by",
      "tag"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/KnowledgebaseController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\KnowledgebaseEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(KnowledgebaseEvent::onKnowledgebaseTagCreated(), function ($article, $createdBy, $tag) {\n        // Handle featherpanel:admin:knowledgebase:tag:created\n        // Data keys: article, created_by, tag\n    });\n}"
  },
  {
    "method": "onKnowledgebaseTagDeleted",
    "name": "featherpanel:admin:knowledgebase:tag:deleted",
    "callback": "array article, array tag, array deleted_by.",
    "category": "Knowledgebase",
    "actualData": [
      "article",
      "deleted_by",
      "tag"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/KnowledgebaseController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\KnowledgebaseEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(KnowledgebaseEvent::onKnowledgebaseTagDeleted(), function ($article, $deletedBy, $tag) {\n        // Handle featherpanel:admin:knowledgebase:tag:deleted\n        // Data keys: article, deleted_by, tag\n    });\n}"
  },
  {
    "method": "onKnowledgebaseTagsRetrieved",
    "name": "featherpanel:admin:knowledgebase:tags:retrieved",
    "callback": "array article, array tags.",
    "category": "Knowledgebase",
    "actualData": [
      "article",
      "tags"
    ],
    "sourceFiles": [
      "backend/app/Controllers/Admin/KnowledgebaseController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\KnowledgebaseEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(KnowledgebaseEvent::onKnowledgebaseTagsRetrieved(), function ($article, $tags) {\n        // Handle featherpanel:admin:knowledgebase:tags:retrieved\n        // Data keys: article, tags\n    });\n}"
  },
  {
    "method": "onUserKnowledgebaseArticleRetrieved",
    "name": "featherpanel:user:knowledgebase:article:retrieved",
    "callback": "array article, array attachments, array tags, array|null user.",
    "category": "Knowledgebase",
    "actualData": [
      "article",
      "attachments",
      "tags",
      "user"
    ],
    "sourceFiles": [
      "backend/app/Controllers/User/KnowledgebaseController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\KnowledgebaseEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(KnowledgebaseEvent::onUserKnowledgebaseArticleRetrieved(), function ($article, $attachments, $tags, $user) {\n        // Handle featherpanel:user:knowledgebase:article:retrieved\n        // Data keys: article, attachments, tags, user\n    });\n}"
  },
  {
    "method": "onUserKnowledgebaseArticlesRetrieved",
    "name": "featherpanel:user:knowledgebase:articles:retrieved",
    "callback": "array articles, array pagination.",
    "category": "Knowledgebase",
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\KnowledgebaseEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(KnowledgebaseEvent::onUserKnowledgebaseArticlesRetrieved(), function ($articles, $pagination) {\n        // Handle featherpanel:user:knowledgebase:articles:retrieved\n        // Parameters: array articles, array pagination.\n    });\n}"
  },
  {
    "method": "onUserKnowledgebaseCategoriesRetrieved",
    "name": "featherpanel:user:knowledgebase:categories:retrieved",
    "callback": "array categories, array pagination.",
    "category": "Knowledgebase",
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\KnowledgebaseEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(KnowledgebaseEvent::onUserKnowledgebaseCategoriesRetrieved(), function ($categories, $pagination) {\n        // Handle featherpanel:user:knowledgebase:categories:retrieved\n        // Parameters: array categories, array pagination.\n    });\n}"
  },
  {
    "method": "onUserKnowledgebaseCategoryArticlesRetrieved",
    "name": "featherpanel:user:knowledgebase:category:articles:retrieved",
    "callback": "array category, array articles, array pagination.",
    "category": "Knowledgebase",
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\KnowledgebaseEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(KnowledgebaseEvent::onUserKnowledgebaseCategoryArticlesRetrieved(), function ($category, $articles, $pagination) {\n        // Handle featherpanel:user:knowledgebase:category:articles:retrieved\n        // Parameters: array category, array articles, array pagination.\n    });\n}"
  },
  {
    "method": "onUserKnowledgebaseCategoryRetrieved",
    "name": "featherpanel:user:knowledgebase:category:retrieved",
    "callback": "array category.",
    "category": "Knowledgebase",
    "actualData": [
      "category"
    ],
    "sourceFiles": [
      "backend/app/Controllers/User/KnowledgebaseController.php"
    ],
    "exampleCode": "use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\KnowledgebaseEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(KnowledgebaseEvent::onUserKnowledgebaseCategoryRetrieved(), function ($category) {\n        // Handle featherpanel:user:knowledgebase:category:retrieved\n        // Data keys: category\n    });\n}"
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
