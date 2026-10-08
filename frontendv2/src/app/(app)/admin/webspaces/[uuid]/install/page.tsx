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

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { WebSpaceInstallConsole } from '@/components/webspace/WebSpaceInstallConsole';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';

export default function AdminWebSpaceInstallPage() {
    const params = useParams();
    const uuid = String(params.uuid || '');
    const [name, setName] = useState<string | undefined>();
    const [initialStatus, setInitialStatus] = useState<string | undefined>();
    const [loading, setLoading] = useState(true);

    const [webNodeId, setWebNodeId] = useState<number | undefined>();
    const [ssl, setSsl] = useState(false);
    const [databaseLimit, setDatabaseLimit] = useState(0);
    const [mailboxLimit, setMailboxLimit] = useState(0);

    useEffect(() => {
        if (!uuid) return;
        axios
            .get(`/api/admin/webspaces/${uuid}`)
            .then((res) => {
                const space = res.data?.data?.webspace ?? res.data?.data;
                setName(space?.name);
                setInitialStatus(space?.status);
                setWebNodeId(space?.web_node_id);
                setSsl(!!space?.ssl);
                setDatabaseLimit(Number(space?.database_limit) || 0);
                setMailboxLimit(Number(space?.mailbox_limit) || 0);
            })
            .finally(() => setLoading(false));
    }, [uuid]);

    if (loading) return <TableSkeleton count={3} />;

    return (
        <WebSpaceInstallConsole
            uuid={uuid}
            name={name}
            initialStatus={initialStatus}
            webNodeId={webNodeId}
            ssl={ssl}
            databaseLimit={databaseLimit}
            mailboxLimit={mailboxLimit}
            jwtEndpoint={`/api/admin/webspaces/${uuid}/jwt`}
            onCompleteRedirect={`/admin/webspaces/${uuid}`}
            backHref='/admin/webspaces'
        />
    );
}
