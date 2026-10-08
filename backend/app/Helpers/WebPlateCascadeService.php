<?php

/*
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studios
 * Copyright (C) 2025 FeatherPanel Contributors
 * Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

namespace App\Helpers;

use App\Chat\WebNode;
use App\Chat\WebPlate;
use App\Chat\WebSpace;

/**
 * Propagate WebPlate template edits to linked WebSpaces and sync daemons.
 */
final class WebPlateCascadeService
{
    /**
     * @param array<string, mixed> $previousPlate plate row before update
     * @param array<string, mixed> $updatedPlate plate row after update
     *
     * @return array{cascaded: int, errors: list<string>}
     */
    public static function cascadeAfterPlateUpdate(array $previousPlate, array $updatedPlate): array
    {
        $plateId = (int) ($updatedPlate['id'] ?? 0);
        if ($plateId <= 0) {
            return ['cascaded' => 0, 'errors' => []];
        }

        $previousDocRoot = WebPlate::normalizeDocumentRoot($previousPlate['document_root'] ?? '');
        $newDocRoot = WebPlate::normalizeDocumentRoot($updatedPlate['document_root'] ?? '');
        $newImage = trim((string) ($updatedPlate['docker_image'] ?? ''));
        $plateRuntimeChanged = self::plateRuntimeFieldsChanged($previousPlate, $updatedPlate);

        $cascaded = 0;
        $errors = [];

        foreach (WebSpace::listByWebplateId($plateId) as $space) {
            $uuid = (string) ($space['uuid'] ?? '');
            if ($uuid === '') {
                continue;
            }

            $previousSpace = $space;
            $fields = [];
            if ($newImage !== '') {
                $fields['image'] = $newImage;
            }

            $currentDocRoot = WebPlate::normalizeDocumentRoot($space['document_root'] ?? '');
            if ($newDocRoot !== $previousDocRoot && $currentDocRoot === $previousDocRoot) {
                $fields['document_root'] = $newDocRoot;
            }

            if ($fields !== [] && !WebSpace::update($uuid, $fields)) {
                $errors[] = 'Failed to update WebSpace ' . $uuid;

                continue;
            }

            if ($fields === [] && !$plateRuntimeChanged) {
                continue;
            }

            $updatedSpace = WebSpace::getByUuid($uuid);
            if (!$updatedSpace) {
                $errors[] = 'WebSpace ' . $uuid . ' not found after update';

                continue;
            }

            $webNode = WebNode::getWebNodeById((int) ($updatedSpace['web_node_id'] ?? 0));
            if (!$webNode) {
                $errors[] = 'Web node missing for WebSpace ' . $uuid;

                continue;
            }

            $sync = WebSpaceDaemonSync::syncAfterUpdate($webNode, $updatedSpace, $previousSpace, $previousPlate);
            if (!$sync['ok']) {
                $errors[] = ($sync['error'] ?? 'Daemon sync failed') . ' (' . $uuid . ')';

                continue;
            }

            ++$cascaded;
        }

        return ['cascaded' => $cascaded, 'errors' => $errors];
    }

    /**
     * @param array<string, mixed> $previous
     * @param array<string, mixed> $current
     */
    private static function plateRuntimeFieldsChanged(array $previous, array $current): bool
    {
        $prevRef = WebPlate::toDaemonRef($previous);
        $currRef = WebPlate::toDaemonRef($current);

        if (trim((string) ($prevRef['startup'] ?? '')) !== trim((string) ($currRef['startup'] ?? ''))) {
            return true;
        }
        if ((int) ($prevRef['container_port'] ?? 0) !== (int) ($currRef['container_port'] ?? 0)) {
            return true;
        }

        $prevImage = trim((string) ($prevRef['docker_image'] ?? ''));
        $currImage = trim((string) ($currRef['docker_image'] ?? ''));

        return $prevImage !== '' && $currImage !== '' && strcasecmp($prevImage, $currImage) !== 0;
    }
}
