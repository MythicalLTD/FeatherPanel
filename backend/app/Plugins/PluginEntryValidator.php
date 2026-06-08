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

use Symfony\Component\Yaml\Exception\ParseException;
use Symfony\Component\Yaml\Yaml;

class PluginEntryValidator
{
    /**
     * Validate an extracted addon package before it is installed.
     *
     * @param string $packageDir Path to the extracted addon directory (must contain conf.yml)
     * @param string|null $identifier Optional expected identifier (e.g. from cloud registry)
     *
     * @return array{valid: bool, errors: string[], identifier: string|null, entry_class: string|null}
     */
    public static function validatePackage(string $packageDir, ?string $identifier = null): array
    {
        $errors = [];
        $packageDir = rtrim($packageDir, '/');
        $configFile = $packageDir . '/conf.yml';

        if (!file_exists($configFile)) {
            return self::result(false, ['Missing conf.yml'], null, null);
        }

        try {
            $conf = Yaml::parseFile($configFile);
        } catch (ParseException $e) {
            return self::result(false, ['Failed to parse conf.yml: ' . $e->getMessage()], null, null);
        } catch (\Throwable $e) {
            return self::result(false, ['Failed to read conf.yml: ' . $e->getMessage()], null, null);
        }

        if (!is_array($conf) || !PluginConfig::isConfigValid($conf)) {
            return self::result(false, ['Invalid or incomplete plugin configuration in conf.yml'], null, null);
        }

        $confIdentifier = (string) ($conf['plugin']['identifier'] ?? '');
        if ($identifier !== null && $confIdentifier !== $identifier) {
            $errors[] = 'conf.yml identifier "' . $confIdentifier . '" does not match expected "' . $identifier . '"';
        }

        $resolvedIdentifier = $identifier ?? $confIdentifier;
        if ($resolvedIdentifier === '' || !PluginConfig::isValidIdentifier($resolvedIdentifier)) {
            $errors[] = 'Invalid plugin identifier in conf.yml';
        }

        $entryName = (string) ($conf['plugin']['name'] ?? '');
        if ($entryName === '') {
            $errors[] = 'plugin.name is required in conf.yml';
        }

        if (!empty($errors)) {
            return self::result(false, $errors, $resolvedIdentifier, null);
        }

        $expectedNamespace = 'App\\Addons\\' . $resolvedIdentifier;
        $entryFile = $packageDir . '/' . $entryName . '.php';
        $resolvedEntryName = $entryName;

        if (!file_exists($entryFile)) {
            $candidates = self::discoverEntryCandidates($packageDir, $resolvedIdentifier);
            if (count($candidates) === 0) {
                $errors[] = 'Entry class file "' . $entryName . '.php" not found in plugin root';
            } elseif (count($candidates) > 1) {
                $errors[] = 'Multiple AppPlugin entry classes found in plugin root; set plugin.name in conf.yml to the correct class';
            } else {
                $entryFile = $candidates[0]['file'];
                $resolvedEntryName = $candidates[0]['class'];
            }
        }

        if (!empty($errors)) {
            return self::result(false, $errors, $resolvedIdentifier, null);
        }

        $parsed = self::parsePhpClassFile($entryFile);
        if ($parsed === null) {
            return self::result(
                false,
                ['Failed to parse entry class file: ' . basename($entryFile)],
                $resolvedIdentifier,
                null
            );
        }

        if ($parsed['namespace'] !== $expectedNamespace) {
            $errors[] = 'Entry class namespace "' . $parsed['namespace'] . '" does not match required "' . $expectedNamespace . '"';
        }

        if ($parsed['class'] !== $resolvedEntryName) {
            $errors[] = 'Entry class name "' . $parsed['class'] . '" does not match plugin.name "' . $resolvedEntryName . '" in conf.yml';
        }

        if (!$parsed['implements_app_plugin']) {
            $errors[] = 'Entry class "' . $resolvedEntryName . '" must implement App\\Plugins\\AppPlugin';
        }

        if (!empty($errors)) {
            return self::result(false, $errors, $resolvedIdentifier, null);
        }

        return self::result(true, [], $resolvedIdentifier, $expectedNamespace . '\\' . $resolvedEntryName);
    }

    /**
     * @param string[] $errors
     *
     * @return array{valid: bool, errors: string[], identifier: string|null, entry_class: string|null}
     */
    private static function result(bool $valid, array $errors, ?string $identifier, ?string $entryClass): array
    {
        return [
            'valid' => $valid,
            'errors' => $errors,
            'identifier' => $identifier,
            'entry_class' => $entryClass,
        ];
    }

    /**
     * @return array<int, array{file: string, class: string}>
     */
    private static function discoverEntryCandidates(string $packageDir, string $identifier): array
    {
        $candidates = [];

        foreach (glob($packageDir . '/*.php') ?: [] as $file) {
            $parsed = self::parsePhpClassFile($file);
            if ($parsed === null || !$parsed['implements_app_plugin']) {
                continue;
            }

            $candidates[] = [
                'file' => $file,
                'class' => $parsed['class'],
            ];
        }

        return $candidates;
    }

