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

namespace App\Observability;

/**
 * Parser for the Prometheus text exposition format (version 0.0.4).
 *
 * Built for reading node daemon scrapes in the panel, so it keeps only what the
 * panel needs: sample name, labels and value. Comments, HELP/TYPE lines,
 * timestamps and exemplars are ignored, and malformed lines are skipped instead
 * of failing the whole scrape.
 */
final class PrometheusParser
{
    /** Hard cap so a huge scrape cannot exhaust panel memory. */
    public const MAX_SAMPLES = 50000;

    /** @var array<string, list<array{labels: array<string, string>, value: float}>> */
    private array $samples = [];

    private int $count = 0;

    public static function parse(string $text): self
    {
        $parser = new self();
        foreach (preg_split('/\r?\n/', $text) ?: [] as $line) {
            if ($parser->count >= self::MAX_SAMPLES) {
                break;
            }
            $line = trim($line);
            if ($line === '' || $line[0] === '#') {
                continue;
            }
            $parsed = self::parseLine($line);
            if ($parsed === null) {
                continue;
            }
            [$name, $labels, $value] = $parsed;
            $parser->samples[$name][] = ['labels' => $labels, 'value' => $value];
            ++$parser->count;
        }

        return $parser;
    }

    /**
     * @return array{0: string, 1: array<string, string>, 2: float}|null
     */
    public static function parseLine(string $line): ?array
    {
        if (!preg_match('/^([a-zA-Z_:][a-zA-Z0-9_:]*)/', $line, $m)) {
            return null;
        }
        $name = $m[1];
        $pos = strlen($name);
        $labels = [];
        $len = strlen($line);

        if ($pos < $len && $line[$pos] === '{') {
            ++$pos;
            while (true) {
                while ($pos < $len && ($line[$pos] === ' ' || $line[$pos] === ',')) {
                    ++$pos;
                }
                if ($pos >= $len) {
                    return null;
                }
                if ($line[$pos] === '}') {
                    ++$pos;
                    break;
                }
                if (!preg_match('/\G([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*"/', $line, $lm, 0, $pos)) {
                    return null;
                }
                $key = $lm[1];
                $pos += strlen($lm[0]);
                $value = '';
                while (true) {
                    if ($pos >= $len) {
                        return null;
                    }
                    $ch = $line[$pos];
                    if ($ch === '\\' && $pos + 1 < $len) {
                        $next = $line[$pos + 1];
                        $value .= match ($next) {
                            'n' => "\n",
                            '"' => '"',
                            '\\' => '\\',
                            default => '\\' . $next,
                        };
                        $pos += 2;
                        continue;
                    }
                    if ($ch === '"') {
                        ++$pos;
                        break;
                    }
                    $value .= $ch;
                    ++$pos;
                }
                $labels[$key] = $value;
            }
        }

        $rest = trim(substr($line, $pos));
        if ($rest === '') {
            return null;
        }
        // "<value> [timestamp]" and optional exemplar after '#'.
        $hash = strpos($rest, '#');
        if ($hash !== false) {
            $rest = trim(substr($rest, 0, $hash));
        }
        $parts = preg_split('/\s+/', $rest) ?: [];
        $raw = $parts[0] ?? '';
        $value = self::parseValue($raw);
        if ($value === null) {
            return null;
        }

        return [$name, $labels, $value];
    }

    public static function parseValue(string $raw): ?float
    {
        $lower = strtolower($raw);

        return match ($lower) {
            '+inf', 'inf' => INF,
            '-inf' => -INF,
            'nan' => NAN,
            default => is_numeric($raw) ? (float) $raw : null,
        };
    }

    public function count(): int
    {
        return $this->count;
    }

    public function has(string $name): bool
    {
        return isset($this->samples[$name]);
    }

    /**
     * Whether any series starts with the given prefix (e.g. "featherwings_").
     */
    public function hasPrefix(string $prefix): bool
    {
        foreach (array_keys($this->samples) as $name) {
            if (str_starts_with($name, $prefix)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param array<string, string> $match labels that must be equal
     *
     * @return list<array{labels: array<string, string>, value: float}>
     */
    public function samples(string $name, array $match = []): array
    {
        $out = [];
        foreach ($this->samples[$name] ?? [] as $sample) {
            foreach ($match as $key => $value) {
                if (($sample['labels'][$key] ?? null) !== $value) {
                    continue 2;
                }
            }
            $out[] = $sample;
        }

        return $out;
    }

    /**
     * First matching value, or null when the series is missing.
     *
     * @param array<string, string> $match
     */
    public function value(string $name, array $match = []): ?float
    {
        $samples = $this->samples($name, $match);
        if ($samples === []) {
            return null;
        }
        $value = $samples[0]['value'];

        return is_finite($value) ? $value : null;
    }

    /**
     * Sum of every matching sample, or null when the series is missing.
     *
     * @param array<string, string> $match
     */
    public function sum(string $name, array $match = []): ?float
    {
        $samples = $this->samples($name, $match);
        if ($samples === []) {
            return null;
        }
        $sum = 0.0;
        foreach ($samples as $sample) {
            if (is_finite($sample['value'])) {
                $sum += $sample['value'];
            }
        }

        return $sum;
    }

    /**
     * Sum grouped by one label.
     *
     * @param array<string, string> $match
     *
     * @return array<string, float>
     */
    public function sumBy(string $name, string $label, array $match = []): array
    {
        $out = [];
        foreach ($this->samples($name, $match) as $sample) {
            $key = $sample['labels'][$label] ?? '';
            if (!is_finite($sample['value'])) {
                continue;
            }
            $out[$key] = ($out[$key] ?? 0.0) + $sample['value'];
        }

        return $out;
    }
}
