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


}