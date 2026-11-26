namespace FeatherCli.Commands.Migrate.Models;

public class StagingDatabaseOptions
{
    public string Host { get; set; } = "127.0.0.1";
    public string Port { get; set; } = "3306";
    public string Username { get; set; } = "root";
    public string Password { get; set; } = "";
}
