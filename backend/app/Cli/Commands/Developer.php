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
use App\Cli\CommandBuilder;

class Developer extends App implements CommandBuilder
{
    private const PID_DIR = '/tmp/featherpanel-dev';
    private const PID_FILE = '/tmp/featherpanel-dev/vscode-tunnel.pid';
    private const LOG_FILE = '/tmp/featherpanel-dev/vscode-tunnel.log';
    private const TUNNEL_INFO_FILE = '/tmp/featherpanel-dev/vscode-tunnel-info.txt';

    public static function execute(array $args): void
    {
        $app = App::getInstance();

        // Check if we're in a Docker container (production install)
        // Only allow start/stop/status/logs if we're in the container
        if (isset($args[1])) {
            $subCommand = strtolower($args[1]);
            if (in_array($subCommand, ['start', 'stop', 'status', 'logs'], true)) {
                if (!self::isInDockerContainer()) {
                    $app->send('');
                    $app->send('&c&l╔════════════════════════════════════════════════════════════╗');
                    $app->send('&c&l║                   ⚠️   WOAH!   ⚠️                    ║');
                    $app->send('&c&l╚════════════════════════════════════════════════════════════╝');
                    $app->send('');
                    $app->send('&c&lThis command only works for production installs of FeatherPanel!');
                    $app->send('');
                    $app->send('&7This developer server feature is designed to run inside the');
                    $app->send('&7Docker container environment (/var/www/html).');
                    $app->send('');
                    $app->send('&7Current directory: &f' . getcwd());
                    $app->send('');
                    $app->send('&7To use this feature, run the command from inside the');
                    $app->send('&7FeatherPanel backend container.');
                    $app->send('');
                    exit;
                }
            }
        }

        // Route to sub-commands
        if (isset($args[1])) {
            $subCommand = strtolower($args[1]);
            switch ($subCommand) {
                case 'start':
                    self::startServer($app);
                    break;
                case 'stop':
                    self::stopServer($app);
                    break;
                case 'status':
                    self::checkStatus($app);
                    break;
                case 'logs':
                    self::showLogs($app, $args[2] ?? 50);
                    break;
                default:
                    $app->send('&cInvalid subcommand: ' . $subCommand);
                    $app->send('&7Available subcommands: start, stop, status, logs');
                    $app->send('&7Usage: featherpanel developer <subcommand>');
                    break;
            }
        } else {
            self::showHelp($app);
        }

        exit;
    }

    public static function getDescription(): string
    {
        return 'Manage developer server and VS Code Tunnel (start, stop, status, logs)';
    }

    public static function getSubCommands(): array
    {
        return [
            'start' => 'Start the developer server and VS Code Tunnel',
            'stop' => 'Stop the developer server and VS Code Tunnel',
            'status' => 'Check if the developer server is running',
            'logs' => 'Show VS Code Tunnel logs (usage: developer logs [lines])',
        ];
    }

    private static function showHelp(App $app): void
    {
        $app->send($app->color1 . '&l=== FeatherPanel Developer Server ===');
        $app->send('');
        $app->send($app->color3 . 'Available Commands:');
        $app->send('');

        foreach (self::getSubCommands() as $command => $description) {
            $app->send('&a' . $command . '&7: &f' . $description);
        }

        $app->send('');
        $app->send($app->color3 . 'Examples:');
        $app->send('&7  featherpanel developer start');
        $app->send('&7  featherpanel developer stop');
        $app->send('&7  featherpanel developer status');
        $app->send('&7  featherpanel developer logs 100');
    }

