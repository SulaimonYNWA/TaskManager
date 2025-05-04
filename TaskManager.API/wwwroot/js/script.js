// State Management
let tasksData = [];
let projectsData = [];
let currentTask = null;
let currentProjectId = null;
let isLoading = false;

// DOM Elements
const dom = {
    menuToggle: document.querySelector('.menu-toggle'),
    sidebar: document.querySelector('.sidebar'),
    logoutBtn: document.querySelector('.logout-btn'),
    usernameDisplay: document.getElementById('username-display'),
    projectsList: document.getElementById('projects-list'),
    taskBoard: document.getElementById('task-board'),
    taskDetailsPanel: document.getElementById('task-details-panel'),
    addTaskMainBtn: document.getElementById('add-task-main-btn'),
    overlay: null
};

// Initialize the app
document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    initEventListeners();
    loadInitialData();
    createOverlay();
    
    
   username = localStorage.getItem('username');
    if (username) {
        const user = await getUser(username); // assume getUser fetches from server or DB
        if (user) {
            localStorage.setItem('user', JSON.stringify(user)); // ✅ store as JSON string
            console.log(user);
        } else {
            console.error('User not found');
        }
    }
});

// Authentication
function checkAuth() {
    const username = localStorage.getItem("username");
    const token = localStorage.getItem("token");

    if (!username || !token) {
        window.location.href = "login.html";
        return false;
    }

    // Remove or comment out this line:
    // dom.usernameDisplay.textContent = `Logged in as: ${username}`;

    // Add this instead to create the avatar:
    createUserAvatar(username);

    return true;
}

function createUserAvatar(username) {
    const initials = username.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    const avatar = document.createElement('div');
    avatar.className = 'user-avatar';
    avatar.textContent = initials;
    avatar.dataset.username = username; // Store username in dataset

    // Add click event to show full name
    avatar.addEventListener('click', function() {
        showUsernameTooltip(this);
    });

    dom.logoutBtn.insertAdjacentElement('beforebegin', avatar);
}

function showUsernameTooltip(avatarElement) {
    // Remove any existing tooltip first
    const existingTooltip = document.querySelector('.username-tooltip');
    if (existingTooltip) {
        existingTooltip.remove();
        return;
    }

    const username = avatarElement.dataset.username;
    const tooltip = document.createElement('div');
    tooltip.className = 'username-tooltip';
    tooltip.textContent = username;

    // Position it centered below the avatar
    const avatarRect = avatarElement.getBoundingClientRect();
    tooltip.style.position = 'fixed';
    tooltip.style.top = `${avatarRect.bottom + 10}px`;
    tooltip.style.left = `${avatarRect.left + (avatarRect.width / 2)}px`;
    tooltip.style.transform = 'translateX(-50%)';

    document.body.appendChild(tooltip);

    // Auto-close after 3 seconds
    const autoCloseTimer = setTimeout(() => {
        tooltip.remove();
    }, 2000);

    // Close when clicking anywhere else or when scrolling
    const closeTooltip = () => {
        clearTimeout(autoCloseTimer);
        tooltip.remove();
        document.removeEventListener('click', handleOutsideClick);
        window.removeEventListener('scroll', closeTooltip);
    };

    const handleOutsideClick = (e) => {
        if (!avatarElement.contains(e.target) && !tooltip.contains(e.target)) {
            closeTooltip();
        }
    };

    // Add event listeners with proper cleanup
    setTimeout(() => {
        document.addEventListener('click', handleOutsideClick);
        window.addEventListener('scroll', closeTooltip);
    }, 0);

    // Cleanup function for when avatar is removed
    avatarElement.cleanupTooltip = closeTooltip;
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    window.location.href = "login.html";
}

// DOM Utilities
function createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.onclick = closeTaskDetails;
    document.body.appendChild(overlay);
    dom.overlay = overlay;
}

