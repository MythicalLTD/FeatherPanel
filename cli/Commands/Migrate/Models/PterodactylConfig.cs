namespace FeatherCli.Commands.Migrate.Models;

public class PterodactylConfig
{
    // Application settings
    public string? AppKey { get; set; }
    public string? AppTimezone { get; set; }
    public string? AppDebug { get; set; }

    // Database settings
    public string? DbConnection { get; set; }
    public string? DbHost { get; set; }
    public string? DbPort { get; set; }
    public string? DbDatabase { get; set; }
    public string? DbUsername { get; set; }
    public string? DbPassword { get; set; }

    // Hashids settings
    public string? HashidsSalt { get; set; }
    public string? HashidsLength { get; set; }

    // Mail settings
    public string? MailMailer { get; set; }
    public string? MailHost { get; set; }
    public string? MailPort { get; set; }
    public string? MailUsername { get; set; }
    public string? MailPassword { get; set; }
    public string? MailEncryption { get; set; }
    public string? MailFromAddress { get; set; }
    public string? MailFromName { get; set; }

    // Service settings
    public string? AppServiceAuthor { get; set; }
    public string? PterodactylTelemetryEnabled { get; set; }
}

