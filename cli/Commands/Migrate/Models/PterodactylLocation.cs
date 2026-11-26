namespace FeatherCli.Commands.Migrate.Models;

public class PterodactylLocation
{
    public int Id { get; set; }
    public string Short { get; set; } = string.Empty;
    public string? Long { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

