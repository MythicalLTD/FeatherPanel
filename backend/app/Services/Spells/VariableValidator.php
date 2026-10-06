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

namespace App\Services\Spells;

use Illuminate\Validation\Factory;
use Illuminate\Translation\Translator;
use Illuminate\Translation\ArrayLoader;

class VariableValidator
{
    public static function validatePayload(array $payload, array $variables): ?array
    {
        $definitions = [];
        foreach ($variables as $variable) {
            $definitions[(int) $variable['id']] = $variable;
        }
        foreach ($payload as $item) {
            $definition = $definitions[(int) $item['variable_id']] ?? null;
            if (!$definition) {
                return ['code' => 'INVALID_VARIABLE_SCOPE', 'message' => 'Variable does not belong to the selected spell', 'status' => 422];
            }
            if (
                !filter_var($definition['user_editable'] ?? false, FILTER_VALIDATE_BOOLEAN)
                || !filter_var($definition['user_viewable'] ?? false, FILTER_VALIDATE_BOOLEAN)
            ) {
                return ['code' => 'VARIABLE_NOT_EDITABLE', 'message' => 'Variable is not editable: ' . $definition['env_variable'], 'status' => 403];
            }
            if ($error = self::validate((string) $item['variable_value'], (string) ($definition['rules'] ?? ''))) {
                return ['code' => 'INVALID_VARIABLE_VALUE', 'message' => 'Validation failed for ' . $definition['env_variable'] . ': ' . $error, 'status' => 422];
            }
        }

        return null;
    }

    public static function validate(string $value, string $rules): ?string
    {
        if (trim($rules) === '') {
            return null;
        }

        $factory = new Factory(new Translator(new ArrayLoader(), 'en'));
        $validator = $factory->make(['value' => $value], ['value' => self::rules($rules)]);
        try {
            if ($validator->passes()) {
                return null;
            }
        } catch (\BadMethodCallException | \InvalidArgumentException $e) {
            return 'Invalid variable validation rules';
        }

        $failed = $validator->failed()['value'] ?? [];

        return 'Value does not satisfy validation rule: ' . (array_key_first($failed) ?? 'unknown');
    }

    /** Preserve pipes inside delimited regex patterns when building Laravel's rule array. */
    public static function rules(string $rules): array
    {
        $result = [];
        $offset = 0;
        $length = strlen($rules);
        while ($offset < $length) {
            $end = strpos($rules, '|', $offset);
            if (preg_match('/\G(?:not_regex|regex):([^a-zA-Z0-9\\\\\s])/A', $rules, $match, 0, $offset)) {
                $delimiter = $match[1];
                $start = $offset + strlen($match[0]);
                $escaped = false;
                for ($position = $start; $position < $length; ++$position) {
                    $character = $rules[$position];
                    if (!$escaped && $character === $delimiter) {
                        $end = strpos($rules, '|', $position + 1);
                        break;
                    }
                    $escaped = !$escaped && $character === '\\';
                }
            }
            $result[] = trim(substr($rules, $offset, $end === false ? null : $end - $offset));
            $offset = $end === false ? $length : $end + 1;
        }

        return array_values(array_filter($result, static fn (string $rule): bool => $rule !== ''));
    }
}
