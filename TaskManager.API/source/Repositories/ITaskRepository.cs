using System.Collections.Generic;
using System.Threading.Tasks;
using TaskManager.API.Models;

namespace TaskManager.API.source.Repositories
{
    public interface ITaskRepository
    {
        Task<IEnumerable<TaskModel>> GetAllTasks();
        Task<TaskModel> GetTaskById(int id);
        Task<IEnumerable<TaskModel>> GetTasksByProjectId(int projectId);
        Task<int> CreateTask(TaskModel task);
        Task<bool> UpdateTask(TaskModel task);
        Task<bool> UpdateTaskColumn(int taskId, int columnId);
        Task<bool> DeleteTask(int id);
    }
}
