namespace TaskManager.API.source.DTO;

public class UserWithProjectInfo
{
    public int UserId { get; set; }
    public string Username { get; set; }
    public string Email { get; set; }
    public string UserRole { get; set; }

    public int ProjectId { get; set; }
    public string ProjectRole { get; set; }  // Role in the project
    public DateTime JoinedAt { get; set; }
}
