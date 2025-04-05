using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;
using TaskManager.API.Models;
using TaskManager.API.source.Repositories;
using TaskManager.API.source.DTO;
using MySql.Data.MySqlClient;
using Dapper;
using Microsoft.AspNetCore.Authorization;



[Route("api/[controller]")]
[ApiController]
public class TasksController : ControllerBase
{
    private readonly string _connectionString;
    private readonly IConfiguration _configuration;
    private readonly ITaskRepository _taskRepository;

    public TasksController(IConfiguration configuration, ITaskRepository taskRepository)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection");
        _configuration = configuration;
        _taskRepository = taskRepository;

    }
    
    // [HttpGet]
    // public async Task<ActionResult<IEnumerable<TaskModel>>> GetAll()
    // {
    //     var tasks = await _taskRepository.GetAllTasks();
    //     return Ok(tasks);
    // }
    
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TaskModel>>> GetTasksByProjectId([FromQuery] int projectId)
    {
        if (projectId <= 0)
        {
            return BadRequest("Invalid project ID.");
        }

        var tasks = await _taskRepository.GetTasksByProjectId(projectId);

        if (tasks == null || !tasks.Any())
        {
            return NotFound("No tasks found for the given project.");
        }

        return Ok(tasks);
    }

    
    // [HttpPut("{id}/status")]
    // public async Task<IActionResult> UpdateTaskStatus(int id, [FromBody] UpdateTaskStatusRequest request)
    // {
    //     var task = await _taskRepository.GetTaskById(id);
    //     if (task == null)
    //         return NotFound();
    //
    //     task.Status = request.Status;
    //     await _taskRepository.UpdateTask(task);
    //
    //     return NoContent();
    // }

    // public class UpdateTaskStatusRequest
    // {
    //     public string Status { get; set; }
    // }
    
    [HttpPut("{id}/column")]
    public async Task<IActionResult> UpdateTaskColumn(int id, [FromBody] UpdateTaskColumnRequest request)
    {
        if (request == null)
            return BadRequest("Invalid request body");

        Console.WriteLine($"Received Update Request - TaskID: {id}, ColumnID: {request.ColumnId}");

        var task = await _taskRepository.GetTaskById(id);
        if (task == null)
            return NotFound();

        task.ColumnId = request.ColumnId;
        await _taskRepository.UpdateTaskColumn(id,request.ColumnId);

        return NoContent();
    }

    public class UpdateTaskColumnRequest
    {
        public int ColumnId { get; set; }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTask(int id, [FromBody] UpdateTaskRequest request)
    {
        if (request == null)
            return BadRequest("Invalid request body");

        Console.WriteLine($"Received Update Request - TaskID: {id}");

        var task = await _taskRepository.GetTaskById(id);
        if (task == null)
            return NotFound();

        // Update the task fields if provided in the request
        task.Title = request.Title ?? task.Title;
        task.Description = request.Description ?? task.Description;
        task.AssigneeId = request.AssigneeId ?? task.AssigneeId;
        task.Status = request.Status ?? task.Status;
        task.Priority = request.Priority ?? task.Priority;
        task.EstimatedWork = request.EstimatedWork ?? task.EstimatedWork;
        task.Progress = request.Progress ?? task.Progress;
        task.DueDate = request.DueDate ?? task.DueDate;

        await _taskRepository.UpdateTask(task);

        return NoContent();
    }
    
    /// <summary>
    /// Adds a new task to the database.
    /// </summary>
    // [Authorize] // Requires authentication
    [HttpPost("add")] 
    public async Task<ActionResult> AddTask([FromBody] TaskModel task)
    {
        if (string.IsNullOrWhiteSpace(task.Title) || task.ProjectId == null || task.ColumnId == null)
        {
            return BadRequest("Title, projectId, and columnId are required.");
        }
    
        using var connection = new MySqlConnection(_connectionString);

        var sql = @"INSERT INTO tasks (title, description, project_id, column_id, assignee_id, status, priority, estimated_work, progress, due_date, created_at) 
                VALUES (@Title, @Description, @ProjectId, @ColumnId, @AssigneeId, @Status, @Priority, @EstimatedWork, @Progress, @DueDate, NOW());
                SELECT LAST_INSERT_ID();";  // Get last inserted ID

        try
        {
            var taskId = await connection.ExecuteScalarAsync<int>(sql, new
            {
                Title = task.Title,
                Description = task.Description ?? "",
                ColumnId = task.ColumnId,  // Ensure ColumnId is passed
                AssigneeId = task.AssigneeId ?? (int?)null,
                ProjectId = task.ProjectId,
                Status = task.Status ?? "To Do",
                Priority = task.Priority ?? "Medium",
                EstimatedWork = task.EstimatedWork ?? "Short (1-4 hours)",
                Progress = task.Progress ?? "Not Started",
                DueDate = task.DueDate ?? (DateTime?)null
            });

            if (taskId > 0)
            {
                task.Id = taskId; // Assign the generated ID
                return Ok(task);  // Return the created task with ID
            }
            return BadRequest("Failed to create task.");
        }
        catch (Exception ex)
        {
            // Log the full exception message and stack trace
            Console.Error.WriteLine($"Error creating task: {ex.Message}");
            Console.Error.WriteLine(ex.StackTrace);
            return BadRequest($"An error occurred while creating the task: {ex.Message}");
        }
    }

    [HttpDelete]
    public async Task<ActionResult> DeleteTaskByID([FromQuery] int id)
    {
        if (id <= 0)
        {
            return BadRequest("Invalid task ID.");
        }

        var deleted = await _taskRepository.DeleteTask(id);

        if (deleted)
        {
            return Ok(new { message = $"Task with ID {id} was deleted successfully." });
        }

        return NotFound(new { message = $"Task with ID {id} not found or could not be deleted." });
    }

}

