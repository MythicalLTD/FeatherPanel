<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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
use App\Chat\Role;
use App\Chat\User;
use App\Chat\Server;
use App\Chat\Subuser;
use App\Chat\Activity;
use App\Chat\MailList;
use App\Chat\ApiClient;
use App\Chat\MailQueue;
use App\Helpers\UUIDUtils;
use App\Cli\CommandBuilder;

class Users extends App implements CommandBuilder
{
    private static $cliApp;
    private static $app;
    private static $currentPage = 1;
    private static $pageSize = 10;
    private static $searchQuery = '';
    private static $users = [];
    private static $totalUsers = 0;

    public static function execute(array $args): void
    {
        self::$cliApp = App::getInstance();

        if (!file_exists(__DIR__ . '/../../../storage/config/.env')) {
            self::$app->getLogger()->warning('Executed a command without a .env file');
            self::$cliApp->send('&cThe .env file does not exist. Please create one before running this command');
            exit;
        }

        // Initialize database connection
        self::$app = new \App\App(false, false, true);
        self::$app->loadEnv();

        try {
            // Test database connection by loading initial users
            self::loadUsers();
            self::showMainMenu();
        } catch (\Exception $e) {
            self::$cliApp->send('&cAn error occurred while connecting to the database: ' . $e->getMessage());
            exit;
        }
    }

    public static function getDescription(): string
    {
        return 'Interactive user management with a beautiful UI!';
    }

    public static function getSubCommands(): array
    {
        return [];
    }

    private static function loadUsers(): void
    {
        self::$users = User::searchUsers(
            self::$currentPage,
            self::$pageSize,
            self::$searchQuery,
            false,
            ['id', 'username', 'uuid', 'email', 'role_id', 'banned', 'first_seen'],
            'id',
            'ASC'
        );

        self::$totalUsers = User::getCount(self::$searchQuery);
    }

    private static function showMainMenu(): void
    {
        while (true) {
            self::clearScreen();
            self::showHeader();
            self::showUsersList();
            self::showFooter();

            $input = self::getUserInput();

            if ($input === 'q' || $input === 'quit') {
                self::$cliApp->send('&aGoodbye!');
                exit;
            } elseif ($input === 'n' || $input === 'next') {
                self::nextPage();
            } elseif ($input === 'p' || $input === 'prev') {
                self::prevPage();
            } elseif ($input === 'c' || $input === 'create') {
                self::createUserInteractive();
            } elseif ($input === 's' || $input === 'search') {
                self::searchInteractive();
            } elseif ($input === 'r' || $input === 'reset') {
                self::$searchQuery = '';
                self::$currentPage = 1;
                self::loadUsers();
            } elseif (is_numeric($input)) {
                $index = (int) $input - 1;
                if ($index >= 0 && $index < count(self::$users)) {
                    self::viewUser($index);
                } else {
                    self::$cliApp->send('&cInvalid selection. Press any key to continue...');
                    self::waitForInput();
                }
            } else {
                self::$cliApp->send('&cInvalid input. Press any key to continue...');
                self::waitForInput();
            }
        }
    }

    private static function showHeader(): void
    {
        self::$cliApp->send(self::$cliApp->color1 . '&l╔════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗');
        self::$cliApp->send(self::$cliApp->color1 . '&l║                                    FeatherPanel User Management                                                 ║');
        self::$cliApp->send(self::$cliApp->color1 . '&l╚════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝');

        $totalPages = max(1, ceil(self::$totalUsers / self::$pageSize));
        $searchInfo = !empty(self::$searchQuery) ? ' &7(Search: ' . self::$cliApp->color3 . self::$searchQuery . '&7)' : '';
        self::$cliApp->send('&aTotal Users: &f' . self::$totalUsers . ' &7| &aPage: &f' . self::$currentPage . '/' . $totalPages . $searchInfo);
        self::$cliApp->send('');
    }

