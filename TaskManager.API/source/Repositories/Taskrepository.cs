using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Dapper;
using TaskManager.API.Models;
using MySql.Data.MySqlClient;
using Microsoft.Extensions.Configuration;

namespace TaskManager.API.source.Repositories
{
    public class TaskRepository : ITaskRepository
    {
        private readonly string _connectionString;

        public TaskRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection");
        }

        private IDbConnection Connection => new MySqlConnection(_connectionString);

        public async Task<IEnumerable<TaskModel>> GetAllTasks()
        {
            using var db = Connection;
            return await db.QueryAsync<TaskModel>("SELECT * FROM tasks");
        }

        public async Task<TaskModel> GetTaskById(int id)
        {
            using var db = Connection;
            return await db.QueryFirstOrDefaultAsync<TaskModel>("SELECT * FROM tasks WHERE id = @Id", new { Id = id });
        }

        public async Task<int> CreateTask(TaskModel task)
        {
            using var db = Connection;
            var sql = @"INSERT INTO tasks (title, description, project_id, assignee_id, status, priority, due_date)
                        VALUES (@Title, @Description, @ProjectId, @AssigneeId, @Status, @Priority, @DueDate);
                        SELECT LAST_INSERT_ID();";
            return await db.ExecuteScalarAsync<int>(sql, task);
        }

        public async Task<bool> UpdateTask(TaskModel task)
        {
            using var db = Connection;
            var sql = @"UPDATE tasks SET title = @Title, description = @Description, project_id = @ProjectId, 
                        assignee_id = @AssigneeId, status = @Status, priority = @Priority, due_date = @DueDate
                        WHERE id = @Id";
            return await db.ExecuteAsync(sql, task) > 0;
        }

        public async Task<bool> DeleteTask(int id)
        {
            using var db = Connection;
            return await db.ExecuteAsync("DELETE FROM tasks WHERE id = @Id", new { Id = id }) > 0;
        }
    }
}
