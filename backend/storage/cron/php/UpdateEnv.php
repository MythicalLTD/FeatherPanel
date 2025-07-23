<?php

namespace App\Cron;

use App\Config\ConfigFactory;
use App\Config\ConfigInterface;
use App\Cron\Cron;
use App\Cron\TimeTask;
use PDO;

class UpdateEnv implements TimeTask
{

	public function run()
	{
		$cron = new Cron('update-env', '1H');
		try {
			$cron->runIfDue(function () {
				$app = \App\App::getInstance(false, true);
				$db = $app->getDatabase()->getPdo();
				$config = new ConfigFactory($db);

				$settings = [
					ConfigInterface::FIREWALL_ENABLED => 'false',
					ConfigInterface::FIREWALL_RATE_LIMIT => '100',
					ConfigInterface::FIREWALL_BLOCK_VPN => 'false',
					ConfigInterface::MYTHICAL_ZERO_TRUST_ENABLED => 'false',
					ConfigInterface::MYTHICAL_ZERO_TRUST_SERVER_SCAN_TOOL_ENABLED => 'false',
					ConfigInterface::MYTHICAL_ZERO_TRUST_WHITELIST_IPS_ENABLED => 'false',
					ConfigInterface::MYTHICAL_ZERO_TRUST_BLOCK_TOR_ENABLED => 'false',
					ConfigInterface::MYTHICAL_ZERO_TRUST_ENHANCED_LOGGING_ENABLED => 'false',
					ConfigInterface::DAILY_BACKUP_ENABLED => 'false'
				];

				foreach ($settings as $key => $value) {
					$config->setSetting($key, $value);
					$app->updateEnvValue($key, $value, false);
				}

				// Log results
			});
		} catch (\Exception $e) {
			$app = \App\App::getInstance(false, true);
			$app->getLogger()->error('Failed to update env values: ' . $e->getMessage());
		}
	}
}