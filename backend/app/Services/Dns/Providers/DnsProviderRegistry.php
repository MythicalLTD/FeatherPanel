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

namespace App\Services\Dns\Providers;

/**
 * The DNS providers a customer can use with a one-time API token.
 */
class DnsProviderRegistry
{
    /**
     * @return array<string, class-string<AbstractApiDnsProvider>>
     */
    public static function classes(): array
    {
        $classes = [
            CloudflareDnsProvider::class,
            HetznerDnsProvider::class,
            IonosDnsProvider::class,
            DigitalOceanDnsProvider::class,
            DesecDnsProvider::class,
        ];
        $map = [];
        foreach ($classes as $class) {
            $map[$class::id()] = $class;
        }

        return $map;
    }

    /**
     * @return list<array{id: string, label: string, help: string}>
     */
    public static function describe(): array
    {
        $out = [];
        foreach (self::classes() as $id => $class) {
            $out[] = ['id' => $id, 'label' => $class::label(), 'help' => $class::help()];
        }

        return $out;
    }

    public static function has(string $id): bool
    {
        return isset(self::classes()[$id]);
    }

    /**
     * @param (callable(string, string, array<string, string>, ?array<mixed>): array{status: int, body: mixed})|null $transport
     */
    public static function create(string $id, string $token, ?callable $transport = null): AbstractApiDnsProvider
    {
        $classes = self::classes();
        if (!isset($classes[$id])) {
            throw new \InvalidArgumentException('Unknown DNS provider');
        }
        $class = $classes[$id];

        return new $class($token, $transport);
    }
}
