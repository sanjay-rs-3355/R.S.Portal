// ===== PROJECT PAGE LOGIC =====

document.addEventListener('DOMContentLoaded', initProjectPage);

let currentProjectMembers = [];
let currentAssignmentTaskId = null;
let currentProjectId = null;
let progressChart = null;
let modalProgressChart = null;
let allProjectsData = [];
let isViewAllProjects = false;
let currentFiles = [];
let currentSelectedFileId = null;
let latestPresenceMap = {};

// Avatar color palette
const AVATAR_COLORS = [
    '#6366f1', '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981',
    '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#14b8a6'
];
function avatarColor(name = '') {
    if (!name) name = '';
    let strName = String(name);
    let hash = 0;
    for (let c of strName) hash = (hash << 5) - hash + c.charCodeAt(0);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ===== INIT =====
async function initProjectPage() {
    const user = handleDashboardAccess('member', true);
    if (!user) return;

    setupNavigation();
    setupEventListeners(user);
    initChart();
    setupSocketListeners();

    await loadProjectDashboard();
    await loadProjects();
    await loadDeadlines();
    await loadMeetings(); // Added this

    // Handle ?id= param
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');
    if (projectId) openProjectDetails(projectId);
}

// ===== EVENT LISTENERS =====
function setupEventListeners(user) {
    // Buttons
    const canManageAdmin = user.role === 'admin' || user.role === 'manager';
    const btnNewProject = document.getElementById('btnNewProject');
    if (btnNewProject) btnNewProject.style.display = canManageAdmin ? 'flex' : 'none';

    // Allow members to add meetings too for better collaboration
    const addMeetingBtn = document.getElementById('addMeetingBtn');
    if (addMeetingBtn) addMeetingBtn.style.display = 'flex';

    btnNewProject?.addEventListener('click', () => openModal('createProjectModal'));
    document.getElementById('btnViewAllProjects')?.addEventListener('click', () => {
        isViewAllProjects = !isViewAllProjects;
        renderProjectsList();
    });

    // Forms
    document.getElementById('createProjectForm')?.addEventListener('submit', createProject);
    document.getElementById('createTaskForm')?.addEventListener('submit', createTask);
    document.getElementById('assignTaskForm')?.addEventListener('submit', submitTaskAssignment);
    document.getElementById('addMemberForm')?.addEventListener('submit', addMember);
    document.getElementById('addMeetingForm')?.addEventListener('submit', scheduleMeeting);
    document.getElementById('editProjectForm')?.addEventListener('submit', updateProject);

    // Task & Member buttons (inside modal – delegated via IDs)
    document.getElementById('addTaskBtn')?.addEventListener('click', handleAddTaskClick);
    document.getElementById('addMemberBtn')?.addEventListener('click', () => openModal('addMemberModal'));

    // Delete project
    document.getElementById('deleteProjectBtn')?.addEventListener('click', deleteProject);

    // Chat
    document.getElementById('chatSendBtn')?.addEventListener('click', sendChatMessage);
    document.getElementById('chatInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
    });

    // File Collaboration
    document.getElementById('uploadFileForm')?.addEventListener('submit', handleFileUpload);
    document.getElementById('actualFileInput')?.addEventListener('change', handleFileSelect);

    // Close buttons
    document.querySelectorAll('.close[data-modal]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.getAttribute('data-modal')));
    });

    // Tab switching
    document.querySelectorAll('.proj-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Modals
    document.getElementById('editProjectBtn')?.addEventListener('click', openEditProjectModal);
    document.getElementById('addMeetingBtn')?.addEventListener('click', openAddMeetingModal);
    document.getElementById('btnUploadFile')?.addEventListener('click', () => openModal('uploadFileModal'));

    // Search
    const searchInput = document.querySelector('.search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase().trim();
            let filtered = q === ''
                ? allProjectsData
                : allProjectsData.filter(p =>
                    p.title.toLowerCase().includes(q) ||
                    (p.description && p.description.toLowerCase().includes(q)) ||
                    String(p.id || '').toLowerCase().includes(q) ||
                    String(p._id || '').toLowerCase().includes(q)
                );

            if (q !== '') {
                filtered = sortSearchResults(filtered, q, ['title', 'id', '_id', 'description']);
            }
            renderProjectsList(filtered);
        });
    }

    // Close modal on backdrop click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) e.target.style.display = 'none';
    });

}

// Notifications are handled by app.js → setupTopbar()

// ===== TAB SWITCHING =====
function switchTab(tabId) {
    document.querySelectorAll('.proj-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.proj-panel').forEach(p => p.classList.remove('active'));

    document.querySelector(`.proj-tab[data-tab="${tabId}"]`)?.classList.add('active');
    document.getElementById(`panel-${tabId}`)?.classList.add('active');
}

