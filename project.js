// ===== PROJECT PAGE LOGIC =====

document.addEventListener('DOMContentLoaded', initProjectPage);

let currentProjectMembers = [];
let currentAssignmentTaskId = null;
let progressChart = null;

async function initProjectPage() {
    // 1. Auth Check
    const user = handleDashboardAccess('member', true); // Allow all (admin/member)
    if (!user) return;

    // 2. UI Setup
    document.getElementById("usernameDisplay").innerText = user.name;
    document.getElementById("userAvatar").innerText = user.name.charAt(0).toUpperCase();

    // Admin specific links
    if (user.role === 'admin') {
        const adminLink = document.getElementById('admin-users-link');
        if (adminLink) adminLink.style.display = 'block';
    }

    // 3. Navigation & Listeners
    setupEventListeners(user);

    // 4. Initial Load
    initChart();
    await loadProjectDashboard();
    await loadProjects();
    await loadTeams();
    await loadDeadlines();

    // 5. Handle URL Params
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');
    if (projectId) {
        openProjectDetails(projectId);
    }
}

function setupEventListeners(user) {
    // Navigation
    document.getElementById('navDashboard')?.addEventListener('click', () => {
        window.location.href = user.role === 'admin' ? 'admin-dashboard.html' : 'member-dashboard.html';
    });
    document.getElementById('navProjects')?.addEventListener('click', () => window.location.href = 'project.html');
    document.getElementById('navTasks')?.addEventListener('click', () => window.location.href = 'tasks.html');
    document.getElementById('admin-users-link')?.addEventListener('click', () => window.location.href = 'users.html');
    document.getElementById('navLogout')?.addEventListener('click', logout);

    // Buttons
    document.getElementById('btnNewProject')?.addEventListener('click', () => openModal('createProjectModal'));
    document.getElementById('btnViewAllProjects')?.addEventListener('click', loadProjects);
    document.getElementById('addTaskBtn')?.addEventListener('click', handleAddTaskClick);
    document.getElementById('addMemberBtn')?.addEventListener('click', () => openModal('addMemberModal'));

    // Forms
    document.getElementById('createProjectForm')?.addEventListener('submit', createProject);
    document.getElementById('createTaskForm')?.addEventListener('submit', createTask);
    document.getElementById('assignTaskForm')?.addEventListener('submit', submitTaskAssignment);
    document.getElementById('addMemberForm')?.addEventListener('submit', addMember);

    // Chat
    document.getElementById('chatToggleBtn')?.addEventListener('click', toggleProjectChat);
    document.getElementById('chatCloseBtn')?.addEventListener('click', toggleProjectChat);
    document.getElementById('chatSendBtn')?.addEventListener('click', sendChatMessage);

    // Modals Close
    document.querySelectorAll('.close[data-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal(btn.getAttribute('data-modal'));
        });
    });
}

