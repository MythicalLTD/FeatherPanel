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

namespace App\Helpers;

use App\App;

/**
 * LDAP authentication helper.
 */
class LdapAuthenticator
{
	private $connection;
	private array $config;
	private ?string $lastError = null;

	public function __construct(array $config)
	{
		$this->config = $config;
	}

	/**
	 * Connect to LDAP server.
	 */
	public function connect(): bool
	{
		if (!extension_loaded('ldap')) {
			$this->lastError = 'LDAP extension is not loaded';
			return false;
		}

		$protocol = 'ldap://';
		if (($this->config['use_ssl'] ?? 'false') === 'true') {
			$protocol = 'ldaps://';
		}

		$host = $protocol . $this->config['host'];
		$port = (int) ($this->config['port'] ?? 389);

		$this->connection = @ldap_connect($host, $port);

		if (!$this->connection) {
			$this->lastError = 'Failed to connect to LDAP server';
			return false;
		}

		// Set LDAP options
		ldap_set_option($this->connection, LDAP_OPT_PROTOCOL_VERSION, 3);
		ldap_set_option($this->connection, LDAP_OPT_REFERRALS, 0);
		ldap_set_option($this->connection, LDAP_OPT_NETWORK_TIMEOUT, 10);

		// Enable TLS if configured
		if (($this->config['use_tls'] ?? 'false') === 'true' && ($this->config['use_ssl'] ?? 'false') !== 'true') {
			if (!@ldap_start_tls($this->connection)) {
				$this->lastError = 'Failed to start TLS: ' . ldap_error($this->connection);
				return false;
			}
		}

		return true;
	}

