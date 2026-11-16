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
 * Builder for the Prometheus text exposition format (version 0.0.4).
 */
final class PrometheusText
{
    public const CONTENT_TYPE = 'text/plain; version=0.0.4; charset=utf-8';

    /** @var array<string, array{type: string, help: string, samples: list<string>}> */
    private array $families = [];

    /**
     * Add one sample. The family (HELP/TYPE) is declared on first use.
     *
     * @param array<string, string|int|float> $labels
     */
    public function add(string $name, string $type, string $help, int | float $value, array $labels = [], string $suffix = ''): void
    {
        if (!isset($this->families[$name])) {
            $this->families[$name] = ['type' => $type, 'help' => $help, 'samples' => []];
        }
        $this->families[$name]['samples'][] = $name . $suffix . self::labels($labels) . ' ' . self::value($value);
    }

    public function gauge(string $name, string $help, int | float $value, array $labels = []): void
    {
        $this->add($name, 'gauge', $help, $value, $labels);
    }

    public function counter(string $name, string $help, int | float $value, array $labels = []): void
    {
        $this->add($name, 'counter', $help, $value, $labels);
    }

    /**
     * Add one histogram series from non-cumulative bucket counts.
     *
     * @param list<float> $bounds upper bounds, ascending
     * @param array<int, int> $bucketCounts index => count; index count($bounds) is +Inf
     * @param array<string, string> $labels
     */
    public function histogram(string $name, string $help, array $bounds, array $bucketCounts, float $sum, array $labels = []): void
    {
        $cumulative = 0;
        foreach ($bounds as $i => $bound) {
            $cumulative += (int) ($bucketCounts[$i] ?? 0);
            $this->add($name, 'histogram', $help, $cumulative, $labels + ['le' => self::value($bound)], '_bucket');
        }
        $cumulative += (int) ($bucketCounts[count($bounds)] ?? 0);
        $this->add($name, 'histogram', $help, $cumulative, $labels + ['le' => '+Inf'], '_bucket');
        $this->add($name, 'histogram', $help, $sum, $labels, '_sum');
        $this->add($name, 'histogram', $help, $cumulative, $labels, '_count');
    }

    public function render(): string
    {
        $out = '';
        foreach ($this->families as $name => $family) {
            $out .= '# HELP ' . $name . ' ' . str_replace(['\\', "\n"], ['\\\\', '\n'], $family['help']) . "\n";
            $out .= '# TYPE ' . $name . ' ' . $family['type'] . "\n";
            $out .= implode("\n", $family['samples']) . "\n";
        }

        return $out;
    }

    /**
     * @param array<string, string|int|float> $labels
     */
    public static function labels(array $labels): string
    {
        if ($labels === []) {
            return '';
        }
        $parts = [];
        foreach ($labels as $key => $value) {
            $parts[] = $key . '="' . self::escape((string) $value) . '"';
        }

        return '{' . implode(',', $parts) . '}';
    }

    public static function escape(string $value): string
    {
        return str_replace(['\\', '"', "\n"], ['\\\\', '\\"', '\n'], $value);
    }

    public static function value(int | float $value): string
    {
        if (is_int($value)) {
            return (string) $value;
        }
        if (is_nan($value)) {
            return 'NaN';
        }
        if (is_infinite($value)) {
            return $value > 0 ? '+Inf' : '-Inf';
        }
        if ($value == floor($value) && abs($value) < 1e15) {
            return (string) (int) $value;
        }

        return rtrim(rtrim(sprintf('%.6F', $value), '0'), '.');
    }
}
