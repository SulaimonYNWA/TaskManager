let tasksData = [];
let currentTask = null; // To hold the task clicked for viewing


async function fetchProjectColumns() {
    try {
        const response = await fetch('/api/ProjectColumns');
        const columns = await response.json();

        const columnsContainer = document.querySelector('.columns');
        columnsContainer.innerHTML = ''; // Clear existing columns

        columns.forEach(column => {
            const columnElement = document.createElement('div');
            columnElement.classList.add('column');
            columnElement.id = `column-${column.id}`;
            columnElement.dataset.columnId = column.id;
            columnElement.ondragover = allowDrop;
            columnElement.ondrop = event => drop(event, column.id);

            columnElement.innerHTML = `
                <h3>${column.name}</h3>
                <div id="task-list-${column.id}" class="task-list"></div>
            `;

            columnsContainer.appendChild(columnElement);
        });

        fetchTasks(); // Fetch tasks after columns are created
    } catch (error) {
        console.error('Error fetching project columns:', error);
    }
}
async function fetchProjects() {
    const token = localStorage.getItem('token'); // Retrieve JWT token from localStorage

    if (!token) {
        alert("Unauthorized! Please log in.");
        window.location.href = 'login.html'; // Redirect to login page
        return;
    }
    // console.log("JWT Token:", token); // Debugging

    try {
        const response = await fetch('/api/projects', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Attach token in the request
            }
        });
        
        console.log("Response Status:", response.status);
        if (response.status === 401) {
            alert("Unauthorized! Please log in again.");
            return;
        }
        

        const projects = await response.json();
        const projectsList = document.getElementById('projects-list');

        projectsList.innerHTML = projects.map(p =>
            `<div class="project" data-project-id="${p.id}">${p.name}</div>`
        ).join('');

        // Set default active project (first one)
        if (projects.length > 0) {
            fetchTasks(projects[0].id);
        }

        // Add click event to each project
        document.querySelectorAll('.project').forEach(project => {
            project.addEventListener('click', () => {
                const projectId = project.getAttribute('data-project-id');
                fetchTasks(projectId);
            });
        });

    } catch (error) {
        console.error('Error fetching projects:', error);
        alert("Error fetching projects. Please try again.");
    }
}
fetchProjects();


async function fetchTasks(projectId) {
    try {
        const response = await fetch(`/api/tasks?projectId=${projectId}`);
        const tasksData = await response.json();

        tasksData.sort((a, b) => sortByDueDate(a, b));

        document.querySelectorAll('.task-list').forEach(list => list.innerHTML = '');

        tasksData.forEach(task => renderTask(task));
    } catch (error) {
        console.error('Error fetching tasks:', error);
    }
}


function renderTask(task) {
    const taskElement = document.createElement('div');
    taskElement.classList.add('task');
    taskElement.setAttribute('draggable', 'true');
    taskElement.setAttribute('data-id', task.id);
    taskElement.ondragstart = drag;
    taskElement.onclick = () => showTaskDetails(task);

    let dueDateDisplay = task.dueDate ? formatDueDate(new Date(task.dueDate)) : '';

    taskElement.innerHTML = `
        <strong>${task.title}</strong><br>
        Priority: ${task.priority} <br>
        <span class="due-date">${dueDateDisplay}</span>
    `;

    const columnContainer = document.getElementById(`task-list-${task.columnId}`);
    if (columnContainer) {
        columnContainer.appendChild(taskElement);
    } else {
        console.warn(`Column ID ${task.columnId} not found for task ${task.id}`);
    }
}

function allowDrop(event) {
    event.preventDefault();
}

function drag(event) {
    event.dataTransfer.setData('text', event.target.dataset.id);
}

async function drop(event, newColumnId) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('text');
    const taskElement = document.querySelector(`[data-id='${taskId}']`);

    if (taskElement) {
        const columnContainer = document.getElementById(`task-list-${newColumnId}`);
        if (columnContainer) {
            columnContainer.appendChild(taskElement);
        }

        await updateTaskColumn(taskId, newColumnId);
    }
}

async function updateTaskColumn(taskId, newColumnId) {
    try {
        const response = await fetch(`/api/tasks/${taskId}/column`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'  // Ensure correct Content-Type
            },
            body: JSON.stringify({ columnId: newColumnId }) // Ensure body is JSON
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Failed to update task column:", errorText);
        }
    } catch (error) {
        console.error("Error updating task column:", error);
    }
}




async function updateTaskStatus(taskId, newStatus, newColumnId) {
    try {
        const task = tasksData.find(t => t.id === taskId);
        if (task) {
            task.status = newStatus;
            task.columnId = newColumnId;
        }
        await fetch(`/api/tasks/${taskId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus, column_id: newColumnId }) // Include column_id
        });
    } catch (error) {
        console.error('Error updating task:', error);
    }
}


function showTaskDetails(task) {
    currentTask = task;

    document.getElementById('task-title').textContent = task.title;
    document.getElementById('task-description').textContent = task.description;
    document.getElementById('task-priority').textContent = task.priority;
    document.getElementById('task-due-date').textContent = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date';
    document.getElementById('task-status').textContent = task.status;

    document.getElementById('taskModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('taskModal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    fetchProjectColumns();
});

function formatDueDate(date) {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);

    const options = { day: '2-digit', month: 'short' };
    const formattedDate = date.toLocaleDateString('en-GB', options);

    let color = 'grey';
    if (date < now) {
        color = 'red';
    } else if (date.toDateString() === now.toDateString() || date.toDateString() === tomorrow.toDateString()) {
        color = 'green';
    }
    return `<span style="color: ${color};">${formattedDate}</span>`;
}

function sortByDueDate(a, b) {
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
}
