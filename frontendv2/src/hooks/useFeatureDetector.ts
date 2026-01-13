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

import { useState, useCallback, useEffect } from 'react';
import { detectFeature } from '@/lib/ServerFeatureDetector';

export interface UseFeatureDetectorProps {
    enabledFeatures?: string[];
}

export interface UseFeatureDetectorReturn {
    processLog: (log: string) => void;

    // EULA State
    eulaOpen: boolean;
    setEulaOpen: (open: boolean) => void;

    // Java Version State
    javaVersionOpen: boolean;
    setJavaVersionOpen: (open: boolean) => void;
    blockJavaVersion: boolean;

    // PID Limit State
    pidLimitOpen: boolean;
    setPidLimitOpen: (open: boolean) => void;

    // Shared Data
    detectedData: Record<string, unknown>;
}

export function useFeatureDetector({
    enabledFeatures = ['eula', 'java_version', 'pid_limit'],
}: UseFeatureDetectorProps = {}): UseFeatureDetectorReturn {
    const [eulaOpen, setEulaOpen] = useState(false);
    const [javaVersionOpen, setJavaVersionOpen] = useState(false);
    const [pidLimitOpen, setPidLimitOpen] = useState(false);

    // Prevent duplicate popups for Java version if already ignored/handled
    const [blockJavaVersion, setBlockJavaVersion] = useState(false);

    const [detectedData, setDetectedData] = useState<Record<string, unknown>>({});

    const processLog = useCallback(
        (log: string) => {
            const result = detectFeature(log, enabledFeatures);

            if (!result) return;

            if (result.feature === 'eula' && !eulaOpen) {
                setEulaOpen(true);
            }

            if (result.feature === 'java_version' && !javaVersionOpen && !blockJavaVersion) {
                setJavaVersionOpen(true);
                // Once opened, we might want to block it from opening again until refreshed
                setBlockJavaVersion(true);

                if (result.metadata) {
                    setDetectedData((prev) => ({
                        ...prev,
                        javaVersion: result.metadata,
                    }));
                }
            }

            if (result.feature === 'pid_limit' && !pidLimitOpen) {
                setPidLimitOpen(true);
            }
        },
        [eulaOpen, javaVersionOpen, pidLimitOpen, blockJavaVersion, enabledFeatures],
    );

    // Reset block on unmount or manual reset if needed
    useEffect(() => {
        return () => {
            setBlockJavaVersion(false);
        };
    }, []);

    return {
        processLog,
        eulaOpen,
        setEulaOpen,
        javaVersionOpen,
        setJavaVersionOpen,
        blockJavaVersion,
        pidLimitOpen,
        setPidLimitOpen,
        detectedData,
    };
}
