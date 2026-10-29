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

namespace App\Helpers;

use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Binds an OAuth `state` value to the browser that started the flow.
 *
 * The state is also kept server side, but without this cookie anyone could send a victim a
 * callback URL carrying the attacker's code and state (login CSRF), or a consent link for a
 * link flow started from the attacker's account.
 */
final class OAuthStateCookie
{
    public const STATE = 'fp_oauth_state';
    public const HANDOFF = 'fp_sso_handoff';
    private const PATH = '/api/user/auth';

    public static function attach(Response $response, string $state, string $name = self::STATE): Response
    {
        $response->headers->setCookie(
            Cookie::create($name, hash('sha256', $state), time() + 600, self::PATH, null, self::secure(), true, false, Cookie::SAMESITE_LAX),
        );

        return $response;
    }

    public static function matches(Request $request, mixed $state, string $name = self::STATE): bool
    {
        $cookie = $request->cookies->get($name);

        return is_string($state) && $state !== '' && is_string($cookie) && hash_equals($cookie, hash('sha256', $state));
    }

    public static function clear(Response $response, string $name = self::STATE): Response
    {
        $response->headers->clearCookie($name, self::PATH, null, self::secure(), true, Cookie::SAMESITE_LAX);

        return $response;
    }

    private static function secure(): bool
    {
        $appUrl = (string) \App\App::getInstance(true)->getConfig()->getSetting(\App\Config\ConfigInterface::APP_URL, '');

        return str_starts_with(strtolower($appUrl), 'https://') || Request::createFromGlobals()->isSecure();
    }
}
