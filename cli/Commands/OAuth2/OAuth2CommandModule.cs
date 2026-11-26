using System.CommandLine;
using System.Reflection;
using System.Text;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Spectre.Console;
using FeatherCli.Core.Api.Models;
using FeatherCli.Core.Api.Services;
using FeatherCli.Core.Commands;

namespace FeatherCli.Commands.OAuth2;

public class OAuth2CommandModule : ICommandModule
{
    public string Name => "oauth2";
    public string Description => "OAuth2 API consent and token management";

    public Command CreateCommand(IServiceProvider serviceProvider)
    {
        var oauth2Command = new Command("oauth2", "OAuth2 API Consent: Documentation + Playground");

        // Add subcommands
        oauth2Command.AddCommand(CreateDocumentationCommand());
        oauth2Command.AddCommand(CreatePlaygroundCommand(serviceProvider));
        oauth2Command.AddCommand(CreateConsentCommand(serviceProvider));
        oauth2Command.AddCommand(CreateValidateCommand(serviceProvider));
        oauth2Command.AddCommand(CreateExchangeCommand(serviceProvider));

        return oauth2Command;
    }

    private Command CreateDocumentationCommand()
    {
        var command = new Command("docs", "Display OAuth2 API Consent documentation");

        command.SetHandler(() =>
        {
            DisplayDocumentation();
        });

        return command;
    }

    private Command CreatePlaygroundCommand(IServiceProvider serviceProvider)
    {
        var command = new Command("playground", "Interactive OAuth2 playground");

        var nameOption = new Option<string?>(
            new[] { "--name", "-n" },
            "API key/client name that will be created on approval");

        var callbackOption = new Option<string?>(
            new[] { "--callback", "-c" },
            "Absolute callback URL (supports https://, http://localhost, and custom schemes)");

        var appNameOption = new Option<string?>(
            new[] { "--app-name" },
            "Display name of requesting app");

        var appLogoOption = new Option<string?>(
            new[] { "--app-logo" },
            "Absolute URL of app logo");

        var descriptionOption = new Option<string?>(
            new[] { "--description", "-d" },
            "Consent description text shown to user");

        var modeOption = new Option<string>(
            new[] { "--mode", "-m" },
            getDefaultValue: () => "user",
            "user (default) for browser redirect, or server for server-to-server callback");

        var allowedIpsOption = new Option<string?>(
            new[] { "--allowed-ips" },
            "Comma/newline separated IPv4/IPv6/CIDR restrictions");

        var alertCorsOption = new Option<bool>(
            new[] { "--alert-cors" },
            getDefaultValue: () => false,
            "Enable foreign IP blocked-attempt notifications");

        command.AddOption(nameOption);
        command.AddOption(callbackOption);
        command.AddOption(appNameOption);
        command.AddOption(appLogoOption);
        command.AddOption(descriptionOption);
        command.AddOption(modeOption);
        command.AddOption(allowedIpsOption);
        command.AddOption(alertCorsOption);

        command.SetHandler(async (name, callback, appName, appLogo, description, mode, allowedIps, alertCors) =>
        {
            await RunPlaygroundAsync(serviceProvider, name, callback, appName, appLogo, description, mode, allowedIps, alertCors);
        }, nameOption, callbackOption, appNameOption, appLogoOption, descriptionOption, modeOption, allowedIpsOption, alertCorsOption);

        return command;
    }

    private Command CreateConsentCommand(IServiceProvider serviceProvider)
    {
        var command = new Command("consent", "Build and open OAuth2 consent screen");

        var nameOption = new Option<string>(
            new[] { "--name", "-n" },
            "API key/client name (required)");

        var callbackOption = new Option<string>(
            new[] { "--callback", "-c" },
            "Absolute callback URL (required)");

        var appNameOption = new Option<string?>(
            new[] { "--app-name" },
            "Display name of requesting app");

        var descriptionOption = new Option<string?>(
            new[] { "--description", "-d" },
            "Consent description text");

        var modeOption = new Option<string>(
            new[] { "--mode", "-m" },
            getDefaultValue: () => "user",
            "user or server mode");

        var allowedIpsOption = new Option<string?>(
            new[] { "--allowed-ips" },
            "IP restrictions");

        command.AddOption(nameOption);
        command.AddOption(callbackOption);
        command.AddOption(appNameOption);
        command.AddOption(descriptionOption);
        command.AddOption(modeOption);
        command.AddOption(allowedIpsOption);

        command.SetHandler(async (name, callback, appName, description, mode, allowedIps) =>
        {
            if (string.IsNullOrEmpty(name) || string.IsNullOrEmpty(callback))
            {
                AnsiConsole.MarkupLine("[red]✗ --name and --callback are required[/]");
                return;
            }
            await RunConsentAsync(serviceProvider, name, callback, appName, description, mode, allowedIps);
        }, nameOption, callbackOption, appNameOption, descriptionOption, modeOption, allowedIpsOption);

        return command;
    }

