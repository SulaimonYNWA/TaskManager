using Microsoft.AspNetCore.Mvc;
using Dapper;
using MySql.Data.MySqlClient;
using System.Collections.Generic;
using System.Threading.Tasks;
using TaskManager.API.Models;

[Route("api/[controller]")]
[ApiController]
public class ProjectColumnsController : ControllerBase
{
    private readonly string _connectionString;

    public ProjectColumnsController(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection");
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProjectColumn>>> GetProjectColumns()
    {
        using var connection = new MySqlConnection(_connectionString);
        var columns = await connection.QueryAsync<ProjectColumn>("SELECT * FROM project_columns;");
        return Ok(columns);
    }
}