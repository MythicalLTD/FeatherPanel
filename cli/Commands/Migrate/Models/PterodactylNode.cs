namespace FeatherCli.Commands.Migrate.Models;

public class PterodactylNode
{
    public int Id { get; set; }
    public string Uuid { get; set; } = string.Empty;
    public bool Public { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int LocationId { get; set; }
    public string Fqdn { get; set; } = string.Empty;
    public string Scheme { get; set; } = "https";
    public bool BehindProxy { get; set; }
    public bool MaintenanceMode { get; set; }
    public int Memory { get; set; }
    public int MemoryOverallocate { get; set; }
    public int Disk { get; set; }
    public int DiskOverallocate { get; set; }
    public int UploadSize { get; set; } = 100;
    public string DaemonTokenId { get; set; } = string.Empty;
    public string DaemonToken { get; set; } = string.Empty; // Encrypted
    public int DaemonListen { get; set; } = 8080;
    public int DaemonSFTP { get; set; } = 2022;
    public string DaemonBase { get; set; } = "/home/daemon-files";
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

