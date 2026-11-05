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

/**
 * A license header whose closing star-slash is missing turns everything up to the
 * next block comment into one big comment, `namespace` and `use` lines included.
 * `php -l` accepts that, but the class then lives in the global namespace and
 * every `App\...` reference to it dies with "class not found" at runtime.
 */
class SourceHeaderIntegrityTest extends TestCase
{
    private const APP_DIR = __DIR__ . '/../../app';

    public function testEveryNamespaceLineIsReallyCode(): void
    {
        $swallowed = [];
        $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(self::APP_DIR, FilesystemIterator::SKIP_DOTS));
        foreach ($files as $file) {
            if ($file->getExtension() !== 'php') {
                continue;
            }
            $source = (string) file_get_contents($file->getPathname());
            if (preg_match('/^namespace\s+[A-Za-z\\\\]+;/m', $source) !== 1) {
                continue;
            }
            $hasNamespaceToken = false;
            foreach (token_get_all($source) as $token) {
                if (is_array($token) && $token[0] === T_NAMESPACE) {
                    $hasNamespaceToken = true;
                    break;
                }
            }
            if (!$hasNamespaceToken) {
                $swallowed[] = substr($file->getPathname(), strlen(self::APP_DIR) + 1);
            }
        }
        $this->assertSame([], $swallowed, 'These files have an unterminated block comment that swallows their namespace line.');
    }

    public function testOAuthStateCookieDeclaresItsNamespaceAndImports(): void
    {
        $tokens = token_get_all((string) file_get_contents(self::APP_DIR . '/Helpers/OAuthStateCookie.php'));
        $kinds = array_map(static fn ($t) => is_array($t) ? $t[0] : null, $tokens);
        $this->assertContains(T_NAMESPACE, $kinds);
        $this->assertContains(T_USE, $kinds);
    }
}
