// async function fetchProjects() {
//     try {
//         const response = await fetch('/api/projects');
//         const projects = await response.json();
//         const projectsList = document.getElementById('projects-list');
//         projectsList.innerHTML = projects.map(p => `<div class="project">${p.name}</div>`).join('');
//     } catch (error) {
//         console.error('Error fetching projects:', error);
//     }
// }

// fetchProjects();
