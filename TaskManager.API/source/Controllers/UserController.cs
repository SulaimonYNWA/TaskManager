using Microsoft.AspNetCore.Mvc;
using Dapper;
using MySql.Data.MySqlClient;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using TaskManager.API.Models;
using TaskManager.API.source.DTO;


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
    
    [HttpGet("byID/{id}")]
    public async Task<ActionResult<User>> GetUserById(int id)
    {
        using var connection = new MySqlConnection(_connectionString);
        
        var user = await connection.QueryFirstOrDefaultAsync<User>(
            "SELECT * FROM users WHERE id = @Id", new { Id = id });

        if (user == null)
            return NotFound(new { message = "User not found" });

        return Ok(user);
    }
    
    [HttpGet("project/{projectId}")]
    public async Task<ActionResult<IEnumerable<UserWithProjectInfo>>> GetUsersByProjectsId(int projectId)
    {
        using var connection = new MySqlConnection(_connectionString);

        var sql = @"
        SELECT 
            pm.user_id AS UserId,
            u.username,
            u.email,
            pm.role AS UserRole,
            pm.project_id AS ProjectId
        FROM users u
        INNER JOIN project_members pm ON u.id = pm.user_id
        WHERE pm.project_id = @ProjectId";

        var users = await connection.QueryAsync<UserWithProjectInfo>(sql, new { ProjectId = projectId });

        return Ok(users);
    }
    
    [HttpGet("search")]
    public async Task<ActionResult<IEnumerable<User>>> SearchUsers([FromQuery] string q)
    {
        using var connection = new MySqlConnection(_connectionString);
        var sql = @"
        SELECT id, username, email
        FROM users
        WHERE username LIKE @Query OR email LIKE @Query
        LIMIT 10";
        var users = await connection.QueryAsync<User>(sql, new { Query = $"%{q}%" });
        return Ok(users);
    }


   
    [HttpGet("me/invitations")]
    public async Task<ActionResult<IEnumerable<object>>> GetUserInvitations()
    {
        var userId = GetCurrentUserId(); // You should implement this from the token or session
        
        using var connection = new MySqlConnection(_connectionString);
        var sql = @"
        SELECT inv.id, p.name AS project_name, u.username AS owner_name
        FROM invitations inv
        JOIN projects p ON inv.project_id = p.id
        JOIN users u ON p.owner_id = u.id
        WHERE inv.user_id = @UserId AND inv.status = 'pending'";
        
        var invitations = await connection.QueryAsync(sql, new { UserId = userId });
        return Ok(invitations);
    }
    
    public class InvitationResponseDto
    {
        public string Action { get; set; }
    }

    [HttpPost("invitations/{invitationId}/respond")]
    public async Task<IActionResult> RespondToInvitation(int invitationId, [FromBody] InvitationResponseDto body)
    {
        var userId = GetCurrentUserId();
        var action = body.Action?.ToLowerInvariant();

        using var connection = new MySqlConnection(_connectionString);
        var invitation = await connection.QuerySingleOrDefaultAsync<Invitation>(
            "SELECT * FROM invitations WHERE id = @Id AND user_id = @UserId AND status = 'pending'",
            new { Id = invitationId, UserId = userId });

        if (invitation == null) return NotFound();

        if (action == "accepted")
        {
            await connection.ExecuteAsync(
                "INSERT INTO project_members (project_id, user_id) VALUES (@ProjectId, @UserId)",
                new { invitation.ProjectId, UserId = userId });
        }

        await connection.ExecuteAsync(
            "UPDATE invitations SET status = @Status WHERE id = @Id",
            new { Status = action, Id = invitationId });

        return Ok();
    }


    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst(JwtRegisteredClaimNames.Sub);
        return userIdClaim != null ? int.Parse(userIdClaim.Value) : throw new UnauthorizedAccessException("User ID not found in token.");
    }
    
}