// ===== CHART LOGIC =====
function initChart() {
    const ctx = document.getElementById("progressChart");
    if (!ctx) return;

    progressChart = new Chart(ctx.getContext("2d"), {
        type: "doughnut",
        data: {
            labels: ["Completed", "Pending", "In Progress"],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ["#f5b041", "#5dade2", "#58d68d"],
                borderWidth: 0
            }]
        },
        options: {
            cutout: "70%",
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

function updateChart(values) {
    if (progressChart && progressChart.data) {
        progressChart.data.datasets[0].data = values;
        progressChart.update();
    }
}

// ===== DATA LOADING =====
async function loadProjectDashboard() {
    const data = await apiGet('/api/dashboard');
    if (!data) return;

    animateValue("totalProjects", data.totalProjects || 0);
    animateValue("totalTasks", data.totalTasks || 0);
    animateValue("completedTasks", data.completedTasks || 0);
    animateValue("totalMembers", data.totalMembers || 0);

    const progress = [
        data.completedTasks || 0,
        data.pendingTasks || 0,
        data.inProgressTasks || 0
    ];

    setText("completedPercent", progress[0] + "%");
    setText("pendingPercent", progress[1] + "%");
    setText("inProgressPercent", progress[2] + "%");

    if (Array.isArray(progress)) {
        updateChart(progress);
    }
}

async function loadProjects() {
    const container = document.getElementById("projectsContainer");
    if (!container) return;
    container.innerHTML = '<p style="text-align:center; color:#666;">Loading projects...</p>';

    const user = parseJwt(localStorage.getItem("token"));
    // Endpoint logic
    const endpoint = user.role === 'admin'
        ? '/api/projects'
        : '/api/dashboard/projects';

    const projects = await apiGet(endpoint);
    container.innerHTML = "";

    if (!projects || !projects.length) {
        container.innerHTML = "<p>No projects found</p>";
        return;
    }

    projects.forEach(project => {
        const item = document.createElement("div");
        item.className = "project-item";
        item.style.cursor = "pointer";
        item.onclick = () => openProjectDetails(project.id);

        const desc = project.description ? project.description : "No description";
        const prog = project.progress || 0;

        item.innerHTML = `
            <div>
                <strong>${project.title}</strong>
                <div class="project-sub">${desc}</div>
            </div>
            <div class="progress-line" style="width:${prog}%"></div>
        `;
        container.appendChild(item);
    });
}

// ===== PROJECT DETAILS =====
async function openProjectDetails(id) {
    currentProjectId = id; // Global from app.js
    openModal('projectDetailsModal');

    if (socket) socket.emit("joinProject", id);

    const user = parseJwt(localStorage.getItem("token"));

    // UI Permissions
    const deleteBtn = document.getElementById('deleteProjectBtn');
    if (deleteBtn) deleteBtn.style.display = user.role === 'admin' ? 'block' : 'none';

    const canCreateTask = ['admin', 'manager', 'tester'].includes(user.role);
    const addTaskBtn = document.getElementById('addTaskBtn');
    if (addTaskBtn) addTaskBtn.style.display = canCreateTask ? 'block' : 'none';

    const canAddMember = ['admin', 'manager'].includes(user.role);
    const addMemberBtn = document.getElementById('addMemberBtn');
    if (addMemberBtn) addMemberBtn.style.display = canAddMember ? 'block' : 'none';

    // Fetch Details parallel
    const [project, tasks, members, messages] = await Promise.all([
        apiGet(`/api/projects/${id}`),
        apiGet(`/api/projects/${id}/tasks`),
        apiGet(`/api/projects/${id}/members`),
        apiGet(`/api/projects/${id}/messages`)
    ]);

    if (project) {
        setText("modalTitle", project.title);
        setText("modalDesc", project.description);
    }

    if (tasks) renderModalTasks(tasks);
    if (members) {
        currentProjectMembers = members;
        renderModalMembers(members);
        populateAssignDropdowns();
    }
    if (messages) renderChatMessages(messages);
}

// ===== TASKS LOGIC =====
function renderModalTasks(tasks) {
    const container = document.getElementById("modalTaskList");
    if (!container) return;
    container.innerHTML = "";

    const user = parseJwt(localStorage.getItem("token"));

    tasks.forEach(task => {
        const item = document.createElement("div");
        const priorityClass = task.priority ? task.priority.toLowerCase() : 'medium';
        item.className = `task-item priority-${priorityClass}`;

        const isCompleted = task.status === 'completed';
        const assigneeHtml = task.assigneeName
            ? `<div class="member" title="Assigned to ${task.assigneeName}" style="width:24px;height:24px;font-size:10px;background:#3b82f6;color:white;display:flex;align-items:center;justify-content:center;border-radius:50%;">${task.assigneeName.charAt(0).toUpperCase()}</div>`
            : `<div class="member" title="Unassigned" style="width:24px;height:24px;font-size:10px;background:#cbd5e1;color:white;display:flex;align-items:center;justify-content:center;border-radius:50%;"><i class="fa-solid fa-user-plus"></i></div>`;

        // Permission Checks
        const canUpdateStatus = ['admin', 'manager', 'tester'].includes(user.role) || task.assigned_to === user.id;
        const canAssign = ['admin', 'manager'].includes(user.role);
        const canDelete = ['admin', 'manager'].includes(user.role);

        const statusOptions = ['pending', 'in_progress', 'completed'].map(s =>
            `<option value="${s}" ${task.status === s ? 'selected' : ''}>${s.replace('_', ' ')}</option>`
        ).join('');

        item.innerHTML = `
            <div class="task-status">
                <select onchange="updateTaskStatus('${task._id || task.id}', this.value)" 
                        ${!canUpdateStatus ? 'disabled' : ''}
                        style="padding:6px; border-radius:6px; border:1px solid #cbd5e1; font-size:12px; background:${isCompleted ? '#f0fdf4' : 'white'}; opacity:${!canUpdateStatus ? 0.7 : 1}; width: 100%;">
                    ${statusOptions}
                </select>
            </div>
            
            <div class="task-meta">
                <div style="font-weight:600; font-size:14px; text-decoration: ${isCompleted ? 'line-through' : 'none'}; color: ${isCompleted ? '#94a3b8' : '#1e293b'}">${task.title}</div>
                <div style="font-size:11px; color:#64748b; display:flex; gap:8px; align-items:center; margin-top:4px;">
                    <span class="badge ${task.priority ? task.priority.toLowerCase() : 'medium'}" style="background:none; padding:0; color:inherit; font-weight:normal;">${task.priority}</span>
                    <span>•</span>
                    <span>${task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No Due Date'}</span>
                </div>
            </div>

            <div class="task-assignee" style="display:flex; justify-content:center;">
                ${assigneeHtml}
            </div>

            <div class="task-actions">
                ${canAssign ? `<button class="btn-sm" onclick="promptAssignTask('${task._id || task.id}')" title="Assign" style="color:#3b82f6; background:white; border:1px solid #e2e8f0; width:28px; height:28px; display:flex; align-items:center; justify-content:center; padding:0;">
                    <i class="fa-solid fa-user-pen"></i>
                </button>` : ''}
                ${canDelete ? `<button class="btn-sm" onclick="deleteTask('${task._id || task.id}')" title="Delete" style="color:#ef4444; background:white; border:1px solid #e2e8f0; width:28px; height:28px; display:flex; align-items:center; justify-content:center; padding:0;">
                    <i class="fa-solid fa-trash"></i>
                </button>` : ''}
            </div>
        `;
        container.appendChild(item);
    });
}

// ===== ACTIONS (Create/Delete/Update) =====
// Note: For POST/PUT/DELETE we often need headers. 
// We can use a helper or raw fetch. For now, raw fetch with token from app.js logic.

async function createProject(e) {
    e.preventDefault();
    const title = document.getElementById("newProjectTitle").value;
    const desc = document.getElementById("newProjectDesc").value;
    const token = localStorage.getItem("token");

    try {
        const res = await fetch(`${API_BASE_URL}/api/projects`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
            body: JSON.stringify({ title, description: desc })
        });

        if (res.ok) {
            closeModal('createProjectModal');
            showToast("Project created successfully!");
            await loadProjectDashboard();
            await loadProjects();
            e.target.reset();
        } else { showToast("Failed to create project", "error"); }
    } catch (err) { console.error(err); showToast("Server error", "error"); }
}

async function createTask(e) {
    e.preventDefault();
    if (!currentProjectId) { showToast("No active project found.", "error"); return; }

    const title = document.getElementById("newTaskTitle").value;
    const desc = document.getElementById("newTaskDesc").value;
    const priority = document.getElementById("newTaskPriority").value;
    const dueDate = document.getElementById("newTaskDue").value;
    const assignedTo = document.getElementById("newTaskAssignee").value;
    const token = localStorage.getItem("token");

    try {
        const res = await fetch(`${API_BASE_URL}/api/projects/${currentProjectId}/tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
            body: JSON.stringify({ title, description: desc, priority, dueDate, assigned_to: assignedTo })
        });
        if (res.ok) {
            closeModal('addTaskModal');
            openProjectDetails(currentProjectId);
            e.target.reset();
            showToast("Task added");
        } else { showToast("Failed to add task", "error"); }
    } catch (err) { console.error(err); }
}

async function updateTaskStatus(taskId, newStatus) {
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
            body: JSON.stringify({ status: newStatus })
        });

        if (res.ok) {
            showToast(`Task marked as ${newStatus.replace('_', ' ')}`);
            openProjectDetails(currentProjectId);
        } else {
            showToast("Failed to update status", "error");
        }
    } catch (e) { console.error(e); }
}

async function deleteTask(taskId) {
    if (!confirm("Delete this task?")) return;
    const token = localStorage.getItem("token");
    try {
        await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }
        });
        openProjectDetails(currentProjectId);
        showToast("Task deleted");
    } catch (err) { console.error(err); }
}

async function deleteProject() {
    if (!confirm("Delete project?")) return;
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`${API_BASE_URL}/api/projects/${currentProjectId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }
        });
        if (res.ok) {
            closeModal('projectDetailsModal');
            await loadProjectDashboard();
            await loadProjects();
            showToast("Project deleted");
        }
    } catch (err) { console.error(err); }
}

