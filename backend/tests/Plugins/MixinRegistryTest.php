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
use App\Plugins\PluginConfig;
use PHPUnit\Framework\TestCase;
use App\Plugins\Mixins\MixinManager;
use App\Plugins\Mixins\MixinRegistry;

/**
 * Mixin registration and conf.yml mixin declarations.
 */
class MixinRegistryTest extends TestCase
{
    private string $className;
    private string $fixtureFile;

    protected function setUp(): void
    {
        if (!defined('APP_DEBUG')) {
            define('APP_DEBUG', false);
        }
        App::getInstance(false, true, true);
        $this->resetMixinState();

        $this->className = 'TestMixin' . bin2hex(random_bytes(4));
        $this->fixtureFile = dirname(__DIR__, 2) . '/app/Plugins/Mixins/Custom/' . $this->className . '.php';
        file_put_contents($this->fixtureFile, <<<PHP
<?php

namespace App\\Plugins\\Mixins\\Custom;

use App\\Plugins\\Mixins\\AbstractMixin;

/**
 * Test mixin. This docblock mentions a class on purpose.
 */
final class {$this->className} extends AbstractMixin
{
    public static function getMixinIdentifier(): string
    {
        return '{$this->className}';
    }

    public static function getMixinVersion(): string
    {
        return '1.0.0';
    }
}
PHP);
    }

    protected function tearDown(): void
    {
        @unlink($this->fixtureFile);
        $this->resetMixinState();
    }

    public function testRegisterMixinsDiscoversCustomMixins(): void
    {
        MixinRegistry::registerMixins();

        $this->assertContains($this->className, MixinManager::getRegisteredMixins());
    }

    public function testRegisterMixinsIsIdempotent(): void
    {
        MixinRegistry::registerMixins();
        $first = MixinManager::getRegisteredMixins();
        MixinRegistry::registerMixins();

        $this->assertSame($first, MixinManager::getRegisteredMixins());
    }

    public function testRegisteredMixinCanBeAttachedToPlugin(): void
    {
        MixinRegistry::registerMixins();

        $mixin = MixinManager::getMixin('someplugin', $this->className, ['level' => 2]);

        $this->assertNotNull($mixin);
        $this->assertSame('someplugin', $mixin->getPluginIdentifier());
        $this->assertSame(2, $mixin->getConfigValue('level'));
        $this->assertTrue(MixinManager::pluginHasMixin('someplugin', $this->className));
    }

    public function testGetMixinsFromConfigReadsBothLocations(): void
    {
        $config = [
            'plugin' => ['identifier' => 'x', 'mixins' => ['Legacy' => ['a' => 1], 'Shared' => ['from' => 'plugin']]],
            'mixins' => ['TopLevel' => null, 'Shared' => ['from' => 'top']],
        ];

        $this->assertSame(
            ['Legacy' => ['a' => 1], 'Shared' => ['from' => 'top'], 'TopLevel' => []],
            PluginConfig::getMixinsFromConfig($config)
        );
        $this->assertSame([], PluginConfig::getMixinsFromConfig(['plugin' => ['identifier' => 'x']]));
        $this->assertSame([], PluginConfig::getMixinsFromConfig(['mixins' => 'nope']));
    }

    public function testIsConfigValidAcceptsTopLevelMixins(): void
    {
        $config = $this->validConfig();
        $config['mixins'] = ['SomeMixin' => ['option' => true]];

        $this->assertTrue(PluginConfig::isConfigValid($config));
    }

    public function testIsConfigValidRejectsInvalidMixins(): void
    {
        $config = $this->validConfig();
        $config['mixins'] = ['SomeMixin' => 'not-an-array'];
        $this->assertFalse(PluginConfig::isConfigValid($config));

        $config = $this->validConfig();
        $config['plugin']['mixins'] = 'nope';
        $this->assertFalse(PluginConfig::isConfigValid($config));
    }

    private function validConfig(): array
    {
        return [
            'plugin' => [
                'name' => 'Mixin Test',
                'identifier' => 'mixintest',
                'description' => 'Test',
                'flags' => ['hasEvents'],
                'version' => '1.0.0',
                'target' => 'v2',
                'author' => ['Tests'],
                'icon' => 'https://example.com/icon.png',
                'dependencies' => [],
                'requiredConfigs' => [],
            ],
        ];
    }

    private function resetMixinState(): void
    {
        (new ReflectionProperty(MixinRegistry::class, 'registered'))->setValue(null, false);
        (new ReflectionProperty(MixinManager::class, 'registeredMixins'))->setValue(null, []);
        (new ReflectionProperty(MixinManager::class, 'mixinInstances'))->setValue(null, []);
    }
}
