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

namespace App\Cli\Commands;

use App\Cli\App;
use App\Chat\User;
use App\Chat\Database;
use App\Config\ConfigInterface;
use App\Helpers\UUIDUtils;
use App\Cli\CommandBuilder;
use App\Config\ConfigFactory;

class Saas extends App implements CommandBuilder
{
    private static $app;
    private static $cliApp;
    private static $config;

    public static function execute(array $args): void
    {
        self::$cliApp = App::getInstance();

        if (!file_exists(__DIR__ . '/../../../storage/config/.env')) {
            self::$cliApp->send('&cThe .env file does not exist. Please create one before running this command');
            exit;
        }

        // Initialize database connection
        self::$app = new \App\App(false, false, true);
        self::$app->loadEnv();

        try {
            $db = new Database($_ENV['DATABASE_HOST'], $_ENV['DATABASE_DATABASE'], $_ENV['DATABASE_USER'], $_ENV['DATABASE_PASSWORD'], $_ENV['DATABASE_PORT']);
            self::$config = new ConfigFactory($db->getPdo());
        } catch (\Exception $e) {
            self::$cliApp->send('&cAn error occurred while connecting to the database: ' . $e->getMessage());
            exit;
        }

        // Route to sub-commands
        if (isset($args[1])) {
            $subCommand = $args[1];
            switch ($subCommand) {
                case 'createuser':
                    self::createUser($args);
                    break;
                case 'deleteuser':
                    self::deleteUser($args);
                    break;
                case 'updateuser':
                    self::updateUser($args);
                    break;
                case 'setsetting':
                    self::setSetting($args);
                    break;
                case 'getsetting':
                    self::getSetting($args);
                    break;
                case 'listsettings':
                    self::listSettings();
                    break;
                case 'listusers':
                    self::listUsers($args);
                    break;
                case 'userinfo':
                    self::userInfo($args);
                    break;
                case 'banuser':
                    self::banUser($args);
                    break;
                case 'unbanuser':
                    self::unbanUser($args);
                    break;
                case 'resetpassword':
                    self::resetPassword($args);
                    break;
                default:
                    self::$cliApp->send('&cInvalid subcommand. Use &ehelp&c for available commands');
                    break;
            }
        } else {
            self::showHelp();
        }

        exit;
    }

    public static function getDescription(): string
    {
        return 'SaaS administrative helper for automation and scripting';
    }

    public static function getSubCommands(): array
    {
        return [
            'createuser' => 'Create a new user (usage: saas createuser <username> <email> <firstName> <lastName> <password> [roleId])',
            'deleteuser' => 'Delete a user (usage: saas deleteuser <uuid|username|email>)',
            'updateuser' => 'Update a user field (usage: saas updateuser <uuid|username|email> <field> <value>)',
            'banuser' => 'Ban a user (usage: saas banuser <uuid|username|email>)',
            'unbanuser' => 'Unban a user (usage: saas unbanuser <uuid|username|email>)',
            'resetpassword' => 'Reset user password (usage: saas resetpassword <uuid|username|email> <newPassword>)',
            'userinfo' => 'Get user information (usage: saas userinfo <uuid|username|email>)',
            'listusers' => 'List users (usage: saas listusers [limit] [search])',
            'setsetting' => 'Set a configuration setting (usage: saas setsetting <key> <value>)',
            'getsetting' => 'Get a configuration setting (usage: saas getsetting <key>)',
            'listsettings' => 'List all configurable settings (usage: saas listsettings)',
        ];
    }

    private static function showHelp(): void
    {
        self::$cliApp->send(self::$cliApp->color1 . '&l=== FeatherPanel SaaS Helper ===');
        self::$cliApp->send('');
        self::$cliApp->send(self::$cliApp->color3 . 'Available Commands:');
        self::$cliApp->send('');

        foreach (self::getSubCommands() as $command => $description) {
            self::$cliApp->send('&a' . $command . '&7: &f' . $description);
        }

        self::$cliApp->send('');
        self::$cliApp->send('&7Examples:');
        self::$cliApp->send(self::$cliApp->color3 . 'php fuse saas createuser john john@example.com John Doe MyPass123 1');
        self::$cliApp->send(self::$cliApp->color3 . 'php fuse saas setsetting APP_NAME "My Panel"');
        self::$cliApp->send(self::$cliApp->color3 . 'php fuse saas userinfo john@example.com');
    }

    private static function createUser(array $args): void
    {
        if (count($args) < 7) {
            self::$cliApp->send('&cUsage: saas createuser <username> <email> <firstName> <lastName> <password> [roleId]');
            self::$cliApp->send(self::$cliApp->color3 . 'Example: saas createuser john john@example.com John Doe MyPass123 1');

            return;
        }

        $username = $args[2];
        $email = $args[3];
        $firstName = $args[4];
        $lastName = $args[5];
        $password = $args[6];
        $roleId = (int) ($args[7] ?? 1);

        // Validate email
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            self::$cliApp->send('&cError: Invalid email address');

            return;
        }

