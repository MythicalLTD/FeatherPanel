/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    40|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

/** Starter files offered in the "New file" dialog. */
export interface FileTemplate {
    id: string;
    fileName: string;
    content: string;
}

export const FILE_TEMPLATES: FileTemplate[] = [
    {
        id: 'server-properties',
        fileName: 'server.properties',
        content: [
            'motd=A Minecraft Server',
            'server-port=25565',
            'max-players=20',
            'online-mode=true',
            'difficulty=easy',
            'gamemode=survival',
            'pvp=true',
            'view-distance=10',
            'simulation-distance=10',
            'white-list=false',
            'enable-command-block=false',
            '',
        ].join('\n'),
    },
    { id: 'eula', fileName: 'eula.txt', content: 'eula=true\n' },
    {
        id: 'env',
        fileName: '.env',
        content: ['# Environment variables', 'APP_ENV=production', 'APP_DEBUG=false', 'PORT=3000', ''].join('\n'),
    },
    {
        id: 'gitignore',
        fileName: '.gitignore',
        content: ['node_modules/', 'logs/', '*.log', '.env', 'cache/', ''].join('\n'),
    },
    {
        id: 'package-json',
        fileName: 'package.json',
        content:
            JSON.stringify(
                {
                    name: 'my-app',
                    version: '1.0.0',
                    private: true,
                    main: 'index.js',
                    scripts: { start: 'node index.js' },
                },
                null,
                2,
            ) + '\n',
    },
    {
        id: 'start-sh',
        fileName: 'start.sh',
        content: ['#!/bin/sh', 'java -Xms1G -Xmx2G -jar server.jar nogui', ''].join('\n'),
    },
    { id: 'readme', fileName: 'README.md', content: '# Notes\n\n' },
];
