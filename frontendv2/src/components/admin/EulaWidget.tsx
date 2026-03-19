/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import React from 'react';
import { FileText } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import ReactMarkdown from 'react-markdown';

const eulaContent = `# FeatherPanel End User License Agreement (EULA)

_Last updated: March 19, 2026_

## 1. Acceptance of Terms
By installing, accessing, or using FeatherPanel ("the Software"), you agree to be bound by this End User License Agreement ("EULA"). If you do not agree, do not use the Software.

## 2. License Grant
FeatherPanel grants you a limited, non-exclusive, non-transferable, revocable license to use the Software for personal or commercial purposes, subject to this EULA.

## 3. Restrictions
You agree not to:
- Modify, reverse engineer, decompile, or disassemble the Software
- Resell, sublicense, or redistribute the Software without permission
- Use the Software for illegal or unauthorized purposes
- Attempt to bypass security, authentication, or licensing mechanisms

Additionally:
- You may **not develop, sell, or distribute plugins or extensions** that replicate or directly compete with official FeatherPanel features (e.g., a Minecraft Plugin Installer), whether free or paid, without **explicit written permission** from FeatherPanel developers.
- You may **not modify FeatherPanel and resell it**, in whole or in part, without direct approval via a **signed document** from MythicalSystems.
- You may **not use FeatherPanel on free-tier or abuse-prone hosting platforms**, including but not limited to Oracle Cloud Free Tier, Google Cloud Free Tier, DigitalOcean free credits, or similar services.
- You may **not use FeatherPanel on platforms not intended for hosting**, including but not limited to Google IDX, Replit, Github WorkFlows or similar environments.
- You may **not generate profit directly from FeatherPanel itself** (e.g., reselling the panel), except through services built on top of it such as web hosting, game hosting, VPS, or VDS offerings.

## 4. Commercial Use
This is a free license. You are allowed to use FeatherPanel to generate revenue **indirectly**, such as by offering hosting or related services powered by the Software.

## 5. Ownership
The Software and all associated intellectual property rights remain the property of FeatherPanel and its developers (MythicalSystems).

## 6. Updates
FeatherPanel may provide updates or modifications at any time. Continued use of the Software constitutes acceptance of those changes.

## 7. Support Policy
FeatherPanel and MythicalSystems are **not required to provide support** unless you are a paid client or have purchased an official product or service.

## 8. Disclaimer of Warranty
The Software is provided "AS IS" without warranty of any kind. FeatherPanel does not guarantee that the Software will be error-free or uninterrupted.

## 9. Limitation of Liability
In no event shall FeatherPanel or its developers be liable for any damages arising from the use or inability to use the Software.

## 10. Termination
This license may be terminated at any time if you violate this EULA. Upon termination, you must stop using and delete all copies of the Software.

## 11. Governing Law
This Agreement shall be governed by the laws applicable in your jurisdiction.

## 12. Contact
For questions regarding this EULA, contact: legal@mythical.systems

---

By using FeatherPanel, you acknowledge that you have read and agree to this EULA.`;

export function EulaWidget() {
    const { t } = useTranslation();

    return (
        <div className='p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] bg-card/50 border border-border/50 backdrop-blur-3xl relative group overflow-hidden'>
            <div className='absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16 rounded-full group-hover:bg-primary/10 transition-all duration-700' />

            <div className='relative z-10 space-y-6'>
                <div className='flex items-center gap-4'>
                    <div className='h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20'>
                        <FileText className='h-6 w-6' />
                    </div>
                    <div>
                        <h2 className='text-2xl font-black uppercase tracking-tight'>
                            {t('admin.dashboard.eula.title') || 'End User License Agreement'}
                        </h2>
                        <p className='text-sm text-muted-foreground font-bold'>
                            {t('admin.dashboard.eula.subtitle') || 'Terms and conditions for using FeatherPanel'}
                        </p>
                    </div>
                </div>

                <div className='prose prose-sm dark:prose-invert max-w-none'>
                    <ReactMarkdown
                        components={{
                            h1: ({ children }) => (
                                <h1 className='text-xl font-black uppercase tracking-tight mb-4'>{children}</h1>
                            ),
                            h2: ({ children }) => (
                                <h2 className='text-lg font-black uppercase tracking-tight mt-6 mb-3'>{children}</h2>
                            ),
                            p: ({ children }) => <p className='text-sm text-muted-foreground mb-3'>{children}</p>,
                            ul: ({ children }) => <ul className='list-disc list-inside space-y-1 mb-3'>{children}</ul>,
                            li: ({ children }) => <li className='text-sm text-muted-foreground'>{children}</li>,
                            strong: ({ children }) => <strong className='font-bold text-foreground'>{children}</strong>,
                            em: ({ children }) => <em className='italic text-muted-foreground/80'>{children}</em>,
                            hr: () => <hr className='my-6 border-border/50' />,
                        }}
                    >
                        {eulaContent}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    );
}
