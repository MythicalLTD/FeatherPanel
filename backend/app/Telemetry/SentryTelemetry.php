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

namespace App\Telemetry;

use Sentry\Event;
use Sentry\Severity;
use Sentry\Breadcrumb;
use Sentry\State\Scope;
use Sentry\Tracing\Transaction;
use Sentry\Tracing\TransactionSource;
use Sentry\Tracing\TransactionContext;
use Symfony\Component\HttpFoundation\Request;

/** Shared, best-effort telemetry for HTTP, CLI and cron bootstraps. */
final class SentryTelemetry
{
    private static bool $enabled = false;
    private static ?Transaction $transaction = null;
    private static ?string $route = null;
    private static ?string $method = null;

    /** External error reporting is disabled; telemetry is restricted to totals. */
    public static function boot(): void
    {
        self::initialize([]);
    }

    public static function initialize(array $options): void
    {
        self::$enabled = false;
        self::$route = null;
        self::$method = null;
        self::$transaction = null;
        \Sentry\SentrySdk::setCurrentHub(new \Sentry\State\Hub());
    }

    public static function options(array $config): array
    {
        $environment =
            (string) ($config['SENTRY_ENVIRONMENT'] ??
                ($config['APP_ENV'] ?? 'production'));
        $rate = filter_var(
            $config['SENTRY_TRACES_SAMPLE_RATE'] ?? 0.01,
            FILTER_VALIDATE_FLOAT,
        );

        return [
            'dsn' => null, // Cannot be enabled by settings or environment variables.
            'environment' => $environment,
            'release' => (string) ($config['SENTRY_RELEASE'] ??
                    'featherpanel@' .
                        (defined('APP_VERSION') ? APP_VERSION : 'unknown')),
            'traces_sample_rate' => $rate !== false && $rate >= 0 && $rate <= 1
                    ? (float) $rate
                    : 0.01,
            'send_default_pii' => false,
            'max_request_body_size' => 'none',
            'attach_stacktrace' => true,
            'error_types' => E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED,
            'in_app_include' => [dirname(__DIR__)],
            'in_app_exclude' => [dirname(__DIR__, 2) . '/storage/packages'],
            'http_connect_timeout' => 1,
            'http_timeout' => 2,
            'max_breadcrumbs' => 50,
            'before_send' => [self::class, 'sanitizeEvent'],
            'before_send_transaction' => [self::class, 'sanitizeEvent'],
        ];
    }

    public static function startRequest(Request $request, string $route): void
    {
        if (!self::$enabled) {
            return;
        }
        try {
            self::$route = $route;
            self::$method = $request->getMethod();
            $name = self::$method . ' ' . $route;
            // Use the route template, never user IDs, tokens or query strings as transaction names.
            $context = new TransactionContext($name);
            $context->setOp('http.server');
            $context->getMetadata()->setSource(TransactionSource::route());
            if (defined('APP_START')) {
                $context->setStartTimestamp(APP_START);
            }
            self::$transaction = \Sentry\startTransaction($context);
            \Sentry\configureScope(static function (Scope $scope) use (
                $route,
            ): void {
                $scope->setTag('route', $route);
                $scope->setSpan(self::$transaction);
            });
        } catch (\Throwable) {
            // Best effort.
        }
    }

    public static function finishRequest(int $status): void
    {
        if (self::$transaction === null) {
            return;
        }
        $transaction = self::$transaction;
        self::$transaction = null;
        try {
            $transaction->setHttpStatus($status);
            $transaction->setData(['http.response.status_code' => $status]);
            $transaction->finish();
            \Sentry\configureScope(static function (Scope $scope): void {
                $scope->setSpan(null);
            });
        } catch (\Throwable) {
            // Best effort.
        }
    }

    public static function setUser(string $id): void
    {
        if (!self::$enabled) {
            return;
        }
        try {
            \Sentry\configureScope(static function (Scope $scope) use (
                $id,
            ): void {
                $scope->setUser(['id' => $id]);
            });
        } catch (\Throwable) {
            // Best effort.
        }
    }

    public static function captureException(\Throwable $exception): ?string
    {
        if (!self::$enabled) {
            return null;
        }
        try {
            $id = \Sentry\captureException($exception);

            return $id === null ? null : (string) $id;
        } catch (\Throwable) {
            return null;
        }
    }

