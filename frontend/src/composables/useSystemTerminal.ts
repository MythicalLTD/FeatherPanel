/*
MIT License

Copyright (c) 2025 MythicalSystems and Contributors
Copyright (c) 2025 Cassian Gherman (NaysKutzu)
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

import { ref, computed } from 'vue';
import type { Ref } from 'vue';
import axios from 'axios';

export interface CommandExecutionRequest {
    command: string;
    timeout_seconds?: number;
    working_directory?: string;
    environment?: Record<string, string>;
}

export interface CommandExecutionResponse {
    exit_code: number;
    stdout: string;
    stderr: string;
    timed_out: boolean;
    duration_ms: number;
}

export interface Node {
    id: number;
    fqdn: string;
    daemon_token: string;
}

export function useSystemTerminal(node: Ref<Node | null>) {
    const isExecuting = ref(false);
    const error = ref<string | null>(null);
    const lastResult = ref<CommandExecutionResponse | null>(null);

    const hasError = computed(() => error.value !== null);
    const isIdle = computed(() => !isExecuting.value);

    async function executeCommand(request: CommandExecutionRequest): Promise<CommandExecutionResponse | null> {
        if (!node.value) {
            error.value = 'No node provided';
            return null;
        }

        if (isExecuting.value) {
            error.value = 'Command already executing';
            return null;
        }

        isExecuting.value = true;
        error.value = null;
        lastResult.value = null;

        try {
            const response = await axios.post<{
                success: boolean;
                data: CommandExecutionResponse;
                message?: string;
            }>(`/api/admin/nodes/${node.value.id}/terminal/exec`, request);

            if (!response.data.success) {
                throw new Error(response.data.message || 'Command execution failed');
            }

            lastResult.value = response.data.data;
            return response.data.data;
        } catch (err) {
            const errorMessage =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                (err as Error).message ||
                'Failed to execute command';
            error.value = errorMessage;
            return null;
        } finally {
            isExecuting.value = false;
        }
    }

    function clearError(): void {
        error.value = null;
    }

    function reset(): void {
        isExecuting.value = false;
        error.value = null;
        lastResult.value = null;
    }

    return {
        // State
        isExecuting,
        error,
        lastResult,

        // Computed
        hasError,
        isIdle,

        // Methods
        executeCommand,
        clearError,
        reset,
    };
}