// ===== CHART =====
function initChart() {
    const ctx = document.getElementById('progressChart');
    if (!ctx) return;

    progressChart = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'In Progress / Review', 'Pending Allocation'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#10b981', '#6366f1', '#f59e0b'],
                borderWidth: 0,
                hoverOffset: 6
            }]
        },
        options: {
            cutout: '76%',
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

// ===== DASHBOARD DATA =====
async function loadProjectDashboard() {
    const data = await apiGet('/api/dashboard');
    if (!data) return;

    // Use IDs from the new consolidated UI
    animateValue('totalTasks', data.totalTasks || 0);
    animateValue('totalMembers', data.totalUsers || 0);

    // Update the counter in the project list card
    const projCounter = document.getElementById('totalProjectsCounter');
    if (projCounter) projCounter.textContent = `${data.totalProjects || 0} Active Projects`;

    if (!data.totalUsers) {
        apiGet('/api/users').then(users => {
            if (users && users.length) animateValue('totalMembers', users.length);
        }).catch(() => { });
    }

    const total = (data.totalTasks || 0);
    const completed = data.completedTasks || 0;
    const inProgress = (data.inProgressTasks || 0) + (data.reviewTasks || 0);

    animateValue('completedTasksLabel', completed);

    updateChart([completed, inProgress, total - completed - inProgress]);
}

// ===== PROJECTS LIST =====
async function loadProjects() {
    const container = document.getElementById('projectsContainer');
    if (!container) return;
    container.innerHTML = '<p style="text-align:center; color:#94a3b8; padding: 20px 0;">Loading projects…</p>';

    const user = parseJwt(localStorage.getItem('token'));
    const endpoint = user.role === 'admin' ? '/api/projects' : '/api/dashboard/projects';
    const projects = await apiGet(endpoint);
    allProjectsData = projects || [];
    renderProjectsList();
}

function renderProjectsList(dataToRender = null) {
    const container = document.getElementById('projectsContainer');
    const btnViewAll = document.getElementById('btnViewAllProjects');
    if (!container) return;

    // Set grid layout and scroll for modern cards
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(240px, 1fr))';
    container.style.gap = '15px';
    container.style.marginTop = '15px';
    container.style.maxHeight = '650px';
    container.style.overflowY = 'auto';
    container.style.paddingRight = '8px';
    container.classList.add('deadline-feed-scroll'); // Use existing premium scrollbar style

    const source = dataToRender !== null ? dataToRender : allProjectsData;
    container.innerHTML = '';

    if (!source || !source.length) {
        container.style.display = 'block'; // Reset for empty state
        container.innerHTML = `
            <div style="text-align:center; padding:50px 20px; background:#f8fafc; border-radius:20px; border:1px dashed #e2e8f0;">
                <i class="fa-regular fa-folder-open" style="font-size:48px; color:#cbd5e1; margin-bottom:15px; display:block;"></i>
                <h4 style="margin:0; color:#475569;">No projects found</h4>
                <p style="margin:5px 0 0 0; font-size:13px; color:#94a3b8;">Start by creating a new project</p>
            </div>`;
        if (btnViewAll) btnViewAll.style.display = 'none';
        return;
    }

    const MAX = 6; // Show 6 cards on dashboard
    const toShow = (!isViewAllProjects && source.length > MAX)
        ? source.slice(0, MAX)
        : source;

    toShow.forEach((project, index) => {
        const div = document.createElement('div');
        div.className = 'project-card-premium reveal';
        div.onclick = () => openProjectDetails(project.id);
        div.style.animationDelay = `${index * 80}ms`;

        const prog = project.progress || 0;
        const color = avatarColor(project.title);
        const status = prog === 100 ? 'Completed' : (project.status || 'Active');
        const statusClass = status.toLowerCase().replace(' ', '');

        // Apply a subtle dynamic box-shadow glow based on the project's color
        div.style.setProperty('--card-glow', `${color}15`);

        // Mocking member avatars (ideally these come from API)
        const members = project.memberNames ? project.memberNames.split(',') : ['User'];
        const memberHtml = members.slice(0, 3).map(m =>
            `<div class="member-avg-mini" style="background:${avatarColor(m)}; border-color:#fff;">${(m.trim() || '?').charAt(0).toUpperCase()}</div>`
        ).join('') + (members.length > 3 ? `<div class="member-avg-mini" style="background:#f8fafc; color:#64748b; border-color:#fff;">+${members.length - 3}</div>` : '');

        div.innerHTML = `
            <div class="project-card-header">
                <div class="project-card-icon" style="background:${color}12; color:${color};">
                    <i class="fa-solid fa-folder-closed"></i>
                </div>
                <span class="project-status-badge status-${statusClass}">${status}</span>
            </div>
            <div class="project-card-body">
                <h4 title="${escapeHTML(project.title)}">${escapeHTML(project.title)}</h4>
                <p style="margin-bottom:0;">${escapeHTML(project.description || 'No description provided')}</p>
            </div>
            <div class="project-card-footer">
                <div class="member-stack-mini">${memberHtml}</div>
                <div class="project-progress-circle">
                    <svg viewBox="0 0 36 36" style="width:100%; height:100%; transform:rotate(-90deg); filter: drop-shadow(0 2px 4px ${color}20);">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f1f5f9" stroke-width="3" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="${color}" stroke-width="3.5" stroke-dasharray="${prog}, 100" stroke-linecap="round" />
                    </svg>
                    <div class="progress-pct-text">${prog}%</div>
                </div>
            </div>
            ${project.last_activity_text ? `
            <div class="recent-activity-section" style="margin-top:0; padding-top:14px; border-top:1px solid rgba(241, 245, 249, 0.5);">
                <div class="recent-activity-item" style="font-size:11px; opacity:0.8;">
                    <i class="fa-solid fa-clock-rotate-left" style="color:${color}; margin-right:6px;"></i>
                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#64748b; font-weight:600;">${project.last_activity_text}</span>
                </div>
            </div>` : ''}
        `;
        container.appendChild(div);
    });

    if (btnViewAll) {
        if (source.length > MAX) {
            btnViewAll.style.display = 'block';
            btnViewAll.style.width = '100%';
            btnViewAll.style.marginTop = '20px';
            btnViewAll.innerText = isViewAllProjects ? 'Show Less' : `Explore All Projects (${source.length})`;
        } else {
            btnViewAll.style.display = 'none';
        }
    }
}

// ===== PROJECT DETAILS =====
async function openProjectDetails(id) {
    currentProjectId = id;
    openModal('projectDetailsModal');

    // Join socket room
    if (socket) socket.emit('joinProject', id);

    const user = parseJwt(localStorage.getItem('token'));

    const canManage = ['admin', 'manager'].includes(user.role);
    const editBtn = document.getElementById('editProjectBtn');
    if (editBtn) editBtn.style.display = canManage ? 'flex' : 'none';

    const deleteBtn = document.getElementById('deleteProjectBtn');
    if (deleteBtn) deleteBtn.style.display = user.role === 'admin' ? 'flex' : 'none';

    const canCreateTask = ['admin', 'manager', 'tester'].includes(user.role);
    const addTaskBtn = document.getElementById('addTaskBtn');
    if (addTaskBtn) addTaskBtn.style.display = canCreateTask ? 'inline-flex' : 'none';

    const canAddMember = ['admin', 'manager'].includes(user.role);
    const addMemberBtn = document.getElementById('addMemberBtn');
    if (addMemberBtn) addMemberBtn.style.display = canAddMember ? 'inline-flex' : 'none';

    const canAddMeeting = ['admin', 'manager'].includes(user.role);
    const addMeetingBtn = document.getElementById('addMeetingBtn');
    if (addMeetingBtn) addMeetingBtn.style.display = canAddMeeting ? 'inline-flex' : 'none';

    // Switch to Overview tab by default
    switchTab('overview');

    // Fetch all data in parallel
    const [project, tasks, members, messages, files, meetings] = await Promise.all([
        apiGet(`/api/projects/${id}`),
        apiGet(`/api/projects/${id}/tasks`),
        apiGet(`/api/projects/${id}/members`),
        apiGet(`/api/projects/${id}/messages`),
        apiGet(`/api/projects/${id}/files`),
        apiGet(`/api/meetings?projectId=${id}`)
    ]);

    if (project) {
        setText('modalTitle', project.title);
        setText('modalDesc', project.description || '');
    }

    if (meetings) {
        renderMeetingsList(meetings);
    }


    if (tasks) {
        renderModalTasks(tasks);
        renderModalProgress(tasks);
        const badge = document.getElementById('taskCount');
        if (badge) badge.textContent = tasks.length;
    }

    // Scoped deadlines for this project
    loadProjectDeadlines(id);

    if (members) {
        currentProjectMembers = members;
        renderModalMembers(members);
        populateAssignDropdowns();
        const badge = document.getElementById('memberCount');
        if (badge) badge.textContent = members.length;
        renderTeamPresence({}); // Initial render with everyone offline
    }

    if (messages) renderChatMessages(messages);

    if (files) {
        renderFilesList(files);
        const count = files.length;
        const b1 = document.getElementById('fileCount');
        if (b1) b1.textContent = count;
        const b2 = document.getElementById('fileListCount');
        if (b2) b2.textContent = count;
    }
}