// ===== TEAMS & MEMBERS =====
async function loadTeams() {
    const teamBox = document.querySelector(".teams-box");
    if (!teamBox) return;

    const teams = await apiGet('/api/dashboard/teams');
    teamBox.innerHTML = "<h3>My Teams</h3>";

    if (!teams || !teams.length) {
        teamBox.innerHTML += "<p>No team memberships</p>";
        return;
    }

    teams.forEach(team => {
        const card = document.createElement("div");
        card.className = "team-modern-card";
        card.onclick = () => openProjectDetails(team.projectId); // Clickable
        card.innerHTML = `
            <span class="team-card-header">${team.projectTitle}</span>
            <div class="avatar-stack">
                ${team.members.map((m, index) => `
                    <div class="avatar-item" title="${m.name}" style="z-index:${team.members.length - index}">
                        ${m.name.charAt(0).toUpperCase()}
                    </div>
                `).join("")}
            </div>
        `;
        teamBox.appendChild(card);
    });
}

async function addMember(e) {
    e.preventDefault();
    const email = document.getElementById("newMemberEmail").value;
    const token = localStorage.getItem("token");

    try {
        const res = await fetch(`${API_BASE_URL}/api/projects/${currentProjectId}/members`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
            body: JSON.stringify({ email })
        });
        if (res.ok) {
            closeModal('addMemberModal');
            openProjectDetails(currentProjectId);
            e.target.reset();
            showToast("Member added");
        } else { showToast("Failed to add member", "error"); }
    } catch (err) { console.error(err); }
}

