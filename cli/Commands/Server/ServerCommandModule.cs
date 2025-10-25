using System.CommandLine;
using Microsoft.Extensions.DependencyInjection;
using FeatherCli.Core.Commands;
using FeatherCli.Commands.Server.Commands;

namespace FeatherCli.Commands.Server;

public class ServerCommandModule : ICommandModule
{
    public string Name => "server";
    public string Description => "Manage game servers";

    public Command CreateCommand(IServiceProvider serviceProvider)
    {
        var serverCommand = new Command(Name, Description);

        // Create command instances
        var listCommand = new ServerListCommand();
        var powerCommands = new ServerPowerCommands();
        var logsCommand = new ServerLogsCommand();
        var infoCommand = new ServerInfoCommand();
        var commandCommand = new ServerCommandCommand();
        var reinstallCommand = new ServerReinstallCommand();

        // Add all commands
        serverCommand.AddCommand(listCommand.CreateCommand(serviceProvider));
        serverCommand.AddCommand(powerCommands.CreateStartCommand(serviceProvider));
        serverCommand.AddCommand(powerCommands.CreateStopCommand(serviceProvider));
        serverCommand.AddCommand(powerCommands.CreateRestartCommand(serviceProvider));
        serverCommand.AddCommand(powerCommands.CreateKillCommand(serviceProvider));
        serverCommand.AddCommand(logsCommand.CreateLogsCommand(serviceProvider));
        serverCommand.AddCommand(logsCommand.CreateInstallLogsCommand(serviceProvider));
        serverCommand.AddCommand(infoCommand.CreateInfoCommand(serviceProvider));
        serverCommand.AddCommand(commandCommand.CreateCommandCommand(serviceProvider));
        serverCommand.AddCommand(reinstallCommand.CreateReinstallCommand(serviceProvider));

        return serverCommand;
    }
}