// ===== TASKS =====
function renderModalTasks(tasks) {
    const container = document.getElementById('modalTaskList');
    if (!container) return;

    const user = parseJwt(localStorage.getItem('token'));
    container.innerHTML = '';

    if (!tasks || tasks.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px 20px; color:#94a3b8;">
                <i class="fa-regular fa-circle-check" style="font-size:32px; margin-bottom:10px; display:block; opacity:0.35;"></i>
                <p style="margin:0; font-size:13px;">No tasks yet. Add one above.</p>
            </div>`;
        return;
    }

    tasks.forEach(task => {
        const item = document.createElement('div');
        const priorityClass = (task.priority || 'medium').toLowerCase();
        item.className = `task-item priority-${priorityClass}`;

        const isCompleted = task.status === 'completed';
        const assigneeHtml = task.assigneeName
            ? `<div style="width:26px;height:26px;font-size:10px;background:${avatarColor(task.assigneeName)};color:white;display:flex;align-items:center;justify-content:center;border-radius:50%;font-weight:700;" title="${escapeHTML(task.assigneeName)}">${task.assigneeName.charAt(0).toUpperCase()}</div>`
            : `<div style="width:26px;height:26px;font-size:10px;background:#e2e8f0;color:#94a3b8;display:flex;align-items:center;justify-content:center;border-radius:50%;" title="Unassigned"><i class="fa-solid fa-user"></i></div>`;

        const canUpdateStatus = ['admin', 'manager', 'tester'].includes(user.role) || task.assigned_to === user.id;
        const canAssign = ['admin', 'manager'].includes(user.role);
        const canDelete = ['admin', 'manager'].includes(user.role);

        const statusOptions = ['pending', 'in_progress', 'completed', 'review'].map(s =>
            `<option value="${s}" ${task.status === s ? 'selected' : ''}>${s.replace('_', ' ')}</option>`
        ).join('');

        item.innerHTML = `
            <div class="task-status">
                <select onchange="updateTaskStatus('${task._id || task.id}', this.value)"
                        ${!canUpdateStatus ? 'disabled' : ''}
                        style="padding:5px 8px; border-radius:6px; border:1px solid #cbd5e1; font-size:11px; background:${isCompleted ? '#f0fdf4' : 'white'}; cursor:pointer; min-width:110px;">
                    ${statusOptions}
                </select>
            </div>

            <div class="task-meta">
                <div style="font-weight:600; font-size:13px; text-decoration:${isCompleted ? 'line-through' : 'none'}; color:${isCompleted ? '#94a3b8' : '#1e293b'};">${escapeHTML(task.title)}</div>
                <div style="font-size:11px; color:#64748b; display:flex; gap:8px; align-items:center; margin-top:3px;">
                    <span style="font-weight:700; color:${priorityClass === 'high' ? '#ef4444' : priorityClass === 'medium' ? '#f59e0b' : '#10b981'};">${task.priority || 'Medium'}</span>
                    <span>•</span>
                    <span>${task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No due date'}</span>
                </div>
            </div>

            <div class="task-assignee" style="display:flex; justify-content:center;">
                ${assigneeHtml}
            </div>

            <div class="task-actions">
                ${canAssign ? `<button class="btn-sm" onclick="promptAssignTask('${task._id || task.id}', '${task.assigned_to || ''}')" title="Assign Task" style="color:#3b82f6; background:white; border:1px solid #e2e8f0; width:28px; height:28px; display:flex; align-items:center; justify-content:center; padding:0; border-radius: 8px;">
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

// ===== MEMBERS =====
function renderModalMembers(members) {
    const container = document.getElementById('modalMemberList');
    const user = parseJwt(localStorage.getItem('token'));
    if (!container) return;
    container.innerHTML = '';

    if (!members || members.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px; color:#94a3b8;">
                <i class="fa-solid fa-users-slash" style="font-size:32px; margin-bottom:10px; display:block; opacity:0.3;"></i>
                <p style="margin:0; font-size:13px;">No members yet.</p>
            </div>`;
        return;
    }

    members.forEach(m => {
        const memberId = m.id || m._id;
        const color = avatarColor(m.name);
        const item = document.createElement('div');
        item.className = 'member-pill-v2';
        item.innerHTML = `
            <div class="mem-avatar" style="background: ${color};">${(m.name || '?').charAt(0).toUpperCase()}</div>
            <div class="mem-info">
                <div class="mem-name">${escapeHTML(m.name)}</div>
                <div class="mem-email">${escapeHTML(m.email || m.role || '')}</div>
            </div>
            ${['admin', 'manager'].includes(user.role) ? `<button class="mem-remove-btn" onclick="removeMember('${memberId}')" title="Remove member">&times;</button>` : ''}
        `;
        container.appendChild(item);
    });
}

function populateAssignDropdowns() {
    const options = `<option value="">Unassigned</option>` + currentProjectMembers.map(m =>
        `<option value="${m.id || m._id}">${escapeHTML(m.name)} (${escapeHTML(m.email || '')})</option>`
    ).join('');

    ['newTaskAssignee', 'assignTaskSelect'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = options;
    });
}

function handleAddTaskClick() {
    populateAssignDropdowns();
    openModal('addTaskModal');
}

function promptAssignTask(taskId, currentAssigneeId) {
    currentAssignmentTaskId = taskId;
    populateAssignDropdowns();
    const select = document.getElementById('assignTaskSelect');
    if (select) select.value = currentAssigneeId || "";
    openModal('assignTaskModal');
}

// ===== CRUD ACTIONS =====
async function createProject(e) {
    e.preventDefault();
    const title = document.getElementById('newProjectTitle').value;
    const desc = document.getElementById('newProjectDesc').value;
    const token = localStorage.getItem('token');

    try {
        const res = await apiPost('/api/projects', { title, description: desc });
        if (res) {
            closeModal('createProjectModal');
            showToast('Project created successfully!');
            await loadProjectDashboard();
            await loadProjects();
            e.target.reset();
        }
    } catch (err) { console.error(err); showToast(err.message || 'Failed to create project', 'error'); }
}

async function openEditProjectModal() {
    if (!currentProjectId) return;
    try {
        const project = await apiGet(`/api/projects/${currentProjectId}`);
        if (project) {
            document.getElementById('editProjectId').value = project.id;
            document.getElementById('editProjectTitle').value = project.title;
            document.getElementById('editProjectDesc').value = project.description || '';
            openModal('editProjectModal');
        }
    } catch (err) {
        showToast('Failed to load project data', 'error');
    }
}

async function updateProject(e) {
    e.preventDefault();
    const id = document.getElementById('editProjectId').value;
    const title = document.getElementById('editProjectTitle').value.trim();
    const description = document.getElementById('editProjectDesc').value.trim();

    if (!title) return;

    try {
        await apiPut(`/api/projects/${id}`, { title, description });
        showToast('Project updated successfully!');
        closeModal('editProjectModal');

        // Update modal header if it's open
        const modalTitle = document.getElementById('modalTitle');
        const modalDesc = document.getElementById('modalDesc');
        if (modalTitle) modalTitle.innerText = title;
        if (modalDesc) modalDesc.innerText = description;

        await loadProjects();
        await loadProjectDashboard();
    } catch (err) {
        console.error(err);
        showToast(err.message || 'Update failed', 'error');
    }
}

async function createTask(e) {
    e.preventDefault();
    if (!currentProjectId) { showToast('No active project.', 'error'); return; }

    const title = document.getElementById('newTaskTitle').value;
    const desc = document.getElementById('newTaskDesc').value;
    const priority = document.getElementById('newTaskPriority').value;
    const dueDate = document.getElementById('newTaskDue').value;
    const assignedTo = document.getElementById('newTaskAssignee').value;
    const token = localStorage.getItem('token');

    try {
        const res = await apiPost(`/api/projects/${currentProjectId}/tasks`, { title, description: desc, priority, deadline: dueDate || null, assigned_to: assignedTo || null });
        if (res) {
            closeModal('addTaskModal');
            showToast('Task added!');
            e.target.reset();
            await refreshProjectDetails();
        }
    } catch (err) { console.error(err); showToast(err.message || 'Failed to add task', 'error'); }
}

async function updateTaskStatus(taskId, newStatus) {
    const token = localStorage.getItem('token');
    try {
        const res = await apiPut(`/api/tasks/${taskId}/status`, { status: newStatus });
        if (res) {
            showToast(`Task marked as ${newStatus.replace('_', ' ')}`);
            await Promise.all([
                refreshProjectDetails(),
                loadProjectDashboard() // Sync main page chart too
            ]);
        }
    } catch (e) { console.error(e); showToast(e.message || 'Failed to update status', 'error'); }
}

async function deleteTask(taskId) {
    if (!confirm('Delete this task?')) return;
    const token = localStorage.getItem('token');
    try {
        await apiDelete(`/api/tasks/${taskId}`);
        showToast('Task deleted');
        await refreshProjectDetails();
    } catch (err) { console.error(err); showToast(err.message || 'Failed to delete task', 'error'); }
}

async function deleteProject() {
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return;
    const token = localStorage.getItem('token');
    try {
        const res = await apiDelete(`/api/projects/${currentProjectId}`);
        if (res) {
            closeModal('projectDetailsModal');
            await loadProjectDashboard();
            await loadProjects();
            showToast('Project deleted');
        }
    } catch (err) { console.error(err); showToast(err.message || 'Failed to delete project', 'error'); }
}

async function addMember(e) {
    e.preventDefault();
    const email = document.getElementById('newMemberEmail').value;
    try {
        const res = await apiPost(`/api/projects/${currentProjectId}/members`, { email });
        if (res) {
            closeModal('addMemberModal');
            showToast('Member added!');
            e.target.reset();
            await refreshProjectDetails();
        }
    } catch (err) { console.error(err); showToast(err.message || 'Failed to add member', 'error'); }
}

async function removeMember(memId) {
    if (!confirm('Remove this member from the project?')) return;
    try {
        await apiDelete(`/api/projects/${currentProjectId}/members/${memId}`);
        showToast('Member removed');
        await refreshProjectDetails();
    } catch (err) { console.error(err); showToast(err.message || 'Failed to remove member', 'error'); }
}

async function submitTaskAssignment(e) {
    e.preventDefault();
    const assigneeId = document.getElementById('assignTaskSelect').value;
    try {
        const res = await apiPut(`/api/tasks/${currentAssignmentTaskId}/assign`, { assigned_to: assigneeId });
        if (res) {
            closeModal('assignTaskModal');
            showToast('Task assigned!');
            await refreshProjectDetails();
        }
    } catch (err) { console.error(err); showToast(err.message || 'Failed to assign task', 'error'); }
}

// Helper: refresh modal without closing it
async function refreshProjectDetails() {
    if (!currentProjectId) return;
    const activeTab = document.querySelector('.proj-tab.active')?.dataset.tab || 'tasks';

    const [tasks, members, files] = await Promise.all([
        apiGet(`/api/projects/${currentProjectId}/tasks`),
        apiGet(`/api/projects/${currentProjectId}/members`),
        apiGet(`/api/projects/${currentProjectId}/files`)
    ]);

    if (tasks) {
        renderModalTasks(tasks);
        renderModalProgress(tasks);
        const badge = document.getElementById('taskCount');
        if (badge) badge.textContent = tasks.length;
    }
    if (members) {
        currentProjectMembers = members;
        renderModalMembers(members);
        populateAssignDropdowns();
        const badge = document.getElementById('memberCount');
        if (badge) badge.textContent = members.length;
    }
    if (files) {
        renderFilesList(files, currentSelectedFileId);
        const badge = document.getElementById('fileCount');
        if (badge) badge.textContent = files.length;
    }

    renderTeamPresence(latestPresenceMap);
    switchTab(activeTab);
    await loadProjectDashboard();
    await loadProjects();
}

// ===== CHAT =====
function renderChatMessages(messages) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    container.innerHTML = '';
    messages.forEach(msg => appendChatMessage(msg));
    container.scrollTop = container.scrollHeight;
}

