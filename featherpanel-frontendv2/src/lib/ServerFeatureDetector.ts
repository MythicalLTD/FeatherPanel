export interface FeaturePattern {
  feature: string;
  patterns: RegExp[];
  description: string;
}

export interface FeatureDetectionResult {
  feature: string;
  matched: boolean;
  message?: string;
  metadata?: Record<string, string>;
}

export const FEATURE_PATTERNS: FeaturePattern[] = [
  {
    feature: "eula",
    patterns: [
      /You need to agree to the EULA/i,
      /Go to eula\.txt for more info/i,
      /Failed to load eula\.txt/i,
      /eula=false/i,
      /EULA.*not.*accept/i,
    ],
    description: "Minecraft EULA agreement required",
  },
  {
    feature: "java_version",
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
      /Minecraft .* requires.*Java (\d+)/i,
      /Minecraft .* requires running the server with Java (\d+)/i,
      /Please install Java (\d+) or above/i,
      /Download Java (\d+).*adoptium\.net/i,
    ],
    description: "Java version mismatch detected",
  },
  {
    feature: "pid_limit",
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
    description: "Process/PID limit reached",
  },
];

function extractJavaVersion(message: string): string | null {
  const patterns = [
    /Java (\d+)/i,
    /version (\d+)/i,
    /class file version (\d+)/i,
    /major version (\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export function detectFeature(
  message: string,
  enabledFeatures: string[] = []
): FeatureDetectionResult | null {
  // If enabledFeatures is empty or not provided, we might want to default to ALL or specific ones.
  // However, logic from Vue shows it checks against enabled list.
  // For now we assume all are enabled if the list is irrelevant, but the caller should provide it.

  for (const featurePattern of FEATURE_PATTERNS) {
    // Only check if this feature is enabled in the egg (if list is provided and not empty)
    // If empty, we might skip checking, but for safety let's assume if enabledFeatures is provided we check against it.
    // If the user wants to force check all, they would pass all keys.
    if (
      enabledFeatures.length > 0 &&
      !enabledFeatures.includes(featurePattern.feature)
    ) {
      continue;
    }

    for (const pattern of featurePattern.patterns) {
      if (pattern.test(message)) {
        const result: FeatureDetectionResult = {
          feature: featurePattern.feature,
          matched: true,
          message,
        };

        if (featurePattern.feature === "java_version") {
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
