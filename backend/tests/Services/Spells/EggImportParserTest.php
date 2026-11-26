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

use App\Helpers\SafeUrlFetcher;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Yaml\Yaml;
use App\Services\Spells\EggImportParser;
use App\Controllers\Admin\SpellsController;
use App\Services\Spells\EggImportException;
use PHPUnit\Framework\Attributes\DataProvider;

class EggImportParserTest extends TestCase
{
    private const FIXTURES = __DIR__ . '/../../fixtures/eggs/';

    public static function fixtureProvider(): array
    {
        return [
            'PTDL_v2 Paper' => ['ptdl_v2-paper.json', 'PTDL_v2', 'json'],
            'PTDL_v2 Rust' => ['ptdl_v2-rust.json', 'PTDL_v2', 'json'],
            'PTDL_v2 Node.js' => ['ptdl_v2-nodejs.json', 'PTDL_v2', 'json'],
            'PLCN_v1 Left 4 Dead 2 JSON' => ['plcn_v1-left4dead2.json', 'PLCN_v1', 'json'],
            'PLCN_v1 Left 4 Dead 2 YAML' => ['plcn_v1-left4dead2.yaml', 'PLCN_v1', 'yaml'],
            'PLCN_v1 Veloren JSON' => ['plcn_v1-veloren.json', 'PLCN_v1', 'json'],
            'PLCN_v2 Arma Reforger JSON' => ['plcn_v2-arma-reforger.json', 'PLCN_v2', 'json'],
            'PLCN_v2 Arma Reforger YAML' => ['plcn_v2-arma-reforger.yaml', 'PLCN_v2', 'yaml'],
            'PLCN_v3 Folia JSON' => ['plcn_v3-folia.json', 'PLCN_v3', 'json'],
            'PLCN_v3 Nightingale JSON' => ['plcn_v3-nightingale.json', 'PLCN_v3', 'json'],
            'PLCN_v3 Paper YAML' => ['plcn_v3-paper.yaml', 'PLCN_v3', 'yaml'],
            'PLCN_v3 Rust YAML' => ['plcn_v3-rust.yaml', 'PLCN_v3', 'yaml'],
            'PLCN_v3 Node.js YAML' => ['plcn_v3-nodejs.yaml', 'PLCN_v3', 'yaml'],
        ];
    }

    #[DataProvider('fixtureProvider')]
    public function testRealEggImportsToValidSpell(string $file, string $format, string $syntax): void
    {
        $content = file_get_contents(self::FIXTURES . $file);
        $source = $syntax === 'json' ? json_decode($content, true) : Yaml::parse($content);
        [$parsed, $egg, $spell] = $this->import($file);

        self::assertSame($format, $parsed['format']);
        self::assertSame($syntax, $parsed['syntax']);
        self::assertSame($source['name'], $spell['name']);
        self::assertSame($source['author'], $spell['author']);
        self::assertIsString($spell['startup']);
        self::assertNotSame('', trim($spell['startup']));

        $images = json_decode($spell['docker_images'], true);
        self::assertIsArray($images);
        self::assertNotEmpty($images);
        self::assertContains($spell['default_docker_image'], $images);

        foreach (['config_files', 'config_startup', 'config_logs'] as $field) {
            self::assertIsObject(json_decode($spell[$field]), $field . ' must be a JSON object');
        }
        self::assertStringNotContainsString('server.allocations.', $spell['config_files']);
        self::assertStringNotContainsString('server.environment.', $spell['config_files']);
        self::assertStringNotContainsString('memory_limit', $spell['config_files']);

        self::assertSame($source['scripts']['installation']['container'], $spell['script_container']);
        self::assertSame($source['scripts']['installation']['entrypoint'], $spell['script_entry']);
        self::assertSame($source['scripts']['installation']['script'], $spell['script_install']);
        self::assertSame($source['config']['stop'] ?? 'stop', $spell['config_stop']);

        self::assertCount(count($source['variables']), $egg['variables']);
        foreach ($egg['variables'] as $variable) {
            self::assertIsString($variable['rules']);
            self::assertIsString($variable['default_value']);
            self::assertIsString($variable['description']);
            self::assertArrayNotHasKey('sort', $variable);
        }
    }

