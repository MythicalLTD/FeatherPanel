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

module.exports = {
  apps: [
    {
      name: "featherpanel-frontendv2",
      cwd: "/var/www/featherpanel/frontendv2",

      // Run Next.js directly
      script: "node_modules/next/dist/bin/next",
      args: "start -p 4921",

      env: {
        NODE_ENV: "production",
        PORT: 4921
      },

      instances: 1,        // change to "max" if you want clustering
      exec_mode: "fork",   // "cluster" also works with instances > 1
      autorestart: true,
      watch: false,
      max_memory_restart: "512M"
    }
  ]
};