using Microsoft.EntityFrameworkCore;
using TaskManager.API.Models;

namespace TaskManager.API.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

        public DbSet<Project> Projects { get; set; }
        public DbSet<TaskModel> Tasks { get; set; }
        public DbSet<Column> Columns { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Project>()
                .HasMany(p => p.Tasks)
                .WithOne() // Remove navigation property reference
                .HasForeignKey(t => t.ProjectId);

            modelBuilder.Entity<Column>()
                .HasMany(c => c.Tasks)
                .WithOne() // Remove navigation property reference
                .HasForeignKey(t => t.ColumnId);
        }
    }
}