    /**
     * @return array{namespace: string, class: string, implements_app_plugin: bool}|null
     */
    private static function parsePhpClassFile(string $file): ?array
    {
        $content = @file_get_contents($file);
        if ($content === false) {
            return null;
        }

        $tokens = token_get_all($content);
        $namespace = '';
        $class = '';
        $implementsAppPlugin = false;
        $tokenCount = count($tokens);

        for ($i = 0; $i < $tokenCount; ++$i) {
            $token = $tokens[$i];
            if (!is_array($token)) {
                continue;
            }

            if ($token[0] === T_NAMESPACE) {
                $namespace = self::readNamespace($tokens, $i + 1);
            }

            if ($token[0] === T_CLASS && self::isClassDeclaration($tokens, $i)) {
                $class = self::readNextIdentifier($tokens, $i + 1);
            }

            if ($token[0] === T_IMPLEMENTS) {
                foreach (self::readImplements($tokens, $i + 1) as $iface) {
                    if ($iface === 'AppPlugin' || str_ends_with($iface, '\\AppPlugin')) {
                        $implementsAppPlugin = true;
                        break;
                    }
                }
            }
        }

        if ($class === '') {
            return null;
        }

        return [
            'namespace' => $namespace,
            'class' => $class,
            'implements_app_plugin' => $implementsAppPlugin,
        ];
    }

    /**
     * @param array<int, array{0: int, 1: string, 2: int}|string> $tokens
     */
    private static function isClassDeclaration(array $tokens, int $index): bool
    {
        for ($j = $index - 1; $j >= 0; --$j) {
            $token = $tokens[$j];
            if (!is_array($token)) {
                continue;
            }

            if (in_array($token[0], [T_WHITESPACE, T_COMMENT, T_DOC_COMMENT], true)) {
                continue;
            }

            return $token[0] !== T_NEW;
        }

        return true;
    }

    /**
     * @param array<int, array{0: int, 1: string, 2: int}|string> $tokens
     */
    private static function readNamespace(array $tokens, int $start): string
    {
        $parts = [];
        $count = count($tokens);

        for ($i = $start; $i < $count; ++$i) {
            $token = $tokens[$i];
            if (is_array($token) && $token[0] === T_NAME_QUALIFIED) {
                return $token[1];
            }
            if (is_array($token) && $token[0] === T_NS_SEPARATOR) {
                if (!empty($parts) && !str_ends_with(end($parts), '\\')) {
                    $parts[] = '\\';
                }

                continue;
            }
            if (is_array($token) && in_array($token[0], [T_STRING, T_NAME_QUALIFIED], true)) {
                $parts[] = $token[1];

                continue;
            }
            if ($token === ';' || $token === '{') {
                break;
            }
            if (is_array($token) && !in_array($token[0], [T_WHITESPACE, T_COMMENT, T_DOC_COMMENT], true)) {
                break;
            }
        }

        return implode('', $parts);
    }

    /**
     * @param array<int, array{0: int, 1: string, 2: int}|string> $tokens
     */
    private static function readNextIdentifier(array $tokens, int $start): string
    {
        $count = count($tokens);
        for ($i = $start; $i < $count; ++$i) {
            $token = $tokens[$i];
            if (!is_array($token)) {
                continue;
            }
            if (in_array($token[0], [T_WHITESPACE, T_COMMENT, T_DOC_COMMENT], true)) {
                continue;
            }
            if (in_array($token[0], [T_STRING, T_NAME_QUALIFIED], true)) {
                return $token[1];
            }

            break;
        }

        return '';
    }

    /**
     * @param array<int, array{0: int, 1: string, 2: int}|string> $tokens
     *
     * @return string[]
     */
    private static function readImplements(array $tokens, int $start): array
    {
        $interfaces = [];
        $current = '';
        $count = count($tokens);

        for ($i = $start; $i < $count; ++$i) {
            $token = $tokens[$i];
            if ($token === '{') {
                break;
            }
            if (is_array($token) && in_array($token[0], [T_STRING, T_NAME_QUALIFIED], true)) {
                $current .= $token[1];

                continue;
            }
            if (is_array($token) && $token[0] === T_NS_SEPARATOR) {
                $current .= '\\';

                continue;
            }
            if ($token === ',') {
                if ($current !== '') {
                    $interfaces[] = $current;
                }
                $current = '';

                continue;
            }
            if (is_array($token) && !in_array($token[0], [T_WHITESPACE, T_COMMENT, T_DOC_COMMENT], true)) {
                if ($current !== '') {
                    $interfaces[] = $current;
                }

                break;
            }
        }

        if ($current !== '') {
            $interfaces[] = $current;
        }

        return $interfaces;
    }
}
