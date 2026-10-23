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

namespace App\Plugins;

/**
 * Rules for the admin settings a plugin declares under `config:` in conf.yml.
 *
 * A field looks like:
 *
 *   - name: api_key
 *     display_name: 'API key'
 *     type: text          # text | textarea | url | email | password | number | boolean | file
 *     description: '...'
 *     required: true      # an empty value cannot be saved
 *     default: ''         # saved when the setting does not exist yet
 *     validation:         # optional, all keys optional
 *       regex: '/^[A-Za-z0-9_-]+$/'  # PCRE pattern with delimiters, must match the value
 *       min: 8            # number fields: smallest value, other fields: shortest length
 *       max: 64           # number fields: largest value, other fields: longest length
 *       type: integer     # string | integer | number | boolean | email | url
 *       message: 'Use 8 to 64 letters, digits, "_" or "-".'  # replaces the generated error text
 *
 * Settings are stored as strings. Booleans are stored as "true" / "false".
 * The class has no database or App dependency so it can be unit tested.
 */
final class PluginSettingsSchema
{
    /**
     * Field types the admin UI knows how to render.
     *
     * @var list<string>
     */
    public const FIELD_TYPES = ['text', 'textarea', 'url', 'email', 'password', 'number', 'boolean', 'file'];

    /**
     * Value formats accepted by `validation.type`.
     *
     * @var list<string>
     */
    public const VALUE_TYPES = ['string', 'integer', 'number', 'boolean', 'email', 'url'];

    /**
     * Normalize the `config:` block of conf.yml into a list of fields keyed by setting name.
     *
     * Accepts a list of field maps (the documented format) and ignores anything else,
     * such as the empty map `config: {}`.
     *
     * @return array<string, array<string, mixed>>
     */
    public static function fields(mixed $schema): array
    {
        if (!is_array($schema)) {
            return [];
        }

        $fields = [];
        foreach ($schema as $field) {
            if (!is_array($field) || !isset($field['name']) || !is_string($field['name']) || $field['name'] === '') {
                continue;
            }
            $fields[$field['name']] = $field;
        }

        return $fields;
    }

    /**
     * Get the field definition for a setting key, or null when the key is not declared.
     *
     * @return array<string, mixed>|null
     */
    public static function field(mixed $schema, string $key): ?array
    {
        return self::fields($schema)[$key] ?? null;
    }

    /**
     * Whether the field is marked `required: true` (YAML booleans and "true" strings).
     *
     * @param array<string, mixed> $field
     */
    public static function isRequired(array $field): bool
    {
        $required = $field['required'] ?? false;

        return $required === true || $required === 1 || (is_string($required) && in_array(strtolower($required), ['true', '1', 'yes'], true));
    }

    /**
     * Whether a value counts as empty for `required` checks.
     */
    public static function isEmpty(mixed $value): bool
    {
        return $value === null || (is_string($value) && trim($value) === '');
    }

    /**
     * Convert a default from conf.yml into the string form settings are stored in.
     *
     * Returns null when the field has no usable default.
     *
     * @param array<string, mixed> $field
     */
    public static function defaultValue(array $field): ?string
    {
        if (!array_key_exists('default', $field)) {
            return null;
        }

        return self::toStoredString($field['default']);
    }

    /**
     * Defaults for every declared field that has one.
     *
     * @return array<string, string>
     */
    public static function defaults(mixed $schema): array
    {
        $defaults = [];
        foreach (self::fields($schema) as $name => $field) {
            $default = self::defaultValue($field);
            if ($default !== null) {
                $defaults[$name] = $default;
            }
        }

        return $defaults;
    }

    /**
     * Defaults for the declared fields that are not stored yet.
     *
     * @param list<string> $existingKeys keys that already have a stored value
     *
     * @return array<string, string>
     */
    public static function missingDefaults(mixed $schema, array $existingKeys): array
    {
        $existing = array_flip($existingKeys);

        return array_filter(
            self::defaults($schema),
            static fn (string $value, string $name): bool => !isset($existing[$name]),
            ARRAY_FILTER_USE_BOTH
        );
    }

