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

namespace App\Services\Wings\Exceptions;

/**
 * Exception thrown when Wings request fails.
 */
class WingsRequestException extends \Exception
{
    private ?string $requestId;
    private ?array $responseBody;

    public function __construct(
        string $message = '',
        int $code = 0,
        ?\Exception $previous = null,
        ?string $requestId = null,
        ?array $responseBody = null,
    ) {
        parent::__construct($message, $code, $previous);
        $this->requestId = $requestId;
        $this->responseBody = $responseBody;
    }

    public function getRequestId(): ?string
    {
        return $this->requestId;
    }

    public function getResponseBody(): ?array
    {
        return $this->responseBody;
    }
}
