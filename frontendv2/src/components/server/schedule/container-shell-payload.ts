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

/** Limits mirror backend ContainerShellExec (docker exec `sh -c <command>`). */
export const CONTAINER_SHELL_ACTION = 'container_shell';
export const CONTAINER_SHELL_COMMAND_MAX = 4096;
export const CONTAINER_SHELL_TIMEOUT_MIN = 1;
export const CONTAINER_SHELL_TIMEOUT_MAX = 120;
export const CONTAINER_SHELL_TIMEOUT_DEFAULT = 30;

export type ContainerShellFields = {
    command: string;
    timeout: number;
};

export const emptyContainerShellFields = (): ContainerShellFields => ({
    command: '',
    timeout: CONTAINER_SHELL_TIMEOUT_DEFAULT,
});

export function isContainerShellAction(action: string): boolean {
    return action === CONTAINER_SHELL_ACTION;
}

/** Parse a stored task payload (JSON object, or a plain command string from API-created tasks). */
export function parseContainerShellFields(payload: string): ContainerShellFields {
    const base = emptyContainerShellFields();
    const trimmed = (payload || '').trim();
    if (!trimmed) {
        return base;
    }

    try {
        const data = JSON.parse(trimmed) as unknown;
        if (data && typeof data === 'object' && !Array.isArray(data)) {
            const record = data as { command?: unknown; timeout?: unknown };
            const timeout = Number(record.timeout);
            return {
                command: typeof record.command === 'string' ? record.command : '',
                timeout: Number.isFinite(timeout) && timeout > 0 ? Math.floor(timeout) : base.timeout,
            };
        }
    } catch {
        // Plain command string.
    }

    return { ...base, command: trimmed };
}

export type ContainerShellValidation = 'ok' | 'command_required' | 'command_too_long' | 'timeout_invalid';

export function validateContainerShellFields(fields: ContainerShellFields): ContainerShellValidation {
    const command = fields.command.trim();
    if (command === '') return 'command_required';
    if (command.length > CONTAINER_SHELL_COMMAND_MAX) return 'command_too_long';
    const timeout = Number(fields.timeout);
    if (!Number.isInteger(timeout) || timeout < CONTAINER_SHELL_TIMEOUT_MIN || timeout > CONTAINER_SHELL_TIMEOUT_MAX) {
        return 'timeout_invalid';
    }
    return 'ok';
}

export function buildContainerShellPayload(fields: ContainerShellFields): string {
    return JSON.stringify({
        command: fields.command.trim(),
        timeout: Math.floor(Number(fields.timeout)),
    });
}

export function formatContainerShellDisplay(payload: string): string {
    const fields = parseContainerShellFields(payload);
    return `${fields.command} (${fields.timeout}s)`;
}
