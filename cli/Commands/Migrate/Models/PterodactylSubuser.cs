namespace FeatherCli.Commands.Migrate.Models;

public class PterodactylSubuser
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int ServerId { get; set; }
    public string Permissions { get; set; } = "[]"; // JSON string
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