async function removeMember(memId) {
    if (!confirm("Remove this member?")) return;
    const token = localStorage.getItem("token");
    try {
        await fetch(`${API_BASE_URL}/api/projects/${currentProjectId}/members/${memId}`, {
            method: "DELETE",
            headers: { Authorization: "Bearer " + token }
        });
        openProjectDetails(currentProjectId);
        showToast("Member removed");
    } catch (err) { console.error(err); }
}

function renderModalMembers(members) {
    const container = document.getElementById("modalMemberList");
    const user = parseJwt(localStorage.getItem("token"));
    if (!container) return;
    container.innerHTML = "";
    members.forEach(m => {
        const item = document.createElement("div");
        item.className = "member-pill";
        item.innerHTML = `<span>${m.name}</span>`;
        if (user.role === 'admin') {
            item.innerHTML += `<span style="cursor:pointer;" onclick="removeMember('${m._id}')">&times;</span>`;
        }
        container.appendChild(item);
    });
}

function populateAssignDropdowns() {
    const options = `<option value="">Unassigned</option>` + currentProjectMembers.map(m =>
        `<option value="${m._id}">${m.name} (${m.email})</option>`
    ).join("");

    const ids = ["newTaskAssignee", "assignTaskSelect"];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = options;
    });
}


function handleAddTaskClick() {
    populateAssignDropdowns();
    openModal('addTaskModal');
}

