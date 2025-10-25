# FeatherCli - Advanced FeatherPanel CLI Tool

A powerful command-line interface for managing FeatherPanel servers with full API integration, modular architecture, and namespace support.

## Features

- 🚀 **Full API Integration** - Complete FeatherPanel API support
- 🏗️ **Modular Architecture** - Extensible command system with namespace support
- 🔧 **Easy Configuration** - Simple setup with automatic configuration management
- 🎨 **Beautiful Output** - Rich console output with colors and tables
- 🔒 **Secure Authentication** - Bearer token authentication with session validation
- 📊 **Server Management** - Start, stop, restart, and manage your servers
- ⚡ **Fast & Reliable** - Built with .NET 9.0 for optimal performance

## Installation

### Quick Install

```bash
# Download and run the installation script
curl -fsSL https://raw.githubusercontent.com/MythicalLTD/FeatherPanel/main/cli/install.sh | sudo bash
```

### Manual Install

1. **Prerequisites**

   - .NET 9.0 SDK or later
   - Linux system (x64, ARM, or ARM64)

2. **Build from Source**

   ```bash
   git clone https://github.com/MythicalLTD/FeatherPanel.git
   cd FeatherPanel/cli
   make all
   ```

3. **Install System-wide**
   ```bash
   sudo ./install.sh
   ```

## Quick Start

1. **Setup Configuration**

   ```bash
   sudo feathercli config setup
   ```

   Enter your FeatherPanel API URL and API Key when prompted.

2. **Test Connection**

   ```bash
   feathercli config test
   ```

3. **List Your Servers**

   ```bash
   feathercli server list
   ```

4. **Get Detailed Server Information**

   ```bash
   feathercli server info <server-uuid>
   ```

5. **Manage Servers**

   ```bash
   # Start a server
   feathercli server start <server-uuid>

   # Stop a server
   feathercli server stop <server-uuid>

   # Restart a server
   feathercli server restart <server-uuid>

   # Reinstall a server (resets to initial state)
   feathercli server reinstall <server-uuid> --force

   # Send a command to a server
   feathercli server command --uuid <server-uuid> --command "say Hello World"

   # Interactive command entry (in interactive terminals)
   feathercli server command --uuid <server-uuid>

   # View server logs
   feathercli server logs --uuid <server-uuid> --lines 50
   feathercli server logs --uuid <server-uuid> --upload
   ```

6. **Advanced Server Listing**

   ```bash
   # Search for servers
   feathercli server list --search "minecraft"

   # Paginate results
   feathercli server list --page 2 --limit 10

   # Show all servers
   feathercli server list --all

   # Get comprehensive server details
   feathercli server info --uuid <server-uuid>
   ```

7. **Comprehensive Server Information**

   The `server info` command provides detailed information about your servers including:

   ```bash
   # Interactive server selection
   feathercli server info

   # Direct server targeting
   feathercli server info --uuid <server-uuid>
   ```

   **Information Displayed:**

   - 📊 **Basic Information**: Name, UUID, status, suspension status
   - 💾 **Resource Information**: Memory, disk, CPU, IO limits
   - 🚀 **Startup Information**: Startup commands, Docker images, timestamps
   - 🖥️ **Node Information**: Node details, FQDN, maintenance status
   - 🎮 **Realm Information**: Game realm details
   - ✨ **Spell Information**: Server type, features, Docker images
   - 🌐 **Allocation Information**: IP addresses, ports, aliases
   - 📁 **SFTP Information**: File transfer connection details
   - ⚙️ **Server Variables**: Environment variables and configuration
   - 📈 **Recent Activity**: Last 10 server events and logs

