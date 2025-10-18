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

/**
 * Feature detection configuration
 * Maps feature names to their detection patterns
 */
export interface FeaturePattern {
    feature: string;
    patterns: RegExp[];
    description: string;
}

/**
 * Feature detection result
 */
export interface FeatureDetectionResult {
    feature: string;
    matched: boolean;
    message?: string;
    metadata?: Record<string, string>;
}

/**
 * All available feature patterns
 */
export const FEATURE_PATTERNS: FeaturePattern[] = [
    {
        feature: 'eula',
        patterns: [
            /You need to agree to the EULA/i,
            /Go to eula\.txt for more info/i,
            /Failed to load eula\.txt/i,
            /eula=false/i,
            /EULA.*not.*accept/i,
        ],
        description: 'Minecraft EULA agreement required',
    },
    {
        feature: 'java_version',
        patterns: [
            /Unsupported Java detected/i,
            /requires Java (\d+)/i,
            /Please update to Java/i,
            /incompatible Java version/i,
            /Java version (\d+) is not supported/i,
            /Unsupported class file major version (\d+)/i,
            /UnsupportedClassVersionError/i,
            /has been compiled by a more recent version of the Java Runtime/i,
            /class file version (\d+\.\d+)/i,
        ],
        description: 'Java version mismatch detected',
    },
    {
        feature: 'pid_limit',
        patterns: [
            /PID limit/i,
            /process limit/i,
            /too many processes/i,
            /Cannot fork/i,
            /fork.*failed/i,
            /Resource temporarily unavailable.*fork/i,
            /unable to create new native thread/i,
            /OutOfMemoryError.*unable to create.*thread/i,
        ],
        description: 'Process/PID limit reached',
    },
];

/**
 * Extract Java version from error message
 */
function extractJavaVersion(message: string): string | null {
    const patterns = [/Java (\d+)/i, /version (\d+)/i, /class file version (\d+)/i, /major version (\d+)/i];

    for (const pattern of patterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
}

/**
 * Detect if a console message matches any feature pattern
 * @param message - The console message to check
 * @param enabledFeatures - Array of features enabled in the egg
 * @returns Detection result or null if no match
 */
export function detectFeature(message: string, enabledFeatures: string[]): FeatureDetectionResult | null {
    // Check each feature pattern
    for (const featurePattern of FEATURE_PATTERNS) {
        // Only check if this feature is enabled in the egg
        if (!enabledFeatures.includes(featurePattern.feature)) {
            continue;
        }

        // Check if any pattern matches
        for (const pattern of featurePattern.patterns) {
            if (pattern.test(message)) {
                const result: FeatureDetectionResult = {
                    feature: featurePattern.feature,
                    matched: true,
                    message,
                };

                // Extract metadata for specific features
                if (featurePattern.feature === 'java_version') {
                    const version = extractJavaVersion(message);
                    if (version) {
                        result.metadata = { detectedVersion: version };
                    }
                }

                return result;
            }
        }
    }

    return null;
}

/**
 * Check if a feature is enabled in the egg
 * @param feature - Feature name to check
 * @param enabledFeatures - Array of features enabled in the egg
 * @returns True if feature is enabled
 */
export function isFeatureEnabled(feature: string, enabledFeatures: string[]): boolean {
    return enabledFeatures.includes(feature);
}
