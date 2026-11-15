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
use App\Mail\MailTemplateRenderer;

class MailTemplateRendererTest extends TestCase
{
    private const MARKUP = '<img src=x onerror="alert(1)">';

    public function testHtmlValuesAreEncoded(): void
    {
        $out = MailTemplateRenderer::renderHtml('<p>Hi {first_name} {last_name}</p>', [
            'first_name' => self::MARKUP,
            'last_name' => "O'Brien & Co",
        ]);

        $this->assertSame('<p>Hi &lt;img src=x onerror=&quot;alert(1)&quot;&gt; O&#039;Brien &amp; Co</p>', $out);
    }

    public function testRawHtmlKeysAreKeptAsIs(): void
    {
        $out = MailTemplateRenderer::renderHtml('{a}|{b}', ['a' => '<b>x</b>', 'b' => '<b>y</b>'], ['b']);

        $this->assertSame('&lt;b&gt;x&lt;/b&gt;|<b>y</b>', $out);
    }

    public function testValuesAreNotExpandedTwice(): void
    {
        $out = MailTemplateRenderer::renderHtml('{first_name} / {password}', [
            'first_name' => '{password}',
            'password' => 'secret',
        ]);

        $this->assertSame('{password} / secret', $out);
    }

    public function testTextRenderingKeepsPlainValues(): void
    {
        $out = MailTemplateRenderer::renderText('Reply on {ticket_title}: {reply_preview}', [
            'ticket_title' => 'A & B <c>',
            'reply_preview' => 'line&amp;1<br />line2',
        ], ['reply_preview']);

        $this->assertSame('Reply on A & B <c>: line&1line2', $out);
    }

    public function testUnknownPlaceholdersStay(): void
    {
        $this->assertSame('{missing} ok', MailTemplateRenderer::renderHtml('{missing} {x}', ['x' => 'ok']));
        $this->assertSame('', MailTemplateRenderer::renderHtml('', ['x' => 'ok']));
    }

    /**
     * @return iterable<string, array{class-string}>
     */
    public static function templateClasses(): iterable
    {
        foreach (glob(dirname(__DIR__, 2) . '/app/Mail/templates/*.php') ?: [] as $file) {
            $class = 'App\\Mail\\templates\\' . basename($file, '.php');
            yield basename($file, '.php') => [$class];
        }
    }

    /**
     * Every mail template encodes user values placed in the HTML body.
     */
    #[PHPUnit\Framework\Attributes\DataProvider('templateClasses')]
    public function testEveryTemplateEncodesValues(string $class): void
    {
        $this->assertTrue(method_exists($class, 'parseTemplate'), $class . ' has parseTemplate');

        $keys = ['first_name', 'last_name', 'username', 'email', 'ticket_title', 'replier_name', 'server_name', 'ticket_owner', 'warning_title', 'warning_message', 'api_client_name', 'suspension_reason'];
        $template = '';
        $data = [];
        foreach ($keys as $key) {
            $template .= '<td>{' . $key . '}</td>';
            $data[$key] = self::MARKUP;
        }

        $out = $class::parseTemplate($template, $data);

        $this->assertStringNotContainsString('<img', $out);
        $this->assertSame(count($keys), substr_count($out, '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'));
    }

    public function testWelcomeBodyEncodesNames(): void
    {
        $out = App\Mail\templates\Welcome::parseTemplate('<h1>Welcome {first_name} {last_name} ({username})</h1><a href="{dashboard_url}">go</a>', [
            'app_name' => 'Panel',
            'app_url' => 'https://panel.test',
            'first_name' => self::MARKUP,
            'last_name' => '<script>x()</script>',
            'email' => 'a@b.test',
            'username' => 'user',
            'password' => '',
            'dashboard_url' => 'https://panel.test/dashboard?a=1&b=2',
            'support_url' => 'https://panel.test/support',
        ]);

        $this->assertStringNotContainsString('<img', $out);
        $this->assertStringNotContainsString('<script', $out);
        $this->assertStringContainsString('href="https://panel.test/dashboard?a=1&amp;b=2"', $out);
    }

    public function testPrebuiltFragmentsStayMarkup(): void
    {
        $warning = App\Mail\templates\UserWarning::parseTemplate('{server_name_clause}|{server_name}', [
            'server_name_clause' => ' / server <b>a&lt;b</b>',
            'server_name' => 'a<b',
        ]);
        $this->assertSame(' / server <b>a&lt;b</b>|a&lt;b', $warning);

        $reply = App\Mail\templates\TicketReplied::parseTemplate('{reply_preview}|{replier_name}', [
            'reply_preview' => 'hi<br />',
            'replier_name' => '<i>x</i>',
        ]);
        $this->assertSame('hi<br />|&lt;i&gt;x&lt;/i&gt;', $reply);
    }
}
