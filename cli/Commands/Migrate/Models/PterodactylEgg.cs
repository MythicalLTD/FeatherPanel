namespace FeatherCli.Commands.Migrate.Models;

public class PterodactylEgg
{
    public int Id { get; set; }
    public string Uuid { get; set; } = string.Empty;
    public int NestId { get; set; }
    public string Author { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Features { get; set; } // JSON string
    public string? DockerImages { get; set; } // JSON string
    public string? FileDenylist { get; set; } // JSON string
    public string? UpdateUrl { get; set; }
    public string? ConfigFiles { get; set; }
    public string? ConfigStartup { get; set; }
    public string? ConfigLogs { get; set; }
    public string? ConfigStop { get; set; }
    public int? ConfigFrom { get; set; }
    public string? Startup { get; set; }
    public string ScriptContainer { get; set; } = "alpine:3.4";
    public int? CopyScriptFrom { get; set; }
    public string ScriptEntry { get; set; } = "ash";
    public bool ScriptIsPrivileged { get; set; } = true;
    public string? ScriptInstall { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool ForceOutgoingIp { get; set; } = false;
    public List<PterodactylEggVariable> Variables { get; set; } = new();
}

