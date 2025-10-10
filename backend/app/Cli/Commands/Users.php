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

namespace App\Cli\Commands;

use App\Cli\App;
use App\Chat\User;
use App\Helpers\UUIDUtils;
use App\Cli\CommandBuilder;

class Users extends App implements CommandBuilder
{
    public static function execute(array $args): void
    {
        $app = App::getInstance();
        if (!file_exists(__DIR__ . '/../../../storage/config/.env')) {
            \App\App::getInstance(true)->getLogger()->warning('Executed a command without a .env file');
            $app->send('The .env file does not exist. Please create one before running this command');
            exit;
        }

        // Check for subcommands
        if (isset($args[1])) {
            $subCommand = $args[1];
            switch ($subCommand) {
                case 'list':
                    self::listUsers($app, $args);
                    break;
                case 'show':
                    self::showUser($app, $args[2] ?? null);
                    break;
                case 'create':
                    self::createUser($app, $args);
                    break;
                case 'update':
                    self::updateUser($app, $args);
                    break;
                case 'delete':
                    self::deleteUser($app, $args[2] ?? null);
                    break;
                case 'ban':
                    self::banUser($app, $args[2] ?? null);
                    break;
                case 'unban':
                    self::unbanUser($app, $args[2] ?? null);
                    break;
                case 'search':
                    self::searchUsers($app, $args[2] ?? '');
                    break;
                default:
                    $app->send('&cInvalid subcommand. Use: list, show, create, update, delete, ban, unban, or search');
                    break;
            }
        } else {
            $app->send('&cPlease specify a subcommand: list, show, create, update, delete, ban, unban, or search');
        }

        exit;
    }

    public static function getDescription(): string
    {
        return 'Manage users (list, show, create, update, delete, ban, unban, search)';
    }

    public static function getSubCommands(): array
    {
        return [
            'list' => 'List all users (usage: users list [page] [limit])',
            'show' => 'Show user details (usage: users show <uuid|username|email>)',
            'create' => 'Create a new user (usage: users create <username> <email> <first_name> <last_name> <password>)',
            'update' => 'Update a user (usage: users update <uuid|username|email> <field> <value>)',
            'delete' => 'Delete a user (usage: users delete <uuid|username|email>)',
            'ban' => 'Ban a user (usage: users ban <uuid|username|email>)',
            'unban' => 'Unban a user (usage: users unban <uuid|username|email>)',
            'search' => 'Search users (usage: users search <query>)',
        ];
    }

    private static function listUsers(App $app, array $args): void
    {
        $page = (int) ($args[2] ?? 1);
        $limit = (int) ($args[3] ?? 10);

        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 10;
        }

        $users = User::searchUsers(
            $page,
            $limit,
            '',
            false,
            ['id', 'username', 'uuid', 'email', 'role_id', 'banned', 'first_seen'],
            'id',
            'ASC'
        );

        $total = User::getCount('');
        $totalPages = ceil($total / $limit);

        $app->send('&aUsers (Page ' . $page . ' of ' . $totalPages . ', Total: ' . $total . '):');
        $app->send('&7' . str_repeat('-', 100));
        $app->send(sprintf('&e%-5s %-20s %-36s %-30s %-8s %-8s', 'ID', 'Username', 'UUID', 'Email', 'Role', 'Banned'));
        $app->send('&7' . str_repeat('-', 100));

        foreach ($users as $user) {
            $banned = ($user['banned'] == 1 || $user['banned'] === true || $user['banned'] === 'true') ? '&cYes' : '&aNo';
            $app->send(sprintf(
                '%-5s %-20s %-36s %-30s %-8s %s',
                $user['id'],
                substr($user['username'], 0, 20),
                $user['uuid'],
                substr($user['email'], 0, 30),
                $user['role_id'],
                $banned
            ));
        }

