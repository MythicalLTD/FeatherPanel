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

use PHPUnit\Framework\TestCase;
use App\Plugins\PluginSettingsSchema;

/**
 * Rules for conf.yml `config:` fields: defaults, required and validation.
 */
class PluginSettingsSchemaTest extends TestCase
{
    public function testFieldsAcceptsEmptyMapAndSkipsInvalidEntries(): void
    {
        $this->assertSame([], PluginSettingsSchema::fields([]));
        $this->assertSame([], PluginSettingsSchema::fields(null));
        $this->assertSame([], PluginSettingsSchema::fields('nope'));

        $fields = PluginSettingsSchema::fields($this->schema());
        $this->assertSame(['api_key', 'enabled', 'limit', 'webhook', 'no_default', 'null_default'], array_keys($fields));
        $this->assertNull(PluginSettingsSchema::field($this->schema(), 'unknown'));
        $this->assertSame('Limit', PluginSettingsSchema::field($this->schema(), 'limit')['display_name']);
    }

    public function testDefaultsAreStoredAsStrings(): void
    {
        $this->assertSame(
            ['api_key' => '', 'enabled' => 'true', 'limit' => '10'],
            PluginSettingsSchema::defaults($this->schema())
        );
        $this->assertSame('false', PluginSettingsSchema::defaultValue(['name' => 'x', 'default' => false]));
        $this->assertNull(PluginSettingsSchema::defaultValue(['name' => 'x', 'default' => ['a']]));
    }

    public function testMissingDefaultsSkipsStoredKeys(): void
    {
        $this->assertSame(
            ['enabled' => 'true'],
            PluginSettingsSchema::missingDefaults($this->schema(), ['api_key', 'limit'])
        );
        $this->assertSame([], PluginSettingsSchema::missingDefaults($this->schema(), ['api_key', 'enabled', 'limit']));
    }

    public function testRequiredRejectsEmptyValues(): void
    {
        $field = PluginSettingsSchema::field($this->schema(), 'api_key');
        $this->assertSame(['API key is required.'], PluginSettingsSchema::validateValue($field, ''));
        $this->assertSame(['API key is required.'], PluginSettingsSchema::validateValue($field, '   '));
        $this->assertSame(['API key is required.'], PluginSettingsSchema::validateValue($field, null));
        $this->assertSame([], PluginSettingsSchema::validateValue($field, 'abc'));
        $this->assertSame([], PluginSettingsSchema::validateValue($field, '0'));
    }

    public function testRequiredAcceptsStringTrue(): void
    {
        $this->assertTrue(PluginSettingsSchema::isRequired(['required' => 'true']));
        $this->assertTrue(PluginSettingsSchema::isRequired(['required' => true]));
        $this->assertFalse(PluginSettingsSchema::isRequired(['required' => false]));
        $this->assertFalse(PluginSettingsSchema::isRequired(['required' => 'false']));
        $this->assertFalse(PluginSettingsSchema::isRequired([]));
    }

    public function testOptionalEmptyValueSkipsOtherRules(): void
    {
        $field = ['name' => 'code', 'type' => 'text', 'validation' => ['regex' => '/^\d+$/', 'min' => 3]];
        $this->assertSame([], PluginSettingsSchema::validateValue($field, ''));
    }

    public function testFieldTypeChecks(): void
    {
        $number = ['name' => 'n', 'display_name' => 'N', 'type' => 'number'];
        $this->assertSame(['N must be a number.'], PluginSettingsSchema::validateValue($number, 'abc'));
        $this->assertSame([], PluginSettingsSchema::validateValue($number, '4.5'));

        $bool = ['name' => 'b', 'display_name' => 'B', 'type' => 'boolean'];
        $this->assertSame([], PluginSettingsSchema::validateValue($bool, 'false'));
        $this->assertSame([], PluginSettingsSchema::validateValue($bool, true));
        $this->assertSame(['B must be true or false.'], PluginSettingsSchema::validateValue($bool, 'maybe'));

        $email = ['name' => 'e', 'display_name' => 'E', 'type' => 'email'];
        $this->assertSame([], PluginSettingsSchema::validateValue($email, 'me@example.com'));
        $this->assertSame(['E must be a valid email address.'], PluginSettingsSchema::validateValue($email, 'nope'));

        $url = ['name' => 'u', 'display_name' => 'U', 'type' => 'url'];
        $this->assertSame([], PluginSettingsSchema::validateValue($url, 'https://example.com/hook'));
        $this->assertSame(['U must be a valid http or https URL.'], PluginSettingsSchema::validateValue($url, 'ftp://example.com'));
        $this->assertSame(['U must be a valid http or https URL.'], PluginSettingsSchema::validateValue($url, 'example'));
    }

