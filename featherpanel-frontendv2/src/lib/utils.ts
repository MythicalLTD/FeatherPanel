import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "sonner";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Copy text to clipboard with fallback
 */
export async function copyToClipboard(
  text: string,
  t?: (key: string) => string
) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for non-secure contexts or older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
      } catch (err) {
        console.error("Fallback copy failed", err);
      }
      textArea.remove();
    }
    toast.success(t ? t("common.copiedToClipboard") : "Copied to clipboard");
  } catch (err) {
    console.error("Failed to copy text: ", err);
    toast.error(t ? t("common.error") : "Failed to copy");
  }
}

export function isEnabled(val?: string | boolean | number | null): boolean {
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val === 1;
  if (typeof val === "string") {
    return val === "true" || val === "1";
  }
  return false;
}

export function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

/**
 * Format MiB to human-readable size (MiB, GiB, TiB, etc)
 */
export function formatMib(mib: number): string {
  if (mib === 0) return "0 MiB";
  const k = 1024;
  const sizes = ["MiB", "GiB", "TiB", "PiB"];
  const i = Math.floor(Math.log(mib) / Math.log(k));
  // Handle case where i < 0 (mib < 1) by treating as lowest unit (MiB)
  const index = Math.max(0, i);
  // If index >= sizes.length, stick to largest unit
  const safeIndex = Math.min(index, sizes.length - 1);

  return `${Math.round((mib / Math.pow(k, safeIndex)) * 100) / 100} ${
    sizes[safeIndex]
  }`;
}

/**
 * Format CPU percentage
 */
export function formatCpu(percent: number): string {
  if (percent === 0) return "Unlimited"; // Caller should handle translation if needed, or pass unlimited string
  return `${Math.round(percent)}%`;
}