	/**
	 * Authenticate user against LDAP.
	 */
	public function authenticate(string $username, string $password): ?array
	{
		if (!$this->connect()) {
			return null;
		}

		try {
			// Bind with service account if configured
			if (!empty($this->config['bind_dn']) && !empty($this->config['bind_password'])) {
				$app = App::getInstance(true);
				$bindPassword = $app->decryptValue($this->config['bind_password']);

				if (!@ldap_bind($this->connection, $this->config['bind_dn'], $bindPassword)) {
					$this->lastError = 'Service account bind failed: ' . ldap_error($this->connection);
					return null;
				}
			} else {
				// Anonymous bind
				if (!@ldap_bind($this->connection)) {
					$this->lastError = 'Anonymous bind failed: ' . ldap_error($this->connection);
					return null;
				}
			}

			// Search for user
			$userFilter = str_replace('{username}', ldap_escape($username, '', LDAP_ESCAPE_FILTER), $this->config['user_filter']);
			$baseDn = $this->config['base_dn'];

			$usernameAttr = $this->config['username_attribute'] ?? 'uid';
			$emailAttr = $this->config['email_attribute'] ?? 'mail';
			$firstNameAttr = $this->config['first_name_attribute'] ?? 'givenName';
			$lastNameAttr = $this->config['last_name_attribute'] ?? 'sn';

			$attributes = ['dn', $usernameAttr, $emailAttr];
			if (!empty($firstNameAttr)) {
				$attributes[] = $firstNameAttr;
			}
			if (!empty($lastNameAttr)) {
				$attributes[] = $lastNameAttr;
			}
			if (!empty($this->config['group_attribute'])) {
				$attributes[] = $this->config['group_attribute'];
			}

			$search = @ldap_search($this->connection, $baseDn, $userFilter, $attributes);

			if (!$search) {
				$this->lastError = 'User search failed: ' . ldap_error($this->connection);
				return null;
			}

			$entries = ldap_get_entries($this->connection, $search);

			if ($entries['count'] === 0) {
				$this->lastError = 'User not found in LDAP directory';
				return null;
			}

			if ($entries['count'] > 1) {
				$this->lastError = 'Multiple users found with same username';
				return null;
			}

			$entry = $entries[0];
			$userDn = $entry['dn'];

			// Check group membership if required
			if (!empty($this->config['required_group'])) {
				$groupAttr = $this->config['group_attribute'] ?? 'memberOf';
				$userGroups = [];

				if (isset($entry[strtolower($groupAttr)])) {
					$groupData = $entry[strtolower($groupAttr)];
					$count = $groupData['count'] ?? 0;
					for ($i = 0; $i < $count; $i++) {
						$userGroups[] = $groupData[$i];
					}
				}

				$requiredGroup = $this->config['required_group'];
				$hasRequiredGroup = false;

				foreach ($userGroups as $group) {
					if (stripos($group, $requiredGroup) !== false) {
						$hasRequiredGroup = true;
						break;
					}
				}

				if (!$hasRequiredGroup) {
					$this->lastError = 'User is not a member of required group';
					return null;
				}
			}

			// Authenticate user with their password
			if (!@ldap_bind($this->connection, $userDn, $password)) {
				$this->lastError = 'Invalid password';
				return null;
			}

			// Extract user attributes
			$userData = [
				'dn' => $userDn,
				'username' => $this->getAttributeValue($entry, $usernameAttr),
				'email' => $this->getAttributeValue($entry, $emailAttr),
			];

			if (!empty($firstNameAttr)) {
				$userData['first_name'] = $this->getAttributeValue($entry, $firstNameAttr);
			}
			if (!empty($lastNameAttr)) {
				$userData['last_name'] = $this->getAttributeValue($entry, $lastNameAttr);
			}

			// Generate email if missing and option is enabled
			if (empty($userData['email']) && ($this->config['generate_email_if_missing'] ?? 'false') === 'true') {
				$app = App::getInstance(true);
				$panelUrl = $app->getConfig()->getSetting(\App\Config\ConfigInterface::APP_URL, 'localhost');
				// Extract domain from panel URL
				$domain = parse_url($panelUrl, PHP_URL_HOST) ?? 'localhost';
				$userData['email'] = $userData['username'] . '@' . $domain;
				$app->getLogger()->info('LDAP: Generated email for user ' . $userData['username'] . ' as ' . $userData['email']);
			}

			// Debug logging
			$app = App::getInstance(true);
			$app->getLogger()->debug('LDAP: User authenticated successfully. Username: ' . $userData['username'] . ', Email: ' . ($userData['email'] ?? 'null') . ', DN: ' . $userDn);

			return $userData;

		} finally {
			if ($this->connection) {
				@ldap_unbind($this->connection);
			}
		}
	}

	/**
	 * Test connection to LDAP server.
	 */
	public function testConnection(): bool
	{
		if (!$this->connect()) {
			return false;
		}

		try {
			// Try to bind
			if (!empty($this->config['bind_dn']) && !empty($this->config['bind_password'])) {
				$app = App::getInstance(true);
				$bindPassword = $app->decryptValue($this->config['bind_password']);

				if (!@ldap_bind($this->connection, $this->config['bind_dn'], $bindPassword)) {
					$this->lastError = 'Bind failed: ' . ldap_error($this->connection);
					return false;
				}
			} else {
				if (!@ldap_bind($this->connection)) {
					$this->lastError = 'Anonymous bind failed: ' . ldap_error($this->connection);
					return false;
				}
			}

			// Try to read base DN
			$search = @ldap_read($this->connection, $this->config['base_dn'], '(objectClass=*)', ['dn']);
			if (!$search) {
				$this->lastError = 'Cannot read base DN: ' . ldap_error($this->connection);
				return false;
			}

			return true;

		} finally {
			if ($this->connection) {
				@ldap_unbind($this->connection);
			}
		}
	}

	/**
	 * Get attribute value from LDAP entry.
	 */
	private function getAttributeValue(array $entry, string $attribute): ?string
	{
		$attrLower = strtolower($attribute);
		if (isset($entry[$attrLower][0])) {
			return $entry[$attrLower][0];
		}
		return null;
	}

	/**
	 * Get last error message.
	 */
	public function getLastError(): ?string
	{
		return $this->lastError;
	}
}
