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

use App\Chat\User;
use App\Chat\MailList;
use App\Chat\MailQueue;
use App\Chat\TimedTask;
use App\Config\ConfigFactory;
use App\Config\ConfigInterface;
use App\Cli\Utils\MinecraftColorCodeSupport;

class MailSender implements TimeTask
{
    /**
     * Entry point for the cron mail sender.
     */
    public function run()
    {
        $cron = new Cron('mail-sender', '1M');
        try {
            $this->sendMails();
            TimedTask::markRun('mail-sender', true, 'Mail sender heartbeat');
        } catch (\Exception $e) {
            $app = \App\App::getInstance(false, true);
            $app->getLogger()->error('Failed to send mail: ' . $e->getMessage());
            TimedTask::markRun('mail-sender', false, $e->getMessage());
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
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aSending mails: ' . $mailEnabled);
        if ($mailEnabled == 'false') {
            MinecraftColorCodeSupport::sendOutputWithNewLine('&cMail is disabled, skipping mail sending: ' . $mailEnabled);

            return;
        }

        MinecraftColorCodeSupport::sendOutputWithNewLine('&aProcessing mails');
        // Only process mails with status 'pending' and not locked
        $mailQueue = array_filter(MailQueue::getPending(), function ($mail) {
            MinecraftColorCodeSupport::sendOutputWithNewLine('&aProcessing mail: ' . $mail['id']);

            return ($mail['status'] ?? 'pending') === 'pending' && ($mail['locked'] ?? 'false') === 'false';
        });
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aFound ' . count($mailQueue) . ' mails to process');

        MinecraftColorCodeSupport::sendOutputWithNewLine('&aProcessing mails');
        foreach ($mailQueue as $mail) {
            MinecraftColorCodeSupport::sendOutputWithNewLine('&aProcessing mail: ' . $mail['id']);
            // Lock the mail queue item to avoid duplicate processing
            MailQueue::update($mail['id'], ['locked' => 'true']);
            $mailInfo = MailList::getById($mail['id']);
            if (!$mailInfo) {
                MinecraftColorCodeSupport::sendOutputWithNewLine('&cMailList entry not found for queue id: ' . $mail['id']);
                MailQueue::update($mail['id'], ['status' => 'failed', 'locked' => 'false']);
                continue;
            }
            MinecraftColorCodeSupport::sendOutputWithNewLine('&aFound mailInfo: ' . $mailInfo['id']);
            $userInfo = User::getUserByUuid($mailInfo['user_uuid']);
            if (!$userInfo || empty($userInfo['email']) || !filter_var($userInfo['email'], FILTER_VALIDATE_EMAIL)) {
                $app->getLogger()->error('Invalid or missing user/email for mail queue id: ' . $mail['id']);
                MailQueue::update($mail['id'], ['status' => 'failed', 'locked' => 'false']);
                MinecraftColorCodeSupport::sendOutputWithNewLine('&cInvalid or missing user/email for mail queue id: ' . $mail['id']);
                MailQueue::update($mail['id'], ['status' => 'failed', 'locked' => 'false']);
                continue;
            }
            MinecraftColorCodeSupport::sendOutputWithNewLine('&aFound userInfo: ' . $userInfo['email']);
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
        $mailEnabled = $config->getSetting(ConfigInterface::SMTP_ENABLED, 'false');
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aMail enabled: ' . $mailEnabled);

        if ($mailEnabled == 'false') {
            MinecraftColorCodeSupport::sendOutputWithNewLine('&cMail is disabled, skipping mail sending: ' . $mailEnabled);

            return;
        }
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aSending mail to &e' . $userInfo['email']);

        $maxRetries = 3;
        $attempt = 0;
        $success = false;
        $lastError = '';
        while ($attempt < $maxRetries && !$success) {
            MinecraftColorCodeSupport::sendOutputWithNewLine('&aAttempting to send mail to &e' . $userInfo['email'] . " (Attempt $attempt/$maxRetries)");
            ++$attempt;
            try {
                MinecraftColorCodeSupport::sendOutputWithNewLine('&aSending mail to &e' . $userInfo['email'] . " (Attempt $attempt/$maxRetries)");
                if ($config->getSetting(ConfigInterface::SMTP_HOST, null) == null) {
                    MinecraftColorCodeSupport::sendOutputWithNewLine('&cSMTP host is not set, skipping mail sending');
                    MailQueue::update($mail['id'], ['status' => 'failed', 'locked' => 'false']);

                    return;
                }
                if ($config->getSetting(ConfigInterface::SMTP_USER, null) == null) {
                    MinecraftColorCodeSupport::sendOutputWithNewLine('&cSMTP user is not set, skipping mail sending');
                    MailQueue::update($mail['id'], ['status' => 'failed', 'locked' => 'false']);

                    return;
                }
                if ($config->getSetting(ConfigInterface::SMTP_PORT, null) == null) {
                    MinecraftColorCodeSupport::sendOutputWithNewLine('&cSMTP port is not set, skipping mail sending');
                    MailQueue::update($mail['id'], ['status' => 'failed', 'locked' => 'false']);

                    return;
                }
                if ($config->getSetting(ConfigInterface::SMTP_FROM, null) == null) {
                    MinecraftColorCodeSupport::sendOutputWithNewLine('&cSMTP from is not set, skipping mail sending');
                    MailQueue::update($mail['id'], ['status' => 'failed', 'locked' => 'false']);

                    return;
                }
                if ($config->getSetting(ConfigInterface::SMTP_ENCRYPTION, null) == null) {
                    MinecraftColorCodeSupport::sendOutputWithNewLine('&cSMTP encryption is not set, skipping mail sending');
                    MailQueue::update($mail['id'], ['status' => 'failed', 'locked' => 'false']);

                    return;
                }
                if ($config->getSetting(ConfigInterface::SMTP_FROM, null) == null) {
                    MinecraftColorCodeSupport::sendOutputWithNewLine('&cSMTP from is not set, skipping mail sending');
                    MailQueue::update($mail['id'], ['status' => 'failed', 'locked' => 'false']);

                    return;
                }
                if ($config->getSetting(ConfigInterface::SMTP_FROM, null) == null) {
                    MinecraftColorCodeSupport::sendOutputWithNewLine('&cSMTP from is not set, skipping mail sending');
                    MailQueue::update($mail['id'], ['status' => 'failed', 'locked' => 'false']);

                    return;
                }

                $mailObj = new \PHPMailer\PHPMailer\PHPMailer(false);
                $mailObj->isSMTP();
                $mailObj->Host = $config->getSetting(ConfigInterface::SMTP_HOST, null);
                $mailObj->SMTPAuth = true;
                $mailObj->Username = $config->getSetting(ConfigInterface::SMTP_USER, null);
                $mailObj->Password = $config->getSetting(ConfigInterface::SMTP_PASS, null);
                $mailObj->SMTPSecure = $config->getSetting(ConfigInterface::SMTP_ENCRYPTION, 'ssl');
                $mailObj->Port = $config->getSetting(ConfigInterface::SMTP_PORT, null);
                $mailObj->setFrom($config->getSetting(ConfigInterface::SMTP_FROM, null), $config->getSetting(ConfigInterface::APP_NAME, null));
                $mailObj->addReplyTo($config->getSetting(ConfigInterface::SMTP_FROM, null), $config->getSetting(ConfigInterface::APP_NAME, null));
                $mailObj->isHTML(true);
                $mailObj->Name = $config->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel');
                $mailObj->Subject = $mail['subject'];
                $mailObj->Body = $mail['body'];
                $mailObj->Encoding = 'base64';
                $mailObj->CharSet = 'UTF-8';
                $mailObj->addAddress($userInfo['email']);
                $mailObj->send();
                $success = true;
                MailQueue::update($mail['id'], ['status' => 'sent', 'locked' => 'false']);
            } catch (\Exception $e) {
                $lastError = $e->getMessage();
                MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to send mail (attempt ' . $attempt . '): ' . $lastError);
                $app->getLogger()->error('Failed to send mail (attempt ' . $attempt . '): ' . $lastError);
                if ($attempt < $maxRetries) {
                    sleep(2); // Wait before retrying
                }
            }
        }
        if (!$success) {
            MailQueue::update($mail['id'], ['status' => 'failed', 'locked' => 'false']);
        }
    }
}
