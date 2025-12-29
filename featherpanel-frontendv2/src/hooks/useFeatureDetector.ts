import { useState, useCallback, useEffect } from "react";
import { detectFeature } from "@/lib/ServerFeatureDetector";

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
  enabledFeatures = ["eula", "java_version", "pid_limit"],
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

      if (result.feature === "eula" && !eulaOpen) {
        setEulaOpen(true);
      }

      if (
        result.feature === "java_version" &&
        !javaVersionOpen &&
        !blockJavaVersion
      ) {
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

      if (result.feature === "pid_limit" && !pidLimitOpen) {
        setPidLimitOpen(true);
      }
    },
    [eulaOpen, javaVersionOpen, pidLimitOpen, blockJavaVersion, enabledFeatures]
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
