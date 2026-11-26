namespace FeatherCli.Commands.Migrate.Models;

public class PterodactylAllocation
{
    public int Id { get; set; }
    public int NodeId { get; set; }
    public string Ip { get; set; } = string.Empty;
    public string? IpAlias { get; set; }
    public int Port { get; set; }
    public int? ServerId { get; set; }
    public string? Notes { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

