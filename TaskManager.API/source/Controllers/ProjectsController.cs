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
}