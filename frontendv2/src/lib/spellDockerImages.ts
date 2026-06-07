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

export function parseSpellDockerImages(
    dockerImages?: string | Record<string, string> | null,
): { name: string; value: string }[] {
    if (!dockerImages) return [];

    try {
        const dockerImagesObj =
            typeof dockerImages === 'string' ? (JSON.parse(dockerImages) as Record<string, string>) : dockerImages;

        return Object.entries(dockerImagesObj).map(([name, value]) => ({ name, value }));
    } catch {
        return [];
    }
}

export function resolveSpellDefaultDockerImage(spell: {
    default_docker_image?: string | null;
    docker_images?: string | Record<string, string> | null;
}): string {
    if (spell.default_docker_image?.trim()) {
        return spell.default_docker_image.trim();
    }

    const images = parseSpellDockerImages(spell.docker_images);
    return images[0]?.value ?? '';
}

export function buildSpellDockerImageOptions(
    spell: {
        default_docker_image?: string | null;
        docker_images?: string | Record<string, string> | null;
    },
    currentImage?: string | null,
): { name: string; value: string }[] {
    const images = parseSpellDockerImages(spell.docker_images);
    const trimmedCurrent = currentImage?.trim();

    if (trimmedCurrent && !images.some((img) => img.value === trimmedCurrent)) {
        images.unshift({ name: trimmedCurrent, value: trimmedCurrent });
    }

    return images;
}
