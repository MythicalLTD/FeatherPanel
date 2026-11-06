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

import axios from 'axios';

export const SW_PATH = '/sw.js';

export function pushSupported(): boolean {
    return (
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    );
}

export async function registerPanelServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
    if (process.env.NODE_ENV !== 'production') return null;
    try {
        return await navigator.serviceWorker.register(SW_PATH);
    } catch (error) {
        console.warn('SW register failed', error);
        return null;
    }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const output = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) {
        output[i] = raw.charCodeAt(i);
    }
    return output;
}

export async function fetchVapidPublicKey(): Promise<string | null> {
    try {
        const { data } = await axios.get('/api/user/push/vapid');
        const key = data?.data?.publicKey;
        return typeof key === 'string' && key ? key : null;
    } catch {
        return null;
    }
}

export async function subscribeWebPush(): Promise<PushSubscription | null> {
    if (!pushSupported()) return null;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const registration = (await navigator.serviceWorker.getRegistration(SW_PATH)) || (await registerPanelServiceWorker());
    if (!registration) return null;
    await navigator.serviceWorker.ready;

    const publicKey = await fetchVapidPublicKey();
    if (!publicKey) return null;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });
    }

    const json = subscription.toJSON();
    await axios.post('/api/user/push/subscriptions', {
        endpoint: json.endpoint,
        keys: json.keys,
        contentEncoding: 'aes128gcm',
    });

    return subscription;
}

export async function unsubscribeWebPush(): Promise<void> {
    if (!pushSupported()) {
        await axios.delete('/api/user/push/subscriptions', { data: { all: true } });
        return;
    }
    const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
    const subscription = registration ? await registration.pushManager.getSubscription() : null;
    const endpoint = subscription?.endpoint;
    if (subscription) {
        try {
            await subscription.unsubscribe();
        } catch {
            /* ignore */
        }
    }
    if (endpoint) {
        await axios.delete('/api/user/push/subscriptions', { data: { endpoint } });
    } else {
        await axios.delete('/api/user/push/subscriptions', { data: { all: true } });
    }
}

export async function getLocalPushSubscription(): Promise<PushSubscription | null> {
    if (!pushSupported()) return null;
    const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
    if (!registration) return null;
    return registration.pushManager.getSubscription();
}