8. **Interactive Command Execution**

   The `server command` command supports both direct command execution and interactive command entry:

   ```bash
   # Direct command execution
   feathercli server command --uuid <server-uuid> --command "say Hello World"

   # Interactive command entry (prompts for command in interactive terminals)
   feathercli server command --uuid <server-uuid>
   feathercli server command  # Also prompts for server selection
   ```

   **Features:**

   - 🎯 **Interactive Server Selection**: Choose server from a list if no UUID provided
   - ⌨️ **Manual Command Entry**: Enter commands interactively when `--command` option is omitted
   - 🔒 **Non-Interactive Support**: Graceful fallback with clear instructions in non-interactive terminals
   - ✅ **Error Handling**: Comprehensive error messages for offline servers or Wings daemon issues

9. **Server Reinstallation**

   The `server reinstall` command allows you to completely reset a server to its initial state:

   ```bash
   # Interactive reinstall (with safety confirmations)
   feathercli server reinstall --uuid <server-uuid>

   # Force reinstall (skip confirmations - use with extreme caution!)
   feathercli server reinstall --uuid <server-uuid> --force
   ```

   **⚠️ Safety Features:**

   - 🛡️ **Double Confirmation**: Requires two confirmations in interactive terminals
   - 🚫 **Non-Interactive Protection**: Prevents accidental reinstalls in scripts
   - ⚠️ **Clear Warnings**: Prominent warnings about data loss
   - 🔒 **Force Override**: `--force` flag for automation (use with caution)

   **What Happens During Reinstall:**

   - All server files and configurations are permanently deleted
   - Server is reset to its initial state as if newly created
   - Wings daemon reinstalls the server using the original spell
   - Server becomes ready for fresh configuration

10. **Log Management**

FeatherCli provides comprehensive log management capabilities:

```bash
# View server logs (last 50 lines by default)
feathercli server logs --uuid <server-uuid>
feathercli server logs --uuid <server-uuid> --lines 100

# Upload logs to mclo.gs for sharing
feathercli server logs --uuid <server-uuid> --upload

# View installation logs
feathercli server install-logs --uuid <server-uuid>

# Upload installation logs
feathercli server install-logs --uuid <server-uuid> --upload
```

**📋 Log Features:**

- 🎨 **Color-Coded Logs**: Different colors for ERROR, WARN, INFO, DEBUG levels
- 📊 **Configurable Lines**: Control how many log lines to display
- 🔗 **Easy Sharing**: Upload logs to mclo.gs for shareable URLs
- 🔧 **Installation Logs**: View server setup and installation process
- 🎯 **Interactive Selection**: Choose server from list if no UUID provided

## Configuration

FeatherCli stores its configuration in `/etc/feathercli/.env`:

```env
API_URL=https://your-panel.example.com
API_KEY=your-api-key-here
```

### Configuration Commands

```bash
# Show current configuration
feathercli config show

# Set configuration values
feathercli config set api_url "https://panel.example.com"
feathercli config set api_key "your-api-key"

# Test API connection
feathercli config test
```

## Commands

### Server Management

```bash
# List all servers
feathercli server list

# List servers with pagination
feathercli server list --page 1 --limit 20

# Search servers by name or description
feathercli server list --search "minecraft"

# Show all servers (ignores pagination)
feathercli server list --all

# Get detailed server information (interactive selection if no UUID provided)
feathercli server info
feathercli server info --uuid <uuid>

# Start a server (interactive selection if no UUID provided)
feathercli server start
feathercli server start --uuid <uuid>

# Stop a server (interactive selection if no UUID provided)
feathercli server stop
feathercli server stop --uuid <uuid>

# Restart a server (interactive selection if no UUID provided)
feathercli server restart
feathercli server restart --uuid <uuid>

# Force kill a server (requires interactive terminal for safety)
feathercli server kill --uuid <uuid>

# Reinstall a server (resets to initial state - requires interactive terminal for safety)
feathercli server reinstall --uuid <uuid>
feathercli server reinstall --uuid <uuid> --force  # Skip confirmation (use with caution!)

# Send command to server (interactive selection if no UUID provided)
feathercli server command --command "say Hello World"
feathercli server command --uuid <uuid> --command "say Hello World"

# Interactive command entry (in interactive terminals)
feathercli server command
feathercli server command --uuid <uuid>

# View server logs
feathercli server logs --uuid <uuid>
feathercli server logs --uuid <uuid> --lines 100
feathercli server logs --uuid <uuid> --upload

# View installation logs
feathercli server install-logs --uuid <uuid>
feathercli server install-logs --uuid <uuid> --upload
```

