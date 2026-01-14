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

import { useParams } from 'next/navigation';
import { NodeDatabases } from '@/app/(app)/admin/databases/nodes/NodeDatabases';

export default function NodeDatabasesPage() {
    const params = useParams();
    const nodeId = parseInt(params.id as string);

    return <NodeDatabases nodeId={nodeId} />;
}
