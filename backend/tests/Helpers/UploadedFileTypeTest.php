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
use App\Helpers\UploadedFileType;
use Symfony\Component\HttpFoundation\File\UploadedFile;

class UploadedFileTypeTest extends TestCase
{
    /** @var list<string> */
    private array $tmp = [];

    protected function tearDown(): void
    {
        foreach ($this->tmp as $f) {
            @unlink($f);
        }
    }

    public function testActiveDocumentTypesAreNotListed(): void
    {
        foreach (['svg', 'svgz', 'html', 'htm', 'xhtml', 'xml', 'js', 'mjs'] as $ext) {
            $this->assertArrayNotHasKey($ext, UploadedFileType::TICKET_ATTACHMENT_TYPES, $ext);
        }
    }

    public function testExtensionIsNormalised(): void
    {
        $this->assertSame('png', UploadedFileType::extensionOf('Shot.PNG'));
        $this->assertSame('txt', UploadedFileType::extensionOf('notes.t-x-t'));
        $this->assertSame('', UploadedFileType::extensionOf('README'));
    }

    public function testTypeMustMatchExtension(): void
    {
        $types = UploadedFileType::TICKET_ATTACHMENT_TYPES;
        $this->assertTrue(UploadedFileType::matches('png', 'image/png', $types));
        $this->assertTrue(UploadedFileType::matches('txt', 'text/plain', $types));
        $this->assertTrue(UploadedFileType::matches('pdf', 'application/pdf', $types));
        $this->assertFalse(UploadedFileType::matches('png', 'text/plain', $types));
        $this->assertFalse(UploadedFileType::matches('txt', 'text/html', $types));
        $this->assertFalse(UploadedFileType::matches('svg', 'text/plain', $types));
        $this->assertFalse(UploadedFileType::matches('svg', 'image/svg+xml', $types));
        $this->assertFalse(UploadedFileType::matches('pdf', null, $types));
    }

    public function testRealFilesAreDetected(): void
    {
        if (!extension_loaded('fileinfo')) {
            $this->markTestSkipped('fileinfo not loaded');
        }
        $types = UploadedFileType::TICKET_ATTACHMENT_TYPES;

        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
        $file = $this->upload($png, 'shot.png');
        $this->assertTrue(UploadedFileType::matches('png', UploadedFileType::detect($file), $types));

        $file = $this->upload("plain notes\nline 2\n", 'notes.txt');
        $this->assertTrue(UploadedFileType::matches('txt', UploadedFileType::detect($file), $types));

        // Markup renamed to an image extension does not pass.
        $file = $this->upload('<html><body>hi</body></html>', 'shot.png');
        $this->assertFalse(UploadedFileType::matches('png', UploadedFileType::detect($file), $types));

        // Vector images are not accepted whatever they are detected as.
        $svg = '<!-- x --><svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>';
        $file = $this->upload($svg, 'icon.svg');
        $this->assertFalse(UploadedFileType::matches('svg', UploadedFileType::detect($file), $types));
    }

    public function testInlineImages(): void
    {
        $this->assertTrue(UploadedFileType::isInlineImage('PNG'));
        $this->assertTrue(UploadedFileType::isInlineImage('webp'));
        $this->assertFalse(UploadedFileType::isInlineImage('svg'));
        $this->assertFalse(UploadedFileType::isInlineImage('pdf'));
    }

    /** The web server configs send non-image attachments as downloads. */
    public function testWebServerConfigsServeAttachmentsAsDownloads(): void
    {
        $root = dirname(__DIR__, 3);
        $caddy = (string) file_get_contents($root . '/backend/Caddyfile');
        $this->assertStringContainsString('@attachment_downloads', $caddy);
        $this->assertStringContainsString('header @attachment_downloads Content-Disposition "attachment"', $caddy);
        $this->assertMatchesRegularExpression('/@attachments path \/attachments\/\*\s+header @attachments \{[^}]*X-Content-Type-Options "nosniff"[^}]*sandbox/s', $caddy);

        foreach (['/backend/nginx.conf', '/installer/source/init/panel.bash'] as $file) {
            $conf = (string) file_get_contents($root . $file);
            $this->assertStringContainsString('add_header Content-Disposition "attachment" always;', $conf, $file);
            $this->assertStringNotContainsString('alias ${BACKEND_DIR}/public/attachments/', $conf, $file);
        }
    }

    private function upload(string $contents, string $name): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'fpup');
        file_put_contents($path, $contents);
        $this->tmp[] = $path;

        return new UploadedFile($path, $name, null, null, true);
    }
}
