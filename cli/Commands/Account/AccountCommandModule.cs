using System.CommandLine;
using Microsoft.Extensions.DependencyInjection;
using FeatherCli.Core.Commands;
using FeatherCli.Core.Configuration;
using FeatherCli.Core.Api;
using Spectre.Console;

namespace FeatherCli.Commands.Account;

public class AccountCommandModule : ICommandModule
{
    public string Name => "account";
    public string Description => "Account, SSH keys, and notifications";

    public Command CreateCommand(IServiceProvider serviceProvider)
    {
        var root = new Command(Name, Description);
        root.AddCommand(CreateMeCommand(serviceProvider));
        root.AddCommand(CreateSshKeysCommand(serviceProvider));
        root.AddCommand(CreateNotificationsCommand(serviceProvider));
        return root;
    }

    private static Command CreateMeCommand(IServiceProvider serviceProvider)
    {
        var cmd = new Command("me", "Show the current user session");
        cmd.SetHandler(async () =>
        {
            var api = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            var config = serviceProvider.GetRequiredService<ConfigManager>();

            if (!await config.IsConfiguredAsync() || !await api.ValidateConnectionAsync())
            {
                AnsiConsole.MarkupLine("[red]✗ API not configured or unreachable. Run 'feathercli config setup'.[/]");
                return;
            }

            try
            {
                var session = await api.GetUserSessionAsync();
                var user = session?.UserInfo;
                if (user == null)
                {
                    AnsiConsole.MarkupLine("[red]✗ Could not load session[/]");
                    return;
                }

                var table = new Table();
                table.AddColumn("Field");
                table.AddColumn("Value");
                table.AddRow("ID", user.Id.ToString());
                table.AddRow("Username", Markup.Escape(user.Username ?? "-"));
                table.AddRow("Email", Markup.Escape(user.Email ?? "-"));
                table.AddRow("Name", Markup.Escape($"{user.FirstName} {user.LastName}".Trim()));
                table.AddRow("UUID", Markup.Escape(user.Uuid ?? "-"));
                table.AddRow("2FA", user.TwoFaEnabled == "true" || user.TwoFaEnabled == "1" ? "enabled" : "disabled");
                table.AddRow("Role ID", user.RoleId.ToString());
                AnsiConsole.Write(table);

                if (session?.Permissions?.Count > 0)
                {
                    AnsiConsole.WriteLine();
                    AnsiConsole.MarkupLine($"[dim]Permissions: {session.Permissions.Count}[/]");
                }
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ {Markup.Escape(ex.Message)}[/]");
            }
        });
        return cmd;
    }

    private static Command CreateSshKeysCommand(IServiceProvider serviceProvider)
    {
        var root = new Command("ssh-keys", "Manage SSH keys");
        root.AddCommand(CreateSshListCommand(serviceProvider));
        root.AddCommand(CreateSshAddCommand(serviceProvider));
        root.AddCommand(CreateSshDeleteCommand(serviceProvider));
        return root;
    }

    private static Command CreateSshListCommand(IServiceProvider serviceProvider)
    {
        var cmd = new Command("list", "List SSH keys");
        cmd.SetHandler(async () =>
        {
            var api = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            var config = serviceProvider.GetRequiredService<ConfigManager>();
            if (!await config.IsConfiguredAsync() || !await api.ValidateConnectionAsync())
            {
                AnsiConsole.MarkupLine("[red]✗ API not configured or unreachable.[/]");
                return;
            }

            try
            {
                var result = await api.ListSshKeysAsync();
                var keys = result.SshKeys ?? new();
                if (keys.Count == 0)
                {
                    AnsiConsole.MarkupLine("[yellow]No SSH keys found.[/]");
                    return;
                }

                var table = new Table();
                table.AddColumn("ID");
                table.AddColumn("Name");
                table.AddColumn("Fingerprint");
                table.AddColumn("Created");

                foreach (var key in keys)
                {
                    table.AddRow(
                        key.Id.ToString(),
                        Markup.Escape(key.Name ?? "-"),
                        Markup.Escape(key.Fingerprint ?? "-"),
                        key.CreatedAt ?? "-");
                }

                AnsiConsole.Write(table);
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ {Markup.Escape(ex.Message)}[/]");
            }
        });
        return cmd;
    }

