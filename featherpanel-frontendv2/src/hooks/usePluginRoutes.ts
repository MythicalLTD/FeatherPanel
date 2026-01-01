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

import { useState, useEffect } from "react";
import axios from "axios";
import type { PluginSidebarResponse } from "@/types/navigation";

// Global cache to share across all components
let cachedPluginData: PluginSidebarResponse["data"]["sidebar"] | null = null;
let isLoading = false;
let loadPromise: Promise<void> | null = null;

/**
 * Shared hook for accessing plugin routes data
 * Uses a global cache to ensure the API is only called once across all components
 */
export function usePluginRoutes() {
  const [pluginData, setPluginData] = useState<
    PluginSidebarResponse["data"]["sidebar"] | null
  >(cachedPluginData);

  useEffect(() => {
    // If we already have cached data, use it
    if (cachedPluginData) {
      setPluginData(cachedPluginData);
      return;
    }

    // If already loading, wait for that promise
    if (isLoading && loadPromise) {
      loadPromise.then(() => setPluginData(cachedPluginData));
      return;
    }

    // Start loading
    isLoading = true;
    loadPromise = (async () => {
      try {
        const { data } = await axios
          .get<PluginSidebarResponse>("/api/system/plugin-sidebar")
          .catch(() => ({ data: { success: false, data: null } }));

        if (data.success && data.data?.sidebar) {
          cachedPluginData = data.data.sidebar;
          setPluginData(data.data.sidebar);
        }
      } catch (error) {
        console.error("Failed to fetch plugin sidebar", error);
      } finally {
        isLoading = false;
        loadPromise = null;
      }
    })();

    loadPromise.then(() => setPluginData(cachedPluginData));
  }, []);

  return pluginData;
}

/**
 * Get all plugin paths for layout detection
 */
export function getPluginPaths(
  pluginData: PluginSidebarResponse["data"]["sidebar"] | null
): string[] {
  if (!pluginData) return [];

  const paths: string[] = [];

  // Extract client plugin paths
  if (pluginData.client) {
    Object.values(pluginData.client).forEach((item) => {
      if (item.redirect) {
        const redirectPath = item.redirect.startsWith("/")
          ? item.redirect
          : `/${item.redirect}`;
        paths.push(`/dashboard${redirectPath}`);
      }
    });
  }

  // Extract admin plugin paths
  if (pluginData.admin) {
    Object.values(pluginData.admin).forEach((item) => {
      if (item.redirect) {
        const redirectPath = item.redirect.startsWith("/")
          ? item.redirect
          : `/${item.redirect}`;
        paths.push(`/admin${redirectPath}`);
      }
    });
  }

  // Extract server plugin paths
  if (pluginData.server) {
    Object.values(pluginData.server).forEach((item) => {
      if (item.redirect) {
        const redirectPath = item.redirect.startsWith("/")
          ? item.redirect
          : `/${item.redirect}`;
        paths.push(redirectPath);
      }
    });
  }

  return paths;
}
