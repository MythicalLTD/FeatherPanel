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

namespace Tests\Telemetry;

use Sentry\Event;
use Sentry\SentrySdk;
use Sentry\State\Hub;
use Sentry\Breadcrumb;
use Sentry\UserDataBag;
use Sentry\Transport\Result;
use PHPUnit\Framework\TestCase;
use App\Telemetry\SentryTelemetry;
use Sentry\Transport\ResultStatus;
use Sentry\Transport\TransportInterface;
use Symfony\Component\HttpFoundation\Request;

final class SentryTelemetryTest extends TestCase
{
    private TransportInterface $transport;

    protected function setUp(): void
    {
        SentrySdk::setCurrentHub(new Hub());
        $this->transport = new class () implements TransportInterface {
            public array $events = [];

            public function send(Event $event): Result
            {
                $this->events[] = $event;

                return new Result(ResultStatus::success(), $event);
            }

            public function close(?int $timeout = null): Result
            {
                return new Result(ResultStatus::success());
            }
        };
        $options = SentryTelemetry::options([
            'SENTRY_DSN' => 'https://public@example.invalid/1',
            'SENTRY_ENVIRONMENT' => 'testing',
            'SENTRY_ENABLED' => 'true',
            'SENTRY_TRACES_SAMPLE_RATE' => '1',
        ]);
        $options['transport'] = $this->transport;
        $options['default_integrations'] = false;
        SentryTelemetry::initialize($options);
    }

    protected function tearDown(): void
    {
        SentryTelemetry::finishRequest(200);
        SentryTelemetry::initialize(['dsn' => null]);
        SentrySdk::setCurrentHub(new Hub());
    }

    public function testConfigurationAndDisableSwitch(): void
    {
        $options = SentryTelemetry::options(['SENTRY_ENABLED' => 'false', 'SENTRY_TRACES_SAMPLE_RATE' => 'garbage']);
        self::assertNull($options['dsn']);
        self::assertSame(0.01, $options['traces_sample_rate']);
        self::assertFalse($options['send_default_pii']);
        self::assertSame('none', $options['max_request_body_size']);
        self::assertNull(SentryTelemetry::options(['APP_ENV' => 'testing'])['dsn']);
        self::assertSame(0.0, SentryTelemetry::options(['SENTRY_TRACES_SAMPLE_RATE' => '0'])['traces_sample_rate']);
        self::assertSame(0.01, SentryTelemetry::options(['SENTRY_TRACES_SAMPLE_RATE' => '2'])['traces_sample_rate']);
    }

    public function testUserRequestsErrorsAndTransactionsNeverReachSentry(): void
    {
        SentryTelemetry::initialize([
            'dsn' => 'https://public@example.invalid/1',
            'transport' => $this->transport,
        ]);
        SentryTelemetry::startRequest(Request::create('/api/servers/private-id?token=secret'), '/api/servers/{uuid}');
        SentryTelemetry::setUser('user-123');
        SentryTelemetry::log('info', 'Starting operation', 'ExampleController');
        SentryTelemetry::log('error', 'Private error details', 'ExampleController', true);
        self::assertNull(SentryTelemetry::captureException(new \TypeError('token=supersecret')));
        SentryTelemetry::finishRequest(503);
        SentryTelemetry::finishRequest(200);
        self::assertSame([], $this->transport->events);
        self::assertNull(SentryTelemetry::options(['SENTRY_ENABLED' => 'true', 'SENTRY_DSN' => 'https://public@example.invalid/1'])['dsn']);
    }

    public function testSensitiveDataIsRemovedFromEvent(): void
    {
        $event = Event::createEvent();
        $event->setRequest(['headers' => ['Authorization' => 'secret'], 'cookies' => ['session' => 'secret'], 'data' => ['password' => 'secret'], 'query_string' => 'token=secret']);
        $event->setExtra(['nested' => ['api_key' => 'secret', 'safe' => 'ok']]);
        $event->setUser(UserDataBag::createFromArray(['id' => '123', 'email' => 'private@example.com', 'ip_address' => '127.0.0.1']));
        $event->setBreadcrumb([new Breadcrumb('info', 'http', 'http', 'https://example.com/?token=secret', ['private_key' => 'secret'])]);
        $event = SentryTelemetry::sanitizeEvent($event);
        self::assertSame([], $event->getRequest());
        self::assertSame('[Filtered]', $event->getExtra()['nested']['api_key']);
        self::assertSame('ok', $event->getExtra()['nested']['safe']);
        self::assertNull($event->getUser()->getEmail());
        self::assertNull($event->getUser()->getIpAddress());
        self::assertSame('https://example.com/?[Filtered]', $event->getBreadcrumbs()[0]->getMessage());
        self::assertSame('[Filtered]', $event->getBreadcrumbs()[0]->getMetadata()['private_key']);
    }

    public function testLocalLoggingContinuesWhenTransportFails(): void
    {
        $options = SentryTelemetry::options(['SENTRY_DSN' => 'https://public@example.invalid/1']);
        $options['default_integrations'] = false;
        $options['transport'] = new class () implements TransportInterface {
            public function send(Event $event): Result
            {
                throw new \RuntimeException('Transport unavailable');
            }

            public function close(?int $timeout = null): Result
            {
                return new Result(ResultStatus::success());
            }
        };
        SentryTelemetry::initialize($options);
        $path = tempnam(sys_get_temp_dir(), 'sentry-logger-');
        try {
            $logger = new \App\Logger\LoggerFactory($path);
            $logger->error('Test local logging during outage');
            self::assertStringContainsString('Test local logging during outage', file_get_contents($path));
            self::assertNull(SentryTelemetry::captureException(new \RuntimeException('Test error')));
        } finally {
            unlink($path);
        }
    }

    public function testLogsRemainLocalEvenWhenReportingWasRequested(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'sentry-logger-');
        try {
            $logger = new \App\Logger\LoggerFactory($path);
            $logger->error('Reported error');
            $logger->error('Already captured exception', false);
            $logger->warning('Breadcrumb warning');
            self::assertCount(0, $this->transport->events);
            $logger->critical('Critical error');
            self::assertCount(0, $this->transport->events);
            self::assertStringContainsString('Critical error', file_get_contents($path));
        } finally {
            unlink($path);
        }
    }

    public function testDisabledTelemetryDoesNotSendEvents(): void
    {
        SentryTelemetry::initialize(['dsn' => null]);
        SentryTelemetry::startRequest(Request::create('/'), '/');
        SentryTelemetry::log('error', 'Disabled', 'Job', true);
        self::assertNull(SentryTelemetry::captureException(new \RuntimeException('Disabled')));
        SentryTelemetry::finishRequest(500);
        self::assertCount(0, $this->transport->events);
    }
}
