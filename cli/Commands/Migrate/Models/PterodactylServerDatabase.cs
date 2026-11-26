namespace FeatherCli.Commands.Migrate.Models;

public class PterodactylServerDatabase
{
    public int Id { get; set; }
    public int ServerId { get; set; }
    public int DatabaseHostId { get; set; }
    public string Database { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Remote { get; set; } = "%";
    public string Password { get; set; } = string.Empty; // Encrypted
    public int MaxConnections { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

