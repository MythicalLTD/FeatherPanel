namespace FeatherCli.Commands.Migrate.Models;

/// <summary>
/// Pterodactyl v2 replaced nests with tags. Eggs are linked via taggables.
/// </summary>
public class PterodactylTag
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Color { get; set; }
    public int? LegacyNestId { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