        // Check for existing user
        if (User::getUserByEmail($email)) {
            self::$cliApp->send('&cError: Email already exists');

            return;
        }
        if (User::getUserByUsername($username)) {
            self::$cliApp->send('&cError: Username already exists');

            return;
        }

        // Validate lengths
        if (strlen($username) < 3 || strlen($username) > 32) {
            self::$cliApp->send('&cError: Username must be between 3 and 32 characters');

            return;
        }
        if (strlen($password) < 8) {
            self::$cliApp->send('&cError: Password must be at least 8 characters');

            return;
        }

        $uuid = UUIDUtils::generateV4();
		$config = self::$app->getConfig();
		$avatar = $config->getSetting(ConfigInterface::APP_LOGO_WHITE, 'https://cdn.mythical.systems/featherpanel/logo.png');

        $data = [
            'username' => $username,
            'email' => $email,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'password' => password_hash($password, PASSWORD_BCRYPT),
            'uuid' => $uuid,
            'remember_token' => User::generateAccountToken(),
            'avatar' => $avatar,
            'role_id' => $roleId,
        ];

        $userId = User::createUser($data);
        if ($userId) {
            self::$cliApp->send('&aSuccess: User created');
            self::$cliApp->send(self::$cliApp->color3 . 'User ID: &f' . $userId);
            self::$cliApp->send(self::$cliApp->color3 . 'UUID: &f' . $uuid);
            self::$cliApp->send(self::$cliApp->color3 . 'Username: &f' . $username);
            self::$cliApp->send(self::$cliApp->color3 . 'Email: &f' . $email);
        } else {
            self::$cliApp->send('&cError: Failed to create user');
        }
    }

    private static function deleteUser(array $args): void
    {
        if (count($args) < 3) {
            self::$cliApp->send('&cUsage: saas deleteuser <uuid|username|email>');

            return;
        }

        $identifier = $args[2];
        $user = self::findUser($identifier);

        if (!$user) {
            self::$cliApp->send('&cError: User not found');

            return;
        }

        // Check if user has servers
        $servers = \App\Chat\Server::searchServers(
            page: 1,
            limit: 1,
            search: '',
            fields: ['id'],
            sortBy: 'id',
            sortOrder: 'ASC',
            ownerId: (int) $user['id']
        );

        if (!empty($servers)) {
            self::$cliApp->send('&cError: Cannot delete user with active servers');

            return;
        }

        // Delete related data
        \App\Chat\Activity::deleteUserData($user['uuid']);
        \App\Chat\MailList::deleteAllMailListsByUserId($user['uuid']);
        \App\Chat\ApiClient::deleteAllApiClientsByUserId($user['uuid']);
        \App\Chat\Subuser::deleteAllSubusersByUserId((int) $user['id']);
        \App\Chat\MailQueue::deleteAllMailQueueByUserId($user['uuid']);

        $deleted = User::hardDeleteUser($user['id']);
        if ($deleted) {
            self::$cliApp->send('&aSuccess: User deleted');
            self::$cliApp->send(self::$cliApp->color3 . 'Username: &f' . $user['username']);
            self::$cliApp->send(self::$cliApp->color3 . 'UUID: &f' . $user['uuid']);
        } else {
            self::$cliApp->send('&cError: Failed to delete user');
        }
    }

    private static function updateUser(array $args): void
    {
        if (count($args) < 5) {
            self::$cliApp->send('&cUsage: saas updateuser <uuid|username|email> <field> <value>');
            self::$cliApp->send(self::$cliApp->color3 . 'Available fields: username, email, first_name, last_name, role_id, banned');

            return;
        }

        $identifier = $args[2];
        $field = $args[3];
        $value = $args[4];

        $user = self::findUser($identifier);
        if (!$user) {
            self::$cliApp->send('&cError: User not found');

            return;
        }

        $allowedFields = ['username', 'email', 'first_name', 'last_name', 'role_id', 'banned'];
        if (!in_array($field, $allowedFields)) {
            self::$cliApp->send('&cError: Invalid field. Allowed: ' . implode(', ', $allowedFields));

            return;
        }

        $updateData = [];

        switch ($field) {
            case 'banned':
                $updateData['banned'] = in_array(strtolower($value), ['true', '1', 'yes']);
                break;
            case 'role_id':
                $updateData['role_id'] = (int) $value;
                break;
            case 'email':
                if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
                    self::$cliApp->send('&cError: Invalid email address');

                    return;
                }
                $updateData['email'] = $value;
                break;
            default:
                $updateData[$field] = $value;
                break;
        }

        $updated = User::updateUser($user['uuid'], $updateData);
        if ($updated) {
            self::$cliApp->send('&aSuccess: User updated');
            self::$cliApp->send(self::$cliApp->color3 . 'Field: &f' . $field);
            self::$cliApp->send(self::$cliApp->color3 . 'New value: &f' . $value);
        } else {
            self::$cliApp->send('&cError: Failed to update user');
        }
    }

    private static function banUser(array $args): void
    {
        if (count($args) < 3) {
            self::$cliApp->send('&cUsage: saas banuser <uuid|username|email>');

            return;
        }

        $identifier = $args[2];
        $user = self::findUser($identifier);

        if (!$user) {
            self::$cliApp->send('&cError: User not found');

            return;
        }

        if ($user['banned'] == 1 || $user['banned'] === true) {
            self::$cliApp->send('&cError: User is already banned');

            return;
        }

        $updated = User::updateUser($user['uuid'], ['banned' => true]);
        if ($updated) {
            self::$cliApp->send('&aSuccess: User banned');
            self::$cliApp->send(self::$cliApp->color3 . 'Username: &f' . $user['username']);
        } else {
            self::$cliApp->send('&cError: Failed to ban user');
        }
    }

    private static function unbanUser(array $args): void
    {
        if (count($args) < 3) {
            self::$cliApp->send('&cUsage: saas unbanuser <uuid|username|email>');

            return;
        }

        $identifier = $args[2];
        $user = self::findUser($identifier);

        if (!$user) {
            self::$cliApp->send('&cError: User not found');

            return;
        }

        if (!($user['banned'] == 1 || $user['banned'] === true)) {
            self::$cliApp->send('&cError: User is not banned');

            return;
        }

        $updated = User::updateUser($user['uuid'], ['banned' => false]);
        if ($updated) {
            self::$cliApp->send('&aSuccess: User unbanned');
            self::$cliApp->send(self::$cliApp->color3 . 'Username: &f' . $user['username']);
        } else {
            self::$cliApp->send('&cError: Failed to unban user');
        }
    }

    private static function resetPassword(array $args): void
    {
        if (count($args) < 4) {
            self::$cliApp->send('&cUsage: saas resetpassword <uuid|username|email> <newPassword>');

            return;
        }

        $identifier = $args[2];
        $newPassword = $args[3];

        $user = self::findUser($identifier);
        if (!$user) {
            self::$cliApp->send('&cError: User not found');

            return;
        }

        if (strlen($newPassword) < 8) {
            self::$cliApp->send('&cError: Password must be at least 8 characters');

            return;
        }

        $updateData = [
            'password' => password_hash($newPassword, PASSWORD_BCRYPT),
            'remember_token' => User::generateAccountToken(),
        ];

        $updated = User::updateUser($user['uuid'], $updateData);
        if ($updated) {
            self::$cliApp->send('&aSuccess: Password reset');
            self::$cliApp->send(self::$cliApp->color3 . 'Username: &f' . $user['username']);
            self::$cliApp->send(self::$cliApp->color3 . 'Note: User will be logged out of all sessions');
        } else {
            self::$cliApp->send('&cError: Failed to reset password');
        }
    }

    private static function userInfo(array $args): void
    {
        if (count($args) < 3) {
            self::$cliApp->send('&cUsage: saas userinfo <uuid|username|email>');

            return;
        }

        $identifier = $args[2];
        $user = self::findUser($identifier);

        if (!$user) {
            self::$cliApp->send('&cError: User not found');

            return;
        }

        $roles = \App\Chat\Role::getAllRoles();
        $roleName = 'Unknown';
        foreach ($roles as $role) {
            if ($role['id'] == $user['role_id']) {
                $roleName = $role['display_name'];
                break;
            }
        }

        self::$cliApp->send('&7' . str_repeat('-', 80));
        self::$cliApp->send(self::$cliApp->color3 . 'ID: &f' . $user['id']);
        self::$cliApp->send(self::$cliApp->color3 . 'UUID: &f' . $user['uuid']);
        self::$cliApp->send(self::$cliApp->color3 . 'Username: &f' . $user['username']);
        self::$cliApp->send(self::$cliApp->color3 . 'Email: &f' . $user['email']);
        self::$cliApp->send(self::$cliApp->color3 . 'First Name: &f' . $user['first_name']);
        self::$cliApp->send(self::$cliApp->color3 . 'Last Name: &f' . $user['last_name']);
        self::$cliApp->send(self::$cliApp->color3 . 'Role: &f' . $roleName . ' (ID: ' . $user['role_id'] . ')');
        self::$cliApp->send(self::$cliApp->color3 . 'Banned: &f' . (($user['banned'] == 1 || $user['banned'] === true) ? '&cYes' : '&aNo'));
        self::$cliApp->send(self::$cliApp->color3 . '2FA Enabled: &f' . (($user['two_fa_enabled'] == 1 || $user['two_fa_enabled'] === true) ? '&aYes' : '&cNo'));
        self::$cliApp->send(self::$cliApp->color3 . 'Created At: &f' . $user['first_seen']);
        if ($user['last_seen']) {
            self::$cliApp->send(self::$cliApp->color3 . 'Last Seen: &f' . $user['last_seen']);
        }
        self::$cliApp->send('&7' . str_repeat('-', 80));
    }

    private static function listUsers(array $args): void
    {
        $limit = (int) ($args[2] ?? 10);
        $search = $args[3] ?? '';

        if ($limit < 1) {
            $limit = 10;
        }

        $users = User::searchUsers(
            1,
            $limit,
            $search,
            false,
            ['id', 'username', 'uuid', 'email', 'role_id', 'banned'],
            'id',
            'ASC'
        );

        $total = User::getCount($search);

        self::$cliApp->send('&aUsers (Showing: ' . count($users) . ', Total: ' . $total . '):');
        self::$cliApp->send('&7' . str_repeat('-', 100));
        self::$cliApp->send(sprintf(self::$cliApp->color3 . '%-5s %-20s %-30s %-8s %-8s', 'ID', 'Username', 'Email', 'Role', 'Banned'));
        self::$cliApp->send('&7' . str_repeat('-', 100));

        foreach ($users as $user) {
            $banned = ($user['banned'] == 1 || $user['banned'] === true) ? '&cYes' : '&aNo';
            self::$cliApp->send(sprintf(
                '%-5s %-20s %-30s %-8s %s',
                $user['id'],
                substr($user['username'], 0, 20),
                substr($user['email'], 0, 30),
                $user['role_id'],
                $banned
            ));
        }

        self::$cliApp->send('&7' . str_repeat('-', 100));
    }

    private static function setSetting(array $args): void
    {
        if (count($args) < 4) {
            self::$cliApp->send('&cUsage: saas setsetting <key> <value>');
            self::$cliApp->send(self::$cliApp->color3 . 'Example: saas setsetting APP_NAME "FeatherPanel"');

            return;
        }

        $key = $args[2];
        $value = $args[3];

        // Check if setting exists
        $configurableSettings = self::$config->getConfigurableSettings();
        if (!in_array($key, $configurableSettings)) {
            self::$cliApp->send('&cError: Setting not found or not configurable');
            self::$cliApp->send(self::$cliApp->color3 . 'Use &fsaas listsettings' . self::$cliApp->color3 . ' to see available settings');

            return;
        }

        try {
            $result = self::$config->setSetting($key, $value);
            if ($result) {
                self::$cliApp->send('&aSuccess: Setting updated');
                self::$cliApp->send(self::$cliApp->color3 . 'Key: &f' . $key);
                self::$cliApp->send(self::$cliApp->color3 . 'Value: &f' . $value);
            } else {
                self::$cliApp->send('&cError: Failed to update setting');
            }
        } catch (\Exception $e) {
            self::$cliApp->send('&cError: ' . $e->getMessage());
        }
    }

    private static function getSetting(array $args): void
    {
        if (count($args) < 3) {
            self::$cliApp->send('&cUsage: saas getsetting <key>');

            return;
        }

        $key = $args[2];

        try {
            $value = self::$config->getSetting($key, null);
            if ($value !== null) {
                self::$cliApp->send(self::$cliApp->color3 . 'Key: &f' . $key);
                self::$cliApp->send(self::$cliApp->color3 . 'Value: &f' . $value);
            } else {
                self::$cliApp->send('&cError: Setting not found');
            }
        } catch (\Exception $e) {
            self::$cliApp->send('&cError: ' . $e->getMessage());
        }
    }

    private static function listSettings(): void
    {
        $settings = self::$config->getConfigurableSettings();

        self::$cliApp->send('&aConfigurable Settings (' . count($settings) . '):');
        self::$cliApp->send('&7' . str_repeat('-', 80));

        foreach ($settings as $setting) {
            $value = self::$config->getSetting($setting, 'NOT SET');
            $displayValue = strlen($value) > 50 ? substr($value, 0, 47) . '...' : $value;
            self::$cliApp->send(sprintf(self::$cliApp->color3 . '%-30s &7→ &f%s', $setting, $displayValue));
        }

        self::$cliApp->send('&7' . str_repeat('-', 80));
    }

    private static function findUser(string $identifier): ?array
    {
        // Try UUID first
        $user = User::getUserByUuid($identifier);
        if ($user) {
            return $user;
        }

        // Try username
        $user = User::getUserByUsername($identifier);
        if ($user) {
            return $user;
        }

        // Try email
        $user = User::getUserByEmail($identifier);
        if ($user) {
            return $user;
        }

        return null;
    }
}
