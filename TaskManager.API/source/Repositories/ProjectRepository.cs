using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Dapper;
using TaskManager.API.Models;
using MySql.Data.MySqlClient;
using Microsoft.Extensions.Configuration;

namespace TaskManager.API.source.Repositories
{
    public class ProjectRepository : IProjectRepository
    {
        private readonly string _connectionString;

        public ProjectRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("TaskModel");
        }

        private IDbConnection Connection => new MySqlConnection(_connectionString);

        public async Task<IEnumerable<Project>> GetAllProjects()
        {
            using var db = Connection;
            return await db.QueryAsync<Project>("SELECT * FROM projects");
        }

        public async Task<Project> GetProjectById(int id)
        {
            using var db = Connection;
            return await db.QueryFirstOrDefaultAsync<Project>("SELECT * FROM projects WHERE id = @Id", new { Id = id });
        }

        public async Task<int> CreateProject(Project project)
        {
            using var db = Connection;
            var sql = "INSERT INTO projects (name, description) VALUES (@Name, @Description); SELECT LAST_INSERT_ID();";
            return await db.ExecuteScalarAsync<int>(sql, project);
        }

        public async Task<bool> AddUserToProject(ProjectMember projectMember)
        {
            using var db = Connection; // Ensure a new DB connection
            var sql = @"
        INSERT INTO project_members (project_id, user_id, role) 
        VALUES (@ProjectId, @UserId, @Role)";
            return await db.ExecuteAsync(sql, projectMember) > 0;
        }


        
        public async Task<bool> UpdateProject(Project project)
        {
            using var db = Connection;
            var sql = "UPDATE projects SET name = @Name, description = @Description WHERE id = @Id";
            return await db.ExecuteAsync(sql, project) > 0;
        }

        public async Task<bool> DeleteProject(int id)
        {
            using var db = Connection;
            return await db.ExecuteAsync("DELETE FROM projects WHERE id = @Id", new { Id = id }) > 0;
        }
    }
}