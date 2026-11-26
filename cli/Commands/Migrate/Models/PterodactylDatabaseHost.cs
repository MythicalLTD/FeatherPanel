namespace FeatherCli.Commands.Migrate.Models;

public class PterodactylDatabaseHost
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty; // Encrypted
    public int? MaxDatabases { get; set; }
    public int? NodeId { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

