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

use App\Chat\User;
use App\Chat\MailList;
use App\Chat\MailQueue;
use App\Chat\TimedTask;
use App\Helpers\LogHelper;
use App\Config\ConfigFactory;
use App\Logger\LoggerFactory;
use App\Config\ConfigInterface;
use App\Cli\Utils\MinecraftColorCodeSupport;

class AMailSender implements TimeTask
{
    /**
     * Entry point for the cron mail sender.
     */
    public function run()
    {
        $cron = new Cron('mail-sender', '1M');
        $force = getenv('FP_CRON_FORCE') === '1';
        try {
            $cron->runIfDue(function () {
                $this->sendMails();
                TimedTask::markRun('mail-sender', true, 'Mail sender heartbeat');
            }, $force);
        } catch (\Exception $e) {
            $app = \App\App::getInstance(false, true);
            $app->getLogger()->error('Failed to send mail: ' . $e->getMessage());
            $this->mailLog('error', 'Cron failed: ' . $e->getMessage());
            TimedTask::markRun('mail-sender', false, $e->getMessage());
        }
    }

    private function getMailLogger(): LoggerFactory
    {
        return new LoggerFactory(LogHelper::getLogFilePath('mail'));
    }

    /**
     * Log to the dedicated mail log (and app log for errors) for easy debugging when mails fail.
     */
    private function mailLog(string $level, string $message, array $context = []): void
    {
        $logger = $this->getMailLogger();
        $parts = ['[MAIL]', $message];
        if (!empty($context)) {
            $parts[] = json_encode($context);
        }
        $line = implode(' ', $parts);
        if ($level === 'error') {
            $logger->error($line);
            \App\App::getInstance(false, true)->getLogger()->error($line);
        } elseif ($level === 'warning') {
            $logger->warning($line);
        } else {
            $logger->info($line);
        }
    }

    /**
     * Process and send all pending mails in the queue.
     */
    private function sendMails()
    {
        $app = \App\App::getInstance(false, true);
        $config = new ConfigFactory($app->getDatabase()->getPdo());
        $mailEnabled = $config->getSetting(ConfigInterface::SMTP_ENABLED, 'false');
        if ($mailEnabled == 'false') {
            $this->mailLog('info', 'Mail sending skipped: SMTP disabled');
            MinecraftColorCodeSupport::sendOutputWithNewLine('&cMail is disabled, skipping mail sending');

            return;
        }

        // Only process mails with status 'pending' and not locked
        $mailQueue = array_filter(MailQueue::getPending(), function ($mail) {
            return ($mail['status'] ?? 'pending') === 'pending' && ($mail['locked'] ?? 'false') === 'false';
        });
        $count = count($mailQueue);
        $this->mailLog('info', "Processing queue: {$count} pending mail(s)");
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aFound ' . $count . ' mails to process');

        foreach ($mailQueue as $mail) {
            MailQueue::update($mail['id'], ['locked' => 'true']);
            $mailInfo = MailList::getById($mail['id']);
            if (!$mailInfo) {
                $this->mailLog('error', 'MailList entry not found', ['queue_id' => $mail['id'], 'subject' => $mail['subject'] ?? '']);
                MailQueue::update($mail['id'], ['status' => 'failed', 'locked' => 'false']);
                continue;
            }
            $userInfo = User::getUserByUuid($mailInfo['user_uuid']);
            if (!$userInfo || empty($userInfo['email']) || !filter_var($userInfo['email'], FILTER_VALIDATE_EMAIL)) {
                $this->mailLog('error', 'Invalid or missing user/email', ['queue_id' => $mail['id'], 'subject' => $mail['subject'] ?? '']);
                MailQueue::update($mail['id'], ['status' => 'failed', 'locked' => 'false']);
                continue;
            }
            $this->sendMail($mail, $mailInfo, $userInfo);
        }
    }

