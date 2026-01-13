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

namespace App\Cli\Utils;

class MinecraftColorCodeSupport
{
    public static function Black(): string
    {
        return "\033[0;30m";
    }

    public static function DarkBlue(): string
    {
        return "\033[0;34m";
    }

    public static function DarkGreen(): string
    {
        return "\033[0;32m";
    }

    public static function DarkAqua(): string
    {
        return "\033[0;36m";
    }

    public static function DarkRed(): string
    {
        return "\033[0;31m";
    }

    public static function DarkPurple(): string
    {
        return "\033[0;35m";
    }

    public static function Gold(): string
    {
        return "\033[0;33m";
    }

    public static function Gray(): string
    {
        return "\033[0;37m";
    }

    public static function DarkGray(): string
    {
        return "\033[1;30m";
    }

    public static function Blue(): string
    {
        return "\033[1;34m";
    }

    public static function Green(): string
    {
        return "\033[1;32m";
    }

    public static function Aqua(): string
    {
        return "\033[1;36m";
    }

    public static function Red(): string
    {
        return "\033[1;31m";
    }

    public static function LightPurple(): string
    {
        return "\033[1;35m";
    }

    public static function Yellow(): string
    {
        return "\033[1;33m";
    }

    public static function White(): string
    {
        return "\033[1;37m";
    }

    public static function Reset(): string
    {
        return "\033[0m";
    }

    public static function Bold(): string
    {
        return "\033[1m";
    }

    public static function Strike(): string
    {
        return "\033[9m";
    }

    public static function Underline(): string
    {
        return "\033[4m";
    }

    public static function NewLine(): string
    {
        return "\n";
    }

    /**
     * Send a message to the console.
     *
     * @param string $message The message to send
     *
     * @return string The message to send
     */
    public static function sendOutput(string $message): void
    {
        $pattern = '/&([0-9a-fklmnor])/i';
        $translatedMessage = preg_replace_callback($pattern, function ($matches) {
            return self::getColorCode($matches[1]);
        }, $message);
        echo $translatedMessage;
    }

    /**
     * Send a message to the console.
     *
     * @param string $message The message to send
     *
     * @return string The message to send
     */
    public static function sendOutputWithNewLine(string $message, bool $stripColors = false, bool $stripClean = false): void
    {
        $pattern = '/&([0-9a-fklmnor])/i';
        $translatedMessage = preg_replace_callback($pattern, function ($matches) use ($stripColors) {
            if ($stripColors) {
                return '';
            }

            return self::getColorCode($matches[1]);
        }, $message);

        if ($stripClean) {
            // Allow only basic keyboard printable characters and whitespace
            $translatedMessage = preg_replace('/[^a-zA-Z0-9\s\.\,\_\-\!\?\:\;\@\#\$\%\^\&\*\(\)\[\]\{\}\<\>\=\+\/\\\\\|\~\`\'\"\§]/u', '', $translatedMessage);
        }

        echo $translatedMessage . self::NewLine();
    }

    /**
     * Get the output as a string.
     *
     * @param string $message The message to get
     *
     * @return string The message to get
     */
    public static function getOutputAsString(string $message): string
    {
        $pattern = '/&([0-9a-fklmnor])/i';
        $translatedMessage = preg_replace_callback($pattern, function ($matches) {
            return self::getColorCode($matches[1]);
        }, $message);

        return $translatedMessage;
    }

    /**
     * Get the output as a string.
     *
     * @return string The message to get
     */
    private static function getColorCode(string $colorCode): string
    {
        switch ($colorCode) {
            case '0':
                return self::Black();
            case '1':
                return self::DarkBlue();
            case '2':
                return self::DarkGreen();
            case '3':
                return self::DarkAqua();
            case '4':
                return self::DarkRed();
            case '5':
                return self::DarkPurple();
            case '6':
                return self::Gold();
            case '7':
                return self::Gray();
            case '8':
                return self::DarkGray();
            case '9':
                return self::Blue();
            case 'a':
                return self::Green();
            case 'b':
                return self::Aqua();
            case 'c':
                return self::Red();
            case 'd':
                return self::LightPurple();
            case 'e':
                return self::Yellow();
            case 'f':
                return self::White();
            case 'k':
                return self::Strike();
            case 'l':
                return self::Bold();
            case 'm':
                return self::Strike();
            case 'n':
                return self::Underline();
            case 'r':
                return self::Reset();
            default:
                return '';
        }
    }
}