function initEventListeners() {
    

    // Main Add Task Button
    dom.addTaskMainBtn.addEventListener('click', () => {
        if (!currentProjectId) {
            alert("Please select a project first");
            return;
        }
        const firstColumn = document.querySelector('.column');
        if (firstColumn) {
            showAddTaskModal(firstColumn.dataset.columnId);
        } else {
            alert("No columns available. Please wait...");
        }
    });
}

// Initial data loading
async function loadInitialData() {
    if (!checkAuth()) return;

    try {
        isLoading = true;
        projectsData = await fetchProjects();
        console.log('projectsData', projectsData);
        
        if (projectsData && projectsData.length > 0) {
            currentProjectId = projectsData[0].id;
            renderProjects(projectsData);
            await loadProjectData(currentProjectId);
        } else {
            renderProjects(projectsData);
        }
        renderProjectName(projectsData[0]);
    } catch (error) {
        console.error('Initial data loading error:', error);
        showError("Failed to load initial data. Please refresh the page.");
    } finally {
        isLoading = false;
    }
}

// Project Functions
// Add these functions to your JavaScript

async function fetchProjects() {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem("username");

    try {
        // First get the current user
        const user = await getUser(username);
        if (!user) throw new Error("User not found");

        // Then get projects for this user
        const response = await fetch(`/api/projects/user/${user.id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            window.location.href = 'login.html';
            return null;
        }

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        return await response.json();
    } catch (error) {
        console.error('Error fetching projects:', error);
        showError("Error loading projects. Please try again.");
        return [];
    }
}

async function createProject(projectData) {
    const token = localStorage.getItem('token');

    try {
        const response = await fetch('/api/projects/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(projectData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error creating project:', error);
        showError(error.message || 'Failed to create project. Please try again.');
        throw error;
    }
}

async function deleteProject(projectId) {
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`/api/projects/${projectId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
        }else {
            alert("Project deleted successfully.");
            await loadProjects(); // reload project list
        }
        return true;
    } catch (error) {
        console.error('Error deleting project:', error);
        showError(error.message || 'Failed to delete project. Please try again.');
        throw error;
    }
}

async function loadProjectData(projectId) {
    try {
        await Promise.all([
            fetchProjectColumns(projectId),
            fetchTasks(projectId)
            
        ]);
    } catch (error) {
        console.error('Error loading project data:', error);
        showError("Error loading project details. Please try again.");
    }
}

// Update your renderProjects function
function renderProjects(projects) {
    const projectsContainer = document.createElement('div');
    projectsContainer.className = 'projects-container';

    const createProjectBtn = document.createElement('button');
    createProjectBtn.className = 'create-project-btn';
    createProjectBtn.innerHTML = '<i class="fas fa-plus"></i> Create Project';
    createProjectBtn.addEventListener('click', showCreateProjectModal);
    projectsContainer.appendChild(createProjectBtn);

    const projectsList = document.createElement('div');
    projectsList.className = 'projects-list';

    const currentUser = JSON.parse(localStorage.getItem('user')); // Get current user info

    projects.forEach(project => {
        const projectElement = document.createElement('div');
        projectElement.className = `project ${project.id == currentProjectId ? 'active' : ''}`;
        projectElement.dataset.projectId = project.id;

        const isOwner = currentUser && project.ownerId == currentUser.id;

        projectElement.innerHTML = `
            <div class="project-content">
                <span class="project-name">${project.name}</span>
               
            </div>
        `;

        projectElement.addEventListener('click', async (e) => {
            if (e.target.closest('.project-actions')) return;
            const projectId = projectElement.dataset.projectId;
            if (projectId == currentProjectId || isLoading) return;

            currentProjectId = projectId;
            document.querySelectorAll('.project').forEach(p => p.classList.remove('active'));
            projectElement.classList.add('active');

            await loadProjectData(projectId);
            renderProjectName(project);
        });

        // if (isOwner) {
        //     projectElement.querySelector('.edit-project-btn').addEventListener('click', (e) => {
        //         e.stopPropagation();
        //         editProject(project);
        //     });
        //
        //     projectElement.querySelector('.delete-project-btn').addEventListener('click', (e) => {
        //         e.stopPropagation();
        //         deleteProject(project.id);
        //     });
        // }

        projectsList.appendChild(projectElement);
    });

    projectsContainer.appendChild(projectsList);
    dom.projectsList.replaceWith(projectsContainer);
    dom.projectsList = projectsContainer;
}



async function editProject(project) {
    const newName = prompt("Enter new project name:", project.name);
    if (!newName || newName.trim() === project.name.trim()) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/projects/${project.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                ...project,
                name: newName.trim()
            })
        });

        if (response.ok) {
            alert("Project updated.");
            await loadProjects(); // reload project list
        } else {
            const data = await response.json();
            alert("Failed to update project: " + (data.message || response.statusText));
        }
    } catch (err) {
        console.error("Error updating project:", err);
    }
}


