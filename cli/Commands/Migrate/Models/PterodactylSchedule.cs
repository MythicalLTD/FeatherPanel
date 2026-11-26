namespace FeatherCli.Commands.Migrate.Models;

public class PterodactylSchedule
{
    public int Id { get; set; }
    public int ServerId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string CronDayOfWeek { get; set; } = "*";
    public string CronMonth { get; set; } = "*";
    public string CronDayOfMonth { get; set; } = "*";
    public string CronHour { get; set; } = "*";
    public string CronMinute { get; set; } = "*";
    public bool IsActive { get; set; }
    public bool IsProcessing { get; set; }
    public int OnlyWhenOnline { get; set; }
    public DateTime? LastRunAt { get; set; }
    public DateTime? NextRunAt { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

