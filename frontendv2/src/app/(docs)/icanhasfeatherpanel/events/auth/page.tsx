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
    name: 'Auth',
    events: [
        {
            method: 'onAuth2FAEnabled',
            name: 'featherpanel:auth:2fa:enabled',
            callback: 'array user info.',
            category: 'Auth',
            actualData: ['user'],
            sourceFiles: ['backend/app/Controllers/User/Auth/TwoFactorController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\AuthEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(AuthEvent::onAuth2FAEnabled(), function ($user) {\n        // Handle featherpanel:auth:2fa:enabled\n        // Data keys: user\n    });\n}',
        },
        {
            method: 'onAuth2FAFailed',
            name: 'featherpanel:auth:2fa:failed',
            callback: 'array user info.',
            category: 'Auth',
            actualData: ['ip_address', 'user'],
            sourceFiles: ['backend/app/Controllers/User/Auth/TwoFactorController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\AuthEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(AuthEvent::onAuth2FAFailed(), function ($ipAddress, $user) {\n        // Handle featherpanel:auth:2fa:failed\n        // Data keys: ip_address, user\n    });\n}',
        },
        {
            method: 'onAuth2FASetup',
            name: 'featherpanel:auth:2fa:setup',
            callback: 'array user info.',
            category: 'Auth',
            actualData: ['user'],
            sourceFiles: ['backend/app/Controllers/User/Auth/TwoFactorController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\AuthEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(AuthEvent::onAuth2FASetup(), function ($user) {\n        // Handle featherpanel:auth:2fa:setup\n        // Data keys: user\n    });\n}',
        },
        {
            method: 'onAuth2FAVerified',
            name: 'featherpanel:auth:2fa:verified',
            callback: 'array user info.',
            category: 'Auth',
            actualData: ['user'],
            sourceFiles: ['backend/app/Controllers/User/Auth/TwoFactorController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\AuthEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(AuthEvent::onAuth2FAVerified(), function ($user) {\n        // Handle featherpanel:auth:2fa:verified\n        // Data keys: user\n    });\n}',
        },
        {
            method: 'onAuthAccountLocked',
            name: 'featherpanel:auth:account:locked',
            callback: 'array user info.',
            category: 'Auth',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\AuthEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(AuthEvent::onAuthAccountLocked(), function ($info) {\n        // Handle featherpanel:auth:account:locked\n        // Parameters: array user info.\n    });\n}',
        },
        {
            method: 'onAuthAccountUnlocked',
            name: 'featherpanel:auth:account:unlocked',
            callback: 'array user info.',
            category: 'Auth',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\AuthEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(AuthEvent::onAuthAccountUnlocked(), function ($info) {\n        // Handle featherpanel:auth:account:unlocked\n        // Parameters: array user info.\n    });\n}',
        },
        {
            method: 'onAuthEmailChanged',
            name: 'featherpanel:auth:email:changed',
            callback: 'array user info, string email.',
            category: 'Auth',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\AuthEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(AuthEvent::onAuthEmailChanged(), function ($info, $email) {\n        // Handle featherpanel:auth:email:changed\n        // Parameters: array user info, string email.\n    });\n}',
        },
        {
            method: 'onAuthForgotPassword',
            name: 'featherpanel:auth:forgot:password',
            callback: 'array user info, string reset_url, string reset_token.',
            category: 'Auth',
            actualData: ['ip_address', 'reset_token', 'reset_url', 'user'],
            sourceFiles: ['backend/app/Controllers/User/Auth/ForgotPasswordController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\AuthEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(AuthEvent::onAuthForgotPassword(), function ($ipAddress, $resetToken, $resetUrl, $user) {\n        // Handle featherpanel:auth:forgot:password\n        // Data keys: ip_address, reset_token, reset_url, user\n    });\n}',
        },
        {
            method: 'onAuthForgotPasswordFailed',
            name: 'featherpanel:auth:forgot:password:failed',
            callback: 'string email, string reason.',
            category: 'Auth',
            actualData: ['email', 'ip_address', 'reason'],
            sourceFiles: ['backend/app/Controllers/User/Auth/ForgotPasswordController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\AuthEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(AuthEvent::onAuthForgotPasswordFailed(), function ($email, $ipAddress, $reason) {\n        // Handle featherpanel:auth:forgot:password:failed\n        // Data keys: email, ip_address, reason\n    });\n}',
        },
        {
            method: 'onAuthLoginFailed',
            name: 'featherpanel:auth:login:failed',
            callback: 'array user info.',
            category: 'Auth',
            actualData: ['ip_address', 'reason', 'user', 'username_or_email'],
            sourceFiles: ['backend/app/Controllers/User/Auth/LoginController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\AuthEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(AuthEvent::onAuthLoginFailed(), function ($ipAddress, $reason, $user, $usernameOrEmail) {\n        // Handle featherpanel:auth:login:failed\n        // Data keys: ip_address, reason, user, username_or_email\n    });\n}',
        },
        {
            method: 'onAuthLoginSuccess',
            name: 'featherpanel:auth:login:success',
            callback: 'array user info.',
            category: 'Auth',
            actualData: ['user'],
            sourceFiles: [
                'backend/app/Controllers/User/Auth/LoginController.php',
                'backend/app/Controllers/User/Auth/RegisterController.php',
                'backend/app/Controllers/User/Auth/TwoFactorController.php',
            ],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\AuthEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(AuthEvent::onAuthLoginSuccess(), function ($user) {\n        // Handle featherpanel:auth:login:success\n        // Data keys: user\n    });\n}',
        },
        {
            method: 'onAuthLogout',
            name: 'featherpanel:auth:logout',
            callback: 'array user info.',
            category: 'Auth',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\AuthEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(AuthEvent::onAuthLogout(), function ($info) {\n        // Handle featherpanel:auth:logout\n        // Parameters: array user info.\n    });\n}',
        },
        {
            method: 'onAuthPasswordChanged',
            name: 'featherpanel:auth:password:changed',
            callback: 'array user info.',
            category: 'Auth',
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\AuthEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(AuthEvent::onAuthPasswordChanged(), function ($info) {\n        // Handle featherpanel:auth:password:changed\n        // Parameters: array user info.\n    });\n}',
        },
        {
            method: 'onAuthPasswordResetFailed',
            name: 'featherpanel:auth:password:reset:failed',
            callback: 'string email, string reason.',
            category: 'Auth',
            actualData: ['ip_address', 'reason', 'token'],
            sourceFiles: ['backend/app/Controllers/User/Auth/ResetPasswordController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\AuthEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(AuthEvent::onAuthPasswordResetFailed(), function ($ipAddress, $reason, $token) {\n        // Handle featherpanel:auth:password:reset:failed\n        // Data keys: ip_address, reason, token\n    });\n}',
        },
        {
            method: 'onAuthRegisterSuccess',
            name: 'featherpanel:auth:register:success',
            callback: 'array user info.',
            category: 'Auth',
            actualData: ['user'],
            sourceFiles: ['backend/app/Controllers/User/Auth/RegisterController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\AuthEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(AuthEvent::onAuthRegisterSuccess(), function ($user) {\n        // Handle featherpanel:auth:register:success\n        // Data keys: user\n    });\n}',
        },
        {
            method: 'onAuthRegistrationFailed',
            name: 'featherpanel:auth:registration:failed',
            callback: 'string email, string reason.',
            category: 'Auth',
            actualData: ['email', 'ip_address', 'reason', 'username'],
            sourceFiles: ['backend/app/Controllers/User/Auth/RegisterController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\AuthEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(AuthEvent::onAuthRegistrationFailed(), function ($email, $ipAddress, $reason, $username) {\n        // Handle featherpanel:auth:registration:failed\n        // Data keys: email, ip_address, reason, username\n    });\n}',
        },
        {
            method: 'onAuthResetPasswordSuccess',
            name: 'featherpanel:auth:reset:password:success',
            callback: 'array user info.',
            category: 'Auth',
            actualData: ['user'],
            sourceFiles: ['backend/app/Controllers/User/Auth/ResetPasswordController.php'],
            exampleCode:
                'use App\\Plugins\\PluginEvents;\nuse App\\Plugins\\Events\\Events\\AuthEvent;\n\npublic static function processEvents(PluginEvents $evt): void\n{\n    $evt->on(AuthEvent::onAuthResetPasswordSuccess(), function ($user) {\n        // Handle featherpanel:auth:reset:password:success\n        // Data keys: user\n    });\n}',
        },
    ],
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
