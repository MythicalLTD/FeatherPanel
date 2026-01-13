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

namespace App\Cron;

/**
 * DeleteOldData - Cron task for cleaning up old data.
 *
 * This cron job runs every minute and handles:
 * - Deleting old/expired/used SSO tokens
 * - Hard deleting soft-deleted mail templates
 */

use App\App;
use App\Chat\SsoToken;
use App\Chat\MailTemplate;
use App\Cli\Utils\MinecraftColorCodeSupport;

class DeleteOldData implements TimeTask
{
    /**
     * Entry point for the cron DeleteOldData.
     */
    public function run()
    {
        $cron = new Cron('delete-old-data', '1M');
        try {
            $cron->runIfDue(function () {
                $this->processTask();
            });
        } catch (\Exception $e) {
            $app = App::getInstance(false, true);
            $app->getLogger()->error('Failed to process DeleteOldData: ' . $e->getMessage());
        }
    }

    /**
     * Process the main task logic.
     */
    private function processTask()
    {
        $app = App::getInstance(false, true);
        $logger = $app->getLogger();
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aProcessing DeleteOldData...');

        // Delete old SSO tokens (expired, used, or older than 7 days)
        try {
            $deletedTokens = SsoToken::deleteOldTokens(7);
            if ($deletedTokens > 0) {
                $logger->info('Deleted ' . $deletedTokens . ' old SSO token(s)');
                MinecraftColorCodeSupport::sendOutputWithNewLine('&aDeleted ' . $deletedTokens . ' old SSO token(s)');
            }
        } catch (\Exception $e) {
            $logger->error('Failed to delete old SSO tokens: ' . $e->getMessage());
            MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to delete old SSO tokens: ' . $e->getMessage());
        }

        // Hard delete soft-deleted mail templates
        try {
            $deletedTemplates = MailTemplate::deleteSoftDeletedTemplates();
            if ($deletedTemplates > 0) {
                $logger->info('Hard deleted ' . $deletedTemplates . ' soft-deleted mail template(s)');
                MinecraftColorCodeSupport::sendOutputWithNewLine('&aHard deleted ' . $deletedTemplates . ' soft-deleted mail template(s)');
            }
        } catch (\Exception $e) {
            $logger->error('Failed to delete soft-deleted mail templates: ' . $e->getMessage());
            MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to delete soft-deleted mail templates: ' . $e->getMessage());
        }

        MinecraftColorCodeSupport::sendOutputWithNewLine('&aDeleteOldData completed successfully');
    }
}
