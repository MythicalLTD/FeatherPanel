using System.CommandLine;
using System.Text;
using Microsoft.Extensions.DependencyInjection;
using FeatherCli.Core.Configuration;
using FeatherCli.Core.Api;
using Spectre.Console;

namespace FeatherCli.Commands.Server.Commands;

public class ServerFileCommands : BaseServerCommand
{
    public Command CreateCommand(IServiceProvider serviceProvider)
    {
        var root = new Command("files", "Manage server files");
        root.AddCommand(CreateListCommand(serviceProvider));
        root.AddCommand(CreateReadCommand(serviceProvider));
        root.AddCommand(CreateWriteCommand(serviceProvider));
        root.AddCommand(CreateDeleteCommand(serviceProvider));
        root.AddCommand(CreateMkdirCommand(serviceProvider));
        return root;
    }

    private Command CreateListCommand(IServiceProvider serviceProvider)
    {
        var cmd = new Command("list", "List files in a directory");
        var uuidOption = new Option<string?>("--uuid", "Server UUID or short UUID");
        var pathOption = new Option<string>("--path", () => "/", "Directory path");
        cmd.AddOption(uuidOption);
        cmd.AddOption(pathOption);

        cmd.SetHandler(async (string? uuid, string path) =>
        {
            var api = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            var config = serviceProvider.GetRequiredService<ConfigManager>();
            if (!await ValidateConfigurationAsync(config, api)) return;

            uuid = await ResolveServerUuidAsync(api, config, uuid);
            if (uuid == null) return;

            try
            {
                var files = await api.ListFilesAsync(uuid, path);
                if (files.Count == 0)
                {
                    AnsiConsole.MarkupLine("[yellow]Directory is empty.[/]");
                    return;
                }

                var table = new Table();
                table.AddColumn("Type");
                table.AddColumn("Name");
                table.AddColumn("Size");
                table.AddColumn("Modified");

                foreach (var file in files.OrderBy(f => f.Type != "directory").ThenBy(f => f.Name))
                {
                    var size = file.Type == "directory"
                        ? (file.DirectorySize?.ToString() ?? "-")
                        : (file.Size?.ToString() ?? "-");
                    table.AddRow(
                        file.Type ?? "-",
                        Markup.Escape(file.Name ?? "-"),
                        size,
                        file.ModifiedAt ?? "-");
                }

                AnsiConsole.Write(table);
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ {Markup.Escape(ex.Message)}[/]");
            }
        }, uuidOption, pathOption);

        return cmd;
    }

    private Command CreateReadCommand(IServiceProvider serviceProvider)
    {
        var cmd = new Command("read", "Read a file");
        var uuidOption = new Option<string?>("--uuid", "Server UUID or short UUID");
        var pathOption = new Option<string>("--path", "Remote file path") { IsRequired = true };
        var outOption = new Option<string?>("--out", "Write to local file instead of stdout");
        cmd.AddOption(uuidOption);
        cmd.AddOption(pathOption);
        cmd.AddOption(outOption);

        cmd.SetHandler(async (string? uuid, string path, string? outPath) =>
        {
            var api = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            var config = serviceProvider.GetRequiredService<ConfigManager>();
            if (!await ValidateConfigurationAsync(config, api)) return;

            uuid = await ResolveServerUuidAsync(api, config, uuid);
            if (uuid == null) return;

            try
            {
                var bytes = await api.ReadFileAsync(uuid, path);
                if (!string.IsNullOrEmpty(outPath))
                {
                    await File.WriteAllBytesAsync(outPath, bytes);
                    AnsiConsole.MarkupLine($"[green]✓ Wrote {bytes.Length} bytes to {Markup.Escape(outPath)}[/]");
                    return;
                }

                Console.Write(Encoding.UTF8.GetString(bytes));
                if (bytes.Length == 0 || bytes[^1] != (byte)'\n')
                {
                    Console.WriteLine();
                }
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ {Markup.Escape(ex.Message)}[/]");
            }
        }, uuidOption, pathOption, outOption);

        return cmd;
    }

