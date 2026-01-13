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

namespace App\Services\Chatbot\Providers;

class BasicProvider implements ProviderInterface
{
    /**
     * Process a user message and generate a basic keyword-based response.
     *
     * @param string $message User's message
     * @param array $history Chat history (not used in basic provider)
     * @param string $systemPrompt Optional system prompt (not used in basic provider)
     *
     * @return array Response with 'response' and 'model' keys
     */
    public function processMessage(string $message, array $history, string $systemPrompt = ''): array
    {
        $lowerMessage = strtolower($message);

        if (strpos($lowerMessage, 'hello') !== false || strpos($lowerMessage, 'hi') !== false) {
            return [
                'response' => "Hello! I'm your AI assistant for FeatherPanel. How can I help you today?",
                'model' => 'FeatherPanel AI',
            ];
        }

        if (strpos($lowerMessage, 'help') !== false) {
            return [
                'response' => "I can help you with various FeatherPanel tasks:\n\n" .
                    "• Server management\n" .
                    "• Configuration questions\n" .
                    "• General panel information\n" .
                    "• Troubleshooting\n\n" .
                    'What would you like to know?',
                'model' => 'FeatherPanel AI',
            ];
        }

        if (strpos($lowerMessage, 'server') !== false) {
            return [
                'response' => "I can help you with server-related tasks. You can:\n\n" .
                    "• View server status\n" .
                    "• Manage server files\n" .
                    "• Control server power (start/stop/restart)\n" .
                    "• View server console\n" .
                    "• Manage databases\n\n" .
                    'What specific server task do you need help with?',
                'model' => 'FeatherPanel AI',
            ];
        }

        if (strpos($lowerMessage, 'thank') !== false) {
            return [
                'response' => "You're welcome! Is there anything else I can help you with?",
                'model' => 'FeatherPanel AI',
            ];
        }

        return [
            'response' => "I understand you're asking about: " . $message . "\n\n" .
                "I'm a basic assistant. For more advanced responses, please configure Google Gemini, OpenRouter, or OpenAI in admin settings.",
            'model' => 'FeatherPanel AI',
        ];
    }
}
