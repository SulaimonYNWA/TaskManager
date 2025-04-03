namespace TaskManager.API.source.DTO;

public class UpdateTaskRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public int? AssigneeId { get; set; }
    public string? Status { get; set; }
    public string? Priority { get; set; }
    public string? EstimatedWork { get; set; }
    public string? Progress { get; set; }
    public DateTime? DueDate { get; set; }
}


    public enum TaskStatus
    {
        ToDo,
        InProgress,
        Done
    }

    public enum TaskPriority
    {
        Low,
        Medium,
        High
    }

    public enum EstimatedWork
    {
        Short,      // (1-4 hours)
        Medium,     // (4+ hours)
        Large,      // (1-2 days)
        XLarge      // (3-4 days)
    }

    public enum TaskProgress
    {
        NotStarted,
        OnTrack,
        OffTrack,
        Achieved,
        OnHold,
        Failed,
        AtRisk
    }