function promptAssignTask(taskId) {
    currentAssignmentTaskId = taskId;
    populateAssignDropdowns();
    openModal('assignTaskModal');
}

async function submitTaskAssignment(e) {
    e.preventDefault();
    const assigneeId = document.getElementById("assignTaskSelect").value;
    const token = localStorage.getItem("token");

    try {
        const res = await fetch(`${API_BASE_URL}/api/tasks/${currentAssignmentTaskId}/assign`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
            body: JSON.stringify({ assigned_to: assigneeId })
        });

        if (res.ok) {
            closeModal('assignTaskModal');
            showToast("Task assigned");
            openProjectDetails(currentProjectId);
        } else { showToast("Failed to assign", "error"); }
    } catch (err) { console.error(err); }
}

// ===== MISC & CHAT =====
async function loadDeadlines() {
    const deadlineBox = document.querySelector(".deadline-box");
    if (!deadlineBox) return;

    const deadlines = await apiGet('/api/dashboard/deadlines');
    deadlineBox.innerHTML = "<h3>Upcoming Deadlines</h3>";

    if (!deadlines || !deadlines.length) {
        deadlineBox.innerHTML += "<p>No upcoming deadlines</p>";
        return;
    }

    deadlines.forEach(item => {
        const div = document.createElement("div");
        div.className = "deadline-item";
        div.innerHTML = `
            <div class="deadline-left">
                <span class="deadline-dot normal"></span>
                <div>
                    <strong>${item.title}</strong>
                    <div class="deadline-sub">${item.projectTitle}</div>
                </div>
            </div>
            <div class="deadline-date">${item.remaining}</div>
        `;
        deadlineBox.appendChild(div);
    });
}

function renderChatMessages(messages) {
    const container = document.getElementById("chatMessages");
    if (!container) return;
    container.innerHTML = "";
    messages.forEach(msg => appendChatMessage(msg));
    container.scrollTop = container.scrollHeight;
}

function appendChatMessage(data) {
    const container = document.getElementById("chatMessages");
    const div = document.createElement("div");
    div.className = "message";
    const user = parseJwt(localStorage.getItem("token"));

    const senderId = typeof data.sender === 'object' ? data.sender._id : data.sender;
    const isSelf = senderId === user.id || data.userId === user.id;

    if (isSelf) div.classList.add("self");
    else div.classList.add("other");

    div.textContent = data.message || data.content;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function sendChatMessage() {
    const input = document.getElementById("chatInput");
    const message = input.value.trim();
    if (!message || !currentProjectId) return;

    socket.emit("sendMessage", { projectId: currentProjectId, message });
    input.value = "";
}

function toggleProjectChat() {
    const popup = document.getElementById("chatPopup");
    if (popup) popup.style.display = (popup.style.display === "flex") ? "none" : "flex";
}

// Socket Listener unique to this page
if (socket) {
    socket.on("receiveMessage", (data) => {
        if (currentProjectId && (data.projectId === currentProjectId || data.project === currentProjectId)) {
            appendChatMessage(data);
        }
    });
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
}

function animateValue(id, end) {
    const el = document.getElementById(id);
    if (el) el.textContent = end; // Simplified for now
}

// Toast
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div class="toast-content">${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Modals
function openModal(id) { document.getElementById(id).style.display = "flex"; }
function closeModal(id) { document.getElementById(id).style.display = "none"; }
window.onclick = function (event) {
    if (event.target.classList.contains('modal')) event.target.style.display = "none";
}
