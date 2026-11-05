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
 * storage/modules/webmail/token.php is copied into the Roundcube volume and
 * runs standalone. It must define $featherSso before Roundcube is told to use
 * it; an undefined variable turns every webmail jump into "Webmail login failed".
 */
class WebmailTokenTemplateTest extends TestCase
{
    private function source(): string
    {
        return (string) file_get_contents(__DIR__ . '/../../storage/modules/webmail/token.php');
    }

    public function testTemplateIsValidPhp(): void
    {
        $this->assertNotEmpty(token_get_all($this->source(), TOKEN_PARSE));
    }

    public function testSsoSettingsAreDefinedBeforeTheyAreUsed(): void
    {
        $source = $this->source();
        $definition = strpos($source, '$featherSso = [');
        $firstUse = strpos($source, '$featherSso[');
        $this->assertNotFalse($definition, '$featherSso is never defined');
        $this->assertNotFalse($firstUse);
        $this->assertLessThan($firstUse, $definition);
    }

    public function testSsoSettingsCarryEveryKeyThatIsRead(): void
    {
        $source = $this->source();
        preg_match_all('/\$featherSso\[\'([a-z]+)\'\]/', $source, $used);
        $this->assertNotEmpty($used[1]);
        $this->assertSame(1, preg_match('/\$featherSso = \[(.*?)\];/s', $source, $block));
        foreach (array_unique($used[1]) as $key) {
            $this->assertStringContainsString("'" . $key . "' =>", $block[1], "missing key {$key}");
        }
    }
}
