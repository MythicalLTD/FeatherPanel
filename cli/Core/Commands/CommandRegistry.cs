using System.CommandLine;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using FeatherCli.Core.Configuration;
using FeatherCli.Core.Api;
using FeatherCli.Commands.Server;
using FeatherCli.Commands.Config;

namespace FeatherCli.Core.Commands;

public interface ICommandModule
{
    string Name { get; }
    string Description { get; }
    Command CreateCommand(IServiceProvider serviceProvider);
}

public class CommandRegistry
{
    private readonly List<ICommandModule> _modules;
    private readonly IServiceProvider _serviceProvider;

    public CommandRegistry(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
        _modules = new List<ICommandModule>();
        RegisterModules();
    }

    private void RegisterModules()
    {
        // Register all command modules
        _modules.Add(new ServerCommandModule());
        _modules.Add(new ConfigCommandModule());
    }

    public RootCommand CreateRootCommand()
    {
        var rootCommand = new RootCommand("FeatherCli - Advanced FeatherPanel CLI tool");
        
        foreach (var module in _modules)
        {
            try
            {
                var command = module.CreateCommand(_serviceProvider);
                rootCommand.AddCommand(command);
            }
            catch (Exception ex)
            {
                var logger = _serviceProvider.GetRequiredService<ILogger<CommandRegistry>>();
                logger.LogError(ex, "Failed to create command for module {ModuleName}", module.Name);
            }
        }

        return rootCommand;
    }

    public void RegisterModule(ICommandModule module)
    {
        _modules.Add(module);
    }
}