    private Command CreateValidateCommand(IServiceProvider serviceProvider)
    {
        var command = new Command("validate", "Validate OAuth2 credentials");

        var publicKeyOption = new Option<string>(
            new[] { "--public-key", "-p" },
            "Public key to validate (required)");

        command.AddOption(publicKeyOption);

        command.SetHandler(async (publicKey) =>
        {
            if (string.IsNullOrEmpty(publicKey))
            {
                AnsiConsole.MarkupLine("[red]✗ --public-key is required[/]");
                return;
            }
            await RunValidateAsync(serviceProvider, publicKey);
        }, publicKeyOption);

        return command;
    }

    private Command CreateExchangeCommand(IServiceProvider serviceProvider)
    {
        var command = new Command("exchange", "Exchange authorization code for credentials");

        var codeOption = new Option<string>(
            new[] { "--code", "-c" },
            "Authorization code to exchange (required)");

        command.AddOption(codeOption);

        command.SetHandler(async (code) =>
        {
            if (string.IsNullOrEmpty(code))
            {
                AnsiConsole.MarkupLine("[red]✗ --code is required[/]");
                return;
            }
            await RunExchangeAsync(serviceProvider, code);
        }, codeOption);

        return command;
    }

    private void DisplayDocumentation()
    {
        AnsiConsole.MarkupLine("[bold blue]OAuth2 API Consent: Documentation[/]");
        AnsiConsole.MarkupLine("[dim]Approved requests issue credentials with full account API access.[/]");
        AnsiConsole.MarkupLine("[yellow]Only approve trusted apps and secure your callback receiver.[/]\n");

        AnsiConsole.MarkupLine("[bold]Flow Overview[/]");
        AnsiConsole.MarkupLine("1. Build authorize URL to [cyan]/dashboard/account/oauth2/api/new?...params...[/]");
        AnsiConsole.MarkupLine("2. User reviews request and approves/denies consent");
        AnsiConsole.MarkupLine("3. [yellow]mode=user[/]: Panel redirects user to callback URL with result in URL fragment (#...)");
        AnsiConsole.MarkupLine("4. [yellow]mode=server[/]: Panel calls callback URL server-to-server with JSON credentials");
        AnsiConsole.MarkupLine("5. Optional: App exchanges one-time [yellow]authorization_code[/] via POST /api/user/api-clients/oauth2/token\n");

        AnsiConsole.MarkupLine("[bold]Query Parameters[/]");
        var table = new Table();
        table.AddColumn("Name");
        table.AddColumn("Required");
        table.AddColumn("Description");

        table.AddRow("name", "[green]Yes[/]", "API key/client name that will be created on approval");
        table.AddRow("callbackurl", "[green]Yes[/]", "Absolute callback URL (https://, localhost http://, custom schemes)");
        table.AddRow("allowedips", "No", "Comma/newline separated IPv4/IPv6/CIDR restrictions");
        table.AddRow("alertCors", "No", "true to enable foreign IP blocked-attempt notifications");
        table.AddRow("appName", "No", "Display name of requesting app");
        table.AddRow("appLogo", "No", "Absolute URL of app logo");
        table.AddRow("description", "No", "Consent description text shown to the user");
        table.AddRow("mode", "No", "user (default) for browser redirect, or server for server-to-server");

        AnsiConsole.Write(table);
        AnsiConsole.WriteLine();

        AnsiConsole.MarkupLine("[bold]Callback Responses[/]");
        AnsiConsole.MarkupLine("[yellow]User Mode (URL Fragment):[/]");
        AnsiConsole.MarkupLine("[cyan]Approve:[/] callbackurl#public_key=fp_...&private_key=fp_...&token_type=featherpanel_api_key&issued_at=...&authorization_code=fpoauthcode_...");
        AnsiConsole.MarkupLine("[cyan]Deny:[/] callbackurl#error=access_denied&error_description=The resource owner denied the request\n");

        AnsiConsole.MarkupLine("[yellow]Server Mode (JSON):[/]");
        AnsiConsole.MarkupLine("[cyan]{\"success\":true,\"token_type\":\"featherpanel_api_key\",\"public_key\":\"fp_...\",\"private_key\":\"fp_...\",\"authorization_code\":\"fpoauthcode_...\",\"issued_at\":\"...\"}[/]\n");

        AnsiConsole.MarkupLine("[bold]Validation Endpoints[/]");
        AnsiConsole.MarkupLine("[yellow]Client-side validation (before opening consent):[/]");
        AnsiConsole.MarkupLine("GET /api/user/api-clients/oauth2/metadata?...params...");
        AnsiConsole.MarkupLine("[dim](requires user to be logged in)[/]\n");

        AnsiConsole.MarkupLine("[yellow]Token Exchange:[/]");
        AnsiConsole.MarkupLine("POST /api/user/api-clients/oauth2/token");
        AnsiConsole.MarkupLine("[dim]Content-Type: application/json[/]");
        AnsiConsole.MarkupLine("[dim]{\"code\":\"fpoauthcode_...\"}[/]\n");

        AnsiConsole.MarkupLine("[yellow]Credential Validation:[/]");
        AnsiConsole.MarkupLine("POST /api/user/api-clients/validate");
        AnsiConsole.MarkupLine("[dim]Content-Type: application/json[/]");
        AnsiConsole.MarkupLine("[dim]{\"public_key\":\"fp_...\"}[/]\n");
    }