    private static function startServer(App $app): void
    {
        // Check if already running
        if (self::isRunning()) {
            $pid = self::getPid();
            $app->send('&eDeveloper server is already running (PID: ' . $pid . ')');
            $app->send('&7Use &ffeatherpanel developer stop &7to stop it first');

            return;
        }

        $app->send($app->color1 . '&lStarting Developer Server...');
        $app->send('&7' . str_repeat('─', 50));

        // Find the setup script
        $backendDir = dirname(__DIR__, 3);
        $scriptPath = $backendDir . '/setup-code-prod.sh';

        // Also check common locations
        if (!file_exists($scriptPath)) {
            $scriptPath = '/var/www/html/setup-code-prod.sh';
        }
        if (!file_exists($scriptPath)) {
            $scriptPath = '/var/www/featherpanel/backend/setup-code-prod.sh';
        }

        // Check if script exists
        if (!file_exists($scriptPath)) {
            $app->send('&cError: Setup script not found');
            $app->send('&7Expected locations:');
            $app->send('&7  - ' . $backendDir . '/setup-code-prod.sh');
            $app->send('&7  - /var/www/html/setup-code-prod.sh');
            $app->send('&7  - /var/www/featherpanel/backend/setup-code-prod.sh');

            return;
        }

        // Make sure script is executable
        if (!is_executable($scriptPath)) {
            chmod($scriptPath, 0755);
        }

        // Create PID directory
        if (!is_dir(self::PID_DIR)) {
            mkdir(self::PID_DIR, 0755, true);
        }

        $app->send('&7Running setup script...');
        $app->send('&7This will install VS Code and start the tunnel.');
        $app->send('&7You will see the authentication output below.');
        $app->send('');

        // Run the setup script and show output in real-time
        // Use passthru to show output directly to the user
        $app->send($app->color3 . 'Starting setup (this may take a few minutes)...');
        $app->send('&7' . str_repeat('─', 50));
        $app->send('');

        // Flush output buffer to show messages immediately
        if (function_exists('ob_flush')) {
            ob_flush();
            flush();
        }

        // Run script and capture output line by line to show progress
        $descriptorspec = [
            0 => ['pipe', 'r'],  // stdin
            1 => ['pipe', 'w'],  // stdout
            2 => ['pipe', 'w'],  // stderr
        ];

        $process = proc_open('bash ' . escapeshellarg($scriptPath), $descriptorspec, $pipes);

        if (is_resource($process)) {
            // Close stdin
            fclose($pipes[0]);

            // Read output line by line and display it
            $stdout = $pipes[1];
            $stderr = $pipes[2];

            // Set streams to non-blocking
            stream_set_blocking($stdout, false);
            stream_set_blocking($stderr, false);

            $pidFile = self::PID_FILE;
            $startTime = time();
            $timeout = 300; // 5 minutes timeout

            while (true) {
                $read = [$stdout, $stderr];
                $write = null;
                $except = null;

                if (stream_select($read, $write, $except, 1) > 0) {
                    foreach ($read as $stream) {
                        $line = fgets($stream);
                        if ($line !== false) {
                            // Display the line (strip color codes for CLI compatibility)
                            echo $line;
                            if (function_exists('ob_flush')) {
                                ob_flush();
                                flush();
                            }
                        }
                    }
                }

                // Check if process is still running
                $status = proc_get_status($process);
                if (!$status['running']) {
                    break;
                }

                // Check if PID file exists (tunnel started)
                if (file_exists($pidFile)) {
                    // Keep reading output for a bit more to show auth URL
                    // Code tunnel will output the auth URL shortly after starting
                    $app->send('');
                    $app->send($app->color3 . 'Tunnel process started. Waiting for authentication URL...');
                    $app->send($app->color3 . 'Keep watching the output above for the GitHub/Microsoft auth URL!');
                    $app->send('');

                    // Continue reading for up to 30 more seconds to catch auth URL
                    $authWaitStart = time();
                    $authTimeout = 30;

                    while ((time() - $authWaitStart) < $authTimeout) {
                        if (stream_select($read, $write, $except, 1) > 0) {
                            foreach ($read as $stream) {
                                $line = fgets($stream);
                                if ($line !== false) {
                                    echo $line;
                                    if (function_exists('ob_flush')) {
                                        ob_flush();
                                        flush();
                                    }
                                }
                            }
                        }

                        // Check if process finished
                        $status = proc_get_status($process);
                        if (!$status['running']) {
                            break 2;
                        }
                    }

                    break;
                }

                // Timeout check
                if ((time() - $startTime) > $timeout) {
                    $app->send('');
                    $app->send('&cTimeout waiting for tunnel to start');
                    proc_terminate($process);
                    break;
                }
            }

            // Close pipes
            fclose($stdout);
            fclose($stderr);
            proc_close($process);

            // Show final status
            $app->send('');
            if (self::isRunning()) {
                $pid = self::getPid();
                $app->send('&a&l✅ Developer server is running!');
                $app->send('&7PID: &f' . $pid);
                $app->send('&7Logs: &f' . self::LOG_FILE);
                $app->send('');
                $app->send($app->color3 . 'The tunnel is running in the background.');
                $app->send($app->color3 . 'If you didn\'t see the auth URL above, check the logs:');
                $app->send('&7  tail -f ' . self::LOG_FILE);
            } else {
                $app->send('&eTunnel may still be starting. Check logs:');
                $app->send('&7  tail -f ' . self::LOG_FILE);
            }
        } else {
            // Fallback: run in background if proc_open fails
            $app->send('&7Running in background mode...');
            exec('bash ' . escapeshellarg($scriptPath) . ' > /dev/null 2>&1 &', $output, $returnVar);
            sleep(3);
        }

        // Wait a moment for the process to start
        sleep(3);

        if (self::isRunning()) {
            $pid = self::getPid();
            $app->send('');
            $app->send('&a&l✅ Developer server started successfully!');
            $app->send('&7PID: &f' . $pid);
            $app->send('&7Logs: &f' . self::LOG_FILE);
            $app->send('');
            $app->send($app->color3 . 'VS Code Tunnel is running in the background.');
            $app->send($app->color3 . 'Check the logs for authentication URL.');
        } else {
            $app->send('');
            $app->send('&c&l❌ Failed to start developer server');
            $app->send('&7Check the logs for more information: ' . self::LOG_FILE);
        }
    }