    /**
     * Send a single mail and update status accordingly.
     * Retries up to 3 times on failure.
     */
    private function sendMail(array $mail, array $mailInfo, array $userInfo)
    {
        $app = \App\App::getInstance(false, true);
        $config = new ConfigFactory($app->getDatabase()->getPdo());
        if ($config->getSetting(ConfigInterface::SMTP_ENABLED, 'false') == 'false') {
            return;
        }

        $to = $userInfo['email'];
        $subject = $mail['subject'] ?? '(no subject)';

        // Validate SMTP config once before retries
        if ($config->getSetting(ConfigInterface::SMTP_HOST, null) == null) {
            $this->mailLog('error', 'SMTP host not set', ['queue_id' => $mail['id'], 'to' => $to, 'subject' => $subject]);
            MailQueue::update($mail['id'], ['status' => 'failed', 'locked' => 'false']);

            return;
        }
        if ($config->getSetting(ConfigInterface::SMTP_USER, null) == null) {
            $this->mailLog('error', 'SMTP user not set', ['queue_id' => $mail['id'], 'to' => $to, 'subject' => $subject]);
            MailQueue::update($mail['id'], ['status' => 'failed', 'locked' => 'false']);

            return;
        }
        if ($config->getSetting(ConfigInterface::SMTP_FROM, null) == null) {
            $this->mailLog('error', 'SMTP from not set', ['queue_id' => $mail['id'], 'to' => $to, 'subject' => $subject]);
            MailQueue::update($mail['id'], ['status' => 'failed', 'locked' => 'false']);

            return;
        }

        $maxRetries = 3;
        $attempt = 0;
        $success = false;
        $lastError = '';
        while ($attempt < $maxRetries && !$success) {
            ++$attempt;
            $this->mailLog('info', "Attempt {$attempt}/{$maxRetries}", ['queue_id' => $mail['id'], 'to' => $to, 'subject' => $subject]);
            MinecraftColorCodeSupport::sendOutputWithNewLine("&aAttempt {$attempt}/{$maxRetries}: sending to &e{$to}");
            try {
                $mailObj = new \PHPMailer\PHPMailer\PHPMailer(false);
                $mailObj->isSMTP();
                $mailObj->Host = $config->getSetting(ConfigInterface::SMTP_HOST, null);
                $mailObj->SMTPAuth = true;
                $mailObj->Username = $config->getSetting(ConfigInterface::SMTP_USER, null);
                $mailObj->Password = $config->getSetting(ConfigInterface::SMTP_PASS, null);
                $mailObj->SMTPSecure = $config->getSetting(ConfigInterface::SMTP_ENCRYPTION, 'tls');
                $mailObj->Port = $config->getSetting(ConfigInterface::SMTP_PORT, '587');
                $mailObj->setFrom($config->getSetting(ConfigInterface::SMTP_FROM, null), $config->getSetting(ConfigInterface::APP_NAME, null));
                $mailObj->addReplyTo($config->getSetting(ConfigInterface::SMTP_FROM, null), $config->getSetting(ConfigInterface::APP_NAME, null));
                $mailObj->isHTML(true);
                $mailObj->FromName = $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel');
                $mailObj->Subject = $mail['subject'];
                $mailObj->Body = $mail['body'];
                $mailObj->Encoding = 'base64';
                $mailObj->CharSet = 'UTF-8';
                $mailObj->addAddress($userInfo['email']);
                $mailObj->send();
                $success = true;
                MailQueue::update($mail['id'], ['status' => 'sent', 'locked' => 'false']);
                $this->mailLog('info', 'Sent', ['queue_id' => $mail['id'], 'to' => $to, 'subject' => $subject]);
                MinecraftColorCodeSupport::sendOutputWithNewLine('&aMail sent to &e' . $to);
            } catch (\Exception $e) {
                $lastError = $e->getMessage();
                $this->mailLog('error', 'Send failed: ' . $lastError, ['queue_id' => $mail['id'], 'to' => $to, 'subject' => $subject, 'attempt' => $attempt]);
                MinecraftColorCodeSupport::sendOutputWithNewLine('&cAttempt ' . $attempt . ' failed: ' . $lastError);
                if ($attempt < $maxRetries) {
                    sleep(2);
                }
            }
        }
        if (!$success) {
            MailQueue::update($mail['id'], ['status' => 'failed', 'locked' => 'false']);
            $this->mailLog('error', 'Gave up after ' . $maxRetries . ' attempts', ['queue_id' => $mail['id'], 'to' => $to, 'subject' => $subject, 'last_error' => $lastError]);
        }
    }
}