function appendChatMessage(data) {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    const user = parseJwt(localStorage.getItem('token'));
    const senderId = typeof data.sender === 'object' ? (data.sender._id || data.sender.id) : (data.sender_id || data.userId || data.sender);
    const isSelf = String(senderId) === String(user.id);
    const senderName = typeof data.sender === 'object' ? data.sender.name : (data.userName || 'User');
    const senderInit = (senderName || 'U').charAt(0).toUpperCase();
    const time = data.timestamp ? new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const color = avatarColor(senderName);

    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${isSelf ? 'self' : 'other'}`;
    wrapper.innerHTML = `
        <div class="msg-row ${isSelf ? 'self' : 'other'}">
            ${!isSelf ? `<div class="msg-avatar" style="background:${color};" title="${escapeHTML(senderName)}">${senderInit}</div>` : ''}
            <div class="msg-bubble-wrap">
                ${!isSelf ? `<div class="msg-sender-name">${escapeHTML(senderName)}</div>` : ''}
                <div class="message ${isSelf ? 'self' : 'other'}">
                    ${escapeHTML(data.message || data.content || '')}
                    <div class="message-time">${time}</div>
                </div>
            </div>
        </div>
    `;
    container.appendChild(wrapper);
    container.scrollTop = container.scrollHeight;
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message || !currentProjectId) return;

    socket.emit('sendMessage', { projectId: currentProjectId, message });
    input.value = '';
}

// ===== TEAM PRESENCE =====
function renderTeamPresence(presenceMap) {
    const container = document.getElementById('teamPresenceList');
    if (!container) return;

    container.innerHTML = '';

    // presenceMap is { [userId]: 'online'|'idle' }
    // currentProjectMembers is the full list of members

    const sortedMembers = [...currentProjectMembers].sort((a, b) => {
        const idA = String(a.id || a._id);
        const idB = String(b.id || b._id);
        const statusA = presenceMap[idA] || 'offline';
        const statusB = presenceMap[idB] || 'offline';

        const rank = { online: 3, idle: 2, offline: 1 };
        return rank[statusB] - rank[statusA];
    });
    sortedMembers.forEach(member => {
        const mId = String(member.id || member._id);
        const status = presenceMap[mId] || 'offline';
        const color = avatarColor(member.name);

        const item = document.createElement('div');
        item.className = 'presence-item';
        item.setAttribute('data-user-id', mId);
        item.innerHTML = `
            <div class="presence-avatar" style="background:${color};">
                ${(member.name || '?').charAt(0).toUpperCase()}
                <div class="status-dot ${status}"></div>
            </div>
            <div style="flex:1; min-width:0;">
                <div class="presence-name">${escapeHTML(member.name)}</div>
                <div class="presence-role">${status} • ${member.role || 'member'}</div>
            </div>
        `;
        container.appendChild(item);
    });
}

// Setup socket listeners (called once in init)
function setupSocketListeners() {
    if (!socket) {
        console.warn("Socket not initialized. Real-time features will not work.");
        return;
    }

    console.log("Setting up socket listeners...");

    socket.on('teamPresence', (presenceMap) => {
        console.log("Received teamPresence update:", presenceMap);
        latestPresenceMap = presenceMap;
        renderTeamPresence(presenceMap);

        // Update chat tab badge
        const onlineCount = Object.values(presenceMap).filter(status => status === 'online').length;
        const badge = document.getElementById('chatOnlineCount');
        if (badge) {
            badge.textContent = onlineCount;
            badge.style.display = onlineCount > 0 ? 'inline-flex' : 'none';
        }
    });

    socket.on('receiveMessage', (data) => {
        if (currentProjectId && (data.projectId === currentProjectId || data.project === currentProjectId)) {
            appendChatMessage(data);
        }
    });

    // Send activity heartbeat every 1 minute
    setInterval(() => {
        if (currentProjectId) {
            socket.emit('activity');
        }
    }, 60000);

    // Track local keyboard/mouse activity to keep online
    const updateActivity = () => {
        if (currentProjectId) socket.emit('activity');
    };

    document.addEventListener('mousemove', debounce(updateActivity, 30000));
    document.addEventListener('keypress', debounce(updateActivity, 30000));
}




// ===== DEADLINES =====
async function loadDeadlines() {
    const deadlineBox = document.querySelector('.deadline-box');
    if (!deadlineBox) return;

    deadlineBox.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h3 style="margin:0; font-size:15px; font-weight:700; color:#1e293b;">Upcoming Deadlines</h3>
            <span style="font-size:11px; color:#94a3b8;">Next tasks due</span>
        </div>
        <div id="deadline-list"><p style="color:#94a3b8; text-align:center; padding:20px;">Loading…</p></div>
    `;

    const deadlines = await apiGet('/api/dashboard/deadlines');
    const list = document.getElementById('deadline-list');
    if (!list) return;

    if (!deadlines || !deadlines.length) {
        list.innerHTML = `
            <div style="text-align:center; padding:30px 10px; color:#94a3b8;">
                <i class="fa-solid fa-calendar-check" style="font-size:30px; margin-bottom:10px; display:block; opacity:0.3;"></i>
                <p style="margin:0; font-size:13px;">No upcoming deadlines</p>
            </div>`;
        return;
    }

    list.innerHTML = '';
    deadlines.forEach((item, index) => {
        const diffDays = item.diffDays ?? 99;
        let dotColor, badgeBg, badgeColor, badgeText;
        if (diffDays === 0) { dotColor = '#ef4444'; badgeBg = '#fee2e2'; badgeColor = '#ef4444'; badgeText = 'Due Today'; }
        else if (diffDays === 1) { dotColor = '#f97316'; badgeBg = '#fff7ed'; badgeColor = '#f97316'; badgeText = 'Tomorrow'; }
        else if (diffDays <= 3) { dotColor = '#f59e0b'; badgeBg = '#fef9c3'; badgeColor = '#a16207'; badgeText = item.remaining; }
        else { dotColor = '#10b981'; badgeBg = '#dcfce7'; badgeColor = '#15803d'; badgeText = item.remaining; }

        const priMap = {
            high: { bg: '#fee2e2', color: '#ef4444', label: 'High' },
            medium: { bg: '#fef9c3', color: '#a16207', label: 'Med' },
            low: { bg: '#dcfce7', color: '#15803d', label: 'Low' }
        };
        const pri = priMap[(item.priority || '').toLowerCase()] || null;

        list.innerHTML += `
            <div class="deadline-item-modern" style="animation: slideUpFade 0.35s ease ${index * 60}ms backwards;">
                <div class="deadline-dot-glow" style="background:${dotColor};"></div>
                <div style="flex:1; min-width:0;">
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:3px;">
                        <span style="font-weight:700; font-size:14px; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px;" title="${escapeHTML(item.title)}">${escapeHTML(item.title)}</span>
                        ${pri ? `<span style="font-size:9px; font-weight:800; padding:1px 8px; border-radius:6px; background:${pri.bg}; color:${pri.color}; text-transform:uppercase; letter-spacing:0.4px;">${pri.label}</span>` : ''}
                    </div>
                    <div style="font-size:11px; color:#64748b; display:flex; align-items:center; gap:5px; opacity:0.7;">
                        <i class="fa-regular fa-folder" style="font-size:10px;"></i>
                        <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(item.projectTitle || '')}</span>
                    </div>
                </div>
                <div style="text-align:right; flex-shrink:0; display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                    <div class="deadline-badge-modern" style="background:${badgeBg}; color:${badgeColor}; border: 1px solid ${badgeColor}15; min-width: 75px; text-align: center;">${badgeText}</div>
                    <div style="font-size:10px; color:#94a3b8; font-weight:700; letter-spacing:0.2px;">${item.dateStr || ''}</div>
                </div>
            </div>
        `;
    });
}

