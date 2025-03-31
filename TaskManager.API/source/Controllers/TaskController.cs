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

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TaskModel>>> GetAll()
    {
        var tasks = await _taskRepository.GetAllTasks();
        return Ok(tasks);
    }
    
    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateTaskStatus(int id, [FromBody] UpdateTaskStatusRequest request)
    {
        var task = await _taskRepository.GetTaskById(id);
        if (task == null)
            return NotFound();

        task.Status = request.Status;
        await _taskRepository.UpdateTask(task);

        return NoContent();
    }

    public class UpdateTaskStatusRequest
    {
        public string Status { get; set; }
    }

}

