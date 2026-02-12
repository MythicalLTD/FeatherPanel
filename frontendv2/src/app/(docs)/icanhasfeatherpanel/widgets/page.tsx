// @ts-nocheck
'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const widgets = [
    {
        slug: 'admin-ai-agent',
        sanitizedSlug: 'admin-ai-agent',
        files: ['src/app/(app)/admin/featherpanel-ai-agent/page.tsx'],
        injectionPoints: ['after-header', 'before-content', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'admin-databases-management',
        sanitizedSlug: 'admin-databases-management',
        files: ['src/app/(app)/admin/databases/management/page.tsx'],
        injectionPoints: ['after-header', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'admin-dev-plugins',
        sanitizedSlug: 'admin-dev-plugins',
        files: ['src/app/(app)/admin/dev/plugins/page.tsx'],
        injectionPoints: ['after-header', 'before-list', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'admin-feathercloud-marketplace',
        sanitizedSlug: 'admin-feathercloud-marketplace',
        files: ['src/app/(app)/admin/feathercloud/marketplace/page.tsx'],
        injectionPoints: ['after-header', 'before-content', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'admin-feathercloud-plugins',
        sanitizedSlug: 'admin-feathercloud-plugins',
        files: ['src/app/(app)/admin/feathercloud/plugins/page.tsx'],
        injectionPoints: ['after-header', 'before-content', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'admin-feathercloud-spells',
        sanitizedSlug: 'admin-feathercloud-spells',
        files: ['src/app/(app)/admin/feathercloud/spells/page.tsx'],
        injectionPoints: ['after-header', 'before-content', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'admin-feathercloud-translations',
        sanitizedSlug: 'admin-feathercloud-translations',
        files: ['src/app/(app)/admin/feathercloud/translations/page.tsx'],
        injectionPoints: ['after-header', 'before-content', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'admin-home',
        sanitizedSlug: 'admin-home',
        files: ['src/app/(app)/admin/page.tsx'],
        injectionPoints: ['after-header', 'after-widgets-grid', 'before-widgets-grid', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'admin-images',
        sanitizedSlug: 'admin-images',
        files: ['src/app/(app)/admin/images/page.tsx'],
        injectionPoints: ['after-header', 'before-list', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'admin-knowledgebase-article-edit',
        sanitizedSlug: 'admin-knowledgebase-article-edit',
        files: ['src/app/(app)/admin/knowledgebase/articles/[id]/edit/page.tsx'],
        injectionPoints: ['after-header', 'before-content', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'admin-knowledgebase-categories',
        sanitizedSlug: 'admin-knowledgebase-categories',
        files: ['src/app/(app)/admin/knowledgebase/categories/page.tsx'],
        injectionPoints: ['after-header', 'before-list', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'admin-knowledgebase-category-articles',
        sanitizedSlug: 'admin-knowledgebase-category-articles',
        files: ['src/app/(app)/admin/knowledgebase/categories/[id]/articles/page.tsx'],
        injectionPoints: ['after-header', 'before-list', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'admin-locations',
        sanitizedSlug: 'admin-locations',
        files: ['src/app/(app)/admin/locations/page.tsx'],
        injectionPoints: ['after-header', 'before-list', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'admin-mail-templates',
        sanitizedSlug: 'admin-mail-templates',
        files: ['src/app/(app)/admin/mail-templates/page.tsx'],
        injectionPoints: ['after-header', 'before-list', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'admin-nodes',
        sanitizedSlug: 'admin-nodes',
        files: ['src/app/(app)/admin/nodes/page.tsx'],
        injectionPoints: ['after-header', 'before-list', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'admin-nodes-status',
        sanitizedSlug: 'admin-nodes-status',
        files: ['src/app/(app)/admin/nodes/status/page.tsx'],
        injectionPoints: [
            'after-global-stats',
            'after-header',
            'after-individual-nodes',
            'after-resource-usage',
            'before-global-stats',
            'bottom-of-page',
            'top-of-page',
        ],
    },
    {
        slug: 'admin-notifications',
        sanitizedSlug: 'admin-notifications',
        files: ['src/app/(app)/admin/notifications/page.tsx'],
        injectionPoints: ['after-header', 'before-list', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'admin-plugins',
        sanitizedSlug: 'admin-plugins',
        files: ['src/app/(app)/admin/plugins/page.tsx'],
        injectionPoints: ['after-header', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'admin-pterodactyl-importer',
        sanitizedSlug: 'admin-pterodactyl-importer',
        files: ['src/app/(app)/admin/pterodactyl-importer/page.tsx'],
        injectionPoints: ['after-header', 'before-content', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'admin-rate-limits',
        sanitizedSlug: 'admin-rate-limits',
        files: ['src/app/(app)/admin/rate-limits/page.tsx'],
        injectionPoints: ['after-header', 'before-list', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'admin-realms',
        sanitizedSlug: 'admin-realms',
        files: ['src/app/(app)/admin/realms/page.tsx'],
        injectionPoints: ['after-header', 'before-list', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'admin-roles',
        sanitizedSlug: 'admin-roles',
        files: ['src/app/(app)/admin/roles/page.tsx'],
        injectionPoints: ['after-header', 'before-list', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'admin-servers',
        sanitizedSlug: 'admin-servers',
        files: ['src/app/(app)/admin/servers/page.tsx'],
        injectionPoints: ['after-header', 'before-list', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'admin-settings',
        sanitizedSlug: 'admin-settings',
        files: ['src/app/(app)/admin/settings/page.tsx'],
        injectionPoints: ['after-header', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'admin-spells',
        sanitizedSlug: 'admin-spells',
        files: ['src/app/(app)/admin/spells/page.tsx'],
        injectionPoints: ['after-header', 'before-list', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'admin-subdomains',
        sanitizedSlug: 'admin-subdomains',
        files: ['src/app/(app)/admin/subdomains/page.tsx'],
        injectionPoints: ['after-header', 'before-list', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'admin-tickets',
        sanitizedSlug: 'admin-tickets',
        files: ['src/app/(app)/admin/tickets/page.tsx'],
        injectionPoints: ['after-header', 'before-list', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'admin-tickets-view',
        sanitizedSlug: 'admin-tickets-view',
        files: ['src/app/(app)/admin/tickets/[uuid]/page.tsx'],
        injectionPoints: ['after-header', 'after-messages', 'sidebar-bottom', 'sidebar-top', 'top-of-page'],
    },
    {
        slug: 'admin-translations',
        sanitizedSlug: 'admin-translations',
        files: ['src/app/(app)/admin/translations/page.tsx'],
        injectionPoints: ['after-header', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'admin-users',
        sanitizedSlug: 'admin-users',
        files: ['src/app/(app)/admin/users/page.tsx'],
        injectionPoints: ['after-header', 'before-list', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'auth-forgot-password',
        sanitizedSlug: 'auth-forgot-password',
        files: ['src/app/(app)/auth/forgot-password/ForgotPasswordForm.tsx'],
        injectionPoints: [
            'auth-forgot-password-after-form',
            'auth-forgot-password-before-form',
            'auth-forgot-password-bottom',
            'auth-forgot-password-top',
        ],
    },
    {
        slug: 'auth-login',
        sanitizedSlug: 'auth-login',
        files: ['src/app/(app)/auth/login/LoginForm.tsx'],
        injectionPoints: ['auth-login-after-form', 'auth-login-before-form', 'auth-login-top'],
    },
    {
        slug: 'auth-register',
        sanitizedSlug: 'auth-register',
        files: ['src/app/(app)/auth/register/RegisterForm.tsx'],
        injectionPoints: [
            'auth-register-after-form',
            'auth-register-before-form',
            'auth-register-bottom',
            'auth-register-top',
        ],
    },
    {
        slug: 'auth-reset-password',
        sanitizedSlug: 'auth-reset-password',
        files: ['src/app/(app)/auth/reset-password/ResetPasswordForm.tsx'],
        injectionPoints: [
            'auth-reset-password-after-form',
            'auth-reset-password-before-form',
            'auth-reset-password-bottom',
            'auth-reset-password-top',
        ],
    },
    {
        slug: 'auth-setup-2fa',
        sanitizedSlug: 'auth-setup-2fa',
        files: ['src/app/(app)/auth/setup-2fa/SetupTwoFactorForm.tsx'],
        injectionPoints: [
            'auth-setup-2fa-after-form',
            'auth-setup-2fa-before-form',
            'auth-setup-2fa-bottom',
            'auth-setup-2fa-top',
        ],
    },
    {
        slug: 'auth-verify-2fa',
        sanitizedSlug: 'auth-verify-2fa',
        files: ['src/app/(app)/auth/verify-2fa/VerifyTwoFactorForm.tsx'],
        injectionPoints: [
            'auth-verify-2fa-after-form',
            'auth-verify-2fa-before-form',
            'auth-verify-2fa-bottom',
            'auth-verify-2fa-top',
        ],
    },
    {
        slug: 'dashboard',
        sanitizedSlug: 'dashboard',
        files: ['src/app/(app)/dashboard/page.tsx'],
        injectionPoints: ['after-server-list', 'before-server-list', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'dashboard-account',
        sanitizedSlug: 'dashboard-account',
        files: ['src/app/(app)/dashboard/account/page.tsx'],
        injectionPoints: ['after-profile-card', 'after-tabs', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'dashboard-knowledgebase',
        sanitizedSlug: 'dashboard-knowledgebase',
        files: ['src/app/(app)/dashboard/knowledgebase/page.tsx'],
        injectionPoints: [
            'after-categories-list',
            'after-header',
            'before-categories-list',
            'bottom-of-page',
            'top-of-page',
        ],
    },
    {
        slug: 'dashboard-knowledgebase-article',
        sanitizedSlug: 'dashboard-knowledgebase-article',
        files: ['src/app/(app)/dashboard/knowledgebase/article/[id]/page.tsx'],
        injectionPoints: [
            'after-article-content',
            'after-attachments',
            'after-header',
            'before-article-content',
            'before-attachments',
            'bottom-of-page',
            'top-of-page',
        ],
    },
    {
        slug: 'dashboard-knowledgebase-category',
        sanitizedSlug: 'dashboard-knowledgebase-category',
        files: ['src/app/(app)/dashboard/knowledgebase/category/[id]/page.tsx'],
        injectionPoints: [
            'after-articles-list',
            'after-header',
            'before-articles-list',
            'bottom-of-page',
            'top-of-page',
        ],
    },
    {
        slug: 'dashboard-servers',
        sanitizedSlug: 'dashboard-servers',
        files: ['src/app/(app)/dashboard/servers/page.tsx'],
        injectionPoints: ['after-header', 'after-server-list', 'before-server-list', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'dashboard-status',
        sanitizedSlug: 'dashboard-status',
        files: ['src/app/(app)/dashboard/status/page.tsx'],
        injectionPoints: [
            'after-global-stats',
            'after-header',
            'after-node-list',
            'before-node-list',
            'bottom-of-page',
            'top-of-page',
        ],
    },
    {
        slug: 'dashboard-tickets-create',
        sanitizedSlug: 'dashboard-tickets-create',
        files: ['src/app/(app)/dashboard/tickets/create/page.tsx'],
        injectionPoints: ['after-header', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'dashboard-tickets-list',
        sanitizedSlug: 'dashboard-tickets-list',
        files: ['src/app/(app)/dashboard/tickets/page.tsx'],
        injectionPoints: [
            'after-filters',
            'after-header',
            'after-tickets-list',
            'before-tickets-list',
            'bottom-of-page',
            'top-of-page',
        ],
    },
    {
        slug: 'dashboard-tickets-view',
        sanitizedSlug: 'dashboard-tickets-view',
        files: ['src/app/(app)/dashboard/tickets/[uuid]/page.tsx'],
        injectionPoints: [
            'after-header',
            'after-messages',
            'bottom-of-page',
            'sidebar-bottom',
            'sidebar-top',
            'top-of-page',
        ],
    },
    {
        slug: 'server-activities',
        sanitizedSlug: 'server-activities',
        files: ['src/app/(app)/server/[uuidShort]/activities/page.tsx'],
        injectionPoints: ['activity-bottom', 'activity-top'],
    },
    {
        slug: 'server-allocations',
        sanitizedSlug: 'server-allocations',
        files: ['src/app/(app)/server/[uuidShort]/allocations/page.tsx'],
        injectionPoints: ['allocation-bottom', 'allocation-header'],
    },
    {
        slug: 'server-backups',
        sanitizedSlug: 'server-backups',
        files: ['src/app/(app)/server/[uuidShort]/backups/page.tsx'],
        injectionPoints: ['backup-bottom', 'backup-header'],
    },
    {
        slug: 'server-console',
        sanitizedSlug: 'server-console',
        files: ['src/components/server/ServerConsolePage.tsx'],
        injectionPoints: [
            'after-header',
            'after-performance',
            'after-terminal',
            'after-wings-status',
            'before-performance',
            'before-terminal',
            'bottom-of-page',
            'top-of-page',
            'under-server-info-cards',
        ],
    },
    {
        slug: 'server-databases',
        sanitizedSlug: 'server-databases',
        files: ['src/app/(app)/server/[uuidShort]/databases/page.tsx'],
        injectionPoints: [
            'after-databases-list',
            'after-warning-banner',
            'before-databases-list',
            'bottom-of-page',
            'top-of-page',
        ],
    },
    {
        slug: 'server-fastdl',
        sanitizedSlug: 'server-fastdl',
        files: ['src/app/(app)/server/[uuidShort]/fastdl/page.tsx'],
        injectionPoints: ['after-header', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'server-file-editor',
        sanitizedSlug: 'server-file-editor',
        files: ['src/app/(app)/server/[uuidShort]/files/edit/page.tsx'],
        injectionPoints: ['after-header', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'server-files',
        sanitizedSlug: 'server-files',
        files: ['src/app/(app)/server/[uuidShort]/files/page.tsx'],
        injectionPoints: [
            'after-files-list',
            'after-header',
            'after-search-bar',
            'before-files-list',
            'bottom-of-page',
            'top-of-page',
        ],
    },
    {
        slug: 'server-firewall',
        sanitizedSlug: 'server-firewall',
        files: ['src/app/(app)/server/[uuidShort]/firewall/page.tsx'],
        injectionPoints: ['after-header', 'after-rules-list', 'before-rules-list', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'server-import',
        sanitizedSlug: 'server-import',
        files: ['src/app/(app)/server/[uuidShort]/import/page.tsx'],
        injectionPoints: ['after-header', 'after-imports-list', 'before-imports-list', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'server-import-new',
        sanitizedSlug: 'server-import-new',
        files: ['src/app/(app)/server/[uuidShort]/import/new/page.tsx'],
        injectionPoints: ['after-header', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'server-proxy',
        sanitizedSlug: 'server-proxy',
        files: ['src/app/(app)/server/[uuidShort]/proxy/page.tsx'],
        injectionPoints: ['after-header', 'after-proxies-list', 'before-proxies-list', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'server-proxy-new',
        sanitizedSlug: 'server-proxy-new',
        files: ['src/app/(app)/server/[uuidShort]/proxy/new/page.tsx'],
        injectionPoints: ['after-header', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'server-schedules',
        sanitizedSlug: 'server-schedules',
        files: ['src/app/(app)/server/[uuidShort]/schedules/page.tsx'],
        injectionPoints: ['after-header', 'after-schedules-list', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'server-schedules-edit',
        sanitizedSlug: 'server-schedules-edit',
        files: ['src/app/(app)/server/[uuidShort]/schedules/[id]/edit/page.tsx'],
        injectionPoints: ['after-header'],
    },
    {
        slug: 'server-schedules-new',
        sanitizedSlug: 'server-schedules-new',
        files: ['src/app/(app)/server/[uuidShort]/schedules/new/page.tsx'],
        injectionPoints: ['after-header'],
    },
    {
        slug: 'server-settings',
        sanitizedSlug: 'server-settings',
        files: ['src/app/(app)/server/[uuidShort]/settings/page.tsx'],
        injectionPoints: [
            'after-delete-server',
            'after-header',
            'after-server-actions',
            'after-server-info',
            'after-sftp-details',
            'bottom-of-page',
            'top-of-page',
        ],
    },
    {
        slug: 'server-startup',
        sanitizedSlug: 'server-startup',
        files: ['src/app/(app)/server/[uuidShort]/startup/page.tsx'],
        injectionPoints: [
            'after-docker-image',
            'after-header',
            'after-spell-selection',
            'after-startup-command',
            'after-variables',
            'bottom-of-page',
            'top-of-page',
        ],
    },
    {
        slug: 'server-startup-transfer-spell',
        sanitizedSlug: 'server-startup-transfer-spell',
        files: ['src/app/(app)/server/[uuidShort]/startup/transfer/spell/page.tsx'],
        injectionPoints: ['after-header', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'server-subdomains',
        sanitizedSlug: 'server-subdomains',
        files: ['src/app/(app)/server/[uuidShort]/subdomains/page.tsx'],
        injectionPoints: [
            'after-header',
            'after-subdomains-list',
            'before-subdomains-list',
            'bottom-of-page',
            'top-of-page',
        ],
    },
    {
        slug: 'server-subdomains-new',
        sanitizedSlug: 'server-subdomains-new',
        files: ['src/app/(app)/server/[uuidShort]/subdomains/new/page.tsx'],
        injectionPoints: ['after-header', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'server-tasks',
        sanitizedSlug: 'server-tasks',
        files: ['src/app/(app)/server/[uuidShort]/schedules/[id]/tasks/page.tsx'],
        injectionPoints: ['after-header', 'after-tasks-list', 'before-tasks-list', 'bottom-of-page', 'top-of-page'],
    },
    {
        slug: 'server-users',
        sanitizedSlug: 'server-users',
        files: ['src/app/(app)/server/[uuidShort]/users/page.tsx'],
        injectionPoints: [
            'after-header',
            'after-subusers-list',
            'before-subusers-list',
            'bottom-of-page',
            'top-of-page',
        ],
    },
];

export default function WidgetsListPage() {
    return (
        <div className='min-h-screen bg-background'>
            <div className='container mx-auto px-4 py-16 max-w-6xl'>
                <Link href='/icanhasfeatherpanel'>
                    <Button variant='ghost' className='mb-8 -ml-4'>
                        <ArrowLeft className='w-4 h-4 mr-2' />
                        Back to Documentation
                    </Button>
                </Link>

                <div className='mb-12 space-y-4'>
                    <h1 className='text-5xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent'>
                        Widget Injection Points
                    </h1>
                    <p className='text-xl text-muted-foreground max-w-3xl'>
                        All available widget slugs and their injection points in FeatherPanel. Click on any widget to
                        view detailed information.
                    </p>
                    <div className='flex items-center gap-4 pt-2'>
                        <Badge
                            variant='secondary'
                            className='text-sm px-4 py-1.5 font-semibold bg-card border border-border/50'
                        >
                            {widgets.length} Widget Slugs
                        </Badge>
                        <Badge variant='outline' className='text-sm px-4 py-1.5 font-semibold bg-card border-border/50'>
                            {widgets.reduce((sum, w) => sum + w.injectionPoints.length, 0)} Total Injection Points
                        </Badge>
                    </div>
                </div>

                <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-4'>
                    {widgets.map((widget) => (
                        <Link
                            key={widget.slug}
                            href={`/icanhasfeatherpanel/widgets/${widget.sanitizedSlug}`}
                            className='block'
                        >
                            <Card className='h-full transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/60 cursor-pointer group border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80'>
                                <CardHeader className='pb-3'>
                                    <div className='flex items-start justify-between mb-2'>
                                        <CardTitle className='text-base font-mono group-hover:text-primary transition-colors text-foreground'>
                                            {widget.slug}
                                        </CardTitle>
                                        <ArrowRight className='w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 mt-0.5' />
                                    </div>
                                    <CardDescription className='text-xs text-muted-foreground'>
                                        {widget.files.length} source file{widget.files.length !== 1 ? 's' : ''}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className='space-y-3 pt-0'>
                                    <div className='space-y-2'>
                                        <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                                            <MapPin className='w-3 h-3' />
                                            <span className='font-semibold uppercase tracking-wide'>
                                                Injection Points
                                            </span>
                                        </div>
                                        {widget.injectionPoints.length > 0 ? (
                                            <div className='flex flex-wrap gap-1.5'>
                                                {widget.injectionPoints.slice(0, 3).map((ip) => (
                                                    <Badge
                                                        key={ip}
                                                        variant='outline'
                                                        className='text-xs font-mono bg-muted/30 border-border/50 text-foreground/80 hover:bg-muted/50 hover:border-primary/50 transition-colors'
                                                    >
                                                        {ip}
                                                    </Badge>
                                                ))}
                                                {widget.injectionPoints.length > 3 && (
                                                    <Badge
                                                        variant='outline'
                                                        className='text-xs bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50 transition-colors'
                                                    >
                                                        +{widget.injectionPoints.length - 3} more
                                                    </Badge>
                                                )}
                                            </div>
                                        ) : (
                                            <p className='text-xs text-muted-foreground italic'>
                                                Check detail page for dynamic injection points
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
