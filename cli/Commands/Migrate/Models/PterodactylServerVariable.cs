namespace FeatherCli.Commands.Migrate.Models;

public class PterodactylServerVariable
{
    public int Id { get; set; }
    public int ServerId { get; set; }
    public int VariableId { get; set; } // This is the egg_variable_id
    public string VariableValue { get; set; } = string.Empty;
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

