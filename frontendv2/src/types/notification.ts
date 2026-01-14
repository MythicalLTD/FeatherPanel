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

export interface Notification {
    id: number;
    user_id: number | null;
    title: string;
    message_markdown: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'danger';
    is_dismissible: boolean;
    is_sticky: boolean;
    created_at: string;
    updated_at: string | null;
}

export interface NotificationsResponse {
    success: boolean;
    message: string;
    data: {
        notifications: Notification[];
    };
    error: boolean;
    error_message: string | null;
    error_code: string | null;
}
