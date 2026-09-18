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

import Image from 'next/image';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Flat dark consent chrome — no glow, no motion, no light theme. */
export function OAuthConsentShell({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div
            className={cn('flex min-h-dvh items-start justify-center px-4 py-10 sm:items-center', className)}
            style={{
                background: '#111111',
                color: '#e8e8e8',
                fontFamily: 'ui-sans-serif, system-ui, Segoe UI, Tahoma, sans-serif',
            }}
        >
            <div className='w-full max-w-[440px]'>
                <div
                    className='border border-[#333] px-3 py-2 text-[13px] font-semibold tracking-wide'
                    style={{ background: '#1a1a1a', color: '#f0f0f0' }}
                >
                    AI Connector
                </div>
                {children}
            </div>
        </div>
    );
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div
            className={cn('border border-t-0 border-[#333] px-4 py-4 text-[13px] leading-relaxed', className)}
            style={{ background: '#1a1a1a' }}
        >
            {children}
        </div>
    );
}

export function OAuthConsentButton({
    children,
    onClick,
    primary,
    disabled,
}: {
    children: ReactNode;
    onClick: () => void;
    primary?: boolean;
    disabled?: boolean;
}) {
    return (
        <button
            type='button'
            onClick={onClick}
            disabled={disabled}
            className='cursor-pointer border px-3.5 py-1.5 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-50'
            style={
                primary
                    ? { background: '#e8e8e8', color: '#111', borderColor: '#e8e8e8' }
                    : { background: '#1a1a1a', color: '#e8e8e8', borderColor: '#555' }
            }
        >
            {children}
        </button>
    );
}

export function OAuthConsentCard({
    appName,
    appLogo,
    subtitle,
    signedInAs,
    permissions,
    meta,
    error,
    onCancel,
    onAuthorize,
    authorizeLabel,
    cancelLabel,
    submitting,
    footer,
}: {
    appName: string;
    appLogo?: string | null;
    subtitle: string;
    signedInAs?: string | null;
    permissions: { label: string; allowed?: boolean }[];
    meta?: { icon?: ReactNode; text: ReactNode }[];
    error?: string | null;
    onCancel: () => void;
    onAuthorize: () => void;
    authorizeLabel: string;
    cancelLabel: string;
    submitting?: boolean;
    footer?: ReactNode;
}) {
    return (
        <Panel>
            <div className='mb-4 flex items-start gap-3'>
                {appLogo ? (
                    <Image
                        src={appLogo}
                        alt={appName}
                        width={36}
                        height={36}
                        className='border border-[#444] object-contain'
                        unoptimized
                    />
                ) : null}
                <div>
                    <h1 className='text-[15px] font-semibold text-[#f5f5f5]'>{appName}</h1>
                    <p className='mt-1 text-[#a0a0a0]'>{subtitle}</p>
                    {signedInAs ? (
                        <p className='mt-1 text-[#a0a0a0]'>
                            Signed in as <span className='text-[#e8e8e8]'>{signedInAs}</span>
                        </p>
                    ) : null}
                </div>
            </div>

            {permissions.length > 0 ? (
                <div className='mb-4 border border-[#333] px-3 py-2.5'>
                    <p className='mb-2 text-[11px] font-semibold tracking-wide text-[#888] uppercase'>This app can</p>
                    <ul className='space-y-1.5 text-[#d0d0d0]'>
                        {permissions.map((item) => (
                            <li key={item.label} className={item.allowed === false ? 'text-[#e07070]' : undefined}>
                                {item.allowed === false ? 'Denied — ' : '• '}
                                {item.label}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {meta && meta.length > 0 ? (
                <dl className='mb-4 space-y-2 text-[12px] text-[#888]'>
                    {meta.map((row, idx) => (
                        <div key={idx}>{row.text}</div>
                    ))}
                </dl>
            ) : null}

            {error ? <p className='mb-3 font-medium text-[#e07070]'>{error}</p> : null}

            {footer}

            <div className='mt-1 flex flex-wrap items-center gap-2'>
                <OAuthConsentButton primary onClick={onAuthorize} disabled={submitting}>
                    {authorizeLabel}
                </OAuthConsentButton>
                <OAuthConsentButton onClick={onCancel} disabled={submitting}>
                    {cancelLabel}
                </OAuthConsentButton>
            </div>
        </Panel>
    );
}

export function OAuthConsentMessage({
    title,
    body,
    children,
    error,
}: {
    title: string;
    body?: string;
    children?: ReactNode;
    error?: boolean;
}) {
    return (
        <Panel>
            <h1 className={cn('mb-2 text-[15px] font-semibold', error ? 'text-[#e07070]' : 'text-[#f5f5f5]')}>
                {title}
            </h1>
            {body ? <p className='mb-4 text-[#a0a0a0]'>{body}</p> : null}
            {children}
        </Panel>
    );
}
