<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
