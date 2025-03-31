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

        private IDbConnection CreateConnection() => new MySqlConnection(_connectionString);

        public async Task<IEnumerable<TaskModel>> GetAllTasks()
        {
            using var db = CreateConnection();
            return await db.QueryAsync<TaskModel>(@"
        SELECT id, title, description, project_id AS ProjectId, 
               assignee_id AS AssigneeId, status, priority, 
               estimated_work AS EstimatedWork, progress, 
               column_id AS ColumnId, due_date AS DueDate, created_at AS CreatedAt
        FROM tasks");
        }


        public async Task<TaskModel> GetTaskById(int id)
        {
            using var db = CreateConnection();
            return await db.QueryFirstOrDefaultAsync<TaskModel>(
                "SELECT * FROM tasks WHERE id = @Id", 
                new { Id = id }
            );
        }

        public async Task<int> CreateTask(TaskModel task)
        {
            using var db = CreateConnection();
            var sql = @"
                INSERT INTO tasks (title, description, project_id, assignee_id, status, priority, column_id, due_date)
                VALUES (@Title, @Description, @ProjectId, @AssigneeId, @Status, @Priority, @ColumnId, @DueDate);
                SELECT LAST_INSERT_ID();";
            return await db.ExecuteScalarAsync<int>(sql, task);
        }

        public async Task<bool> UpdateTask(TaskModel task)
        {
            using var db = CreateConnection();
            var sql = @"
                UPDATE tasks 
                SET title = @Title, description = @Description, project_id = @ProjectId, 
                    assignee_id = @AssigneeId, status = @Status, priority = @Priority, 
                    column_id = @ColumnId, due_date = @DueDate, progress = @Progress
                WHERE id = @Id";
            return await db.ExecuteAsync(sql, task) > 0;
        }

        public async Task<bool> UpdateTaskColumn(int taskId, int columnId)
        {
            using var db = CreateConnection();
            var sql = @"UPDATE tasks SET column_id = @ColumnId WHERE id = @TaskId";
            return await db.ExecuteAsync(sql, new { TaskId = taskId, ColumnId = columnId }) > 0;
        }

        public async Task<bool> DeleteTask(int id)
        {
            using var db = CreateConnection();
            return await db.ExecuteAsync("DELETE FROM tasks WHERE id = @Id", new { Id = id }) > 0;
        }
    }
}
