namespace FeatherCli.Commands.Migrate.Models;

public class PterodactylBackup
{
    public long Id { get; set; }
    public int ServerId { get; set; }
    public string Uuid { get; set; } = string.Empty;
    public string? UploadId { get; set; }
    public bool IsSuccessful { get; set; }
    public bool IsLocked { get; set; }
    public string Name { get; set; } = string.Empty;
    public string IgnoredFiles { get; set; } = "[]";
    public string Disk { get; set; } = "wings";
    public string? Checksum { get; set; }
    public long Bytes { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