    private Command CreateWriteCommand(IServiceProvider serviceProvider)
    {
        var cmd = new Command("write", "Write a local file to the server");
        var uuidOption = new Option<string?>("--uuid", "Server UUID or short UUID");
        var pathOption = new Option<string>("--path", "Remote file path") { IsRequired = true };
        var fileOption = new Option<string>("--file", "Local file to upload") { IsRequired = true };
        cmd.AddOption(uuidOption);
        cmd.AddOption(pathOption);
        cmd.AddOption(fileOption);

        cmd.SetHandler(async (string? uuid, string path, string file) =>
        {
            var api = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            var config = serviceProvider.GetRequiredService<ConfigManager>();
            if (!await ValidateConfigurationAsync(config, api)) return;

            uuid = await ResolveServerUuidAsync(api, config, uuid);
            if (uuid == null) return;

            if (!File.Exists(file))
            {
                AnsiConsole.MarkupLine($"[red]✗ Local file not found: {Markup.Escape(file)}[/]");
                return;
            }

            try
            {
                var bytes = await File.ReadAllBytesAsync(file);
                await api.WriteFileAsync(uuid, path, bytes);
                AnsiConsole.MarkupLine($"[green]✓ Wrote {bytes.Length} bytes to {Markup.Escape(path)}[/]");
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ {Markup.Escape(ex.Message)}[/]");
            }
        }, uuidOption, pathOption, fileOption);

        return cmd;
    }

    private Command CreateDeleteCommand(IServiceProvider serviceProvider)
    {
        var cmd = new Command("delete", "Delete files or directories");
        var uuidOption = new Option<string?>("--uuid", "Server UUID or short UUID");
        var pathOption = new Option<string[]>("--path", "Paths to delete") { IsRequired = true, AllowMultipleArgumentsPerToken = true };
        var rootOption = new Option<string>("--root", () => "/", "Root directory");
        var forceOption = new Option<bool>("--force", () => false, "Skip confirmation");
        cmd.AddOption(uuidOption);
        cmd.AddOption(pathOption);
        cmd.AddOption(rootOption);
        cmd.AddOption(forceOption);

        cmd.SetHandler(async (string? uuid, string[] paths, string root, bool force) =>
        {
            var api = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            var config = serviceProvider.GetRequiredService<ConfigManager>();
            if (!await ValidateConfigurationAsync(config, api)) return;

            uuid = await ResolveServerUuidAsync(api, config, uuid);
            if (uuid == null) return;

            if (!force && !AnsiConsole.Confirm($"Delete {paths.Length} item(s)?", false))
            {
                return;
            }

            try
            {
                await api.DeleteFilesAsync(uuid, paths, root);
                AnsiConsole.MarkupLine("[green]✓ Deleted[/]");
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ {Markup.Escape(ex.Message)}[/]");
            }
        }, uuidOption, pathOption, rootOption, forceOption);

        return cmd;
    }

    private Command CreateMkdirCommand(IServiceProvider serviceProvider)
    {
        var cmd = new Command("mkdir", "Create a directory");
        var uuidOption = new Option<string?>("--uuid", "Server UUID or short UUID");
        var pathOption = new Option<string>("--path", "Parent directory") { IsRequired = true };
        var nameOption = new Option<string>("--name", "Directory name") { IsRequired = true };
        cmd.AddOption(uuidOption);
        cmd.AddOption(pathOption);
        cmd.AddOption(nameOption);

        cmd.SetHandler(async (string? uuid, string path, string name) =>
        {
            var api = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            var config = serviceProvider.GetRequiredService<ConfigManager>();
            if (!await ValidateConfigurationAsync(config, api)) return;

            uuid = await ResolveServerUuidAsync(api, config, uuid);
            if (uuid == null) return;

            try
            {
                await api.CreateDirectoryAsync(uuid, path, name);
                AnsiConsole.MarkupLine($"[green]✓ Created directory {Markup.Escape(name)}[/]");
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ {Markup.Escape(ex.Message)}[/]");
            }
        }, uuidOption, pathOption, nameOption);

        return cmd;
    }
}