    private static function stopServer(App $app): void
    {
        if (!self::isRunning()) {
            $app->send('&eDeveloper server is not running');

            return;
        }

        $pid = self::getPid();
        $app->send($app->color1 . '&lStopping Developer Server...');
        $app->send('&7' . str_repeat('─', 50));

        // Kill the process
        $killed = false;
        if ($pid && function_exists('posix_kill') && posix_kill((int) $pid, SIGTERM)) {
            // Wait a moment for graceful shutdown
            sleep(2);

            // If still running, force kill
            if (self::isRunning()) {
                if (function_exists('posix_kill')) {
                    posix_kill((int) $pid, SIGKILL);
                } else {
                    exec('kill -9 ' . escapeshellarg($pid), $output, $returnVar);
                }
                sleep(1);
            }

            $killed = !self::isRunning();
        } else {
            // Try to kill by process name or PID
            if ($pid) {
                exec('kill -TERM ' . escapeshellarg($pid) . ' 2>/dev/null', $output, $returnVar);
                sleep(2);
                if (self::isRunning()) {
                    exec('kill -9 ' . escapeshellarg($pid) . ' 2>/dev/null', $output, $returnVar);
                    sleep(1);
                }
            } else {
                exec('pkill -f "code tunnel" 2>/dev/null', $output, $returnVar);
                sleep(1);
            }
            $killed = !self::isRunning();
        }

        if ($killed) {
            // Clean up PID file
            if (file_exists(self::PID_FILE)) {
                unlink(self::PID_FILE);
            }

            // Also disable developer mode setting
            $backendDir = dirname(__DIR__, 3);
            if (file_exists($backendDir . '/cli')) {
                exec('cd ' . escapeshellarg($backendDir) . ' && php cli saas setsetting app_developer_mode false > /dev/null 2>&1');
            }

            $app->send('&a&l✅ Developer server stopped successfully');
        } else {
            $app->send('&c&l❌ Failed to stop developer server');
            $app->send('&7You may need to manually kill the process: kill ' . $pid);
        }
    }