### Configuration

```bash
# Setup configuration (interactive)
feathercli config setup

# Show current configuration
feathercli config show

# Set configuration value
feathercli config set <key> <value>

# Test API connection
feathercli config test
```

### General

```bash
# Show version
feathercli version
feathercli --version

# Show help
feathercli --help
feathercli <command> --help

# Enable verbose output
feathercli --verbose <command>
```

## Architecture

FeatherCli is built with a modular architecture that supports:

- **Command Modules** - Each feature is a separate module
- **Namespace Support** - Commands are organized by namespace (server, config, etc.)
- **Dependency Injection** - Clean separation of concerns
- **Extensible Design** - Easy to add new commands and features

### Project Structure

```
cli/
├── Core/
│   ├── Api/              # API client and models
│   ├── Commands/         # Command registry and interfaces
│   ├── Configuration/    # Configuration management
│   └── Models/           # Data models
├── Commands/
│   ├── Server/          # Server management commands
│   └── Config/          # Configuration commands
├── Program.cs           # Main entry point
├── install.sh           # Installation script
├── uninstall.sh         # Uninstallation script
└── Makefile             # Build configuration
```

## API Integration

FeatherCli integrates with the FeatherPanel API using:

- **Bearer Token Authentication** - Secure API key authentication
- **Session Validation** - Automatic connection testing
- **Error Handling** - Comprehensive error handling and logging
- **Rate Limiting** - Built-in rate limiting support

### Supported API Endpoints

- `GET /api/user/session` - User session information
- `GET /api/user/servers` - List user servers
- `POST /api/user/servers/{uuid}/power/start` - Start server
- `POST /api/user/servers/{uuid}/power/stop` - Stop server
- `POST /api/user/servers/{uuid}/power/restart` - Restart server
- `POST /api/user/servers/{uuid}/command` - Send server command

## Development

### Building from Source

```bash
# Install dependencies
dotnet restore

# Build the application
dotnet build

# Run tests
dotnet test

# Publish for distribution
make all
```

### Adding New Commands

1. Create a new command module implementing `ICommandModule`
2. Register the module in `CommandRegistry.RegisterModules()`
3. Add your command logic with proper error handling

Example:

```csharp
public class MyCommandModule : ICommandModule
{
    public string Name => "mycommand";
    public string Description => "My custom command";

    public Command CreateCommand(IServiceProvider serviceProvider)
    {
        var command = new Command(Name, Description);
        // Add your command logic here
        return command;
    }
}
```

## Troubleshooting

### Common Issues

1. **"Configuration not found"**

   - Run `feathercli config setup` to configure the application

2. **"Failed to connect to FeatherPanel API"**

   - Check your API URL and key
   - Ensure your FeatherPanel instance is accessible
   - Run `feathercli config test` to verify connection

3. **"Permission denied"**
   - Ensure you have proper permissions for the configuration directory
   - Run with `sudo` if needed for system-wide installation

### Debug Mode

Enable verbose output for debugging:

```bash
feathercli --verbose <command>
```

### Logs

FeatherCli uses structured logging. Check system logs for detailed information:

```bash
journalctl -u feathercli -f
```

## Uninstallation

```bash
sudo ./uninstall.sh
```

This will remove:

- FeatherCli binary
- Systemd service (if created)
- Service file
- Optionally: configuration directory and service user

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [GitHub Wiki](https://github.com/MythicalLTD/FeatherPanel/wiki)
- **Issues**: [GitHub Issues](https://github.com/MythicalLTD/FeatherPanel/issues)
- **Discord**: [MythicalSystems Discord](https://discord.gg/mythicalsystems)

## Changelog

### v1.0.0

- Initial release
- Full server management support
- Configuration management
- Modular command architecture
- API integration with FeatherPanel
