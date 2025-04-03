using Microsoft.AspNetCore.Mvc;
using Dapper;
using MySql.Data.MySqlClient;
using System.Threading.Tasks;
using TaskManager.API.Models;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Cryptography.KeyDerivation;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using System;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly string _connectionString;
    private readonly IConfiguration _configuration;

    public AuthController(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection");
        _configuration = configuration;
    }

    /// <summary>
    /// Registers a new user with a hashed password.
    /// </summary>
    [HttpPost("register")]
    public async Task<ActionResult> Register(User user)
    {
        using var connection = new MySqlConnection(_connectionString);

        // Check if user already exists
        var existingUser = await connection.QueryFirstOrDefaultAsync<User>(
            "SELECT * FROM users WHERE email = @Email OR username = @Username",
            new { user.Email, user.Username });

        if (existingUser != null)
            return BadRequest("User already exists!");

        // Hash the password
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(user.PasswordHash);

        var sql = "INSERT INTO users (username, email, password_hash) VALUES (@Username, @Email, @PasswordHash)";
        var rowsAffected = await connection.ExecuteAsync(sql, user);

        return rowsAffected > 0 ? Ok("User registered successfully!") : BadRequest("Failed to register user.");
    }

    /// <summary>
    /// Logs in a user and returns a JWT token.
    /// </summary>
    [HttpPost("login")]
    public async Task<ActionResult<string>> Login([FromBody] User user)
    {
        using var connection = new MySqlConnection(_connectionString);
        
        var existingUser = await connection.QueryFirstOrDefaultAsync<User>(
            "SELECT * FROM users WHERE username = @Username", new { user.Username });

        
        if (existingUser == null)
            return Unauthorized("User does not exist!");

       
        if (!VerifyPassword(user.PasswordHash, existingUser.PasswordHash))
            return Unauthorized("Invalid credentials!");


        string token = GenerateJwtToken(existingUser);
        // return token;
        return Ok(new { Token = token });
    }
    

    /// <summary>
    /// Verifies a password against a hash.
    /// </summary>
   private bool VerifyPassword(string enteredPassword, string storedHash)
{
    return BCrypt.Net.BCrypt.Verify(enteredPassword, storedHash);
}


    /// <summary>
    /// Generates a JWT token for authentication.
    /// </summary>
    private string GenerateJwtToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: null,
            expires: DateTime.UtcNow.AddHours(2),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