    /**
     * Validate a value for one field.
     *
     * Empty values only fail when the field is required. All other rules are
     * applied to non-empty values.
     *
     * @param array<string, mixed> $field
     *
     * @return list<string> Error messages, empty when the value is valid
     */
    public static function validateValue(array $field, mixed $value): array
    {
        $label = self::label($field);

        if (!is_scalar($value) && $value !== null) {
            return ["{$label} must be a single value."];
        }

        $stored = self::toStoredString($value) ?? '';

        if (self::isEmpty($stored)) {
            return self::isRequired($field) ? ["{$label} is required."] : [];
        }

        $rules = is_array($field['validation'] ?? null) ? $field['validation'] : [];
        $errors = [];

        $fieldType = is_string($field['type'] ?? null) ? strtolower($field['type']) : 'text';
        $typeError = self::checkFieldType($fieldType, $stored, $label);
        if ($typeError !== null) {
            $errors[] = $typeError;
        }

        if (isset($rules['type']) && is_string($rules['type'])) {
            $valueTypeError = self::checkValueType(strtolower($rules['type']), $stored, $label);
            if ($valueTypeError !== null) {
                $errors[] = $valueTypeError;
            }
        }

        $numeric = $fieldType === 'number' || in_array(strtolower((string) ($rules['type'] ?? '')), ['integer', 'number'], true);

        if (isset($rules['min']) && is_numeric($rules['min'])) {
            $min = $rules['min'] + 0;
            if ($numeric) {
                if (is_numeric($stored) && ($stored + 0) < $min) {
                    $errors[] = "{$label} must be at least {$min}.";
                }
            } elseif (mb_strlen($stored) < $min) {
                $errors[] = "{$label} must be at least {$min} characters long.";
            }
        }

        if (isset($rules['max']) && is_numeric($rules['max'])) {
            $max = $rules['max'] + 0;
            if ($numeric) {
                if (is_numeric($stored) && ($stored + 0) > $max) {
                    $errors[] = "{$label} must be at most {$max}.";
                }
            } elseif (mb_strlen($stored) > $max) {
                $errors[] = "{$label} must be at most {$max} characters long.";
            }
        }

        if (isset($rules['regex']) && is_string($rules['regex']) && $rules['regex'] !== '') {
            $match = @preg_match($rules['regex'], $stored);
            if ($match === false) {
                $errors[] = "{$label} has an invalid validation pattern in conf.yml.";
            } elseif ($match === 0) {
                $errors[] = "{$label} does not match the required format.";
            }
        }

        if ($errors !== [] && isset($rules['message']) && is_string($rules['message']) && trim($rules['message']) !== '') {
            return [trim($rules['message'])];
        }

        return $errors;
    }

    /**
     * Validate a set of values against the schema.
     *
     * Keys that are not declared in the schema (for example the panel's own
     * plugin-sidebar-* visibility keys) are not checked.
     *
     * @param array<string, mixed> $values setting key => value
     *
     * @return array<string, list<string>> setting key => errors, empty when everything is valid
     */
    public static function validate(mixed $schema, array $values): array
    {
        $fields = self::fields($schema);
        $errors = [];
        foreach ($values as $key => $value) {
            $key = (string) $key;
            if (!isset($fields[$key])) {
                continue;
            }
            $fieldErrors = self::validateValue($fields[$key], $value);
            if ($fieldErrors !== []) {
                $errors[$key] = $fieldErrors;
            }
        }

        return $errors;
    }

    /**
     * Required fields that have no stored value, or only an empty one.
     *
     * @param array<string, string> $stored setting key => stored value
     *
     * @return list<string>
     */
    public static function missingRequired(mixed $schema, array $stored): array
    {
        $missing = [];
        foreach (self::fields($schema) as $name => $field) {
            if (self::isRequired($field) && self::isEmpty($stored[$name] ?? null)) {
                $missing[] = $name;
            }
        }

        return $missing;
    }

    /**
     * Settings a plugin needs before it counts as configured.
     *
     * That is every key in `plugin.requiredConfigs` plus every `config:` field
     * with `required: true`, minus the ones that have a non-empty stored value.
     *
     * @param mixed $requiredConfigs the `plugin.requiredConfigs` list from conf.yml
     * @param mixed $schema the `config:` block of conf.yml
     * @param array<string, string> $stored setting key => stored value
     *
     * @return list<string>
     */
    public static function missingConfigs(mixed $requiredConfigs, mixed $schema, array $stored): array
    {
        $keys = [];
        if (is_array($requiredConfigs)) {
            foreach ($requiredConfigs as $key) {
                if (is_string($key) && $key !== '') {
                    $keys[$key] = true;
                }
            }
        }
        foreach (self::fields($schema) as $name => $field) {
            if (self::isRequired($field)) {
                $keys[$name] = true;
            }
        }

        $missing = [];
        foreach (array_keys($keys) as $key) {
            $key = (string) $key;
            if (self::isEmpty($stored[$key] ?? null)) {
                $missing[] = $key;
            }
        }

        return $missing;
    }

    /**
     * @param array<string, mixed> $field
     */
    private static function label(array $field): string
    {
        $label = $field['display_name'] ?? $field['name'] ?? 'This setting';

        return is_string($label) && trim($label) !== '' ? trim($label) : 'This setting';
    }

    private static function toStoredString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }
        if (is_scalar($value)) {
            return (string) $value;
        }

        return null;
    }

    private static function checkFieldType(string $type, string $value, string $label): ?string
    {
        return match ($type) {
            'number' => is_numeric($value) ? null : "{$label} must be a number.",
            'boolean' => in_array(strtolower($value), ['true', 'false', '1', '0'], true) ? null : "{$label} must be true or false.",
            'email' => self::checkValueType('email', $value, $label),
            'url' => self::checkValueType('url', $value, $label),
            default => null,
        };
    }

    private static function checkValueType(string $type, string $value, string $label): ?string
    {
        return match ($type) {
            'integer' => preg_match('/^-?\d+$/', $value) === 1 ? null : "{$label} must be a whole number.",
            'number' => is_numeric($value) ? null : "{$label} must be a number.",
            'boolean' => in_array(strtolower($value), ['true', 'false', '1', '0'], true) ? null : "{$label} must be true or false.",
            'email' => filter_var($value, FILTER_VALIDATE_EMAIL) !== false ? null : "{$label} must be a valid email address.",
            'url' => (filter_var($value, FILTER_VALIDATE_URL) !== false && preg_match('#^https?://#i', $value) === 1)
                ? null
                : "{$label} must be a valid http or https URL.",
            default => null,
        };
    }
}