// Add these new functions
function showCreateProjectModal() {
    // Implement your modal logic here
    console.log("Create project modal shown");
}


// Column Functions
async function fetchProjectColumns() {
    if (!currentProjectId) return;

    try {
        const response = await fetch(`/api/ProjectColumns?projectId=${currentProjectId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const columns = await response.json();
        renderColumns(columns);
    } catch (error) {
        console.error('Error fetching columns:', error);
        showError("Error loading columns. Please try again.");
    }
}


function renderColumns(columns) {
    dom.taskBoard.innerHTML = '';

    columns.forEach(column => {
        const columnElement = document.createElement('div');
        columnElement.classList.add('column');
        columnElement.id = `column-${column.id}`;
        columnElement.dataset.columnId = column.id;
        columnElement.ondragover = allowDrop;
        columnElement.ondrop = event => drop(event, column.id);

        const taskCount = tasksData.filter(t => t.columnId === column.id).length;

        columnElement.innerHTML = `
            <div class="column-header">
                <div class="column-title">
                    <h3>${column.name}</h3>
                    <span class="task-count">${taskCount}</span>
                </div>
                <button class="add-task-btn" data-column-id="${column.id}">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <div id="task-list-${column.id}" class="task-list"></div>
        `;

        dom.taskBoard.appendChild(columnElement);

        // Add event listener to the new button
        columnElement.querySelector('.add-task-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            showAddTaskModal(column.id);
        });
    });
}

// Task Functions
function showAddTaskModal(columnId) {
    const column = document.querySelector(`.column[data-column-id="${columnId}"] .task-list`);
    if (!column) {
        console.error(`Column with ID ${columnId} not found`);
        return;
    }

    // Remove any existing forms
    document.querySelectorAll('.quick-add-form').forEach(form => form.remove());

    const form = document.createElement('div');
    form.className = 'task quick-add-form';
    form.innerHTML = `
        <form class="quick-task-form">
            <input type="text" class="quick-task-title" placeholder="Task title" required autofocus>
            <div class="quick-task-actions">
                <input type="date" class="quick-task-date">
                <button type="submit" class="quick-add-submit">Add</button>
                <button type="button" class="quick-add-cancel">×</button>
            </div>
        </form>
    `;

    column.prepend(form);

    // Focus on title field immediately
    form.querySelector('.quick-task-title').focus();

    // Submit handler
    form.querySelector('.quick-task-form').addEventListener('submit', (e) => {
        e.preventDefault();
        handleQuickAddTask(columnId);
    });

    // Cancel handler
    form.querySelector('.quick-add-cancel').addEventListener('click', () => {
        form.remove();
    });
}

async function handleQuickAddTask(columnId) {
    const form = document.querySelector(`.column[data-column-id="${columnId}"] .quick-task-form`);
    if (!form) return;

    const titleInput = form.querySelector('.quick-task-title');
    const dueDateInput = form.querySelector('.quick-task-date');

    if (!titleInput.value.trim()) {
        titleInput.focus();
        showError('Task title cannot be empty');
        return;
    }

    try {
        const response = await fetch('/api/tasks/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                title: titleInput.value.trim(),
                dueDate: dueDateInput.value || null,
                columnId: parseInt(columnId),
                projectId: currentProjectId,
                priority: 'Medium',
                status: 'To Do'
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
        }

        const newTask = await response.json();
        form.remove();
        await fetchTasks(currentProjectId);
        return newTask;
    } catch (error) {
        console.error('Error adding task:', error);
        showError(error.message || 'Failed to add task. Please try again.');
    }
}

async function fetchTasks(projectId) {
    if (!projectId) return;

    try {
        const response = await fetch(`/api/tasks?projectId=${projectId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        tasksData = await response.json();

        // Enhance tasks with assignee names
        await Promise.all(tasksData.map(async task => {
            if (task.assigneeId) {
                const user = await getUserByID(task.assigneeId);
                task.assigneeName = user?.username || null;
            }
            return task;
        }));

        renderAllTasks(tasksData);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        showError("Error loading tasks. Please try again.");
    }
}

function renderAllTasks(tasks) {
    document.querySelectorAll('.task-list').forEach(list => {
        list.innerHTML = '';
    });

    tasks.sort(sortByDueDate).forEach(task => renderTask(task));
    updateTaskCounts();
}

function renderTask(task) {
    const taskElement = document.createElement('div');
    taskElement.className = 'task';
    taskElement.dataset.id = task.id;
    taskElement.draggable = true;
    taskElement.ondragstart = drag;
    taskElement.onclick = () => showTaskDetails(task);

    const dueDateDisplay = task.dueDate ? formatDueDate(new Date(task.dueDate)) : 'No due date';

    taskElement.innerHTML = `
        <strong>${task.title}</strong>
        <div class="task-meta">
            <span class="priority priority-${task.priority.toLowerCase()}">${task.priority}</span>
            <span class="due-date">${dueDateDisplay}</span>
            ${task.assigneeName ? `<span class="assignee-badge">${task.assigneeName.charAt(0).toUpperCase()}</span>` : ''}
        </div>
    `;

    const columnContainer = document.getElementById(`task-list-${task.columnId}`);
    if (columnContainer) columnContainer.appendChild(taskElement);
}

// Task Details Functions
function showTaskDetails(task) {
    const detailsPanel = dom.taskDetailsPanel;
    currentTask = task;

    detailsPanel.innerHTML = `
        <span class="close-details" onclick="closeTaskDetails()">&times;</span>
        <h2><input type="text" id="task-title" value="${task.title}" class="styled-input" /></h2>
        
        <div class="detail-section">
            <h3>Assignee</h3>
            <div class="assignee-container">
                <div class="assignee-avatar" onclick="toggleAssigneeDropdown(${task.projectId}, ${task.assigneeId || 0})">
                    ${task.assigneeName ? task.assigneeName.charAt(0).toUpperCase() : 'U'}
                </div>
                <span class="assignee-name">${task.assigneeName || 'Unassigned'}</span>
            </div>
        </div>

        <div class="detail-section">
            <h3>Description</h3>
            <textarea id="task-description" class="styled-textarea">${task.description || ''}</textarea>
        </div>

        <div class="detail-section">
            <h3>Details</h3>
            <div class="form-row">
                <div class="form-group">
                    <label>Priority</label>
                    <select id="task-priority" class="styled-select">
                        <option value="Low" ${task.priority === "Low" ? "selected" : ""}>Low</option>
                        <option value="Medium" ${task.priority === "Medium" ? "selected" : ""}>Medium</option>
                        <option value="High" ${task.priority === "High" ? "selected" : ""}>High</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Due Date</label>
                    <input type="date" id="task-due-date" class="styled-input" 
                           value="${task.dueDate ? task.dueDate.split('T')[0] : ''}">
                </div>
            </div>
        </div>

        <div class="task-actions">
            <button class="btn btn-primary" onclick="saveTask(${task.id})">
                <i class="fas fa-save"></i> Save Changes
            </button>
            <button class="btn btn-danger" onclick="deleteTask(${task.id})">
                <i class="fas fa-trash"></i> Delete Task
            </button>
        </div>
    `;

    detailsPanel.style.right = '0';
    dom.overlay.style.display = 'block';
}

async function toggleAssigneeDropdown(projectId, currentAssigneeId) {
    try {
        const response = await fetch(`/api/users/project/${projectId}`);
        if (!response.ok) throw new Error('Failed to fetch users');

        const users = await response.json();
        if (!users || users.length === 0) {
            showError('No team members available');
            return;
        }

        // Create dropdown element
        const dropdown = document.createElement('select');
        dropdown.id = 'assignee-dropdown';
        dropdown.className = 'styled-select';

        // Add "Unassigned" option
        const unassignedOption = document.createElement('option');
        unassignedOption.value = '';
        unassignedOption.textContent = 'Unassigned';
        if (!currentAssigneeId) unassignedOption.selected = true;
        dropdown.appendChild(unassignedOption);

        // Add user options
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.username;
            if (user.id === currentAssigneeId) option.selected = true;
            dropdown.appendChild(option);
        });

        // Insert dropdown
        const container = document.querySelector('.assignee-container');
        container.appendChild(dropdown);

        // Handle selection
        dropdown.addEventListener('change', async () => {
            const selectedValue = dropdown.value;
            const selectedOption = dropdown.options[dropdown.selectedIndex];

            // Update UI immediately
            const avatar = container.querySelector('.assignee-avatar');
            const nameSpan = container.querySelector('.assignee-name');

            avatar.textContent = selectedValue ? selectedOption.text.charAt(0).toUpperCase() : 'U';
            nameSpan.textContent = selectedValue ? selectedOption.text : 'Unassigned';

            // Update task in memory
            currentTask.assigneeId = selectedValue ? parseInt(selectedValue) : null;
            currentTask.assigneeName = selectedValue ? selectedOption.text : null;

            // Remove dropdown
            dropdown.remove();
        });

        // Close dropdown when clicking outside
        const clickHandler = (e) => {
            if (!dropdown.contains(e.target) && !e.target.classList.contains('assignee-avatar')) {
                dropdown.remove();
                document.removeEventListener('click', clickHandler);
            }
        };
        document.addEventListener('click', clickHandler);

        // Focus the dropdown
        dropdown.focus();

    } catch (error) {
        console.error('Error loading team members:', error);
        showError('Failed to load team members');
    }
}

