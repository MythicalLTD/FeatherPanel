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

namespace App\Services\Chatbot\Tools;

/**
 * Interface for chatbot tools.
 */
interface ToolInterface
{
    /**
     * Execute the tool.
     *
     * @param array $params Tool parameters
     * @param array $user Current user data
     * @param array $pageContext Page context
     *
     * @return mixed Tool execution result
     */
    public function execute(array $params, array $user, array $pageContext = []): mixed;

    /**
     * Get tool description.
     *
     * @return string Tool description
     */
    public function getDescription(): string;

    /**
     * Get tool parameters description.
     *
     * @return array Parameter descriptions ['param_name' => 'description', ...]
     */
    public function getParameters(): array;
}
