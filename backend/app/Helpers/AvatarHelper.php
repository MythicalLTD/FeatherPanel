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

namespace App\Helpers;

use App\App;
use Gravatar\Gravatar;
use App\Config\ConfigInterface;

class AvatarHelper
{
    public const PROVIDER_GRAVATAR = 'gravatar';
    public const PROVIDER_PANEL_LOGO = 'panel_logo';
    public const PROVIDER_UI_AVATARS = 'ui_avatars';
    public const PROVIDER_ROBOHASH = 'robohash';
    public const PROVIDER_DICEBEAR = 'dicebear';
    public const PROVIDER_CUSTOM = 'custom';

    /**
     * @return string[]
     */
    public static function getProviders(): array
    {
        return [
            self::PROVIDER_GRAVATAR,
            self::PROVIDER_PANEL_LOGO,
            self::PROVIDER_UI_AVATARS,
            self::PROVIDER_ROBOHASH,
            self::PROVIDER_DICEBEAR,
            self::PROVIDER_CUSTOM,
        ];
    }

    public static function resolveAvatar(
        ?string $avatar,
        string $email,
        ?string $username = null,
        ?string $firstName = null,
        ?string $lastName = null,
    ): string {
        if (!self::isDefaultAvatar($avatar)) {
            return (string) $avatar;
        }

        return self::getDefaultAvatarUrl($email, $username, $firstName, $lastName);
    }

    public static function isDefaultAvatar(?string $avatar): bool
    {
        $avatar = trim((string) $avatar);
        if ($avatar === '') {
            return true;
        }

        $config = App::getInstance(true)->getConfig();
        $knownDefaults = [
            'https://github.com/featherpanel-com.png',
            $config->getSetting(ConfigInterface::APP_LOGO_WHITE, ''),
            $config->getSetting(ConfigInterface::APP_LOGO_DARK, ''),
        ];

        foreach ($knownDefaults as $default) {
            if ($default !== '' && $avatar === $default) {
                return true;
            }
        }

        return false;
    }

    public static function getDefaultAvatarUrl(
        string $email,
        ?string $username = null,
        ?string $firstName = null,
        ?string $lastName = null,
    ): string {
        $config = App::getInstance(true)->getConfig();
        $provider = strtolower(trim($config->getSetting(ConfigInterface::AVATAR_PROVIDER, self::PROVIDER_GRAVATAR)));

        switch ($provider) {
            case self::PROVIDER_PANEL_LOGO:
                return $config->getSetting(ConfigInterface::APP_LOGO_WHITE, 'https://github.com/featherpanel-com.png');

            case self::PROVIDER_UI_AVATARS:
                $name = self::buildDisplayName($username, $firstName, $lastName, $email);

                return 'https://ui-avatars.com/api/?' . http_build_query([
                    'name' => $name,
                    'background' => 'random',
                    'size' => 256,
                ]);

            case self::PROVIDER_ROBOHASH:
                return 'https://robohash.org/' . rawurlencode($email) . '.png?size=256x256';

            case self::PROVIDER_DICEBEAR:
                return 'https://api.dicebear.com/9.x/initials/svg?seed=' . rawurlencode($email);

            case self::PROVIDER_CUSTOM:
                $template = trim($config->getSetting(ConfigInterface::AVATAR_CUSTOM_URL, ''));
                if ($template === '') {
                    return self::buildGravatarUrl($email, $username, $firstName, $lastName);
                }

                return self::applyCustomTemplate($template, $email, $username, $firstName, $lastName);

            case self::PROVIDER_GRAVATAR:
            default:
                return self::buildGravatarUrl($email, $username, $firstName, $lastName);
        }
    }

    /**
     * @param array<string, mixed>|null $user
     *
     * @return array<string, mixed>|null
     */
    public static function enrichUser(?array $user): ?array
    {
        if ($user === null) {
            return null;
        }

        if (array_key_exists('avatar', $user) && isset($user['email']) && is_string($user['email'])) {
            $user['avatar'] = self::resolveAvatar(
                isset($user['avatar']) ? (string) $user['avatar'] : null,
                $user['email'],
                isset($user['username']) ? (string) $user['username'] : null,
                isset($user['first_name']) ? (string) $user['first_name'] : null,
                isset($user['last_name']) ? (string) $user['last_name'] : null,
            );
        }

        return $user;
    }

    /**
     * @param array<int, array<string, mixed>> $users
     *
     * @return array<int, array<string, mixed>>
     */
    public static function enrichUsers(array $users): array
    {
        return array_map(
            static fn (array $user): array => self::enrichUser($user) ?? $user,
            $users,
        );
    }

    private static function buildGravatarUrl(
        string $email,
        ?string $username,
        ?string $firstName,
        ?string $lastName,
    ): string {
        try {
            $gravatar = new Gravatar(['s' => 256, 'd' => 'mp']);

            return $gravatar->avatar($email);
        } catch (\InvalidArgumentException) {
            $name = self::buildDisplayName($username, $firstName, $lastName, $email);

            return 'https://ui-avatars.com/api/?' . http_build_query([
                'name' => $name,
                'size' => 256,
            ]);
        }
    }

    private static function applyCustomTemplate(
        string $template,
        string $email,
        ?string $username,
        ?string $firstName,
        ?string $lastName,
    ): string {
        $config = App::getInstance(true)->getConfig();
        $appUrl = rtrim($config->getSetting(ConfigInterface::APP_URL, ''), '/');
        $emailHash = md5(strtolower(trim($email)));
        $name = self::buildDisplayName($username, $firstName, $lastName, $email);

        $replacements = [
            '{email}' => $email,
            '{username}' => (string) $username,
            '{name}' => $name,
            '{hash}' => $emailHash,
            '{email_hash}' => $emailHash,
            '{app_url}' => $appUrl,
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $template);
    }

    private static function buildDisplayName(
        ?string $username,
        ?string $firstName,
        ?string $lastName,
        string $email,
    ): string {
        $parts = array_filter([trim((string) $firstName), trim((string) $lastName)]);
        if ($parts !== []) {
            return implode(' ', $parts);
        }

        if ($username !== null && trim($username) !== '') {
            return trim($username);
        }

        return explode('@', $email)[0];
    }
}