function closeTaskDetails() {
    dom.taskDetailsPanel.style.right = '-450px';
    dom.overlay.style.display = 'none';
}

// Task Actions
async function saveTask(taskId) {
    const updatedTask = {
        title: document.getElementById('task-title').value,
        assigneeId: currentTask.assigneeId,
        description: document.getElementById('task-description').value,
        priority: document.getElementById('task-priority').value,
        dueDate: document.getElementById('task-due-date').value || null,
        status: currentTask.status || 'To Do'
    };

    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(updatedTask)
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        await fetchTasks(currentProjectId);
        closeTaskDetails();
    } catch (error) {
        console.error('Error updating task:', error);
        showError('Failed to save changes. Please try again.');
    }
}

async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
        const response = await fetch(`/api/tasks?id=${taskId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        await fetchTasks(currentProjectId);
        closeTaskDetails();
    } catch (error) {
        console.error('Error deleting task:', error);
        showError('Failed to delete task. Please try again.');
    }
}

// Drag and Drop
function allowDrop(event) {
    event.preventDefault();
}

function drag(event) {
    event.dataTransfer.setData('text', event.target.dataset.id);
}

async function drop(event, newColumnId) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('text');

    try {
        await updateTaskColumn(taskId, newColumnId);
        await fetchTasks(currentProjectId);
    } catch (error) {
        console.error("Error moving task:", error);
        showError('Failed to move task. Please try again.');
    }
}

async function updateTaskColumn(taskId, newColumnId) {
    try {
        const response = await fetch(`/api/tasks/${taskId}/column`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ columnId: newColumnId })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    } catch (error) {
        console.error("Error updating task column:", error);
        throw error;
    }
}

// User Functions
async function getUser(username) {
    try {
        const response = await fetch(`/api/users/${username}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error getting user:', error);
        showError('Failed to load user data.');
        return null;
    }
}

