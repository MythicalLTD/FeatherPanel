namespace FeatherCli.Commands.Migrate.Models;

public class PterodactylTask
{
    public int Id { get; set; }
    public int ScheduleId { get; set; }
    public int SequenceId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Payload { get; set; } = string.Empty;
    public int TimeOffset { get; set; }
    public bool IsQueued { get; set; }
    public int ContinueOnFailure { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