    private static Command CreateSshAddCommand(IServiceProvider serviceProvider)
    {
        var cmd = new Command("add", "Add an SSH key");
        var nameOption = new Option<string>("--name", "Key name") { IsRequired = true };
        var keyOption = new Option<string?>("--key", "Public key contents");
        var fileOption = new Option<string?>("--file", "Path to public key file");
        cmd.AddOption(nameOption);
        cmd.AddOption(keyOption);
        cmd.AddOption(fileOption);

        cmd.SetHandler(async (string name, string? key, string? file) =>
        {
            var api = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            var config = serviceProvider.GetRequiredService<ConfigManager>();
            if (!await config.IsConfiguredAsync() || !await api.ValidateConnectionAsync())
            {
                AnsiConsole.MarkupLine("[red]✗ API not configured or unreachable.[/]");
                return;
            }

            if (string.IsNullOrWhiteSpace(key) && !string.IsNullOrWhiteSpace(file))
            {
                if (!File.Exists(file))
                {
                    AnsiConsole.MarkupLine($"[red]✗ File not found: {Markup.Escape(file)}[/]");
                    return;
                }

                key = await File.ReadAllTextAsync(file);
            }

            if (string.IsNullOrWhiteSpace(key))
            {
                AnsiConsole.MarkupLine("[red]✗ Provide --key or --file[/]");
                return;
            }

            try
            {
                var created = await api.CreateSshKeyAsync(name, key.Trim());
                AnsiConsole.MarkupLine($"[green]✓ SSH key added: {Markup.Escape(created.Name ?? name)} (#{created.Id})[/]");
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ {Markup.Escape(ex.Message)}[/]");
            }
        }, nameOption, keyOption, fileOption);

        return cmd;
    }

    private static Command CreateSshDeleteCommand(IServiceProvider serviceProvider)
    {
        var cmd = new Command("delete", "Delete an SSH key");
        var idOption = new Option<int>("--id", "SSH key ID") { IsRequired = true };
        var forceOption = new Option<bool>("--force", () => false, "Skip confirmation");
        cmd.AddOption(idOption);
        cmd.AddOption(forceOption);

        cmd.SetHandler(async (int id, bool force) =>
        {
            var api = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            var config = serviceProvider.GetRequiredService<ConfigManager>();
            if (!await config.IsConfiguredAsync() || !await api.ValidateConnectionAsync())
            {
                AnsiConsole.MarkupLine("[red]✗ API not configured or unreachable.[/]");
                return;
            }

            if (!force && !AnsiConsole.Confirm($"Delete SSH key #{id}?", false))
            {
                return;
            }

            try
            {
                await api.DeleteSshKeyAsync(id);
                AnsiConsole.MarkupLine("[green]✓ SSH key deleted[/]");
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ {Markup.Escape(ex.Message)}[/]");
            }
        }, idOption, forceOption);

        return cmd;
    }

    private static Command CreateNotificationsCommand(IServiceProvider serviceProvider)
    {
        var root = new Command("notifications", "Manage notifications");
        root.AddCommand(CreateNotificationsListCommand(serviceProvider));
        root.AddCommand(CreateNotificationsDismissCommand(serviceProvider));
        return root;
    }

    private static Command CreateNotificationsListCommand(IServiceProvider serviceProvider)
    {
        var cmd = new Command("list", "List notifications");
        cmd.SetHandler(async () =>
        {
            var api = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            var config = serviceProvider.GetRequiredService<ConfigManager>();
            if (!await config.IsConfiguredAsync() || !await api.ValidateConnectionAsync())
            {
                AnsiConsole.MarkupLine("[red]✗ API not configured or unreachable.[/]");
                return;
            }

            try
            {
                var notifications = await api.ListNotificationsAsync();
                if (notifications.Count == 0)
                {
                    AnsiConsole.MarkupLine("[yellow]No notifications.[/]");
                    return;
                }

                var table = new Table();
                table.AddColumn("ID");
                table.AddColumn("Type");
                table.AddColumn("Title");
                table.AddColumn("Created");

                foreach (var n in notifications)
                {
                    table.AddRow(
                        n.Id.ToString(),
                        n.Type ?? "-",
                        Markup.Escape(n.Title ?? "-"),
                        n.CreatedAt ?? "-");
                }

                AnsiConsole.Write(table);
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ {Markup.Escape(ex.Message)}[/]");
            }
        });
        return cmd;
    }

    private static Command CreateNotificationsDismissCommand(IServiceProvider serviceProvider)
    {
        var cmd = new Command("dismiss", "Dismiss a notification");
        var idOption = new Option<int>("--id", "Notification ID") { IsRequired = true };
        cmd.AddOption(idOption);

        cmd.SetHandler(async (int id) =>
        {
            var api = serviceProvider.GetRequiredService<FeatherPanelApiClient>();
            var config = serviceProvider.GetRequiredService<ConfigManager>();
            if (!await config.IsConfiguredAsync() || !await api.ValidateConnectionAsync())
            {
                AnsiConsole.MarkupLine("[red]✗ API not configured or unreachable.[/]");
                return;
            }

            try
            {
                await api.DismissNotificationAsync(id);
                AnsiConsole.MarkupLine("[green]✓ Notification dismissed[/]");
            }
            catch (Exception ex)
            {
                AnsiConsole.MarkupLine($"[red]✗ {Markup.Escape(ex.Message)}[/]");
            }
        }, idOption);

        return cmd;
    }
}
