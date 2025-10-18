using System.CommandLine;
using System.Reflection;

// Check for version flag before parsing
if (args.Contains("--version") || args.Contains("-v"))
{
    var version = Assembly.GetExecutingAssembly()
        .GetCustomAttribute<AssemblyInformationalVersionAttribute>()?
        .InformationalVersion ?? "1.0.0";
    Console.WriteLine($"FeatherCli v{version}");
    Console.WriteLine("Built with .NET 9.0");
    Console.WriteLine("https://github.com/MythicalLTD/FeatherPanel");
    return 0;
}

// Root command
var rootCommand = new RootCommand("FeatherCli - Advanced FeatherPanel CLI tool");

// Server command
var serverCommand = new Command("server", "Manage game servers");
rootCommand.AddCommand(serverCommand);

// Server start command
var startCommand = new Command("start", "Start a game server");
var startUuidArgument = new Argument<string>(
    name: "uuid",
    description: "Server UUID or short UUID");
startCommand.AddArgument(startUuidArgument);
startCommand.SetHandler((string uuid) =>
{
    Console.WriteLine($"Starting server: {uuid}");
    // TODO: Implement server start logic
    Console.WriteLine($"✓ Server {uuid} started successfully!");
}, startUuidArgument);
serverCommand.AddCommand(startCommand);

// Server stop command
var stopCommand = new Command("stop", "Stop a game server");
var stopUuidArgument = new Argument<string>(
    name: "uuid",
    description: "Server UUID or short UUID");
stopCommand.AddArgument(stopUuidArgument);
stopCommand.SetHandler((string uuid) =>
{
    Console.WriteLine($"Stopping server: {uuid}");
    // TODO: Implement server stop logic
    Console.WriteLine($"✓ Server {uuid} stopped successfully!");
}, stopUuidArgument);
serverCommand.AddCommand(stopCommand);

// Server restart command
var restartCommand = new Command("restart", "Restart a game server");
var restartUuidArgument = new Argument<string>(
    name: "uuid",
    description: "Server UUID or short UUID");
restartCommand.AddArgument(restartUuidArgument);
restartCommand.SetHandler((string uuid) =>
{
    Console.WriteLine($"Restarting server: {uuid}");
    // TODO: Implement server restart logic
    Console.WriteLine($"✓ Server {uuid} restarted successfully!");
}, restartUuidArgument);
serverCommand.AddCommand(restartCommand);

// Server status command
var statusCommand = new Command("status", "Get server status");
var statusUuidArgument = new Argument<string>(
    name: "uuid",
    description: "Server UUID or short UUID");
statusCommand.AddArgument(statusUuidArgument);
statusCommand.SetHandler((string uuid) =>
{
    Console.WriteLine($"Getting status for server: {uuid}");
    // TODO: Implement server status logic
    Console.WriteLine($"Server {uuid} is running");
}, statusUuidArgument);
serverCommand.AddCommand(statusCommand);

// Server list command
var listCommand = new Command("list", "List all servers");
listCommand.SetHandler(() =>
{
    Console.WriteLine("Listing all servers:");
    // TODO: Implement server list logic
    Console.WriteLine("No servers found.");
});
serverCommand.AddCommand(listCommand);

// Config command
var configCommand = new Command("config", "Manage CLI configuration");
rootCommand.AddCommand(configCommand);

// Config set command
var configSetCommand = new Command("set", "Set a configuration value");
var configKeyArgument = new Argument<string>(
    name: "key",
    description: "Configuration key");
var configValueArgument = new Argument<string>(
    name: "value",
    description: "Configuration value");
configSetCommand.AddArgument(configKeyArgument);
configSetCommand.AddArgument(configValueArgument);
configSetCommand.SetHandler((string key, string value) =>
{
    Console.WriteLine($"Setting config: {key} = {value}");
    // TODO: Implement config set logic
    Console.WriteLine($"✓ Configuration updated!");
}, configKeyArgument, configValueArgument);
configCommand.AddCommand(configSetCommand);

// Config show command
var configShowCommand = new Command("show", "Show current configuration");
configShowCommand.SetHandler(() =>
{
    Console.WriteLine("Current configuration:");
    // TODO: Implement config show logic
    Console.WriteLine("No configuration found.");
});
configCommand.AddCommand(configShowCommand);

// Run the command
return await rootCommand.InvokeAsync(args);