    private static function checkStatus(App $app): void
    {
        $app->send($app->color1 . '&lDeveloper Server Status');
        $app->send('&7' . str_repeat('─', 50));

        if (self::isRunning()) {
            $pid = self::getPid();
            $app->send('&a&lStatus: &fRunning');
            $app->send('&7PID: &f' . $pid);

            // Check if process is actually running
            $isActive = false;
            if ($pid) {
                if (function_exists('posix_kill')) {
                    $isActive = posix_kill((int) $pid, 0);
                } else {
                    // Alternative check using ps
                    exec('ps -p ' . escapeshellarg($pid) . ' > /dev/null 2>&1', $output, $returnVar);
                    $isActive = ($returnVar === 0);
                }
            }

            if ($isActive) {
                $app->send('&7Process: &aActive');
            } else {
                $app->send('&7Process: &cNot found (stale PID file)');
            }

            if (file_exists(self::LOG_FILE)) {
                $logSize = filesize(self::LOG_FILE);
                $app->send('&7Log file: &f' . self::LOG_FILE . ' &7(' . self::formatBytes($logSize) . ')');
            }

            // Extract and display tunnel information
            self::displayTunnelInfo($app);
        } else {
            $app->send('&c&lStatus: &fStopped');
        }

        $app->send('');
        $app->send('&7Use &ffeatherpanel developer start &7to start the server');
        $app->send('&7Use &ffeatherpanel developer logs &7to view logs');
    }

    private static function displayTunnelInfo(App $app): void
    {
        $tunnelName = null;
        $tunnelUrl = null;
        $authCode = null;
        $authUrl = null;

        // Try to read from info file first
        if (file_exists(self::TUNNEL_INFO_FILE)) {
            $info = file_get_contents(self::TUNNEL_INFO_FILE);
            if ($info) {
                $lines = explode("\n", $info);
                foreach ($lines as $line) {
                    if (strpos($line, 'TUNNEL_NAME=') === 0) {
                        $tunnelName = trim(substr($line, 12));
                    } elseif (strpos($line, 'TUNNEL_URL=') === 0) {
                        $tunnelUrl = trim(substr($line, 11));
                    }
                }
            }
        }

        // If not in info file, try to extract from logs
        if (!$tunnelName && file_exists(self::LOG_FILE)) {
            $logContent = file_get_contents(self::LOG_FILE);

            // Extract tunnel name (e.g., "Creating tunnel with the name: d03fded1d09c")
            if (preg_match('/Creating tunnel with the name:\s*([a-zA-Z0-9\-]+)/', $logContent, $matches)) {
                $tunnelName = $matches[1];
            } elseif (preg_match('/tunnel\/([a-zA-Z0-9\-]+)\//', $logContent, $matches)) {
                $tunnelName = $matches[1];
            }

            // Extract tunnel URL
            if (preg_match('/https:\/\/vscode\.dev\/tunnel\/([a-zA-Z0-9\-]+)\/([^\s]+)/', $logContent, $matches)) {
                $tunnelUrl = $matches[0];
                if (!$tunnelName) {
                    $tunnelName = $matches[1];
                }
            }

            // Extract auth code and URL
            if (preg_match('/use code ([A-Z0-9\-]+)/', $logContent, $matches)) {
                $authCode = $matches[1];
            }
            if (preg_match('/(https:\/\/[^\s]+login[^\s]+device[^\s]+)/', $logContent, $matches)) {
                $authUrl = $matches[1];
            }
        }

        // Display tunnel information
        if ($tunnelName || $tunnelUrl) {
            $app->send('');
            $app->send($app->color2 . '&lTunnel Information:');

            if ($tunnelUrl) {
                $app->send('&7Tunnel URL: &a&l' . $tunnelUrl);
                $app->send('&7Open this link in your browser to access VS Code remotely!');
            } elseif ($tunnelName) {
                $tunnelUrl = 'https://vscode.dev/tunnel/' . $tunnelName . '/var/www/html';
                $app->send('&7Tunnel Name: &f' . $tunnelName);
                $app->send('&7Tunnel URL: &a&l' . $tunnelUrl);
                $app->send('&7Open this link in your browser to access VS Code remotely!');
            }

            // Save for future reference
            if ($tunnelName && !file_exists(self::TUNNEL_INFO_FILE)) {
                $info = "TUNNEL_NAME=$tunnelName\n";
                if ($tunnelUrl) {
                    $info .= "TUNNEL_URL=$tunnelUrl\n";
                }
                file_put_contents(self::TUNNEL_INFO_FILE, $info);
            }
        } elseif ($authCode || $authUrl) {
            $app->send('');
            $app->send($app->color3 . '&lAuthentication Required:');
            if ($authUrl) {
                $app->send('&7Visit: &a' . $authUrl);
            }
            if ($authCode) {
                $app->send('&7Enter code: &e&l' . $authCode);
            }
            $app->send('&7After authentication, the tunnel URL will appear here.');
        } else {
            $app->send('');
            $app->send($app->color3 . '&7Tunnel is starting... Check logs for authentication URL.');
            $app->send('&7Run: &ftail -f ' . self::LOG_FILE);
        }
    }

