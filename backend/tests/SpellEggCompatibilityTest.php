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

use App\Chat\Spell;
use App\Chat\SpellVariable;
use PHPUnit\Framework\TestCase;
use App\Services\Spells\VariableValidator;
use App\Controllers\Admin\SpellsController;
use App\Services\Spells\SpellConfiguration;

class SpellEggCompatibilityTest extends TestCase
{
    public function testLegacyImagesAndStringConfigArePreserved(): void
    {
        $egg = $this->normalize([
            'meta' => ['version' => 'PTDL_v1'], 'images' => ['node:22', 'node:24'],
            'config' => ['files' => '{}', 'startup' => '{"done":"Ready"}', 'logs' => '{}', 'stop' => '^C'],
        ]);
        self::assertSame(['node:22' => 'node:22', 'node:24' => 'node:24'], $egg['docker_images']);
        self::assertSame('{}', $egg['config']['files']);
        self::assertSame('{"done":"Ready"}', $egg['config']['startup']);
        self::assertSame('^C', $egg['config']['stop']);
    }

    public function testNativeAndDoubleEncodedConfigNormalizeToPterodactylText(): void
    {
        $egg = $this->normalize([
            'meta' => ['version' => 'PTDL_v2'],
            'config' => ['files' => (object) [], 'startup' => ['done' => ['Ready', 'Listening'], 'strip_ansi' => true], 'logs' => json_encode('{}')],
        ]);
        self::assertSame('{}', $egg['config']['files']);
        self::assertSame('{}', $egg['config']['logs']);
        self::assertSame(['Ready', 'Listening'], json_decode($egg['config']['startup'], true)['done']);
    }

    public function testNativeNestedObjectsSurviveImport(): void
    {
        $json = '{"meta":{"version":"PTDL_v2"},"config":{"files":{"x.json":{"parser":"json","find":{"nested":{}}}}}}';
        $data = (new ReflectionMethod(SpellsController::class, 'preserveImportConfigObjects'))->invoke(null, json_decode($json, true), $json);
        $egg = $this->normalize($data);
        self::assertInstanceOf(stdClass::class, json_decode($egg['config']['files'])->{'x.json'}->find->nested);
    }

    public function testNullableVariableFieldsAndBooleanStrings(): void
    {
        $egg = $this->normalize([
            'meta' => ['version' => 'PTDL_v2'], 'features' => null,
            'variables' => [['name' => 'Version', 'env_variable' => 'VERSION', 'description' => null, 'default_value' => null, 'user_viewable' => 'false', 'user_editable' => false]],
        ]);
        self::assertSame('', $egg['variables'][0]['description']);
        self::assertSame('', $egg['variables'][0]['default_value']);
        self::assertFalse($egg['variables'][0]['user_viewable']);
        self::assertFalse($egg['variables'][0]['user_editable']);
    }

