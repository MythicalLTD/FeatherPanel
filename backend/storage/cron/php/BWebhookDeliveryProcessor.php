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

use App\App;
use App\Services\Webhooks\WebhookStore;
use App\Cli\Utils\MinecraftColorCodeSupport;
use App\Services\Webhooks\WebhookDeliveryProcessor;

/**
 * BWebhookDeliveryProcessor - sends queued admin webhook deliveries on every cron run
 * (retries with backoff) and drops finished deliveries older than 30 days once a day.
 */
class BWebhookDeliveryProcessor implements TimeTask
{
    public function run()
    {
        try {
            $stats = WebhookDeliveryProcessor::processDue();
            if ($stats['processed'] > 0) {
                MinecraftColorCodeSupport::sendOutputWithNewLine('&aWebhooks: sent ' . $stats['processed'] . ', delivered ' . $stats['delivered'] . ', retrying ' . $stats['retrying'] . ', failed ' . $stats['failed']);
            }
        } catch (\Throwable $e) {
            App::getInstance(false, true)->getLogger()->error('Failed to process webhook deliveries: ' . $e->getMessage());
        }

        try {
            (new Cron('webhook-deliveries-prune', '1D'))->runIfDue(function () {
                $removed = WebhookStore::prune(30);
                MinecraftColorCodeSupport::sendOutputWithNewLine('&aWebhooks: pruned ' . $removed . ' old deliveries');
            }, getenv('FP_CRON_FORCE') === '1');
        } catch (\Throwable $e) {
            App::getInstance(false, true)->getLogger()->error('Failed to prune webhook deliveries: ' . $e->getMessage());
        }
    }
}