    public function testPelicanV3YamlPaperMapsEveryField(): void
    {
        [$parsed, $egg, $spell] = $this->import('plcn_v3-paper.yaml');

        self::assertSame('java -Xms128M -XX:MaxRAMPercentage=95.0 -Dterminal.jline=false -Dterminal.ansi=true -jar {{SERVER_JARFILE}}', $spell['startup']);
        self::assertSame('ghcr.io/pelican-eggs/yolks:java_25', $spell['default_docker_image']);
        self::assertSame('Java 25', array_key_first(json_decode($spell['docker_images'], true)));
        self::assertSame(['eula', 'java_version', 'pid_limit'], json_decode($spell['features'], true));
        self::assertSame([], json_decode($spell['file_denylist'], true));
        self::assertSame('https://raw.githubusercontent.com/pelican-eggs/minecraft/refs/heads/main/java/paper/egg-paper.yaml', $spell['update_url']);
        self::assertSame('5da37ef6-58da-4169-90a6-e683e1721247', $egg['uuid']);

        $files = json_decode($spell['config_files'], true);
        self::assertSame('properties', $files['server.properties']['parser']);
        self::assertSame('{{server.build.default.port}}', $files['server.properties']['find']['server-port']);
        self::assertSame('{{server.build.default.port}}', $files['server.properties']['find']['query.port']);
        self::assertSame(')! For help, type ', json_decode($spell['config_startup'], true)['done']);
        self::assertSame('{}', $spell['config_logs']);

        // Variables follow Pelican's sort order and keep rules as Laravel rule strings.
        self::assertSame(['MINECRAFT_VERSION', 'SERVER_JARFILE', 'DL_PATH', 'BUILD_NUMBER', 'USER_AGENT', 'PROJECT'], array_column($egg['variables'], 'env_variable'));
        $byEnv = array_column($egg['variables'], null, 'env_variable');
        self::assertSame('required|string|max:20', $byEnv['BUILD_NUMBER']['rules']);
        self::assertFalse($byEnv['DL_PATH']['user_viewable']);

        self::assertContains('Egg tags are not stored on spells: minecraft.', $parsed['warnings']);
        self::assertContains('The egg icon was not imported; set a spell banner instead.', $parsed['warnings']);
    }

    public function testPelicanYamlRustNumbersAndEnvironmentPlaceholders(): void
    {
        [, $egg, $spell] = $this->import('plcn_v3-rust.yaml');
        $byEnv = array_column($egg['variables'], null, 'env_variable');

        self::assertSame('258550', $byEnv['SRCDS_APPID']['default_value']);
        self::assertSame('required|string|in:258550', $byEnv['SRCDS_APPID']['rules']);
        self::assertStringContainsString('{{server.build.env.SERVER_HOSTNAME}}', $spell['config_files']);
        self::assertStringStartsWith('./RustDedicated -batchmode +server.port {{SERVER_PORT}}', $spell['startup']);
        self::assertSame('ghcr.io/pelican-eggs/games:rust', $spell['default_docker_image']);
    }

    public function testPelicanYamlNodeEmptyListsAndStartupDoneList(): void
    {
        [, $egg, $spell] = $this->import('plcn_v3-nodejs.yaml');
        $byEnv = array_column($egg['variables'], null, 'env_variable');

        self::assertSame('{}', $spell['config_files']);
        self::assertSame('{}', $spell['config_logs']);
        self::assertSame(['change this text 1', 'change this text 2'], json_decode($spell['config_startup'], true)['done']);
        self::assertSame('^C', $spell['config_stop']);
        self::assertSame('0', $byEnv['AUTO_UPDATE']['default_value']);
        self::assertSame('required|boolean', $byEnv['AUTO_UPDATE']['rules']);
        self::assertSame('ghcr.io/pelican-eggs/yolks:nodejs_26', $spell['default_docker_image']);
    }

