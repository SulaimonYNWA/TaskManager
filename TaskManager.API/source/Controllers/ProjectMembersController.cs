using Microsoft.AspNetCore.Mvc;
using Dapper;
using MySql.Data.MySqlClient;
using System.Threading.Tasks;
using TaskManager.API.Models;

[Route("api/[controller]")]
[ApiController]
public class ProjectMembersController : ControllerBase
{
    private readonly string _connectionString;

    public ProjectMembersController(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection");
    }

    [HttpPost]
    public async Task<ActionResult> AddUserToProject(ProjectMember projectMember)
    {
        using var connection = new MySqlConnection(_connectionString);
        var sql = @"
            INSERT INTO project_members (project_id, user_id, role) 
            VALUES (@ProjectId, @UserId, @Role)";
        var rowsAffected = await connection.ExecuteAsync(sql, projectMember);

        if (rowsAffected > 0)
            return Ok(new { message = "User added to project successfully" });

        return BadRequest("Failed to add user to project");
    }
}