        $app->send('&7' . str_repeat('-', 100));
    }

    private static function showUser(App $app, ?string $identifier): void
    {
        if (!$identifier) {
            $app->send('&cPlease provide a user UUID, username, or email');

            return;
        }

        $user = self::findUser($identifier);
        if (!$user) {
            $app->send('&cUser not found: ' . $identifier);

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

        $app->send('&aUser Details:');
        $app->send('&7' . str_repeat('-', 80));
        $app->send('&eID: &f' . $user['id']);
        $app->send('&eUUID: &f' . $user['uuid']);
        $app->send('&eUsername: &f' . $user['username']);
        $app->send('&eEmail: &f' . $user['email']);
        $app->send('&eFirst Name: &f' . $user['first_name']);
        $app->send('&eLast Name: &f' . $user['last_name']);
        $app->send('&eRole: &f' . $roleName . ' (' . $user['role_id'] . ')');
        $app->send('&eBanned: &f' . (($user['banned'] == 1 || $user['banned'] === true || $user['banned'] === 'true') ? '&cYes' : '&aNo'));
        $app->send('&e2FA Enabled: &f' . (($user['two_fa_enabled'] == 1 || $user['two_fa_enabled'] === true || $user['two_fa_enabled'] === 'true') ? '&aYes' : '&cNo'));
        $app->send('&eCreated At: &f' . $user['first_seen']);
        $app->send('&eUpdated At: &f' . $user['updated_at']);
        if ($user['last_seen']) {
            $app->send('&eLast Seen: &f' . $user['last_seen']);
        }
        $app->send('&7' . str_repeat('-', 80));
    }

    private static function createUser(App $app, array $args): void
    {
        if (count($args) < 7) {
            $app->send('&cUsage: users create <username> <email> <first_name> <last_name> <password> [role_id]');

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
            $app->send('&cInvalid email address');

            return;
        }

        // Check for existing user
        if (User::getUserByEmail($email)) {
            $app->send('&cEmail already exists');

            return;
        }
        if (User::getUserByUsername($username)) {
            $app->send('&cUsername already exists');

            return;
        }

        // Validate lengths
        if (strlen($username) < 3 || strlen($username) > 32) {
            $app->send('&cUsername must be between 3 and 32 characters');

            return;
        }
        if (strlen($password) < 8) {
            $app->send('&cPassword must be at least 8 characters');

            return;
        }

        $data = [
            'username' => $username,
            'email' => $email,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'password' => password_hash($password, PASSWORD_BCRYPT),
            'uuid' => UUIDUtils::generateV4(),
            'remember_token' => User::generateAccountToken(),
            'avatar' => 'https://cdn.mythical.systems/featherpanel/logo.png',
            'role_id' => $roleId,
        ];

        $userId = User::createUser($data);
        if ($userId) {
            $app->send('&aUser created successfully!');
            $app->send('&eUser ID: &f' . $userId);
            $app->send('&eUUID: &f' . $data['uuid']);
        } else {
            $app->send('&cFailed to create user');
        }
    }

    private static function updateUser(App $app, array $args): void
    {
        if (count($args) < 5) {
            $app->send('&cUsage: users update <uuid|username|email> <field> <value>');
            $app->send('&eAvailable fields: username, email, first_name, last_name, password, role_id, banned');

            return;
        }

        $identifier = $args[2];
        $field = $args[3];
        $value = $args[4];

        $user = self::findUser($identifier);
        if (!$user) {
            $app->send('&cUser not found: ' . $identifier);

            return;
        }

        $allowedFields = ['username', 'email', 'first_name', 'last_name', 'password', 'role_id', 'banned'];
        if (!in_array($field, $allowedFields)) {
            $app->send('&cInvalid field. Allowed fields: ' . implode(', ', $allowedFields));

            return;
        }

        $updateData = [];

        switch ($field) {
            case 'password':
                $updateData['password'] = password_hash($value, PASSWORD_DEFAULT);
                $updateData['remember_token'] = User::generateAccountToken();
                break;
            case 'banned':
                $updateData['banned'] = $value === 'true' || $value === '1' ? true : false;
                break;
            case 'role_id':
                $updateData['role_id'] = (int) $value;
                break;
            default:
                $updateData[$field] = $value;
                break;
        }

        $updated = User::updateUser($user['uuid'], $updateData);
        if ($updated) {
            $app->send('&aUser updated successfully!');
            $app->send('&eUpdated field: &f' . $field);
        } else {
            $app->send('&cFailed to update user');
        }
    }

    private static function deleteUser(App $app, ?string $identifier): void
    {
        if (!$identifier) {
            $app->send('&cPlease provide a user UUID, username, or email');

            return;
        }

        $user = self::findUser($identifier);
        if (!$user) {
            $app->send('&cUser not found: ' . $identifier);

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
            $app->send('&cCannot delete user with active servers. Please transfer or delete all servers first.');

            return;
        }

        $app->send('&eDeleting user: ' . $user['username'] . ' (' . $user['uuid'] . ')');

        // Delete related data
        \App\Chat\Activity::deleteUserData($user['uuid']);
        \App\Chat\MailList::deleteAllMailListsByUserId($user['uuid']);
        \App\Chat\ApiClient::deleteAllApiClientsByUserId($user['uuid']);
        \App\Chat\Subuser::deleteAllSubusersByUserId((int) $user['id']);
        \App\Chat\MailQueue::deleteAllMailQueueByUserId($user['uuid']);

        $deleted = User::hardDeleteUser($user['id']);
        if ($deleted) {
            $app->send('&aUser deleted successfully!');
        } else {
            $app->send('&cFailed to delete user');
        }
    }

    private static function banUser(App $app, ?string $identifier): void
    {
        if (!$identifier) {
            $app->send('&cPlease provide a user UUID, username, or email');

            return;
        }

        $user = self::findUser($identifier);
        if (!$user) {
            $app->send('&cUser not found: ' . $identifier);

            return;
        }

        if ($user['banned'] == 1 || $user['banned'] === true || $user['banned'] === 'true') {
            $app->send('&cUser is already banned');

            return;
        }

        $updated = User::updateUser($user['uuid'], ['banned' => true]);
        if ($updated) {
            $app->send('&aUser banned successfully!');
            $app->send('&eUsername: &f' . $user['username']);
        } else {
            $app->send('&cFailed to ban user');
        }
    }

    private static function unbanUser(App $app, ?string $identifier): void
    {
        if (!$identifier) {
            $app->send('&cPlease provide a user UUID, username, or email');

            return;
        }

        $user = self::findUser($identifier);
        if (!$user) {
            $app->send('&cUser not found: ' . $identifier);

            return;
        }

        if (!($user['banned'] == 1 || $user['banned'] === true || $user['banned'] === 'true')) {
            $app->send('&cUser is not banned');

            return;
        }

        $updated = User::updateUser($user['uuid'], ['banned' => false]);
        if ($updated) {
            $app->send('&aUser unbanned successfully!');
            $app->send('&eUsername: &f' . $user['username']);
        } else {
            $app->send('&cFailed to unban user');
        }
    }

    private static function searchUsers(App $app, string $query): void
    {
        if (empty($query)) {
            $app->send('&cPlease provide a search query');

            return;
        }

        $users = User::searchUsers(
            1,
            50,
            $query,
            false,
            ['id', 'username', 'uuid', 'email', 'role_id', 'banned'],
            'id',
            'ASC'
        );

        $total = count($users);

        $app->send('&aSearch Results for "' . $query . '" (Found: ' . $total . '):');
        $app->send('&7' . str_repeat('-', 100));
        $app->send(sprintf('&e%-5s %-20s %-36s %-30s %-8s %-8s', 'ID', 'Username', 'UUID', 'Email', 'Role', 'Banned'));
        $app->send('&7' . str_repeat('-', 100));

        foreach ($users as $user) {
            $banned = ($user['banned'] == 1 || $user['banned'] === true || $user['banned'] === 'true') ? '&cYes' : '&aNo';
            $app->send(sprintf(
                '%-5s %-20s %-36s %-30s %-8s %s',
                $user['id'],
                substr($user['username'], 0, 20),
                $user['uuid'],
                substr($user['email'], 0, 30),
                $user['role_id'],
                $banned
            ));
        }

        $app->send('&7' . str_repeat('-', 100));
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
