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

namespace App\Mail;

/**
 * Fills `{placeholder}` tokens in mail templates.
 *
 * Bodies are HTML, so every value is HTML-encoded unless its key is listed in
 * `$rawHtmlKeys` (only for fragments the panel builds and encodes itself).
 * Subjects are plain text and are filled as-is. Replacement is a single pass,
 * so a value that contains `{other_key}` is never expanded again.
 */
final class MailTemplateRenderer
{
    public static function escape(mixed $value): string
    {
        return htmlspecialchars(self::stringify($value), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    /**
     * @param array<string, mixed> $values
     * @param list<string> $rawHtmlKeys keys whose value is already safe HTML
     */
    public static function renderHtml(string $template, array $values, array $rawHtmlKeys = []): string
    {
        if ($template === '') {
            return '';
        }

        $raw = array_flip($rawHtmlKeys);
        $pairs = [];
        foreach ($values as $key => $value) {
            $pairs['{' . $key . '}'] = isset($raw[$key]) ? self::stringify($value) : self::escape($value);
        }

        return strtr($template, $pairs);
    }

    /**
     * @param array<string, mixed> $values
     * @param list<string> $rawHtmlKeys keys holding HTML; tags are dropped and entities decoded for text
     */
    public static function renderText(string $template, array $values, array $rawHtmlKeys = []): string
    {
        if ($template === '') {
            return '';
        }

        $raw = array_flip($rawHtmlKeys);
        $pairs = [];
        foreach ($values as $key => $value) {
            $text = self::stringify($value);
            if (isset($raw[$key])) {
                $text = html_entity_decode(strip_tags($text), ENT_QUOTES | ENT_HTML5, 'UTF-8');
            }
            $pairs['{' . $key . '}'] = $text;
        }

        return strtr($template, $pairs);
    }

    private static function stringify(mixed $value): string
    {
        if ($value === null || is_array($value) || is_object($value) && !method_exists($value, '__toString')) {
            return '';
        }
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }

        return (string) $value;
    }
}
