using Microsoft.AspNetCore.Mvc;
using Dapper;
using MySql.Data.MySqlClient;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using TaskManager.API.Models;

[Route("api/[controller]")]
[ApiController]
public class ProjectsController : ControllerBase
{
    private readonly string _connectionString;

    public ProjectsController(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection");
    }

    [Authorize]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Project>>> GetProjects()
    {
        using var connection = new MySqlConnection(_connectionString);
        var projects = await connection.QueryAsync<Project>("SELECT * FROM projects;");
        return Ok(projects);
    }
    
    // Get all projects by user_id
    [Authorize]
    [HttpGet("user/{userId}")]
    public async Task<ActionResult<IEnumerable<Project>>> GetProjectsByUserId(int userId)
    {
        using var connection = new MySqlConnection(_connectionString);
        var sql = @"
            SELECT p.* FROM projects p
            INNER JOIN project_members pm ON p.id = pm.project_id
            WHERE pm.user_id = @UserId";
        
        var projects = await connection.QueryAsync<Project>(sql, new { UserId = userId });

        return Ok(projects);
    }
    
    // [Authorize]
    [HttpPost("create")]
    public async Task<ActionResult<Project>> CreateProject([FromBody] Project project)
    {
        if (string.IsNullOrWhiteSpace(project.Name) || project.OwnerId == 0)
        {
            return BadRequest("Project name and owner_id are required.");
        }

        using var connection = new MySqlConnection(_connectionString);
        await connection.OpenAsync();

        using var transaction = await connection.BeginTransactionAsync();

        try
        {
            var sql = @"
            INSERT INTO projects (name, description, owner_id, created_at)
            VALUES (@Name, @Description, @OwnerId, NOW());
            SELECT LAST_INSERT_ID();";

            var projectId = await connection.ExecuteScalarAsync<int>(sql, new
            {
                Name = project.Name,
                Description = project.Description ?? "",
                OwnerId = project.OwnerId
            }, transaction);

            if (projectId > 0)
            {
                var memberSql = @"
                INSERT INTO project_members (project_id, user_id, role)
                VALUES (@ProjectId, @UserId, 'Owner');";

                await connection.ExecuteAsync(memberSql, new
                {
                    ProjectId = projectId,
                    UserId = project.OwnerId
                }, transaction);

                await transaction.CommitAsync();

                project.Id = projectId;
                return Ok(project);
            }

            await transaction.RollbackAsync();
            return BadRequest("Failed to create project.");
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            Console.Error.WriteLine($"Error creating project: {ex.Message}");
            return StatusCode(500, "An error occurred while creating the project.");
        }
    }
    
    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProject(int id)
    {
        using var connection = new MySqlConnection(_connectionString);
        await connection.OpenAsync();

        using var transaction = await connection.BeginTransactionAsync();

        try
        {
            // Optionally delete related project members or tasks if ON DELETE CASCADE is not set
            var deleteMembersSql = "DELETE FROM project_members WHERE project_id = @ProjectId;";
            await connection.ExecuteAsync(deleteMembersSql, new { ProjectId = id }, transaction);

            var deleteTasksSql = "DELETE FROM tasks WHERE project_id = @ProjectId;";
            await connection.ExecuteAsync(deleteTasksSql, new { ProjectId = id }, transaction);

            var deleteProjectSql = "DELETE FROM projects WHERE id = @ProjectId;";
            var rowsAffected = await connection.ExecuteAsync(deleteProjectSql, new { ProjectId = id }, transaction);

            if (rowsAffected > 0)
            {
                await transaction.CommitAsync();
                return Ok(new { message = "Project deleted successfully." });
            }

            await transaction.RollbackAsync();
            return NotFound(new { message = "Project not found." });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            Console.Error.WriteLine($"Error deleting project: {ex.Message}");
            return StatusCode(500, "An error occurred while deleting the project.");
        }
    }
    
    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProject(int id, [FromBody] Project updatedProject)
    {
        if (string.IsNullOrWhiteSpace(updatedProject.Name))
        {
            return BadRequest("Project name is required.");
        }

        using var connection = new MySqlConnection(_connectionString);
        await connection.OpenAsync();

        var sql = @"
        UPDATE projects
        SET name = @Name,
            description = @Description
        WHERE id = @Id";

        var rowsAffected = await connection.ExecuteAsync(sql, new
        {
            Id = id,
            Name = updatedProject.Name,
            Description = updatedProject.Description ?? ""
        });

        if (rowsAffected > 0)
        {
            return Ok(new { message = "Project updated successfully." });
        }

        return NotFound("Project not found.");
    }


    [Authorize]
    [HttpPost("{projectId}/invite")]
    public async Task<IActionResult> InviteUserToProject(int projectId, [FromBody] string username)
    {
        using var connection = new MySqlConnection(_connectionString);

        var user = await connection.QuerySingleOrDefaultAsync<User>("SELECT * FROM users WHERE username = @Username", new { Username = username });
        if (user == null) return NotFound("User not found");

        var existingInvite = await connection.QuerySingleOrDefaultAsync<Invitation>(
            "SELECT * FROM invitations WHERE user_id = @UserId AND project_id = @ProjectId AND status = 'pending'",
            new { UserId = user.Id, ProjectId = projectId });

        if (existingInvite != null) return BadRequest("Already invited");

        var sql = "INSERT INTO invitations (user_id, project_id) VALUES (@UserId, @ProjectId)";
        await connection.ExecuteAsync(sql, new { UserId = user.Id, ProjectId = projectId });

        return Ok("Invitation sent");
    }

}