// ===== FILE COLLABORATION WORKSPACE =====
function renderFilesList(files, keepFileId = null) {
    currentFiles = files || [];
    const list = document.getElementById('fileHelpList');
    if (!list) return;
    list.innerHTML = '';

    const countBadge = document.getElementById('fileListCount');
    if (countBadge) countBadge.textContent = currentFiles.length;

    if (currentFiles.length === 0) {
        list.innerHTML = `<p style='color:#64748b; font-size:12px; text-align:center; padding:20px;'>No files uploaded yet.</p>`;
        document.getElementById('fileHelpEmpty').style.display = 'flex';
        document.getElementById('fileHelpMain').style.display = 'none';
        return;
    }

    currentFiles.forEach(file => {
        const item = document.createElement('div');
        item.className = 'file-help-item';
        item.dataset.fileId = file.id;

        const ext = (file.filename || file.title || '').split('.').pop().toLowerCase();
        const iconClass = getFileIcon(ext);

        const uploaderName = file.user_name || 'User';
        const color = avatarColor(uploaderName);

        item.innerHTML = `
            <div class="file-help-icon" style="background:${color};"><i class="${iconClass}"></i></div>
            <div class="file-help-info">
                <div class="file-help-name">${escapeHTML(file.filename || file.title)}</div>
                <div class="file-help-meta">
                    <span style="font-weight:600;">${escapeHTML(uploaderName)}</span>
                    <span>•</span>
                    <span>${getTimeAgo(file.created_at)}</span>
                </div>
            </div>
        `;

        item.onclick = () => {
            document.querySelectorAll('.file-help-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            currentSelectedFileId = file.id;
            openFileDetails(file.id);
        };

        list.appendChild(item);
    });

    if (keepFileId) {
        const stillExists = currentFiles.find(f => String(f.id) === String(keepFileId));
        if (stillExists) {
            const el = list.querySelector(`[data-file-id="${keepFileId}"]`);
            if (el) { el.classList.add('active'); openFileDetails(keepFileId); return; }
        }
    }

    const first = list.querySelector('.file-help-item');
    if (first) {
        first.classList.add('active');
        currentSelectedFileId = currentFiles[0].id;
        openFileDetails(currentSelectedFileId);
    }
}

function openFileDetails(id) {
    const file = currentFiles.find(f => String(f.id) === String(id));
    if (!file) return;

    document.getElementById('fileHelpEmpty').style.display = 'none';
    document.getElementById('fileHelpMain').style.display = 'flex';

    document.getElementById('fcTitle').textContent = file.title || file.filename || 'Untitled';
    document.getElementById('fcDesc').textContent = file.description || 'No description provided.';

    // Tags
    let tagsHtml = '';
    const ext = (file.filename || file.title || '').split('.').pop().toLowerCase();
    tagsHtml = `<span class="file-tag">${ext || 'file'}</span>`;
    if (file.file_type) tagsHtml += `<span class="file-tag">${file.file_type.split('/')[0]}</span>`;
    document.getElementById('fcTags').innerHTML = tagsHtml;

    const previewArea = document.getElementById('fcPreview');
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'];

    // Header actions - DOWNLOAD LINK
    const toolbar = document.querySelector('.preview-toolbar');
    if (toolbar) {
        const token = localStorage.getItem('token');
        const downloadUrl = `${API_BASE_URL}/api/files/download/${file.id}?token=${token}`; // Token as query for simple <a> tag if needed, or we'll wrap in JS

        toolbar.innerHTML = `
            <span class="preview-label"><i class="fa-solid fa-file"></i> File Information</span>
            <div style="display:flex; gap:8px;">
                <button class="btn-text-sm" onclick="handleFileDownload('${file.id}', '${file.filename}')" style="background:#6366f1; border:none; border-radius:6px; padding:6px 14px; font-weight:700; color:white; cursor:pointer;"><i class="fa-solid fa-download"></i> Download</button>
                <button class="btn-text-sm" onclick="handleFileDelete('${file.id}')" style="background:#ef4444; border:none; border-radius:6px; padding:6px 14px; font-weight:700; color:white; cursor:pointer;"><i class="fa-solid fa-trash"></i> Delete</button>
            </div>
        `;
    }

    // Since we don't have a direct preview URL yet, we show placeholder or image if we had one.
    // I'll add a preview endpoint in backend that can be used here.
    if (imageExtensions.includes(ext)) {
        previewArea.innerHTML = `
            <div style="text-align:center; padding:40px; color:#94a3b8;">
                <i class="fa-solid fa-image" style="font-size:48px; margin-bottom:15px; opacity:0.3;"></i>
                <p>Preview for <strong>${file.filename}</strong></p>
                <p style="font-size:12px;">Files are stored securely on the server.</p>
            </div>`;
    } else {
        previewArea.innerHTML = `
            <div style="padding: 24px; background: #f8fafc; border-radius: 12px; border: 1px dashed #e2e8f0;">
                <div style="margin-bottom:10px; font-weight:700; color:#1e293b;">File Details:</div>
                <div style="font-size:13px; color:#475569; display:grid; grid-template-columns: 100px 1fr; gap:8px;">
                    <span>Filename:</span> <strong>${file.filename}</strong>
                    <span>Size:</span> <strong>${(file.file_size / 1024).toFixed(1)} KB</strong>
                    <span>Type:</span> <strong>${file.file_type || 'Unknown'}</strong>
                    <span>Uploaded:</span> <strong>${new Date(file.created_at).toLocaleString()}</strong>
                </div>
            </div>`;
    }

    // Load real comments
    loadFileComments(file.id);

    // Comment form submission
    const commentForm = document.getElementById('fcCommentForm');
    if (commentForm) {
        commentForm.onsubmit = async (e) => {
            e.preventDefault();
            const input = document.getElementById('fcCommentInput');
            const content = input.value.trim();
            if (!content) return;

            try {
                await apiPost(`/api/files/${file.id}/comments`, { content });
                input.value = '';
                loadFileComments(file.id);
                showToast('Comment added!');
            } catch (err) {
                console.error("Failed to add comment:", err);
                showToast('Failed to add comment', 'error');
            }
        };
    }
}

async function loadFileComments(fileId) {
    const list = document.getElementById('fcDiscussionList');
    if (!list) return;

    list.innerHTML = `<div style="text-align:center; padding:20px; color:#94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Loading discussion...</div>`;

    try {
        const comments = await apiGet(`/api/files/${fileId}/comments`);
        list.innerHTML = '';

        if (!comments || comments.length === 0) {
            list.innerHTML = `<div style="text-align:center; padding:20px; color:#94a3b8; font-size:12px;">This is a brand new discussion. Be the first to help!</div>`;
            return;
        }

        comments.forEach(comment => {
            const color = avatarColor(comment.user_name);
            const initial = (comment.user_name || 'U').charAt(0).toUpperCase();

            list.innerHTML += `
                <div class="discussion-comment">
                    <div class="comment-avatar" style="background: ${color};">${initial}</div>
                    <div class="comment-content">
                        <div class="comment-header">
                            <span class="comment-author">${escapeHTML(comment.user_name)}</span>
                            <span class="comment-time">${getTimeAgo(comment.created_at)}</span>
                        </div>
                        <p class="comment-text">${escapeHTML(comment.content)}</p>
                    </div>
                </div>
            `;
        });
        list.scrollTop = list.scrollHeight;
    } catch (err) {
        console.error("Failed to load comments:", err);
        list.innerHTML = `<div style="text-align:center; padding:20px; color:#ef4444; font-size:12px;">Failed to load comments.</div>`;
    }
}
async function handleFileDownload(fileId, filename) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/files/download/${fileId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Download failed');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    } catch (err) {
        showToast('Download failed: ' + err.message, 'error');
    }
}

