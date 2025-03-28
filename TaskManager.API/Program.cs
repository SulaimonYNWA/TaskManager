using TaskManager.API.source.Repositories;

var builder = WebApplication.CreateBuilder(args);

// 🔥 Explicitly add appsettings.json
builder.Configuration
    .SetBasePath(Directory.GetCurrentDirectory()) // Ensure it's looking in the right place
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true)
    .AddEnvironmentVariables();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
Console.WriteLine($"🔍 Connection String: {connectionString}");

if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new Exception("❌ Connection string is empty! Check appsettings.json.");
}

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register repositories
builder.Services.AddScoped<ITaskRepository, TaskRepository>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();