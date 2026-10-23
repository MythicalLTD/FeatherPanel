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

use App\App;
use App\Chat\User;
use App\Plugins\PluginSettings;
use PHPUnit\Framework\TestCase;
use App\Controllers\Admin\PluginsController;
use Symfony\Component\HttpFoundation\Request;

/**
 * End to end checks of conf.yml `config:` rules through the admin plugin API.
 */
class PluginSettingsApiTest extends TestCase
{
    private string $identifier;
    private string $pluginDir;
    private string $adminUuid;

    protected function setUp(): void
    {
        App::getInstance(false, true, true);

        global $pluginManager;
        if ($pluginManager === null) {
            $pluginManager = new class () {
                public function getLoadedMemoryPlugins(): array
                {
                    return [];
                }

                public function getPluginsWithoutLoader(): array
                {
                    return [];
                }
            };
        }

        $this->adminUuid = sprintf('%08x-0000-4000-8000-%012x', random_int(0, 0xFFFFFFFF), random_int(0, 0xFFFFFFFFFFFF));
        $suffix = bin2hex(random_bytes(4));
        User::createUser([
            'uuid' => $this->adminUuid,
            'username' => 'fpsettings' . $suffix,
            'first_name' => 'Settings',
            'last_name' => 'Test',
            'email' => 'fpsettings' . $suffix . '@example.com',
            'password' => password_hash('TestPassword123', PASSWORD_BCRYPT),
            'role_id' => 4,
            'avatar' => 'https://cdn.mythical.systems/featherpanel/logo.png',
            'remember_token' => bin2hex(random_bytes(16)),
        ]);

        $this->identifier = 'fpsettingstest' . bin2hex(random_bytes(4));
        $this->pluginDir = rtrim(APP_ADDONS_DIR, '/') . '/' . $this->identifier;
        mkdir($this->pluginDir, 0755, true);
        file_put_contents($this->pluginDir . '/conf.yml', <<<YAML
plugin:
  name: Settings Test
  identifier: {$this->identifier}
  description: Test plugin
  flags: []
  version: 1.0.0
  target: v2
  author: [Tests]
  icon: https://example.com/icon.png
  dependencies: []
  requiredConfigs: [api_key]
config:
  - name: api_key
    display_name: API key
    type: text
    description: Key
    required: true
    validation:
      regex: '/^[A-Za-z0-9]+$/'
      min: 4
  - name: limit
    display_name: Limit
    type: number
    description: Limit
    required: false
    default: 10
    validation:
      min: 1
      max: 50
  - name: enabled
    display_name: Enabled
    type: boolean
    description: Enabled
    required: false
    default: true
YAML);
    }

    protected function tearDown(): void
    {
        foreach (array_keys(PluginSettings::getSettingValues($this->identifier)) as $key) {
            PluginSettings::deleteSettings($this->identifier, $key);
        }
        @unlink($this->pluginDir . '/conf.yml');
        @rmdir($this->pluginDir);

        $admin = User::getUserByUuid($this->adminUuid);
        if ($admin) {
            User::hardDeleteUser($admin['id']);
        }
    }

    public function testRequiredSettingCannotBeSavedEmpty(): void
    {
        [$status, $body] = $this->set('api_key', '  ');

        $this->assertSame(400, $status);
        $this->assertSame('PLUGIN_SETTING_INVALID', $body['error_code']);
        $this->assertSame('api_key', $body['data']['key']);
        $this->assertSame(['API key is required.'], $body['data']['errors']);
        $this->assertNull(PluginSettings::getSetting($this->identifier, 'api_key'));
    }

    public function testValidationRulesAreEnforced(): void
    {
        [$status, $body] = $this->set('api_key', 'ab!');
        $this->assertSame(400, $status);
        $this->assertContains('API key does not match the required format.', $body['data']['errors']);
        $this->assertContains('API key must be at least 4 characters long.', $body['data']['errors']);

        [$status] = $this->set('limit', '51');
        $this->assertSame(400, $status);

        [$status] = $this->set('api_key', 'abcd1234');
        $this->assertSame(200, $status);
        $this->assertSame('abcd1234', PluginSettings::getSetting($this->identifier, 'api_key'));
    }

    public function testBooleanValuesAreStoredAsStrings(): void
    {
        [$status] = $this->set('enabled', false);
        $this->assertSame(200, $status);
        $this->assertSame('false', PluginSettings::getSetting($this->identifier, 'enabled'));
    }

    public function testUndeclaredKeysAreNotValidated(): void
    {
        [$status] = $this->set('plugin-sidebar-hidden-example', 'true');
        $this->assertSame(200, $status);
    }

    public function testGetConfigAppliesDefaultsAndReportsNotConfigured(): void
    {
        $request = Request::create('/api/admin/plugins/' . $this->identifier . '/config', 'GET');
        $response = (new PluginsController())->getConfig($request, $this->identifier);
        $body = json_decode($response->getContent(), true);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('10', $body['data']['settings']['limit']);
        $this->assertSame('true', $body['data']['settings']['enabled']);
        $this->assertArrayNotHasKey('api_key', $body['data']['settings']);
        $this->assertSame(['api_key'], $body['data']['plugin']['plugin']['missingConfigs']);
        $this->assertFalse($body['data']['plugin']['plugin']['configured']);

        $this->set('api_key', 'abcd1234');
        $body = json_decode((new PluginsController())->getConfig($request, $this->identifier)->getContent(), true);
        $this->assertSame([], $body['data']['plugin']['plugin']['missingConfigs']);
        $this->assertTrue($body['data']['plugin']['plugin']['configured']);
    }

    private function set(string $key, mixed $value): array
    {
        $request = Request::create('/api/admin/plugins/' . $this->identifier . '/settings/set', 'POST', [], [], [], [], json_encode(['key' => $key, 'value' => $value]));
        $request->attributes->set('user', ['uuid' => $this->adminUuid]);
        $response = (new PluginsController())->setSettings($request, $this->identifier);

        return [$response->getStatusCode(), json_decode($response->getContent(), true)];
    }
}
