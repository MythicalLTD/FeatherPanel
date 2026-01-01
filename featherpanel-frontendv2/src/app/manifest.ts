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

import { MetadataRoute } from "next";

import { settingsApi } from "@/lib/settings-api";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const data = await settingsApi.getPublicSettings();
  const settings = data?.settings;

  if (!settings || settings.app_pwa_enabled !== "true") {
    return {
      name: "FeatherPanel",
      short_name: "FeatherPanel",
      icons: [],
      start_url: "/",
      display: "browser",
      background_color: "#ffffff",
      theme_color: "#000000",
    };
  }

  return {
    name: settings.app_name || "FeatherPanel",
    short_name: settings.app_pwa_short_name || "FeatherPanel",
    description:
      settings.app_pwa_description || "Manage your game servers on the go.",
    start_url: "/",
    display: "standalone",
    background_color: settings.app_pwa_bg_color || "#ffffff",
    theme_color: settings.app_pwa_theme_color || "#000000",
    icons: [
      {
        src: settings.app_logo_dark || "/favicon.ico",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
