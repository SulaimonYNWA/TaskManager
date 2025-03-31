let tasksData = [];
let currentTask = null; // To hold the task clicked for viewing

async function fetchProjects() {
    try {
        const response = await fetch('/api/projects');
        const projects = await response.json();
        const projectsList = document.getElementById('projects-list');
        projectsList.innerHTML = projects.map(p => `<div class="project">${p.name}</div>`).join('');
    } catch (error) {
        console.error('Error fetching projects:', error);
    }
}

async function fetchTasks() {
    try {
        const response = await fetch('/api/tasks');
        tasksData = await response.json(); // Store fetched tasks globally

        // Sort tasks based on due date and overdue status
        tasksData.sort((a, b) => {
            const dateA = a.dueDate ? new Date(a.dueDate) : null;
            const dateB = b.dueDate ? new Date(b.dueDate) : null;
            const now = new Date();

            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;

            const isOverdueA = dateA < now;
            const isOverdueB = dateB < now;

            if (isOverdueA && !isOverdueB) return -1;
            if (!isOverdueA && isOverdueB) return 1;

            return dateA - dateB;
        });

        // Update task lists
        const todoList = document.getElementById('todo-tasks');
        const inProgressList = document.getElementById('in-progress-tasks');
        const doneList = document.getElementById('done-tasks');

        todoList.innerHTML = '';
        inProgressList.innerHTML = '';
        doneList.innerHTML = '';

        tasksData.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.classList.add('task');
            taskElement.setAttribute('draggable', 'true');
            taskElement.setAttribute('data-id', task.id);
            taskElement.ondragstart = drag;
            taskElement.onclick = () => showTaskDetails(task); // Add click listener

            let dueDateDisplay = '';
            if (task.dueDate) {
                const dueDate = new Date(task.dueDate);
                dueDateDisplay = formatDueDate(dueDate);
            }

            taskElement.innerHTML = `
                <strong>${task.title}</strong><br>
                Priority: ${task.priority} <br>
                <span class="due-date">${dueDateDisplay}</span>
            `;

            if (task.status === 'To Do') todoList.appendChild(taskElement);
            else if (task.status === 'In Progress') inProgressList.appendChild(taskElement);
            else if (task.status === 'Done') doneList.appendChild(taskElement);
        });
    } catch (error) {
        console.error('Error fetching tasks:', error);
    }
}

function formatDueDate(date) {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);

    const options = { day: '2-digit', month: 'short' }; // "10 Apr" format
    const formattedDate = date.toLocaleDateString('en-GB', options);

    let color = 'grey'; // Default color

    if (date < now) {
        color = 'red'; // Overdue
    } else if (date.toDateString() === now.toDateString() || date.toDateString() === tomorrow.toDateString()) {
        color = 'green'; // Today or Tomorrow
    }

    return `<span style="color: ${color};">${formattedDate}</span>`;
}

function allowDrop(event) {
    event.preventDefault();
}

function drag(event) {
    event.dataTransfer.setData('text', event.target.dataset.id);
}

async function drop(event, newStatus) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('text');
    const taskElement = document.querySelector(`[data-id='${taskId}']`);

    if (taskElement) {
        document.getElementById(newStatus.toLowerCase().replace(' ', '-') + '-tasks').appendChild(taskElement);
        await updateTaskStatus(taskId, newStatus);
        sortTasksInColumn(newStatus.toLowerCase().replace(' ', '-') + '-tasks');
    }
}

function sortTasksInColumn(columnId) {
    const column = document.getElementById(columnId);
    const tasks = Array.from(column.getElementsByClassName('task'));

    tasks.sort((a, b) => {
        const taskAId = a.dataset.id;
        const taskBId = b.dataset.id;

        const taskA = tasksData.find(task => task.id === taskAId);
        const taskB = tasksData.find(task => task.id === taskBId);

        const dateA = taskA.dueDate ? new Date(taskA.dueDate) : null;
        const dateB = taskB.dueDate ? new Date(taskB.dueDate) : null;
        const now = new Date();

        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;

        const isOverdueA = dateA < now;
        const isOverdueB = dateB < now;

        if (isOverdueA && !isOverdueB) return -1;
        if (!isOverdueA && isOverdueB) return 1;

        return dateA - dateB;
    });

    tasks.forEach(task => column.appendChild(task));
}

async function updateTaskStatus(taskId, newStatus) {
    try {
        // Find the task object and update its status
        const task = tasksData.find(t => t.id === taskId);
        if (task) {
            task.status = newStatus;
        }
        await fetch(`/api/tasks/${taskId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
    } catch (error) {
        console.error('Error updating task:', error);
    }
}

// Show task details in the modal
function showTaskDetails(task) {
    currentTask = task; // Store the current task for potential updates

    // Populate the modal with task details
    document.getElementById('task-title').textContent = task.title;
    document.getElementById('task-description').textContent = task.description;
    document.getElementById('task-priority').textContent = task.priority;
    document.getElementById('task-due-date').textContent = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date';
    document.getElementById('task-status').textContent = task.status;

    // Show the modal
    document.getElementById('taskModal').style.display = 'block';
}

// Close the modal
function closeModal() {
    document.getElementById('taskModal').style.display = 'none';
}

document.querySelectorAll(".task-column").forEach(column => {
    column.addEventListener("dragover", (event) => {
        event.preventDefault();
    });

    column.addEventListener("drop", (event) => {
        event.preventDefault();
        const taskId = event.dataTransfer.getData("text");
        const taskElement = document.querySelector(`[data-id='${taskId}']`);

        if (taskElement) {
            column.appendChild(taskElement);
            const newStatus = column.dataset.columnId; // Use the dataset column ID for task status
            updateTaskStatus(taskId, newStatus);
        }
    });
});

// Load data
fetchProjects();
fetchTasks();