async function handleFileDelete(fileId) {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
        await apiDelete(`/api/files/${fileId}`);
        showToast('File deleted successfully');
        await refreshProjectDetails();
    } catch (err) {
        showToast('Delete failed: ' + err.message, 'error');
    }
}

function getFileIcon(ext) {
    const map = {
        js: 'fa-brands fa-js',
        ts: 'fa-brands fa-js',
        html: 'fa-brands fa-html5',
        css: 'fa-brands fa-css3-alt',
        py: 'fa-brands fa-python',
        md: 'fa-solid fa-file-lines',
        json: 'fa-solid fa-braces',
        sh: 'fa-solid fa-terminal',
        sql: 'fa-solid fa-database',
        pdf: 'fa-solid fa-file-pdf',
        png: 'fa-solid fa-file-image',
        jpg: 'fa-solid fa-file-image',
        jpeg: 'fa-solid fa-file-image'
    };
    return map[ext] || 'fa-solid fa-file';
}

function handleFileSelect(e) {
    if (e.target.files.length > 0) {
        document.getElementById('uploadFileNameDisplay').textContent = e.target.files[0].name;
    }
}

async function handleFileUpload(e) {
    e.preventDefault();
    if (!currentProjectId) { showToast('No active project.', 'error'); return; }

    const fileInput = document.getElementById('actualFileInput');
    const title = document.getElementById('uploadFileTitle').value;
    const desc = document.getElementById('uploadFileDesc').value;
    const tags = document.getElementById('uploadFileTags').value;

    if (fileInput.files.length === 0) {
        showToast('Please select a file.', 'error');
        return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = 'Uploading...';

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('title', title + (tags ? ` [${tags}]` : ''));
    formData.append('description', desc);

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/projects/${currentProjectId}/files`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const data = await res.json();
        if (res.ok) {
            showToast('File uploaded successfully!');
            closeModal('uploadFileModal');
            e.target.reset();
            document.getElementById('uploadFileNameDisplay').textContent = 'Supported images, text, code';
            fileInput.value = '';

            await refreshProjectDetails();
        } else {
            throw new Error(data.message || 'Upload failed');
        }
    } catch (err) {
        console.error("Upload Error:", err);
        showToast(err.message || 'Upload failed', 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}


// ===== MODAL PROGRESS CHART & DEADLINES =====
function renderModalProgress(tasks) {
    const canvas = document.getElementById('modalProgressChart');
    if (!canvas) return;

    if (modalProgressChart) modalProgressChart.destroy();

    const counts = { completed: 0, pending: 0, in_progress: 0, review: 0 };
    tasks.forEach(t => {
        if (counts[t.status] !== undefined) counts[t.status]++;
        else counts.pending++;
    });

    const data = [counts.completed, counts.pending, counts.in_progress, counts.review];

    const total = tasks.length;

    const ctx = canvas.getContext('2d');
    modalProgressChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Pending', 'In Progress', 'In Review'],
            datasets: [{
                data: data,
                backgroundColor: ['#10b981', '#f59e0b', '#6366f1', '#8b5cf6'],
                borderWidth: 0,
                hoverOffset: 6
            }]
        },
        options: {
            cutout: '75%',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        },
        plugins: [{
            id: 'centerText',
            afterDraw: function (chart) {
                const { width, height, ctx } = chart;
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const cx = width / 2;
                const cy = height / 2;

                // Value
                ctx.font = 'bold 32px Inter, sans-serif';
                ctx.fillStyle = '#1e293b';
                ctx.fillText(total, cx, cy - 8);

                // Label
                ctx.font = '600 12px Inter, sans-serif';
                ctx.fillStyle = '#64748b';
                ctx.fillText('TOTAL TASKS', cx, cy + 18);
                ctx.restore();
            }
        }]
    });

    // Custom Legend
    const legend = document.getElementById('modalChartLegend');
    if (legend) {
        const statuses = [
            { label: 'Done', color: '#10b981', count: counts.completed },
            { label: 'Pending', color: '#f59e0b', count: counts.pending },
            { label: 'Working', color: '#6366f1', count: counts.in_progress },
            { label: 'Review', color: '#8b5cf6', count: counts.review }
        ];

        legend.innerHTML = statuses.map(s => `
            <div class="legend-item-v2">
                <span style="width:10px; height:10px; border-radius:50%; background:${s.color}; display:inline-block; flex-shrink:0;"></span>
                <div style="display:flex; flex-direction:column;">
                    <span style="font-size:10px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px;">${s.label}</span>
                    <span style="font-size:14px; font-weight:700; color:#1e293b;">${s.count}</span>
                </div>
            </div>
            `).join('');
    }
}

async function loadProjectDeadlines(projectId) {
    const list = document.getElementById('project-deadline-list');
    if (!list) return;

    const deadlines = await apiGet(`/api/dashboard/deadlines?projectId=${projectId}`);
    if (!deadlines || !deadlines.length) {
        list.innerHTML = `
            <div style="text-align:center; padding:40px 20px; color:#94a3b8;">
                <i class="fa-solid fa-calendar-check" style="font-size:32px; margin-bottom:12px; display:block; opacity:0.2;"></i>
                <p style="margin:0; font-size:13px;">Perfect! No upcoming deadlines.</p>
            </div> `;
        return;
    }

    list.innerHTML = deadlines.map((item, index) => {
        const diffDays = item.diffDays ?? 99;
        let dotColor = '#10b981';
        let badgeBg = '#dcfce7';
        let badgeColor = '#15803d';

        if (diffDays <= 0) { dotColor = '#ef4444'; badgeBg = '#fee2e2'; badgeColor = '#ef4444'; }
        else if (diffDays === 1) { dotColor = '#f97316'; badgeBg = '#fff7ed'; badgeColor = '#f97316'; }
        else if (diffDays <= 3) { dotColor = '#f59e0b'; badgeBg = '#fef9c3'; badgeColor = '#a16207'; }

        return `
            <div style="display: flex; align-items: center; gap: 16px; padding: 16px; border-bottom: 1px solid #f1f5f9; animation: slideUpFade 0.3s ease ${index * 50}ms backwards;">
                <div style="width: 40px; height: 40px; background: ${badgeBg}; color: ${dotColor}; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;">
                    <i class="fa-regular fa-calendar-check"></i>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 700; font-size: 14px; color: #1e293b; margin-bottom: 2px;">${escapeHTML(item.title)}</div>
                    <div style="font-size: 11px; color: #64748b; font-weight: 500; display: flex; align-items: center; gap: 8px;">
                        <span><i class="fa-regular fa-user" style="margin-right: 4px;"></i> ${escapeHTML(item.assignedToName || 'Unassigned')}</span>
                        <span style="color: #cbd5e1;">|</span>
                        <span style="color: ${dotColor}; font-weight: 700;">${item.remaining}</span>
                    </div>
                </div>
                <div style="width: 100px; height: 6px; background: #f1f5f9; border-radius: 10px; overflow: hidden; flex-shrink: 0;">
                    <div style="width: ${Math.max(10, 100 - (diffDays * 5)) > 100 ? 100 : Math.max(10, 100 - (diffDays * 5))}%; height: 100%; background: ${dotColor}; border-radius: 10px;"></div>
                </div>
            </div>
            `;
    }).join('');
}

async function loadMeetings(projectId = null) {
    const list = document.getElementById('meetingsContainer');
    if (!list) return;

    const endpoint = projectId ? `/api/meetings?projectId=${projectId}` : '/api/meetings';
    const meetings = await apiGet(endpoint);
    renderMeetingsList(meetings);
}

// ===== MEETINGS LOGIC =====
function renderMeetingsList(meetings) {
    const container = document.getElementById('meetingsContainer');
    const summaryContainer = document.getElementById('meetingSummary');
    if (!container) return;

    if (!meetings || meetings.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:60px 20px; color:#94a3b8;">
                <i class="fa-solid fa-calendar-xmark" style="font-size:48px; margin-bottom:15px; display:block; opacity:0.1;"></i>
                <p style="margin:0; font-size:14px; font-weight:500;">No sessions scheduled for your projects yet.</p>
            </div> `;
        if (summaryContainer) summaryContainer.innerHTML = '';
        return;
    }

    // Sort meetings by date/time
    const sorted = [...meetings].sort((a, b) => new Date(a.meeting_date + 'T' + a.meeting_time) - new Date(b.meeting_date + 'T' + b.meeting_time));
    const now = new Date();
    const upcoming = sorted.filter(m => new Date(m.meeting_date + 'T' + m.meeting_time) > now);
    const todayCount = sorted.filter(m => new Date(m.meeting_date).toDateString() === now.toDateString()).length;

    // Render Summary Widgets
    if (summaryContainer) {
        const next = upcoming[0];
        let nextHtml = '';
        if (next) {
            const nextDate = new Date(next.meeting_date + 'T' + next.meeting_time);
            const diffMs = nextDate - now;
            const diffMin = Math.round(diffMs / 60000);
            const countdownText = diffMin < 60 ? `${diffMin}m` : `${Math.floor(diffMin / 60)}h ${diffMin % 60}m`;

            nextHtml = `
                <div style="background: rgba(99, 102, 241, 0.08); padding: 8px 16px; border-radius: 12px; display: flex; align-items: center; gap: 10px; border: 1px solid rgba(99, 102, 241, 0.1);">
                    <div style="width: 8px; height: 8px; background: #6366f1; border-radius: 50%; box-shadow: 0 0 10px #6366f1;"></div>
                    <span style="font-size: 11px; font-weight: 800; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.5px;">Next in ${countdownText}</span>
                </div>
            `;
        }

        summaryContainer.innerHTML = `
            ${nextHtml}
            <div style="background: #f8fafc; padding: 8px 16px; border-radius: 12px; display: flex; align-items: center; gap: 8px; border: 1px solid #e2e8f0;">
                <i class="fa-solid fa-calendar-day" style="color: #64748b; font-size: 12px;"></i>
                <span style="font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase;">Today: ${todayCount}</span>
            </div>
        `;
    }

    // Enhanced Responsive Grid
    container.style.display = 'grid';
    container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(360px, 1fr))';
    container.style.gap = '25px';
    container.style.padding = '10px 5px';

    container.innerHTML = sorted.map((m, index) => {
        const mDate = new Date(m.meeting_date);
        const timeStr = m.meeting_time.substring(0, 5);
        const typeColor = m.meeting_type === 'online' ? '#6366f1' : '#f59e0b';
        const typeBg = m.meeting_type === 'online' ? 'rgba(99, 102, 241, 0.06)' : 'rgba(245, 158, 11, 0.06)';
        const isPast = new Date(m.meeting_date + 'T' + m.meeting_time) < now;

        const participants = m.participants || [];
        const partHtml = participants.slice(0, 3).map((p, i) => `
            <div style="width: 28px; height: 28px; border-radius: 50%; background: ${avatarColor(p.name || 'U')}; color: white; border: 2.5px solid white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; margin-left: ${i === 0 ? '0' : '-10px'}; z-index: ${10 - i}; box-shadow: 0 2px 5px rgba(0,0,0,0.05);" title="${escapeHTML(p.name || 'User')}">
                ${(p.name || 'U').charAt(0).toUpperCase()}
            </div>
        `).join('') + (participants.length > 3 ? `<div style="width: 28px; height: 28px; border-radius: 50%; background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 800; margin-left: -10px; z-index: 1;">+${participants.length - 3}</div>` : '');

        return `
            <div class="meeting-card-inner reveal" style="background: white; border: 1.5px solid rgba(241, 245, 249, 1); border-radius: 24px; padding: 25px; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 18px; animation-delay: ${index * 80}ms; opacity: ${isPast ? 0.6 : 1};">
                <div style="position: absolute; top: 0; left: 0; width: 5px; height: 100%; background: ${typeColor};"></div>
                
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="display: flex; gap: 14px; align-items: center;">
                        <div style="width: 48px; height: 48px; background: #f8fafc; border-radius: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1.5px solid #f1f5f9;">
                            <span style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">${mDate.toLocaleDateString(undefined, { month: 'short' })}</span>
                            <span style="font-size: 18px; font-weight: 800; color: #1e293b; line-height: 1;">${mDate.getDate()}</span>
                        </div>
                        <div>
                            <div style="font-weight: 800; font-size: 16px; color: #0f172a; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px;">${escapeHTML(m.title)}</div>
                            <span style="background: ${typeBg}; color: ${typeColor}; padding: 4px 10px; border-radius: 8px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; border: 1px solid ${typeColor}20;">${m.meeting_type}</span>
                        </div>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 12px; padding: 15px; background: rgba(248, 250, 252, 0.8); border-radius: 16px; border: 1px solid #f1f5f9;">
                    <div style="display: flex; align-items: center; gap: 10px; font-size: 13px; color: #475569; font-weight: 600;">
                        <i class="fa-regular fa-clock" style="color: #6366f1;"></i>
                        <span>${timeStr}</span>
                        <span style="color: #cbd5e1;">•</span>
                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px;">
                            <i class="fa-solid ${m.meeting_type === 'online' ? 'fa-link' : 'fa-location-dot'}" style="color: ${typeColor}; opacity: 0.7;"></i> ${escapeHTML(m.meeting_link || m.location || 'Location TBD')}
                        </span>
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto;">
                    <div style="display: flex; align-items: center; margin-left: 5px;">
                        ${partHtml}
                    </div>
                    ${m.meeting_type === 'online' && m.meeting_link && !isPast ? `
                        <a href="${m.meeting_link}" target="_blank" class="btn-primary" style="padding: 10px 22px; border-radius: 14px; font-size: 12px; font-weight: 800; text-decoration: none; background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 6px 15px rgba(99, 102, 241, 0.25);">
                            <i class="fa-solid fa-video"></i> Join
                        </a>
                    ` : `
                        <button class="btn-details" onclick='openMeetingDetails(${JSON.stringify(m).replace(/'/g, "&apos;")})' style="background: #f1f5f9; border: none; padding: 10px 20px; border-radius: 14px; font-size: 12px; font-weight: 800; color: #475569; transition: all 0.2s; cursor: pointer;">Details</button>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

