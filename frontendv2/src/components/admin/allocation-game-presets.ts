/*
 * Shared game port presets for allocation creation (node allocations & server wizard).
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

export interface GamePreset {
    id: string;
    name: string;
    defaultPort: number;
}

export const allocationGamePresets: GamePreset[] = [
    { id: 'minecraft_java', name: 'Minecraft Java Edition', defaultPort: 25565 },
    { id: 'minecraft_bedrock', name: 'Minecraft Bedrock Edition', defaultPort: 19132 },
    { id: 'rust', name: 'Rust', defaultPort: 28015 },
    { id: 'csgo', name: 'CS:GO / Source', defaultPort: 27015 },
    { id: 'ark', name: 'ARK: Survival Evolved', defaultPort: 7777 },
    { id: 'ark_query', name: 'ARK: Survival Evolved (Query)', defaultPort: 27015 },
    { id: 'valheim', name: 'Valheim', defaultPort: 2456 },
    { id: 'terraria', name: 'Terraria', defaultPort: 7777 },
    { id: 'starbound', name: 'Starbound', defaultPort: 21025 },
    { id: '7dtd', name: '7 Days to Die', defaultPort: 26900 },
    { id: 'unturned', name: 'Unturned', defaultPort: 27015 },
    { id: 'gmod', name: "Garry's Mod", defaultPort: 27015 },
    { id: 'tf2', name: 'Team Fortress 2', defaultPort: 27015 },
    { id: 'satisfactory', name: 'Satisfactory', defaultPort: 15777 },
    { id: 'palworld', name: 'Palworld', defaultPort: 8211 },
];