    private static function showUsersList(): void
    {
        if (empty(self::$users)) {
            self::$cliApp->send(self::$cliApp->color3 . 'No users found.');
            self::$cliApp->send('');

            return;
        }

        self::$cliApp->send('&7' . str_repeat('─', 115));
        self::$cliApp->send(sprintf(self::$cliApp->color3 . '%-4s %-3s %-18s %-32s %-25s %-6s %-8s', '#', 'ID', 'Username', 'Email', 'UUID', 'Role', 'Status'));
        self::$cliApp->send('&7' . str_repeat('─', 115));

        foreach (self::$users as $index => $user) {
            $number = $index + 1;
            $banned = ($user['banned'] == 1 || $user['banned'] === true || $user['banned'] === 'true') ? '&cBanned' : '&aActive';
            $username = substr($user['username'], 0, 18);
            $email = substr($user['email'], 0, 32);
            $uuid = substr($user['uuid'], 0, 8) . '...';

            $line = sprintf(
                '&7%2d. &f%-3s ' . self::$cliApp->color2 . '%-18s &7%-32s &8%-25s ' . self::$cliApp->color3 . '%-6s %s',
                $number,
                $user['id'],
                $username,
                $email,
                $uuid,
                $user['role_id'],
                $banned
            );
            self::$cliApp->send($line);
        }

        self::$cliApp->send('&7' . str_repeat('─', 115));
        self::$cliApp->send('');
    }

    private static function showFooter(): void
    {
        self::$cliApp->send(self::$cliApp->color3 . 'Commands: &f[number]&7=view user &7| &fc&7=create &7| &fs&7=search &7| &fr&7=reset search &7| &fn&7/&fnext &7| &fp&7/&fprev &7| &fq&7/&fquit');
        self::$cliApp->send(self::$cliApp->color2 . 'Enter your choice: ');
    }

    private static function viewUser(int $index): void
    {
        $user = self::$users[$index];

        // Get full user details
        $fullUser = User::getUserByUuid($user['uuid']);
        if (!$fullUser) {
            self::$cliApp->send('&cUser not found!');
            self::waitForInput();

            return;
        }

        $roles = Role::getAllRoles();
        $roleName = 'Unknown';
        foreach ($roles as $role) {
            if ($role['id'] == $fullUser['role_id']) {
                $roleName = $role['display_name'];
                break;
            }
        }

        while (true) {
            self::clearScreen();
            self::$cliApp->send(self::$cliApp->color1 . '&l╔════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗');
            self::$cliApp->send(self::$cliApp->color1 . '&l║                                           User Details                                                          ║');
            self::$cliApp->send(self::$cliApp->color1 . '&l╚════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝');
            self::$cliApp->send('');

            self::$cliApp->send(self::$cliApp->color3 . 'ID:              &f' . $fullUser['id']);
            self::$cliApp->send(self::$cliApp->color3 . 'UUID:            &f' . $fullUser['uuid']);
            self::$cliApp->send(self::$cliApp->color3 . 'Username:        &f' . $fullUser['username']);
            self::$cliApp->send(self::$cliApp->color3 . 'Email:           &f' . $fullUser['email']);
            self::$cliApp->send(self::$cliApp->color3 . 'First Name:      &f' . $fullUser['first_name']);
            self::$cliApp->send(self::$cliApp->color3 . 'Last Name:       &f' . $fullUser['last_name']);
            self::$cliApp->send(self::$cliApp->color3 . 'Role:            &f' . $roleName . ' &7(ID: ' . $fullUser['role_id'] . ')');

            $bannedStatus = ($fullUser['banned'] == 1 || $fullUser['banned'] === true || $fullUser['banned'] === 'true') ? '&cYes' : '&aNo';
            self::$cliApp->send(self::$cliApp->color3 . 'Banned:          ' . $bannedStatus);

            $twoFaStatus = ($fullUser['two_fa_enabled'] == 1 || $fullUser['two_fa_enabled'] === true || $fullUser['two_fa_enabled'] === 'true') ? '&aYes' : '&cNo';
            self::$cliApp->send(self::$cliApp->color3 . '2FA Enabled:     ' . $twoFaStatus);

            self::$cliApp->send(self::$cliApp->color3 . 'Created At:      &f' . $fullUser['first_seen']);
            if ($fullUser['last_seen']) {
                self::$cliApp->send(self::$cliApp->color3 . 'Last Seen:       &f' . $fullUser['last_seen']);
            }

            self::$cliApp->send('');
            self::$cliApp->send('&7' . str_repeat('─', 115));

            $isBanned = ($fullUser['banned'] == 1 || $fullUser['banned'] === true || $fullUser['banned'] === 'true');
            $banAction = $isBanned ? '&fun&7=unban' : '&fb&7=ban';

            self::$cliApp->send(self::$cliApp->color3 . 'Actions: &fe&7=edit &7| &fd&7=delete &7| ' . $banAction . ' &7| &fback&7=return');
            self::$cliApp->send(self::$cliApp->color2 . 'Enter your choice: ');

            $input = self::getUserInput();

            if ($input === 'back' || $input === 'b') {
                break;
            } elseif ($input === 'e' || $input === 'edit') {
                self::editUserInteractive($fullUser);
                // Reload user data after edit
                $fullUser = User::getUserByUuid($user['uuid']);
                if (!$fullUser) {
                    break;
                }
            } elseif ($input === 'd' || $input === 'delete') {
                if (self::deleteUserInteractive($fullUser)) {
                    break; // User was deleted, return to main menu
                }
            } elseif (($input === 'b' || $input === 'ban') && !$isBanned) {
                self::banUserInteractive($fullUser);
                $fullUser = User::getUserByUuid($user['uuid']);
                if (!$fullUser) {
                    break;
                }
            } elseif (($input === 'un' || $input === 'unban') && $isBanned) {
                self::unbanUserInteractive($fullUser);
                $fullUser = User::getUserByUuid($user['uuid']);
                if (!$fullUser) {
                    break;
                }
            } else {
                self::$cliApp->send('&cInvalid input. Press any key to continue...');
                self::waitForInput();
            }
        }

        // Reload users list
        self::loadUsers();
    }

