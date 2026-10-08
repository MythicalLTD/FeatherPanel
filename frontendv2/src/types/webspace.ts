/*
This file is part of FeatherPanel.
 */

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

export interface WebSpace {
    id?: number;
    uuid: string;
    uuidShort?: string;
    name: string;
    description?: string | null;
    domains?: string[];
    ssl?: boolean;
    dns_status?: string | null;
    status?: string;
    state?: string;
    backend_port?: number;
    web_node_id?: number;
    web_node_name?: string | null;
    webplate_name?: string | null;
    webplate_id?: number;
    webplate_runtime?: string | null;
    available_apps?: string[];
    document_root?: string;
    owner_id?: number;
    disk?: number;
    disk_limit_mb?: number;
    disk_used_bytes?: number;
    disk_limit_bytes?: number;
    database_limit?: number;
    mailbox_limit?: number;
    can_edit_disk?: boolean;
    is_subuser?: boolean;
    is_owner?: boolean;
    subuser_permissions?: string[];
    suspended?: number;
    sftp_host?: string;
    sftp_port?: number;
    ftp_host?: string;
    ftp_port?: number;
    ftp_enabled?: boolean;
}