    public function testUnknownVersionIsRejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->normalize(['meta' => ['version' => 'unknown']]);
    }

    public function testInvalidConfigIsRejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->normalize(['meta' => ['version' => 'PTDL_v2'], 'config' => ['files' => '{invalid}']]);
    }

    public function testConditionalReplacementsAndParserOptionsSurvive(): void
    {
        $files = SpellConfiguration::files(
            json_decode('{"config.yml":{"parser":"yaml","file_permissions":"0644","find":{"address":{"127.0.0.1":"{{env.HOST}}","localhost":"{{env.HOST}}"},"enabled":true,"ports":[25565,25566]}}}'),
            static fn (string $value): string => str_replace('{{env.HOST}}', '0.0.0.0', $value)
        );
        self::assertSame('0644', $files[0]['file_permissions']);
        self::assertArrayNotHasKey('find', $files[0]);
        self::assertCount(4, $files[0]['replace']);
        self::assertSame('localhost', $files[0]['replace'][1]['if_value']);
        self::assertSame('0.0.0.0', $files[0]['replace'][1]['replace_with']);
        self::assertTrue($files[0]['replace'][2]['replace_with']);
        self::assertSame([25565, 25566], $files[0]['replace'][3]['replace_with']);
    }

    public function testStopCommandsAndSignals(): void
    {
        self::assertSame(['type' => 'signal', 'value' => 'C'], SpellConfiguration::stop('^C'));
        self::assertSame(['type' => 'signal', 'value' => 'SIGTERM'], SpellConfiguration::stop('^sigterm'));
        self::assertSame(['type' => 'command', 'value' => 'quit'], SpellConfiguration::stop('quit'));
    }

    public function testInheritedConfigScriptsAndDenylist(): void
    {
        $parent = ['id' => 1, 'config_files' => '{}', 'config_startup' => '{"done":"Ready"}', 'file_denylist' => '["secret"]', 'features' => '["eula"]', 'script_container' => 'alpine', 'script_entry' => 'ash', 'script_install' => 'echo install'];
        $child = ['id' => 2, 'config_from' => 1, 'copy_script_from' => 1, 'config_files' => null, 'config_startup' => '{"done":"Child ready"}', 'script_install' => 'old script', 'file_denylist' => '[]'];
        $resolved = Spell::resolveConfiguration($child, static fn (int $id): ?array => $id === 1 ? $parent : null);
        self::assertSame('{}', $resolved['config_files']);
        self::assertSame('{"done":"Child ready"}', $resolved['config_startup']);
        self::assertSame('echo install', $resolved['script_install']);
        self::assertSame('["secret"]', $resolved['file_denylist']);
        self::assertSame('["eula"]', $resolved['features']);
    }

    public function testInheritanceCyclesTerminate(): void
    {
        $spells = [1 => ['id' => 1, 'config_from' => 2], 2 => ['id' => 2, 'config_from' => 1]];
        self::assertSame(1, Spell::resolveConfiguration($spells[1], static fn (int $id): ?array => $spells[$id] ?? null)['id']);
    }

    public function testLaravelRulesAndRegexAlternatives(): void
    {
        self::assertNull(VariableValidator::validate('-1.5', 'required|numeric|min:-2|max:3'));
        self::assertNotNull(VariableValidator::validate('1.5', 'integer'));
        self::assertNull(VariableValidator::validate('https', 'required|string|in:http,https'));
        self::assertNotNull(VariableValidator::validate('ftp', 'in:http,https'));
        self::assertNull(VariableValidator::validate('bar', 'required|regex:/^(foo|bar)$/|max:3'));
        self::assertNotNull(VariableValidator::validate('baz', 'required|regex:/^(foo|bar)$/|max:3'));
        self::assertNull(VariableValidator::validate('', 'nullable|string'));
        self::assertNotNull(VariableValidator::validate('', 'required|string'));
    }

    public function testConfigPlaceholdersKeepDaemonConfigKeys(): void
    {
        self::assertSame('test:4096:abc:{{config.docker.network.interface}}', SpellConfiguration::placeholders(
            '{{server.uuid}}:{{server.build.disk}}:{{env.TOKEN}}:{{config.docker.interface}}',
            ['uuid' => 'test', 'disk' => 4096],
            [],
            ['TOKEN' => 'abc']
        ));
    }

    public function testHiddenVariablesAreExcludedFromUserResponses(): void
    {
        self::assertSame([['user_viewable' => 1]], SpellVariable::filterUserViewable([
            ['user_viewable' => 'false'], ['user_viewable' => 0], ['user_viewable' => 1],
        ]));
    }

    public function testVariablePayloadIsValidatedBeforeChangingSpells(): void
    {
        $variables = [['id' => 1, 'env_variable' => 'PROTOCOL', 'user_viewable' => 1, 'user_editable' => 1, 'rules' => 'required|in:http,https']];
        self::assertNull(VariableValidator::validatePayload([['variable_id' => 1, 'variable_value' => 'http']], $variables));
        self::assertSame('INVALID_VARIABLE_VALUE', VariableValidator::validatePayload([['variable_id' => 1, 'variable_value' => 'ftp']], $variables)['code']);
        self::assertSame('INVALID_VARIABLE_SCOPE', VariableValidator::validatePayload([['variable_id' => 2, 'variable_value' => 'http']], $variables)['code']);
        $variables[0]['user_viewable'] = 0;
        self::assertSame('VARIABLE_NOT_EDITABLE', VariableValidator::validatePayload([['variable_id' => 1, 'variable_value' => 'http']], $variables)['code']);
    }

    public function testCanonicalExportKeepsExtraVariableFieldsInMetadata(): void
    {
        $source = ['meta' => ['version' => 'PTDL_v2'], 'name' => 'Test', 'author' => 'test@example.com',
            'variables' => [['name' => 'Flag', 'env_variable' => 'FLAG', 'user_viewable' => true, 'user_editable' => true, 'rules' => 'boolean', 'field_type' => 'boolean']]];
        $spell = (new ReflectionMethod(SpellsController::class, 'mapImportJsonToSpellData'))->invoke(null, $source, 1)
            + ['created_at' => null, 'updated_at' => null, 'config_from' => null, 'copy_script_from' => null];
        $export = (new ReflectionMethod(SpellsController::class, 'buildExportData'))->invoke(null, $spell, $this->normalize($source)['variables']);
        self::assertSame([], $export['features']);
        self::assertSame('{}', $export['config']['files']);
        self::assertArrayNotHasKey('field_type', $export['variables'][0]);
        self::assertSame('boolean', $export['_featherpanel']['variable_field_types']['FLAG']);
        self::assertSame('boolean', $this->normalize(json_decode(json_encode($export), true))['variables'][0]['field_type']);
    }

    public function testExportedMetadataRestoresFeatherPanelVariableTypes(): void
    {
        $egg = $this->normalize([
            'meta' => ['version' => 'PTDL_v2'],
            'variables' => [['name' => 'Flag', 'env_variable' => 'FLAG']],
            '_featherpanel' => ['variable_field_types' => ['FLAG' => 'boolean']],
        ]);
        self::assertSame('boolean', $egg['variables'][0]['field_type']);
    }

    public function testDefaultDockerImageIsFirstInPortableExport(): void
    {
        $source = ['meta' => ['version' => 'PTDL_v2'], 'name' => 'Test', 'author' => 'test@example.com',
            'docker_images' => ['Node 18' => 'node:18', 'Node 22' => 'node:22']];
        $spell = (new ReflectionMethod(SpellsController::class, 'mapImportJsonToSpellData'))->invoke(null, $source, 1)
            + ['created_at' => null, 'updated_at' => null, 'config_from' => null, 'copy_script_from' => null];
        $spell['default_docker_image'] = 'node:22';
        $export = (new ReflectionMethod(SpellsController::class, 'buildExportData'))->invoke(null, $spell, []);
        self::assertSame(['Node 22' => 'node:22', 'Node 18' => 'node:18'], (array) $export['docker_images']);
    }

    private function normalize(array $egg): array
    {
        return (new ReflectionMethod(SpellsController::class, 'normalizeSpellImportJson'))->invoke(null, $egg);
    }
}
