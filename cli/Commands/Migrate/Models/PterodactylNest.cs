namespace FeatherCli.Commands.Migrate.Models;

public class PterodactylNest
{
    public int Id { get; set; }
    public string Uuid { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

