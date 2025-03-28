using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TaskManager.API.Models
{
    public class TaskModel
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Title { get; set; }

        public string Description { get; set; }

        [Required]
        public int ProjectId { get; set; }

        public int? AssigneeId { get; set; }

        [Required]
        public string Status { get; set; }

        public string Priority { get; set; }

        public string EstimatedWork { get; set; }

        public string Progress { get; set; }

        [Required]
        public int ColumnId { get; set; }

        public DateTime? DueDate { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public Project Project { get; set; }
        public Column Column { get; set; }
    }
}