    private async Task RunPlaygroundAsync(
        IServiceProvider serviceProvider,
        string? name,
        string? callback,
        string? appName,
        string? appLogo,
        string? description,
        string mode,
        string? allowedIps,
        bool alertCors)
    {
        var oauth2Service = serviceProvider.GetRequiredService<OAuth2Service>();
        var logger = serviceProvider.GetRequiredService<ILogger<OAuth2CommandModule>>();

        if (string.IsNullOrEmpty(name) || string.IsNullOrEmpty(callback))
        {
            AnsiConsole.MarkupLine("[yellow]OAuth2 Playground[/]");
            name = AnsiConsole.Ask<string>("[bold]Name[/] (required):");
            callback = AnsiConsole.Ask<string>("[bold]Callback URL[/] (required):");
            appName = AnsiConsole.Ask<string>("[bold]App Name[/] (optional, press Enter to skip):");
            if (string.IsNullOrWhiteSpace(appName)) appName = null;

            var showMore = AnsiConsole.Confirm("[bold]Configure advanced options?[/]");
            if (showMore)
            {
                description = AnsiConsole.Ask<string>("[bold]Description[/] (optional):");
                if (string.IsNullOrWhiteSpace(description)) description = null;

                allowedIps = AnsiConsole.Ask<string>("[bold]Allowed IPs[/] (optional, comma/newline separated):");
                if (string.IsNullOrWhiteSpace(allowedIps)) allowedIps = null;

                mode = AnsiConsole.Prompt(
                    new SelectionPrompt<string>()
                        .Title("[bold]Mode[/]")
                        .PageSize(10)
                        .AddChoices(new[] { "user", "server" }));

                alertCors = AnsiConsole.Confirm("[bold]Alert on CORS violations?[/]");
            }
        }

        var request = new OAuth2AuthorizationRequest
        {
            Name = name,
            CallbackUrl = callback,
            AppName = appName,
            Description = description,
            Mode = mode,
            AllowedIps = allowedIps,
            AlertCors = alertCors
        };

        AnsiConsole.MarkupLine("\n[bold]Validating parameters...[/]");
        var metadata = await oauth2Service.ValidateMetadataAsync(request);

        if (metadata == null || !metadata.Success)
        {
            AnsiConsole.MarkupLine($"[red]✗ Validation failed: {metadata?.Error ?? "Unknown error"}[/]");
            return;
        }

        AnsiConsole.MarkupLine("[green]✓ Parameters validated successfully[/]\n");

        var authUrl = await oauth2Service.BuildAuthorizationUrlAsync(request);
        if (string.IsNullOrEmpty(authUrl))
        {
            AnsiConsole.MarkupLine("[red]✗ Failed to build authorization URL[/]");
            return;
        }

        AnsiConsole.MarkupLine("[bold]Generated Authorization URL:[/]");
        AnsiConsole.MarkupLine($"[cyan]{authUrl}[/]\n");

        AnsiConsole.MarkupLine("[bold]Next Steps:[/]");
        AnsiConsole.MarkupLine("1. Copy the URL above");
        AnsiConsole.MarkupLine("2. Open it in a web browser");
        AnsiConsole.MarkupLine("3. Review the consent request");
        AnsiConsole.MarkupLine("4. Approve to receive credentials at your callback URL");

        if (mode == "user")
        {
            AnsiConsole.MarkupLine("\n[dim][yellow]User Mode:[/] The credentials will appear in the URL fragment (#...) of your callback URL[/]");
        }
        else
        {
            AnsiConsole.MarkupLine("\n[dim][yellow]Server Mode:[/] The credentials will be POSTed as JSON to your callback URL[/]");
        }
    }

