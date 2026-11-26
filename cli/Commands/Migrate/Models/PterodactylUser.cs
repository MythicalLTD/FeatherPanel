namespace FeatherCli.Commands.Migrate.Models;

public class PterodactylUser
{
    public int Id { get; set; }
    public string Uuid { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? NameFirst { get; set; }
    public string? NameLast { get; set; }
    public string Password { get; set; } = string.Empty; // Bcrypt hashed
    public string? RememberToken { get; set; }
    public string? ExternalId { get; set; }
    public bool RootAdmin { get; set; }
    public bool UseTotp { get; set; }
    public string? TotpSecret { get; set; }
    public string? Language { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