    public function testMultipleStartupCommandsPickDefaultAndWarn(): void
    {
        $source = json_decode(file_get_contents(self::FIXTURES . 'plcn_v3-nightingale.json'), true);
        [$parsed, , $spell] = $this->import('plcn_v3-nightingale.json');

        self::assertSame($source['startup_commands']['Default'], $spell['startup']);
        self::assertCount(1, $parsed['warnings'] = array_values(array_filter($parsed['warnings'], static fn ($w) => str_contains($w, 'Startup command'))));
        self::assertStringContainsString('"With cheats"', $parsed['warnings'][0]);
    }

    public function testStartupCommandsWithoutDefaultUseTheFirstOne(): void
    {
        $parsed = EggImportParser::parse("meta:\n  version: PLCN_v3\nname: Test\nstartup_commands:\n  Vanilla: ./run vanilla\n  Modded: ./run modded\n");
        self::assertSame('./run vanilla', $parsed['data']['startup']);
        self::assertArrayNotHasKey('startup_commands', $parsed['data']);
        self::assertStringContainsString('"Modded"', $parsed['warnings'][0]);
    }

    /**
     * Pelican writes the same egg as JSON or YAML; both must give the same spell.
     */
    #[DataProvider('yamlJsonPairs')]
    public function testYamlAndJsonOfTheSameEggImportIdentically(string $json, string $yaml): void
    {
        [$parsedJson, $eggJson, $spellJson] = $this->import($json);
        [$parsedYaml, $eggYaml, $spellYaml] = $this->import($yaml);
        unset($spellJson['uuid'], $spellYaml['uuid']);

        self::assertSame($spellJson, $spellYaml);
        self::assertSame($eggJson['variables'], $eggYaml['variables']);
        self::assertSame($parsedJson['warnings'], $parsedYaml['warnings']);
    }

    public static function yamlJsonPairs(): array
    {
        return [
            'PLCN_v1' => ['plcn_v1-left4dead2.json', 'plcn_v1-left4dead2.yaml'],
            'PLCN_v2' => ['plcn_v2-arma-reforger.json', 'plcn_v2-arma-reforger.yaml'],
        ];
    }

    public function testPelicanV2ConfigPlaceholdersAreTranslated(): void
    {
        [, , $spell] = $this->import('plcn_v2-arma-reforger.json');
        $find = json_decode($spell['config_files'], true)['config.json']['find'];

        self::assertSame('{{server.build.default.port}}', $find['bindPort']);
        self::assertSame('{{server.build.default.ip}}', $find['publicAddress']);
        self::assertSame('{{server.build.env.SERVER_NAME}}', $find['game.name']);
    }

    public function testPterodactylEggsAreUnchanged(): void
    {
        $source = json_decode(file_get_contents(self::FIXTURES . 'ptdl_v2-paper.json'), true);
        [$parsed, $egg, $spell] = $this->import('ptdl_v2-paper.json');

        self::assertSame([], $parsed['warnings']);
        self::assertSame($source['startup'], $spell['startup']);
        self::assertSame(json_decode($source['config']['files'], true), json_decode($spell['config_files'], true));
        self::assertSame(array_column($source['variables'], 'env_variable'), array_column($egg['variables'], 'env_variable'));
        self::assertSame(array_column($source['variables'], 'rules'), array_column($egg['variables'], 'rules'));
    }

    public function testYamlBooleansAndNestedEmptyObjects(): void
    {
        $yaml = <<<'YAML'
            meta:
              version: PLCN_v3
            name: Flags
            author: test@example.com
            startup_commands:
              Default: ./start
            config:
              files:
                config.json:
                  parser: json
                  find:
                    nested: {}
              startup:
                done: Ready
              logs: {}
              stop: stop
            variables:
              - name: Enabled
                env_variable: ENABLED
                default_value: true
                user_viewable: true
                user_editable: false
                rules: [required, boolean]
              - name: Disabled
                env_variable: DISABLED
                default_value: false
                user_viewable: true
                user_editable: true
                rules: [required, boolean]
            YAML;
        $egg = $this->normalize(EggImportParser::parse($yaml)['data']);

        self::assertSame('true', $egg['variables'][0]['default_value']);
        self::assertSame('false', $egg['variables'][1]['default_value']);
        self::assertFalse($egg['variables'][0]['user_editable']);
        self::assertInstanceOf(stdClass::class, json_decode($egg['config']['files'])->{'config.json'}->find->nested);
        self::assertSame('{}', $egg['config']['logs']);
    }

