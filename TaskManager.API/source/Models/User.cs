using Dapper;
using System.ComponentModel.DataAnnotations.Schema;
public class User
{
    public int Id { get; set; }
    public string Username { get; set; }
    public string Email { get; set; }
    
    [Column("password_hash")] // Ensure mapping
    public string PasswordHash { get; set; }
    
    [Column("created_at")] // Ensure mapping
    public DateTime CreatedAt { get; set; }
}