    public static function log(
        string $level,
        string $message,
        string $caller,
        bool $sendTelemetry = false,
    ): void {
        if (!self::$enabled) {
            return;
        }
        try {
            $message = self::redact($message);
            \Sentry\addBreadcrumb(
                new Breadcrumb(
                    $level,
                    Breadcrumb::TYPE_DEFAULT,
                    'app.log',
                    $message,
                    ['caller' => $caller],
                ),
            );
            if ($sendTelemetry) {
                \Sentry\withScope(static function (Scope $scope) use (
                    $level,
                    $message,
                    $caller,
                ): void {
                    $scope->setTag('logger', $caller);
                    \Sentry\captureMessage($message, new Severity($level));
                });
            }
        } catch (\Throwable) {
            // Local logging must continue even when telemetry fails.
        }
    }

    public static function sanitizeEvent(Event $event): Event
    {
        // RequestIntegration otherwise collects headers, query strings and server variables.
        $request = [];
        if (self::$method !== null) {
            $request['method'] = self::$method;
        }
        if (self::$route !== null) {
            $request['url'] = self::$route;
            $event->setTransaction(self::$method . ' ' . self::$route);
        }
        $event->setRequest($request);
        $user = $event->getUser();
        $event->setUser(
            $user !== null && $user->getId() !== null
                ? \Sentry\UserDataBag::createFromUserIdentifier($user->getId())
                : null,
        );
        $event->setExtra(self::sanitizeData($event->getExtra()));
        $breadcrumbs = [];
        foreach ($event->getBreadcrumbs() as $breadcrumb) {
            $breadcrumbs[] = new Breadcrumb(
                $breadcrumb->getLevel(),
                $breadcrumb->getType(),
                $breadcrumb->getCategory(),
                $breadcrumb->getMessage() === null
                    ? null
                    : self::redact($breadcrumb->getMessage()),
                self::sanitizeData($breadcrumb->getMetadata()),
                $breadcrumb->getTimestamp(),
            );
        }
        $event->setBreadcrumb($breadcrumbs);
        $stacktraces = [$event->getStacktrace()];
        foreach ($event->getExceptions() as $exception) {
            $exception->setValue(self::redact($exception->getValue()));
            $stacktraces[] = $exception->getStacktrace();
        }
        foreach ($stacktraces as $stacktrace) {
            if ($stacktrace !== null) {
                foreach ($stacktrace->getFrames() as $frame) {
                    $frame->setVars([]);
                }
            }
        }
        foreach ($event->getSpans() as $span) {
            $span->setData(self::sanitizeData($span->getData()));
            if ($span->getDescription() !== null) {
                $span->setDescription(self::redact($span->getDescription()));
            }
        }
        foreach ($event->getContexts() as $key => $context) {
            $event->setContext($key, self::sanitizeData($context));
        }
        if ($event->getMessage() !== null) {
            $event->setMessage(
                self::redact($event->getMessage()),
                [],
                self::redact(
                    $event->getMessageFormatted() ?? $event->getMessage(),
                ),
            );
        }

        return $event;
    }

    private static function sanitizeData(array $data): array
    {
        foreach ($data as $key => $value) {
            if (
                is_string($key)
                && preg_match(
                    '/password|passwd|secret|token|authorization|cookie|api[_-]?key|private[_-]?key|dsn|database_url/i',
                    $key,
                )
            ) {
                $data[$key] = '[Filtered]';
            } elseif (is_array($value)) {
                $data[$key] = self::sanitizeData($value);
            } elseif (is_string($value)) {
                $data[$key] = self::redact($value);
            }
        }

        return $data;
    }

    private static function redact(string $message): string
    {
        $message =
            preg_replace(
                "/\b(Bearer|Basic)\s+[^\s,;]+/i",
                '$1 [Filtered]',
                $message,
            ) ?? $message;
        $message =
            preg_replace(
                '/((?:password|passwd|secret|token|api[_-]?key|private[_-]?key)\s*[=:]\s*)("[^"]*"|\'[^\']*\'|[^\s&,;]+)/i',
                '$1[Filtered]',
                $message,
            ) ?? $message;

        return preg_replace(
            "~(https?://[^\s?]+)\?[^\s]+~i",
            '$1?[Filtered]',
            $message,
        ) ?? $message;
    }
}
