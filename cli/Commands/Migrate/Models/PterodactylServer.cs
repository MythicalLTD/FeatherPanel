namespace FeatherCli.Commands.Migrate.Models;

public class PterodactylServer
{
    public int Id { get; set; }
    public string Uuid { get; set; } = string.Empty;
    public string UuidShort { get; set; } = string.Empty;
    public int NodeId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Status { get; set; }
    public bool SkipScripts { get; set; }
    public int OwnerId { get; set; }
    public int Memory { get; set; }
    public int Swap { get; set; }
    public int Disk { get; set; }
    public int Io { get; set; }
    public int Cpu { get; set; }
    public string? Threads { get; set; }
    public bool OomDisabled { get; set; }
    public int AllocationId { get; set; }
    public int NestId { get; set; }
    public int EggId { get; set; }
    public string Startup { get; set; } = string.Empty;
    public string Image { get; set; } = string.Empty;
    public int? AllocationLimit { get; set; }
    public int DatabaseLimit { get; set; }
    public int BackupLimit { get; set; }
    public int? ParentId { get; set; }
    public string? ExternalId { get; set; }
    public DateTime? InstalledAt { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

