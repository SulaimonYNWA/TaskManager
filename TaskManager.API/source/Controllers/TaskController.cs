using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;
using TaskManager.API.Models;
using TaskManager.API.source.Repositories;

[Route("api/[controller]")]
[ApiController]
public class TasksController : ControllerBase
{
    private readonly ITaskRepository _taskRepository;

    public TasksController(ITaskRepository taskRepository)
    {
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

}

