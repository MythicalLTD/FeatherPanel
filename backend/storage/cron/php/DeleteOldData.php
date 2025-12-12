<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
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