async function getUserByID(id) {
    try {
        const response = await fetch(`/api/users/byID/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}

// Utility Functions
function updateTaskCounts() {
    document.querySelectorAll('.column').forEach(column => {
        const columnId = column.dataset.columnId;
        const count = tasksData.filter(t => t.columnId == columnId).length;
        column.querySelector('.task-count').textContent = count;
    });
}

function formatDueDate(date) {
    if (!date) return 'No due date';

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    const options = { day: '2-digit', month: 'short' };
    const formattedDate = date.toLocaleDateString('en-GB', options);

    let color = '#aaa';
    if (date < now) {
        color = '#ff4d4d';
    } else if (date.toDateString() === now.toDateString() || date.toDateString() === tomorrow.toDateString()) {
        color = '#4CAF50';
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

function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;

    const header = document.querySelector('.board-header');
    if (header) {
        header.appendChild(errorElement);
        setTimeout(() => errorElement.remove(), 5000);
    } else {
        alert(message);
    }
}

function showCreateProjectModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h2>Create New Project</h2>
            <form id="create-project-form">
                <div class="form-group">
                    <label for="new-project-name">Project Name</label>
                    <input type="text" id="new-project-name" required>
                </div>
                <div class="form-group">
                    <label for="project-description">Description (Optional)</label>
                    <textarea id="project-description"></textarea>
                </div>
                <button type="submit" class="btn btn-primary">Create Project</button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Close modal
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.remove();
    });

    // Form submission
    modal.querySelector('#create-project-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('new-project-name').value.trim();
        const description = document.getElementById('project-description').value.trim();
        const username = localStorage.getItem('username');

        try {
            const user = await getUser(username);
            if (!user) throw new Error("User not found");

            const newProject = await createProject({
                name: name,
                description: description,
                ownerId: user.id
            });

            modal.remove();
            await loadInitialData(); // Refresh projects list
        } catch (error) {
            console.error('Error creating project:', error);
        }
    });
}

// render project name:
function renderProjectName(project) {
    const projectNameElement = document.getElementById('project-name');
    const currentUser = JSON.parse(localStorage.getItem('user'));

    projectNameElement.textContent = project.name;

    // Clear any previous contenteditable and event listeners
    projectNameElement.removeAttribute('contenteditable');
    projectNameElement.replaceWith(projectNameElement.cloneNode(true));
    const newProjectNameElement = document.getElementById('project-name');

    if (currentUser && project.ownerId === currentUser.id) {
        newProjectNameElement.setAttribute('contenteditable', 'true');
        newProjectNameElement.classList.add('editable');

        let timeout;
        newProjectNameElement.addEventListener('input', () => {
            newProjectNameElement.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault(); // Prevent newline
                    newProjectNameElement.blur(); // Trigger update early
                }
            });
            clearTimeout(timeout);
            timeout = setTimeout(async () => {
                const newName = newProjectNameElement.textContent.trim();

                if (newName && newName !== project.name) {
                    const token = localStorage.getItem('token');
                    const response = await fetch(`/api/projects/${project.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            ...project,
                            name: newName
                        })
                    });

                    if (response.ok) {
                        project.name = newName;
                        updateProjectNameInSidebar(project.id, newName);
                        console.log("Project name updated.");
                    } else {
                        console.error("Failed to update project name.");
                        newProjectNameElement.textContent = project.name; // revert on error
                    }
                }
            }, 2000); // update after 2 seconds of inactivity
        });
    } else {
        newProjectNameElement.classList.remove('editable');
    }
}

function updateProjectNameInSidebar(projectId, newName) {
    const sidebarProject = document.querySelector(`.project[data-project-id="${projectId}"] .project-name`);
    if (sidebarProject) {
        sidebarProject.textContent = newName;
    }
}



