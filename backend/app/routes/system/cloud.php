<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

use App\App;
use App\Helpers\ApiResponse;
use App\Config\ConfigInterface;
use Symfony\Component\Routing\Route;
use App\Middleware\CloudAccessMiddleware;
use App\Middleware\PanelAccessMiddleware;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;

return static function (RouteCollection $routes): void {
    $routes->add('feathercloud-handshake', new Route(
        '/api/cloud/v1/handshake',
        [
            '_controller' => static function (Request $request) {
                $config = App::getInstance(true)->getConfig();

                $panelPublic = $config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PUBLIC_KEY, '');
                $panelPrivate = $config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PRIVATE_KEY, '');
                $panelRotated = $config->getSetting(ConfigInterface::FEATHERCLOUD_CLOUD_LAST_ROTATED, null);

                $cloudPublic = $config->getSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PUBLIC_KEY, '');
                $cloudPrivate = $config->getSetting(ConfigInterface::FEATHERCLOUD_ACCESS_PRIVATE_KEY, '');
                $cloudRotated = $config->getSetting(ConfigInterface::FEATHERCLOUD_ACCESS_LAST_ROTATED, null);

                return ApiResponse::success([
                    'message' => 'FeatherCloud handshake successful',
                    'timestamp' => gmdate('c'),
                    'panel_credentials' => [
                        'public_key' => $panelPublic,
                        'private_key' => $panelPrivate,
                        'last_rotated_at' => $panelRotated,
                    ],
                    'cloud_credentials' => [
                        'public_key' => $cloudPublic,
                        'private_key' => $cloudPrivate,
                        'last_rotated_at' => $cloudRotated,
                    ],
                ], 'Handshake successful', 200);
            },
            '_middleware' => [CloudAccessMiddleware::class],
        ],
        [],
        [],
        '',
        [],
        ['POST']
    ));

    $routes->add('feathercloud-panel-handshake', new Route(
        '/api/cloud/v1/panel-handshake',
        [
            '_controller' => static function (Request $request) {
                $config = App::getInstance(true)->getConfig();

                if (isset($_GET['panel_public_key']) && isset($_GET['panel_private_key'])) {
                    $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PUBLIC_KEY, $_GET['panel_public_key']);
                    $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_PRIVATE_KEY, $_GET['panel_private_key']);
                    $config->setSetting(ConfigInterface::FEATHERCLOUD_CLOUD_LAST_ROTATED, gmdate('c'));
                }

                return ApiResponse::success([], 'Panel credentials accepted and updated', 200);
            },
            '_middleware' => [PanelAccessMiddleware::class],
        ],
        [],
        [],
        '',
        [],
        ['POST']
    ));
};
