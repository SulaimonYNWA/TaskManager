let tasksData = [];
let currentTask = null; // To hold the task clicked for viewing

const username = localStorage.getItem("username"); // Retrieve username from local storage
console.log(username);
if (username) {
    document.getElementById("username-display").textContent =  `Logged in as:  ${username}`;
}

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
        alert("Unauthorized!? Please log in.");
        window.location.href = 'login.html'; // Redirect to login page
        return;
    }
    // console.log("JWT Token:", token); // Debugging
    console.log("fetchprojects: username is: ",username);
    
    let user = getUser(username);
    let userID = (await user).id;
    
    try {
        const response = await fetch(`/api/projects/user/${userID}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Attach token in the request
            }
        });
        
        console.log("Response Status:", response.status);
        if (response.status === 401) {
            alert("Unauthorized!! Please log in again.");
            window.location.href = 'login.html';
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
        document.querySelectorAll('.project').forEach((project, index) => {
            project.addEventListener('click', () => {
                // Remove 'selected' class from all projects
                document.querySelectorAll('.project').forEach(p => p.classList.remove('selected'));

                // Add 'selected' class to clicked project
                project.classList.add('selected');

                // Fetch tasks for the selected project
                const projectId = project.getAttribute('data-project-id');
                fetchTasks(projectId);
            });

            // Select the first project by default
            if (index === 0) {
                project.classList.add('selected');
                const projectId = project.getAttribute('data-project-id');
                fetchTasks(projectId);
            }
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

function showTaskDetails(task) {
    // Get the task details panel, create it if not exists
    let detailsPanel = document.getElementById('task-details-panel');

    if (!detailsPanel) {
        detailsPanel = document.createElement('div');
        detailsPanel.id = 'task-details-panel';
        detailsPanel.classList.add('task-details-panel');
        document.body.appendChild(detailsPanel);
    }

    getUserByID(task.assigneeId)
        .then(user => {
            let assigneeName = user.username;

            // Populate task details with editable fields
            detailsPanel.innerHTML = `
                <span class="close-details" onclick="closeTaskDetails()">&times;</span>
                <h2><input type="text" id="task-title" value="${task.title}" class="styled-input" /></h2>
                
                <label>Assignee:</label>
                <select id="task-assignee" class="styled-select">
                    <option value="${task.assigneeId}" selected>${assigneeName}</option>
                    <!-- Dynamically populate with other users -->
                </select>

                <label>Description:</label>
                <textarea id="task-description" class="styled-textarea">${task.description || ''}</textarea>

                <label>Priority:</label>
                <select id="task-priority" class="styled-select priority-select">
                    <option value="Low" class="low-priority" ${task.priority === "Low" ? "selected" : ""}>Low</option>
                    <option value="Medium" class="medium-priority" ${task.priority === "Medium" ? "selected" : ""}>Medium</option>
                    <option value="High" class="high-priority" ${task.priority === "High" ? "selected" : ""}>High</option>
                </select>

                <label>Due Date:</label>
                <input type="date" id="task-due-date" value="${task.dueDate ? task.dueDate.split('T')[0] : ''}" class="styled-input" />

                <label>Status:</label>
                <select id="task-status" class="styled-select">
                    <option value="To Do" ${task.status === "To Do" ? "selected" : ""}>To Do</option>
                    <option value="In Progress" ${task.status === "In Progress" ? "selected" : ""}>In Progress</option>
                    <option value="Done" ${task.status === "Done" ? "selected" : ""}>Done</option>
                </select>

                <button onclick="saveTask(${task.id})" class="save-btn">Save</button>
            `;

            // Show the panel
            detailsPanel.style.right = '0';

            // Shift the main task board to the left
            document.getElementById('main-task-board').classList.add('main-shifted');
        })
        .catch(error => {
            console.error('Error fetching user:', error);
        });
}



function closeTaskDetails() {
    let detailsPanel = document.getElementById('task-details-panel');
    if (detailsPanel) {
        detailsPanel.style.right = '-400px'; // Hide the panel
    }

    // Reset the main task board position
    document.getElementById('main-task-board').classList.remove('main-shifted');
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



function saveTask(taskId) {
    const updatedTask = {
        title: document.getElementById('task-title').value,
        description: document.getElementById('task-description').value,
        assigneeId: parseInt(document.getElementById('task-assignee').value),
        status: document.getElementById('task-status').value,
        priority: document.getElementById('task-priority').value,
        dueDate: document.getElementById('task-due-date').value ? new Date(document.getElementById('task-due-date').value).toISOString() : null
    };

    fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedTask)
    })
        .then(response => {
            if (response.ok) {
                alert("Task updated successfully!");
                closeTaskDetails(); // Close the details panel after update
            } else {
                return response.json().then(data => { throw new Error(data.message || "Failed to update task"); });
            }
        })
        .catch(error => {
            console.error("Error updating task:", error);
            alert("Error updating task: " + error.message);
        });
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

// USERS -----------

async function getUser(username) {
    try {
        const response = await fetch(`/api/users/${username}`, { method: 'GET' });

        if (response.status === 404) {
            console.warn(`User '${username}' not found!`);
            return null; // Return null if user is not found
        }

        if (!response.ok) {
            throw new Error(`Failed to fetch user data (Status: ${response.status})`);
        }

        const user = await response.json(); // Parse JSON response

        if (!user || !user.username) {
            console.warn("User data is missing or invalid.");
            return null;
        }

        return user; // ✅ Return the user object

    } catch (error) {
        console.error('Error getting user:', error);
        return null; // Return null in case of an error
    }
}

async function getUserByID(id) {
    try {
        const response = await fetch(`/api/users/byID/${id}`, { method: 'GET' });

        if (response.status === 404) {
            console.warn(`User '${id}' not found!`);
            return null; // Return null if user is not found
        }

        if (!response.ok) {
            throw new Error(`Failed to fetch user data (Status: ${response.status})`);
        }

        const user = await response.json(); // Parse JSON response

        if (!user || !user.id) {
            console.warn("User data is missing or invalid.");
            return null;
        }

        return user; // ✅ Return the user object

    } catch (error) {
        console.error('Error getting user:', error);
        return null; // Return null in case of an error
    }
}