    private static function createUserInteractive(): void
    {
        self::clearScreen();
        self::$cliApp->send(self::$cliApp->color1 . '&l╔════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗');
        self::$cliApp->send(self::$cliApp->color1 . '&l║                                          Create New User                                                        ║');
        self::$cliApp->send(self::$cliApp->color1 . '&l╚════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝');
        self::$cliApp->send('');

        // Get username
        self::$cliApp->send(self::$cliApp->color3 . 'Enter username &7(3-32 characters, or &cq&7 to cancel)&7:');
        $username = trim(fgets(STDIN));
        if ($username === 'q' || $username === 'quit') {
            return;
        }

        if (strlen($username) < 3 || strlen($username) > 32) {
            self::$cliApp->send('&cUsername must be between 3 and 32 characters. Press any key...');
            self::waitForInput();

            return;
        }

        if (User::getUserByUsername($username)) {
            self::$cliApp->send('&cUsername already exists. Press any key...');
            self::waitForInput();

            return;
        }

        // Get email
        self::$cliApp->send(self::$cliApp->color3 . 'Enter email:');
        $email = trim(fgets(STDIN));
        if ($email === 'q' || $email === 'quit') {
            return;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            self::$cliApp->send('&cInvalid email address. Press any key...');
            self::waitForInput();

            return;
        }

        if (User::getUserByEmail($email)) {
            self::$cliApp->send('&cEmail already exists. Press any key...');
            self::waitForInput();

            return;
        }

        // Get first name
        self::$cliApp->send(self::$cliApp->color3 . 'Enter first name:');
        $firstName = trim(fgets(STDIN));
        if ($firstName === 'q' || $firstName === 'quit') {
            return;
        }

        // Get last name
        self::$cliApp->send(self::$cliApp->color3 . 'Enter last name:');
        $lastName = trim(fgets(STDIN));
        if ($lastName === 'q' || $lastName === 'quit') {
            return;
        }

        // Get password
        self::$cliApp->send(self::$cliApp->color3 . 'Enter password &7(min 8 characters)&7:');
        $password = trim(fgets(STDIN));
        if ($password === 'q' || $password === 'quit') {
            return;
        }

        if (strlen($password) < 8) {
            self::$cliApp->send('&cPassword must be at least 8 characters. Press any key...');
            self::waitForInput();

            return;
        }

        // Get role ID
        self::$cliApp->send(self::$cliApp->color3 . 'Enter role ID &7(default: 1)&7:');
        $roleIdInput = trim(fgets(STDIN));
        if ($roleIdInput === 'q' || $roleIdInput === 'quit') {
            return;
        }
        $roleId = empty($roleIdInput) ? 1 : (int) $roleIdInput;

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
            self::$cliApp->send('');
            self::$cliApp->send('&a✓ User created successfully!');
            self::$cliApp->send(self::$cliApp->color3 . 'User ID: &f' . $userId);
            self::$cliApp->send(self::$cliApp->color3 . 'UUID: &f' . $data['uuid']);
            self::$cliApp->send('&7Press any key to continue...');
            self::waitForInput();
            self::loadUsers();
        } else {
            self::$cliApp->send('&c✗ Failed to create user. Press any key...');
            self::waitForInput();
        }
    }

    private static function editUserInteractive(array $user): void
    {
        $fields = [
            '1' => ['name' => 'username', 'label' => 'Username', 'current' => $user['username']],
            '2' => ['name' => 'email', 'label' => 'Email', 'current' => $user['email']],
            '3' => ['name' => 'first_name', 'label' => 'First Name', 'current' => $user['first_name']],
            '4' => ['name' => 'last_name', 'label' => 'Last Name', 'current' => $user['last_name']],
            '5' => ['name' => 'password', 'label' => 'Password', 'current' => '********'],
            '6' => ['name' => 'role_id', 'label' => 'Role ID', 'current' => $user['role_id']],
        ];

        self::clearScreen();
        self::$cliApp->send(self::$cliApp->color1 . '&l╔════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗');
        self::$cliApp->send(self::$cliApp->color1 . '&l║                                           Edit User                                                             ║');
        self::$cliApp->send(self::$cliApp->color1 . '&l╚════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝');
        self::$cliApp->send('');
        self::$cliApp->send(self::$cliApp->color3 . 'Editing user: &f' . $user['username'] . ' &7(' . $user['uuid'] . ')');
        self::$cliApp->send('');

        foreach ($fields as $num => $field) {
            self::$cliApp->send('&7' . $num . '. ' . self::$cliApp->color3 . $field['label'] . ': &f' . $field['current']);
        }

        self::$cliApp->send('');
        self::$cliApp->send(self::$cliApp->color3 . 'Select field to edit &7(or &cq&7 to cancel)&7:');

        $selection = self::getUserInput();
        if ($selection === 'q' || $selection === 'quit') {
            return;
        }

        if (!isset($fields[$selection])) {
            self::$cliApp->send('&cInvalid selection. Press any key...');
            self::waitForInput();

            return;
        }

        $selectedField = $fields[$selection];
        self::$cliApp->send(self::$cliApp->color3 . 'Enter new value for &f' . $selectedField['label'] . self::$cliApp->color3 . ':');
        $newValue = trim(fgets(STDIN));

        if (empty($newValue)) {
            self::$cliApp->send('&cValue cannot be empty. Press any key...');
            self::waitForInput();

            return;
        }

        $updateData = [];

        switch ($selectedField['name']) {
            case 'password':
                if (strlen($newValue) < 8) {
                    self::$cliApp->send('&cPassword must be at least 8 characters. Press any key...');
                    self::waitForInput();

                    return;
                }
                $updateData['password'] = password_hash($newValue, PASSWORD_BCRYPT);
                $updateData['remember_token'] = User::generateAccountToken();
                break;
            case 'email':
                if (!filter_var($newValue, FILTER_VALIDATE_EMAIL)) {
                    self::$cliApp->send('&cInvalid email address. Press any key...');
                    self::waitForInput();

                    return;
                }
                $updateData['email'] = $newValue;
                break;
            case 'role_id':
                $updateData['role_id'] = (int) $newValue;
                break;
            default:
                $updateData[$selectedField['name']] = $newValue;
                break;
        }

        $updated = User::updateUser($user['uuid'], $updateData);
        if ($updated) {
            self::$cliApp->send('&a✓ User updated successfully!');
            self::$cliApp->send('&7Press any key to continue...');
            self::waitForInput();
        } else {
            self::$cliApp->send('&c✗ Failed to update user. Press any key...');
            self::waitForInput();
        }
    }

    private static function deleteUserInteractive(array $user): bool
    {
        // Check if user has servers
        $servers = Server::searchServers(
            page: 1,
            limit: 1,
            search: '',
            fields: ['id'],
            sortBy: 'id',
            sortOrder: 'ASC',
            ownerId: (int) $user['id']
        );

        if (!empty($servers)) {
            self::clearScreen();
            self::$cliApp->send('&c✗ Cannot delete user with active servers!');
            self::$cliApp->send('&7Please transfer or delete all servers first.');
            self::$cliApp->send('&7Press any key to continue...');
            self::waitForInput();

            return false;
        }

        self::clearScreen();
        self::$cliApp->send('&c&l╔════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗');
        self::$cliApp->send('&c&l║                                          DELETE USER WARNING                                                     ║');
        self::$cliApp->send('&c&l╚════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝');
        self::$cliApp->send('');
        self::$cliApp->send('&eYou are about to permanently delete:');
        self::$cliApp->send('&fUsername: &e' . $user['username']);
        self::$cliApp->send('&fEmail: &e' . $user['email']);
        self::$cliApp->send('&fUUID: &e' . $user['uuid']);
        self::$cliApp->send('');
        self::$cliApp->send('&cThis action cannot be undone!');
        self::$cliApp->send('');
        self::$cliApp->send('&6Type &fDELETE&6 to confirm or anything else to cancel:');

        $confirmation = trim(fgets(STDIN));

        if ($confirmation !== 'DELETE') {
            self::$cliApp->send('&7Deletion cancelled. Press any key...');
            self::waitForInput();

            return false;
        }

        // Delete related data
        Activity::deleteUserData($user['uuid']);
        MailList::deleteAllMailListsByUserId($user['uuid']);
        ApiClient::deleteAllApiClientsByUserId($user['uuid']);
        Subuser::deleteAllSubusersByUserId((int) $user['id']);
        MailQueue::deleteAllMailQueueByUserId($user['uuid']);

        $deleted = User::hardDeleteUser($user['id']);
        if ($deleted) {
            self::$cliApp->send('');
            self::$cliApp->send('&a✓ User deleted successfully!');
            self::$cliApp->send('&7Press any key to continue...');
            self::waitForInput();
            self::loadUsers();

            return true;
        }
        self::$cliApp->send('');
        self::$cliApp->send('&c✗ Failed to delete user. Press any key...');
        self::waitForInput();

        return false;
    }

    private static function banUserInteractive(array $user): void
    {
        $updated = User::updateUser($user['uuid'], ['banned' => true]);
        if ($updated) {
            self::clearScreen();
            self::$cliApp->send('&a✓ User banned successfully!');
            self::$cliApp->send('&eUsername: &f' . $user['username']);
            self::$cliApp->send('&7Press any key to continue...');
            self::waitForInput();
        } else {
            self::clearScreen();
            self::$cliApp->send('&c✗ Failed to ban user. Press any key...');
            self::waitForInput();
        }
    }

    private static function unbanUserInteractive(array $user): void
    {
        $updated = User::updateUser($user['uuid'], ['banned' => false]);
        if ($updated) {
            self::clearScreen();
            self::$cliApp->send('&a✓ User unbanned successfully!');
            self::$cliApp->send('&eUsername: &f' . $user['username']);
            self::$cliApp->send('&7Press any key to continue...');
            self::waitForInput();
        } else {
            self::clearScreen();
            self::$cliApp->send('&c✗ Failed to unban user. Press any key...');
            self::waitForInput();
        }
    }

    private static function searchInteractive(): void
    {
        self::clearScreen();
        self::$cliApp->send(self::$cliApp->color1 . '&l╔════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗');
        self::$cliApp->send(self::$cliApp->color1 . '&l║                                          Search Users                                                            ║');
        self::$cliApp->send(self::$cliApp->color1 . '&l╚════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝');
        self::$cliApp->send('');
        self::$cliApp->send(self::$cliApp->color3 . 'Enter search query &7(username, email, UUID or &cq&7 to cancel)&7:');

        $query = trim(fgets(STDIN));
        if ($query === 'q' || $query === 'quit' || empty($query)) {
            return;
        }

        self::$searchQuery = $query;
        self::$currentPage = 1;
        self::loadUsers();
    }

    private static function nextPage(): void
    {
        $maxPage = ceil(self::$totalUsers / self::$pageSize);
        if (self::$currentPage < $maxPage) {
            ++self::$currentPage;
            self::loadUsers();
        }
    }

    private static function prevPage(): void
    {
        if (self::$currentPage > 1) {
            --self::$currentPage;
            self::loadUsers();
        }
    }

    private static function clearScreen(): void
    {
        if (PHP_OS_FAMILY === 'Windows') {
            system('cls');
        } else {
            system('clear');
        }
    }

    private static function getUserInput(): string
    {
        $handle = fopen('php://stdin', 'r');
        $input = trim(fgets($handle));
        fclose($handle);

        return strtolower($input);
    }

    private static function waitForInput(): void
    {
        $handle = fopen('php://stdin', 'r');
        fgets($handle);
        fclose($handle);
    }
}
