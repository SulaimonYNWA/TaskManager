public class ProjectMember
{
    public int Id { get; set; } // Auto-incremented primary key
    public int ProjectId { get; set; }
    public int UserId { get; set; }
    public string Role { get; set; } = "Editor"; // Default role
}