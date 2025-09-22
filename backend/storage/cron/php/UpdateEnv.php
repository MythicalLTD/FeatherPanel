<?php

namespace App\Cron;

use App\Config\ConfigFactory;
use App\Config\ConfigInterface;
use App\Cron\Cron;
use App\Cron\TimeTask;
use App\Chat\TimedTask;
use PDO;

class UpdateEnv implements TimeTask
{

	public function run()
	{
		$cron = new Cron('update-env', '1H');
		try {
			$cron->runIfDue(function () {
				// Heartbeat
				TimedTask::markRun('update-env', true, 'UpdateEnv heartbeat');
			});
		} catch (\Exception $e) {
			$app = \App\App::getInstance(false, true);
			$app->getLogger()->error('Failed to update env values: ' . $e->getMessage());
			TimedTask::markRun('update-env', false, $e->getMessage());
		}
	}
}