    private async Task RunConsentAsync(
        IServiceProvider serviceProvider,
        string name,
        string callback,
        string? appName,
        string? description,
        string mode,
        string? allowedIps)
    {
        var oauth2Service = serviceProvider.GetRequiredService<OAuth2Service>();

        var request = new OAuth2AuthorizationRequest
        {
            Name = name,
            CallbackUrl = callback,
            AppName = appName,
            Description = description,
            Mode = mode,
            AllowedIps = allowedIps
        };

        var authUrl = await oauth2Service.BuildAuthorizationUrlAsync(request);
        if (string.IsNullOrEmpty(authUrl))
        {
            AnsiConsole.MarkupLine("[red]✗ Failed to build authorization URL[/]");
            return;
        }

        AnsiConsole.MarkupLine("[green]✓ Authorization URL built successfully[/]");
        AnsiConsole.MarkupLine($"[cyan]{authUrl}[/]");
    }

    private async Task RunValidateAsync(IServiceProvider serviceProvider, string publicKey)
    {
        var oauth2Service = serviceProvider.GetRequiredService<OAuth2Service>();

        AnsiConsole.MarkupLine("[bold]Validating credentials...[/]");
        var validation = await oauth2Service.ValidateCredentialsAsync(publicKey);

        if (validation == null)
        {
            AnsiConsole.MarkupLine("[red]✗ Validation request failed[/]");
            return;
        }

        if (validation.Valid)
        {
            AnsiConsole.MarkupLine("[green]✓ Credentials are valid[/]");
        }
        else
        {
            AnsiConsole.MarkupLine($"[red]✗ Credentials are invalid: {validation.Error}[/]");
        }
    }

    private async Task RunExchangeAsync(IServiceProvider serviceProvider, string code)
    {
        var oauth2Service = serviceProvider.GetRequiredService<OAuth2Service>();

        AnsiConsole.MarkupLine("[bold]Exchanging authorization code...[/]");
        var tokenResponse = await oauth2Service.ExchangeCodeAsync(code);

        if (tokenResponse == null || !tokenResponse.Success)
        {
            AnsiConsole.MarkupLine($"[red]✗ Token exchange failed: {tokenResponse?.Error ?? "Unknown error"}[/]");
            return;
        }

        AnsiConsole.MarkupLine("[green]✓ Token exchange successful[/]\n");

        var table = new Table();
        table.AddColumn("Property");
        table.AddColumn("Value");
        table.AddRow("Token Type", tokenResponse.TokenType ?? "N/A");
        table.AddRow("Public Key", MaskSecret(tokenResponse.PublicKey ?? "N/A"));
        table.AddRow("Private Key", MaskSecret(tokenResponse.PrivateKey ?? "N/A"));
        table.AddRow("Issued At", tokenResponse.IssuedAt ?? "N/A");

        AnsiConsole.Write(table);
    }

    private string MaskSecret(string value)
    {
        if (value.Length <= 8)
            return value;

        var visibleChars = Math.Max(4, value.Length / 4);
        var start = value.Substring(0, visibleChars);
        var end = value.Substring(value.Length - visibleChars);
        return $"{start}...{end}";
    }
}
