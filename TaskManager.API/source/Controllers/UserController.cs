using Microsoft.AspNetCore.Mvc;
using Dapper;
using MySql.Data.MySqlClient;
using System.Collections.Generic;
using System.Threading.Tasks;
using TaskManager.API.Models;

// Get All users.
[Route("api/[controller]")]
[ApiController]
public class UsersController : ControllerBase
{
    private readonly string _connectionString;

    public UsersController(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection");
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<User>>> GetUsers()
    {
        using var connection = new MySqlConnection(_connectionString);
        var users = await connection.QueryAsync<User>("SELECT * FROM users;");
        return Ok(users);
    }
    
    [HttpGet("{username}")]
    public async Task<ActionResult<User>> GetUserByUsername(string username)
    {
        using var connection = new MySqlConnection(_connectionString);
        
        var user = await connection.QueryFirstOrDefaultAsync<User>(
            "SELECT * FROM users WHERE username = @Username", new { Username = username });

        if (user == null)
            return NotFound(new { message = "User not found" });

        return Ok(user);
    }
    
}