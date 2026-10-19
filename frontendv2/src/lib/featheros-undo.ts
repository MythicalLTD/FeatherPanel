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

import { filesApi } from '@/lib/files-api';
import { restoreFeatherOsTrash } from '@/lib/featheros-trash';
import type { FeatherOsTrashEntry } from '@/lib/featheros-api';
import { joinPath, normalizeDir } from '@/components/featheros/utils';

const MAX_UNDO = 20;

export type FeatherOsUndoOp =
    | {
          kind: 'delete';
          label: string;
          entries: FeatherOsTrashEntry[];
          serverUuid: string;
          dirs: string[];
      }
    | {
          kind: 'rename';
          label: string;
          serverUuid: string;
          dir: string;
          from: string;
          to: string;
      }
    | {
          kind: 'move';
          label: string;
          serverUuid: string;
          fromDir: string;
          toDir: string;
          names: string[];
      };

type UndoListener = () => void;

const stack: FeatherOsUndoOp[] = [];
const listeners = new Set<UndoListener>();

function notify() {
    listeners.forEach((l) => l());
}

export function subscribeFeatherOsUndo(listener: UndoListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function canFeatherOsUndo(): boolean {
    return stack.length > 0;
}

export function peekFeatherOsUndo(): FeatherOsUndoOp | null {
    return stack[stack.length - 1] ?? null;
}

export function pushFeatherOsUndo(op: FeatherOsUndoOp): void {
    stack.push(op);
    if (stack.length > MAX_UNDO) stack.shift();
    notify();
}

export async function performFeatherOsUndo(): Promise<FeatherOsUndoOp | null> {
    const op = stack.pop() ?? null;
    notify();
    if (!op) return null;

    if (op.kind === 'delete') {
        await restoreFeatherOsTrash(op.entries);
        return op;
    }
    if (op.kind === 'rename') {
        await filesApi.renameFile(op.serverUuid, op.dir, [{ from: op.to, to: op.from }]);
        return op;
    }
    // move
    const fromDir = normalizeDir(op.toDir);
    const toDir = normalizeDir(op.fromDir);
    await filesApi.moveFile(
        op.serverUuid,
        '/',
        op.names.map((n) => ({ from: joinPath(fromDir, n), to: joinPath(toDir, n) })),
    );
    return op;
}

export function undoRefreshDirs(op: FeatherOsUndoOp): { serverUuid: string; dirs: string[] } {
    if (op.kind === 'delete') {
        return { serverUuid: op.serverUuid, dirs: op.dirs };
    }
    if (op.kind === 'rename') {
        return { serverUuid: op.serverUuid, dirs: [op.dir] };
    }
    return { serverUuid: op.serverUuid, dirs: [op.fromDir, op.toDir] };
}
