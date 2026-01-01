/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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

import { useContext } from 'react';
import { ServerContext } from '@/contexts/ServerContext';

// uuidShort is used to identify the server but we now get it from context.
// However, the hook signature expects it. I'll keep it as _uuidShort to silence linter.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useServerPermissions(_uuidShort: string) {
    // Attempt to consume the context
    const context = useContext(ServerContext);

    // If context exists, return it
    if (context) {
        return context;
    }

    // If we are NOT in a ServerProvider (e.g., Dashboard page), return a safe fallback.
    // This effectively means "no server selected, no permissions".
    // This avoids errors when useNavigation calls this hook on global pages.
    return {
        server: null,
        loading: false,
        error: null,
        refreshServer: async () => {},
        hasPermission: () => false,
    };
}
