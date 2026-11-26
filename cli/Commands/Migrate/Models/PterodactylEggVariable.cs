namespace FeatherCli.Commands.Migrate.Models;

public class PterodactylEggVariable
{
    public int Id { get; set; }
    public int EggId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string EnvVariable { get; set; } = string.Empty;
    public string DefaultValue { get; set; } = string.Empty;
    public bool UserViewable { get; set; }
    public bool UserEditable { get; set; }
    public string? Rules { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

