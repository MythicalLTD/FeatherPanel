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

/**
 * Host names are stored and sent to the daemon in their ASCII form only.
 *
 * The daemon accepts [a-z0-9-] labels, so an internationalised name such as
 * "gärtnerei.example.com" has to be stored as "xn--grtnerei-0za.example.com".
 */
class DomainName
{
    /**
     * Trim, drop a trailing dot, lowercase and convert to the ASCII (Punycode) form.
     *
     * Names that are already ASCII are only lowercased. If the name cannot be converted
     * (invalid IDN, or the intl extension is missing) it is returned lowercased and
     * unchanged, so the later validation rejects it exactly as before.
     */
    public static function toAscii(string $domain): string
    {
        $domain = rtrim(trim($domain), '.');
        $domain = trim($domain);
        if ($domain === '') {
            return '';
        }

        if (!preg_match('/[^\x00-\x7F]/', $domain)) {
            return strtolower($domain);
        }

        if (function_exists('idn_to_ascii')) {
            $ascii = idn_to_ascii($domain, \IDNA_NONTRANSITIONAL_TO_ASCII, \INTL_IDNA_VARIANT_UTS46);
            if (is_string($ascii) && $ascii !== '') {
                return strtolower($ascii);
            }
        }

        return function_exists('mb_strtolower') ? mb_strtolower($domain, 'UTF-8') : strtolower($domain);
    }
}