function openMeetingDetails(m) {
    if (!m) return;
    openModal('meetingDetailsModal');

    setText('detailMeetingTitle', m.title);
    setText('detailMeetingType', m.meeting_type);
    setText('detailMeetingDesc', m.description || 'No description provided.');

    const mDate = new Date(m.meeting_date);
    const dateStr = mDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = m.meeting_time.substring(0, 5);
    setText('detailMeetingDateTime', `${dateStr} @${timeStr} `);

    const locArea = document.getElementById('detailMeetingLocationArea');
    const locIcon = locArea?.querySelector('i');
    if (m.meeting_type === 'online') {
        if (locIcon) { locIcon.className = 'fa-solid fa-link'; }
        setText('detailMeetingLocation', m.meeting_link || 'Link pending');
        document.getElementById('detailJoinArea').style.display = m.meeting_link ? 'block' : 'none';
        if (m.meeting_link) {
            document.getElementById('detailJoinLink').href = m.meeting_link;
        }
    } else {
        if (locIcon) { locIcon.className = 'fa-solid fa-location-dot'; }
        setText('detailMeetingLocation', m.location || 'Location pending');
        document.getElementById('detailJoinArea').style.display = 'none';
    }

    // Participants
    const partContainer = document.getElementById('detailMeetingParticipants');
    if (partContainer) {
        partContainer.innerHTML = (m.participants || []).map(p => `
            <div style="display: flex; align-items: center; gap: 8px; background: #f8fafc; padding: 6px 12px; border-radius: 50px; border: 1px solid #e2e8f0;">
                <div style="width: 20px; height: 20px; border-radius: 50%; background: ${avatarColor(p.name)}; color: white; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 800;">
                    ${p.name.charAt(0).toUpperCase()}
                </div>
                <span style="font-size: 12px; font-weight: 600; color: #334155;">${escapeHTML(p.name)}</span>
            </div>
            `).join('') || '<p style="font-size:12px; color:#94a3b8; margin:0;">No participants listed.</p>';
    }
}