    public function testRejectsBrokenFiles(): void
    {
        $cases = [
            ['', 'INVALID_EGG'],
            ['{"meta": {"version": "PTDL_v2"', 'INVALID_JSON'],
            ["meta:\n  version: [unclosed\n", 'INVALID_YAML'],
            ['["not", "an", "object"]', 'INVALID_EGG'],
            ["<!DOCTYPE html>\n<html><body>GitHub</body></html>", 'INVALID_EGG'],
            ["meta:\n  version: PLCN_v9\n", 'INVALID_EGG'],
            ["meta:\n  version: PLCN_v3\nstartup_commands: ./start\n", 'INVALID_EGG'],
            // PHP object tags are never instantiated; the scalar is not an egg.
            ["!php/object 'O:8:\"stdClass\":0:{}'\n", 'INVALID_EGG'],
        ];
        foreach ($cases as [$content, $code]) {
            try {
                EggImportParser::parse($content);
                self::fail('Expected failure for: ' . $content);
            } catch (EggImportException $e) {
                self::assertSame($code, $e->getErrorCode(), $content);
            }
        }
    }

    public function testUnsupportedVersionMessageListsSupportedFormats(): void
    {
        $this->expectExceptionMessage('Supported: PTDL_v1, PTDL_v2, PLCN_v1, PLCN_v2, PLCN_v3.');
        EggImportParser::parse('{"meta":{"version":"PLCN_v4"}}');
    }

    public function testUrlNormalization(): void
    {
        self::assertSame(
            'https://raw.githubusercontent.com/pelican-eggs/minecraft/main/java/paper/egg-paper.yaml',
            EggImportParser::normalizeUrl('https://github.com/pelican-eggs/minecraft/blob/main/java/paper/egg-paper.yaml')
        );
        self::assertSame(
            'https://raw.githubusercontent.com/pelican-eggs/minecraft/refs/heads/main/java/paper/egg-paper.yaml',
            EggImportParser::normalizeUrl('  https://raw.githubusercontent.com/pelican-eggs/minecraft/refs/heads/main/java/paper/egg-paper.yaml#top ')
        );
        self::assertSame('http://eggs.example.com/egg.json?v=1', EggImportParser::normalizeUrl('http://eggs.example.com/egg.json?v=1'));

        foreach ([null, '', 'ftp://example.com/egg.json', 'file:///etc/passwd', 'javascript:alert(1)', 'gopher://example.com/', 'https://user:pass@example.com/egg.json', '/relative/egg.json', 'https://' . str_repeat('a', 2050) . '.com', ['https://example.com']] as $url) {
            try {
                EggImportParser::normalizeUrl($url);
                self::fail('Expected rejection for ' . json_encode($url));
            } catch (EggImportException $e) {
                self::assertSame('INVALID_EGG_URL', $e->getErrorCode());
            }
        }
    }

    public function testPrivateAndLocalUrlsAreRefused(): void
    {
        foreach ([
            'http://127.0.0.1/egg.json',
            'http://localhost/egg.json',
            'http://10.0.0.5/egg.json',
            'http://192.168.1.10/egg.yaml',
            'http://172.16.0.1/egg.yaml',
            'http://169.254.169.254/latest/meta-data/',
            'http://[::1]/egg.json',
            'http://0.0.0.0/egg.json',
            'http://[::ffff:127.0.0.1]/egg.json',
        ] as $url) {
            self::assertFalse(SafeUrlFetcher::isAllowedUrl(EggImportParser::normalizeUrl($url)), $url);
        }
    }

    /**
     * @return array{0: array, 1: array, 2: array}
     */
    private function import(string $file): array
    {
        $parsed = EggImportParser::parse(file_get_contents(self::FIXTURES . $file));
        $egg = $this->normalize($parsed['data']);
        $spell = (new ReflectionMethod(SpellsController::class, 'mapImportJsonToSpellData'))->invoke(null, $egg, 1);

        return [$parsed, $egg, $spell];
    }

    private function normalize(array $egg): array
    {
        return (new ReflectionMethod(SpellsController::class, 'normalizeSpellImportJson'))->invoke(null, $egg);
    }
}