    private static function showLogs(App $app, int $lines = 50): void
    {
        if (!file_exists(self::LOG_FILE)) {
            $app->send('&cLog file not found: ' . self::LOG_FILE);
            $app->send('&7The developer server may not have been started yet');

            return;
        }

        $app->send($app->color1 . '&lVS Code Tunnel Logs (last ' . $lines . ' lines)');
        $app->send('&7' . str_repeat('─', 50));
        $app->send('');

        $logContent = shell_exec('tail -n ' . escapeshellarg($lines) . ' ' . escapeshellarg(self::LOG_FILE));
        if ($logContent) {
            $app->send('&7' . $logContent);
        } else {
            $app->send('&7Log file is empty');
        }

        $app->send('');
        $app->send('&7Full log file: &f' . self::LOG_FILE);
    }

    private static function isRunning(): bool
    {
        if (!file_exists(self::PID_FILE)) {
            return false;
        }

        $pid = self::getPid();
        if (!$pid) {
            return false;
        }

        // Check if process is actually running
        if (function_exists('posix_kill')) {
            return posix_kill((int) $pid, 0);
        }

        // Alternative check using ps
        exec('ps -p ' . escapeshellarg($pid) . ' > /dev/null 2>&1', $output, $returnVar);

        return $returnVar === 0;
    }

    private static function getPid(): ?string
    {
        if (!file_exists(self::PID_FILE)) {
            return null;
        }

        $pid = trim(file_get_contents(self::PID_FILE));
        if (empty($pid) || !is_numeric($pid)) {
            return null;
        }

        return $pid;
    }

    private static function formatBytes(int $bytes, int $precision = 2): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];

        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; ++$i) {
            $bytes /= 1024;
        }

        return round($bytes, $precision) . ' ' . $units[$i];
    }

    private static function isInDockerContainer(): bool
    {
        $cwd = getcwd();

        // Check if we're in /var/www/html (Docker container path)
        if (strpos($cwd, '/var/www/html') === 0) {
            return true;
        }

        // Also check if the expected backend directory structure exists
        // In Docker, the backend files are at /var/www/html
        if (is_dir('/var/www/html') && file_exists('/var/www/html/cli')) {
            // If we're running from a path that resolves to /var/www/html, allow it
            $realPath = realpath('/var/www/html');
            $currentRealPath = realpath($cwd);
            if ($realPath && $currentRealPath && strpos($currentRealPath, $realPath) === 0) {
                return true;
            }
        }

        return false;
    }
}