function openAddMeetingModal() {
    openModal('addMeetingModal');

    const projectSelectContainer = document.getElementById('projectSelectContainer');
    const meetingProjectIdSelect = document.getElementById('meetingProjectId');

    if (currentProjectId) {
        // We are inside a specific project details modal
        if (projectSelectContainer) projectSelectContainer.style.display = 'none';
        loadProjectParticipantsForMeeting(currentProjectId);
    } else {
        // Global dashboard context
        if (projectSelectContainer) {
            projectSelectContainer.style.display = 'flex';
            // Populate project list
            meetingProjectIdSelect.innerHTML = '<option value="">Select a project...</option>' +
                allProjectsData.map(p => `<option value="${p.id}">${escapeHTML(p.title)}</option>`).join('');
        }
        document.getElementById('participantSelect').innerHTML = '<p style="font-size:12px; color:#94a3b8; margin:0;">Select a project first</p>';
    }

    // Set default date to today
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('meetingDate').value = tomorrow.toISOString().split('T')[0];
    document.getElementById('meetingTime').value = "10:00";
}

async function loadProjectParticipantsForMeeting(pid) {
    const projectId = pid || document.getElementById('meetingProjectId').value;
    const container = document.getElementById('participantSelect');
    if (!container) return;

    if (!projectId) {
        container.innerHTML = '<p style="font-size:12px; color:#94a3b8; margin:0;">Select a project first</p>';
        return;
    }

    container.innerHTML = '<p style="font-size:12px; color:#94a3b8; margin:0;">Loading participants...</p>';

    try {
        const members = await apiGet(`/api/projects/${projectId}/members`);
        if (members && members.length) {
            container.innerHTML = members.map(member => `
                <label style="display: flex; align-items: center; gap: 10px; padding: 8px; cursor: pointer; border-radius: 8px; transition: background 0.2s; border-bottom: 1px solid #f8fafc;">
                    <input type="checkbox" name="meetingInvites" value="${member.id}" checked style="width: 16px; height: 16px;">
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-size: 13px; font-weight: 700; color: #334155;">${escapeHTML(member.name)}</span>
                        <span style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">${member.role}</span>
                    </div>
                </label>
            `).join('');
        } else {
            container.innerHTML = '<p style="font-size:12px; color:#94a3b8; margin:0;">No members found for this project</p>';
        }
    } catch (err) {
        container.innerHTML = '<p style="font-size:12px; color:#ef4444; margin:0;">Failed to load members</p>';
    }
}

function toggleMeetingLocation() {
    const type = document.getElementById('meetingType').value;
    document.getElementById('onlineOption').style.display = type === 'online' ? 'block' : 'none';
    document.getElementById('offlineOption').style.display = type === 'offline' ? 'block' : 'none';
}

async function scheduleMeeting(e) {
    if (e) e.preventDefault();
    const btn = document.querySelector('#addMeetingForm button[type="submit"]');
    const originalText = btn.innerText;

    const selectedParticipants = Array.from(document.querySelectorAll('input[name="meetingInvites"]:checked')).map(cb => cb.value);

    if (selectedParticipants.length === 0) {
        return showToast('Please invite at least one participant', 'error');
    }

    const targetProjectId = currentProjectId || document.getElementById('meetingProjectId').value;
    if (!targetProjectId) return showToast('Please select a project', 'error');

    const payload = {
        projectId: targetProjectId,
        title: document.getElementById('meetingTitle').value,
        description: document.getElementById('meetingDesc').value,
        meetingDate: document.getElementById('meetingDate').value,
        meetingTime: document.getElementById('meetingTime').value,
        meetingType: document.getElementById('meetingType').value,
        meetingLink: document.getElementById('meetingLink').value,
        location: document.getElementById('meetingLocation').value,
        participantIds: selectedParticipants
    };

    try {
        btn.disabled = true;
        btn.innerText = 'Scheduling...';

        const res = await apiPost('/api/meetings', payload);
        if (res && res.meetingId) {
            showToast('Meeting scheduled successfully!', 'success');
            closeModal('addMeetingModal');
            document.getElementById('addMeetingForm').reset();

            // Refresh meetings list
            const meetings = await apiGet(`/api/meetings?projectId=${currentProjectId}`);
            renderMeetingsList(meetings);
        }
    } catch (err) {
        showToast(err.message || 'Failed to schedule meeting', 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}


