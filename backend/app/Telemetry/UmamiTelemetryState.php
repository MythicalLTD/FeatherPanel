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

/** Persist scheduling separately from configuration, using an atomic expiring lease. */
final class UmamiTelemetryState
{
    private const REPORT_INTERVAL = 86400;
    private const RETRY_INTERVAL = 3600;
    private const LEASE_INTERVAL = 300;

    public function __construct(private readonly \PDO $db)
    {
    }

    public function claim(int $now): ?string
    {
        $token = bin2hex(random_bytes(16));
        $stmt = $this->db->prepare('UPDATE featherpanel_telemetry_state
            SET lease_token = :token, lease_until = :lease_until
            WHERE service = :service AND lease_until <= :now
            AND (last_success IS NULL OR last_success <= :daily)
            AND (last_attempt IS NULL OR last_attempt <= :retry)');
        $stmt->execute([
            'token' => $token,
            'lease_until' => $now + self::LEASE_INTERVAL,
            'service' => 'umami',
            'now' => $now,
            'daily' => $now - self::REPORT_INTERVAL,
            'retry' => $now - self::RETRY_INTERVAL,
        ]);

        return $stmt->rowCount() === 1 ? $token : null;
    }

    public function attempt(string $token, int $now): bool
    {
        $stmt = $this->db
            ->prepare("UPDATE featherpanel_telemetry_state SET last_attempt = :now, last_result = 'sending'
            WHERE service = 'umami' AND lease_token = :token AND lease_until > :lease_check");
        $stmt->execute([
            'now' => $now,
            'token' => $token,
            'lease_check' => $now,
        ]);

        return $stmt->rowCount() === 1;
    }

    public function complete(string $token, int $now, bool $success): void
    {
        $stmt = $this->db->prepare(
            'UPDATE featherpanel_telemetry_state
            SET last_result = :result, last_success = ' .
                ($success ? ':now' : 'last_success') .
                "
            WHERE service = 'umami' AND lease_token = :token",
        );
        $params = ['result' => $success ? 'sent' : 'failed', 'token' => $token];
        if ($success) {
            $params['now'] = $now;
        }
        $stmt->execute($params);
    }

    public function release(string $token): void
    {
        $stmt = $this->db
            ->prepare("UPDATE featherpanel_telemetry_state SET lease_token = NULL, lease_until = 0
            WHERE service = 'umami' AND lease_token = :token");
        $stmt->execute(['token' => $token]);
    }

    public function status(): array
    {
        $row = $this->db
            ->query(
                "SELECT last_attempt, last_success, last_result, lease_until FROM featherpanel_telemetry_state WHERE service = 'umami'",
            )
            ->fetch(\PDO::FETCH_ASSOC);
        if (!$row) {
            throw new \RuntimeException(
                'Telemetry state is not initialized. Run database migrations.',
            );
        }
        $lastAttempt =
            $row['last_attempt'] !== null ? (int) $row['last_attempt'] : null;
        $lastSuccess =
            $row['last_success'] !== null ? (int) $row['last_success'] : null;
        $result = $row['last_result'];
        if ($result === 'sending' && (int) $row['lease_until'] <= time()) {
            $result = 'failed';
        }

        return [
            'last_attempt' => $lastAttempt,
            'last_success' => $lastSuccess,
            'last_result' => $result,
            'next_attempt' => $lastAttempt !== null
                    ? max(
                        $lastAttempt + self::RETRY_INTERVAL,
                        ($lastSuccess ?? 0) + self::REPORT_INTERVAL,
                    )
                    : null,
        ];
    }
}
