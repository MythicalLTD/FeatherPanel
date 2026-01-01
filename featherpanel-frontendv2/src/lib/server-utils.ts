// Server utility functions for formatting and calculations

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

import { Server } from "@/types/server";
import { formatMib, formatCpu as formatCpuGlobal } from "@/lib/utils";

/**
 * Format bytes to human-readable memory size
 */
export function formatMemory(bytes: number): string {
  // Convert bytes to MiB for formatting
  return formatMib(bytes / 1024 / 1024);
}

/**
 * Format bytes to human-readable disk size
 */
export function formatDisk(bytes: number): string {
  // Convert bytes to MiB for formatting
  return formatMib(bytes / 1024 / 1024);
}

/**
 * Format CPU percentage
 */
export function formatCpu(percent: number): string {
  return formatCpuGlobal(percent).replace("Unlimited", "0%"); // Maintain 0% behavior for server-utils unless updated upstream
}

/**
 * Get resource usage percentage
 */
export function getUsagePercentage(used: number, limit: number): number {
  if (limit === 0) return 0;
  return Math.min((used / limit) * 100, 100);
}

/**
 * Get progress bar width as percentage string
 */
export function getProgressWidth(used: number, limit: number): string {
  if (limit === 0) return "0%";
  const percentage = getUsagePercentage(used, limit);
  return `${percentage}%`;
}

/**
 * Get progress bar color based on usage percentage
 */
export function getProgressColor(
  percentage: number,
  isUnlimited: boolean = false
): string {
  if (isUnlimited) return "bg-blue-500";
  if (percentage >= 90) return "bg-red-500";
  if (percentage >= 75) return "bg-yellow-500";
  return "bg-green-500";
}

/**
 * Format resource usage with current/limit display
 */
export function formatResourceUsage(
  used: number,
  limit: number,
  formatter: (value: number) => string
): string {
  return formatter(used);
}

/**
 * Get server memory usage
 */
export function getServerMemory(server: Server): number {
  return server.stats?.memory_bytes || 0;
}

/**
 * Get server memory limit
 */
export function getServerMemoryLimit(server: Server): number {
  return server.memory * 1024 * 1024; // Convert MB to bytes
}

/**
 * Get server disk usage
 */
export function getServerDisk(server: Server): number {
  return server.stats?.disk_bytes || 0;
}

/**
 * Get server disk limit
 */
export function getServerDiskLimit(server: Server): number {
  return server.disk * 1024 * 1024; // Convert MB to bytes
}

/**
 * Get server CPU usage
 */
export function getServerCpu(server: Server): number {
  return server.stats?.cpu_absolute || 0;
}

/**
 * Get server CPU limit
 */
export function getServerCpuLimit(server: Server): number {
  return server.cpu;
}

/**
 * Get status dot color class
 */
export function getStatusDotColor(status: string): string {
  switch (status) {
    case "running":
      return "bg-green-500 shadow-green-500/50 shadow-lg";
    case "starting":
      return "bg-yellow-500 shadow-yellow-500/50 shadow-lg animate-pulse";
    case "stopping":
      return "bg-orange-500 shadow-orange-500/50 shadow-lg animate-pulse";
    case "stopped":
      return "bg-gray-500 shadow-gray-500/50 shadow-lg";
    case "offline":
      return "bg-red-500 shadow-red-500/50 shadow-lg";
    case "installing":
      return "bg-blue-500 shadow-blue-500/50 shadow-lg animate-pulse";
    case "suspended":
      return "bg-purple-500 shadow-purple-500/50 shadow-lg";
    default:
      return "bg-gray-400";
  }
}

/**
 * Get display status for server
 */
export function displayStatus(server: Server): string {
  // Priority: installation/suspension status > stats state > server status
  if (server.status === "installing" || server.status === "install_failed") {
    return server.status;
  }
  if (server.status === "suspended") {
    return "suspended";
  }
  if (server.status === "restoring_backup") {
    return "restoring_backup";
  }
  return server.stats?.state || server.status;
}

/**
 * Check if server is accessible
 */
export function isServerAccessible(server: Server): boolean {
  // Check if node is in maintenance mode
  if (server.node?.maintenance_mode) {
    return false;
  }

  // Check if server is suspended
  if (server.status === "suspended") {
    return false;
  }

  // Check if installation failed
  if (server.status === "install_failed") {
    return false;
  }

  return true;
}

/**
 * Get access restriction reason
 */
export function getAccessRestrictionReason(server: Server): string {
  if (server.status === "suspended") {
    return "Server Suspended";
  }
  if (server.status === "install_failed") {
    return "Installation Failed";
  }
  if (server.status === "installing") {
    return "Installing...";
  }
  return "Access Restricted";
}