    public function testMinAndMaxUseNumbersForNumberFields(): void
    {
        $field = PluginSettingsSchema::field($this->schema(), 'limit');
        $this->assertSame(['Limit must be at least 1.'], PluginSettingsSchema::validateValue($field, '0'));
        $this->assertSame(['Limit must be at most 100.'], PluginSettingsSchema::validateValue($field, '101'));
        $this->assertSame([], PluginSettingsSchema::validateValue($field, '100'));
    }

    public function testMinAndMaxUseLengthForTextFields(): void
    {
        $field = ['name' => 't', 'display_name' => 'Token', 'type' => 'text', 'validation' => ['min' => 3, 'max' => 5]];
        $this->assertSame(['Token must be at least 3 characters long.'], PluginSettingsSchema::validateValue($field, 'ab'));
        $this->assertSame(['Token must be at most 5 characters long.'], PluginSettingsSchema::validateValue($field, 'abcdef'));
        $this->assertSame([], PluginSettingsSchema::validateValue($field, 'äöü'));
    }

    public function testRegexRule(): void
    {
        $field = ['name' => 'slug', 'display_name' => 'Slug', 'validation' => ['regex' => '/^[a-z-]+$/']];
        $this->assertSame([], PluginSettingsSchema::validateValue($field, 'my-slug'));
        $this->assertSame(['Slug does not match the required format.'], PluginSettingsSchema::validateValue($field, 'My Slug'));

        $broken = ['name' => 'slug', 'display_name' => 'Slug', 'validation' => ['regex' => '/[a-z']];
        $this->assertSame(['Slug has an invalid validation pattern in conf.yml.'], PluginSettingsSchema::validateValue($broken, 'abc'));
    }

    public function testValidationTypeRule(): void
    {
        $field = ['name' => 'port', 'display_name' => 'Port', 'type' => 'text', 'validation' => ['type' => 'integer', 'min' => 1, 'max' => 65535]];
        $this->assertSame([], PluginSettingsSchema::validateValue($field, '25565'));
        $this->assertSame(['Port must be a whole number.'], PluginSettingsSchema::validateValue($field, '1.5'));
        $this->assertSame(['Port must be at most 65535.'], PluginSettingsSchema::validateValue($field, '70000'));
    }

    public function testCustomMessageReplacesErrors(): void
    {
        $field = ['name' => 'p', 'display_name' => 'P', 'validation' => ['min' => 8, 'regex' => '/\d/', 'message' => 'Use at least 8 characters and one digit.']];
        $this->assertSame(['Use at least 8 characters and one digit.'], PluginSettingsSchema::validateValue($field, 'short'));
        $this->assertSame([], PluginSettingsSchema::validateValue($field, 'longer123'));
    }

    public function testNonScalarValueIsRejected(): void
    {
        $this->assertSame(['X must be a single value.'], PluginSettingsSchema::validateValue(['name' => 'x', 'display_name' => 'X'], ['a']));
    }

    public function testValidateOnlyChecksDeclaredKeys(): void
    {
        $errors = PluginSettingsSchema::validate($this->schema(), [
            'api_key' => '',
            'limit' => '500',
            'plugin-sidebar-server-allowedOnlyOnSpells' => '[1,2]',
        ]);

        $this->assertSame(['api_key', 'limit'], array_keys($errors));
    }

    public function testMissingConfigsCombinesRequiredConfigsAndRequiredFields(): void
    {
        $schema = $this->schema();

        $this->assertSame(
            ['secret', 'api_key'],
            PluginSettingsSchema::missingConfigs(['secret', 'api_key'], $schema, [])
        );
        $this->assertSame(
            ['secret'],
            PluginSettingsSchema::missingConfigs(['secret'], $schema, ['secret' => '  ', 'api_key' => 'k'])
        );
        $this->assertSame(
            [],
            PluginSettingsSchema::missingConfigs(['secret'], $schema, ['secret' => 's', 'api_key' => 'k'])
        );
        $this->assertSame([], PluginSettingsSchema::missingConfigs(null, [], []));
        $this->assertSame(['api_key'], PluginSettingsSchema::missingRequired($schema, ['api_key' => '']));
    }

    private function schema(): array
    {
        return [
            ['name' => 'api_key', 'display_name' => 'API key', 'type' => 'text', 'required' => true, 'default' => ''],
            ['name' => 'enabled', 'display_name' => 'Enabled', 'type' => 'boolean', 'required' => false, 'default' => true],
            ['name' => 'limit', 'display_name' => 'Limit', 'type' => 'number', 'default' => 10, 'validation' => ['min' => 1, 'max' => 100]],
            ['name' => 'webhook', 'display_name' => 'Webhook', 'type' => 'url'],
            ['name' => 'no_default', 'display_name' => 'No default', 'type' => 'text'],
            ['name' => 'null_default', 'display_name' => 'Null default', 'type' => 'text', 'default' => null],
            ['display_name' => 'Missing name'],
        ];
    }
}
