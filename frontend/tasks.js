// ===== TASKS PAGE LOGIC =====

document.addEventListener('DOMContentLoaded', initTasksPage);

let userTasks = []; // Global store

async function initTasksPage() {
    try {
        const user = handleDashboardAccess('member', true);
        if (!user) return;

        setupNavigation();
        setupTopbar();
        setupSearchListener();

        fetchUserTasks();
    } catch (error) {
        console.error("Tasks Initialization Error:", error);
        showToast("Error loading tasks", "error");
    }
}

function setupSearchListener() {
    const searchInput = document.querySelector('.search');
    if (searchInput) {
        searchInput.addEventListener('input', () => applyTasksView());
    }
}

async function fetchUserTasks() {
    try {
        const user = parseJwt(localStorage.getItem("token"));
        const endpoint = (user && user.role === 'admin')
            ? "/api/tasks"
            : "/api/dashboard/tasks";

        const tasks = await apiGet(endpoint);
        if (!tasks) return;
        userTasks = tasks;

        const container = document.getElementById("tasks-container");
        if (!container) return;
        container.innerHTML = "";

        if (tasks.length === 0) {
            renderEmptyState();
            return;
        }

        // Update Stats with Animation
        animateCounter('count-pending', tasks.filter(t => t.status !== 'completed').length);
        animateCounter('count-completed', tasks.filter(t => t.status === 'completed').length);

        applyTasksView();

    } catch (e) {
        console.error("Fetch Tasks Error:", e);
        showToast("Failed to load tasks", "error");
    }
}

function applyTasksView() {
    const container = document.getElementById("tasks-container");
    if (!container) return;
    container.innerHTML = "";

    if (userTasks.length === 0) {
        renderEmptyState();
        return;
    }

    // 1. Filtering (Status + Search)
    const activeFilterPill = document.querySelector('.filter-pill.active');
    let currentFilter = activeFilterPill ? activeFilterPill.getAttribute('data-filter') : 'all';
    const searchInput = document.querySelector('.search');
    const q = searchInput ? searchInput.value.toLowerCase().trim() : '';

    let filteredTasks = userTasks;
    if (currentFilter !== 'all') {
        filteredTasks = userTasks.filter(t => (t.status || 'pending').toLowerCase() === currentFilter);
    }

    if (q !== '') {
        filteredTasks = filteredTasks.filter(t =>
            (t.title && t.title.toLowerCase().includes(q)) ||
            (t.projectTitle && t.projectTitle.toLowerCase().includes(q)) ||
            (t.description && t.description.toLowerCase().includes(q))
        );
        filteredTasks = sortSearchResults(filteredTasks, q, ['title', 'projectTitle', 'description']);
    }

    // 2. Sorting
    const sortVal = document.getElementById("taskSort").value;
    filteredTasks.sort((a, b) => {
        const pLevels = { 'high': 3, 'medium': 2, 'low': 1, '': 0 };

        if (sortVal === 'deadline_asc' || sortVal === 'deadline_desc') {
            const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
            const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
            return sortVal === 'deadline_asc' ? dateA - dateB : dateB - dateA;
        } else if (sortVal === 'priority_desc') {
            const pA = pLevels[(a.priority || '').toLowerCase()] || 0;
            const pB = pLevels[(b.priority || '').toLowerCase()] || 0;
            return pB - pA;
        } else if (sortVal === 'title_asc') {
            return (a.title || "").localeCompare(b.title || "");
        }
        return 0;
    });

    if (q !== '') {
        filteredTasks = sortSearchResults(filteredTasks, q, ['title', 'projectTitle']);
    }

    // 3. Render
    if (filteredTasks.length === 0) {
        container.innerHTML = `
            <div style="padding: 60px 0; text-align: center; width: 100%; grid-column: 1 / -1; background: rgba(255,255,255,0.4); backdrop-filter: blur(10px); border-radius: 20px; border: 1px dashed rgba(99, 102, 241, 0.3);">
                <p style="color: #64748b; font-size: 15px;">No tasks match the active filter.</p>
            </div>
        `;
        return;
    }

    filteredTasks.forEach((t, index) => {
        const title = t.title || "Untitled Task";
        const projectTitle = t.projectTitle || "No Project";
        const priority = (t.priority || "medium").toLowerCase();
        const status = (t.status || "pending").toLowerCase();
        const deadline = t.deadline ? new Date(t.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No deadline';
        const taskId = t._id || t.id;

        const statusLabels = {
            'pending': 'Pending',
            'in_progress': 'In Progress',
            'review': 'In Review',
            'completed': 'Completed'
        };

        const div = document.createElement('div');
        div.className = `task-item reveal priority-${priority} ${status === 'completed' ? 'completed' : ''}`;
        div.style.animationDelay = `${(index % 10) * 80}ms`;
        div.style.cursor = 'pointer';
        div.onclick = (e) => {
            if (!e.target.closest('.btn-icon-premium')) {
                openTaskDetails(taskId);
            }
        };

        div.innerHTML = `
            <div style="flex: 1; display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <span class="badge-priority ${priority}"><i class="fa-solid fa-bolt" style="font-size: 10px;"></i> ${priority}</span>
                    <div class="badge-status ${status}">
                        <span class="status-dot"></span> ${statusLabels[status] || status}
                    </div>
                </div>
                
                <div style="margin-top: 5px;">
                    <strong style="font-size: 18px; color: var(--text-color); display: block; margin-bottom: 6px; line-height: 1.3;">${title}</strong>
                    <span style="font-size: 13px; color: #64748b;"><i class="fa-regular fa-folder" style="font-size:11px;"></i> ${projectTitle}</span>
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 15px; border-top: 1px dashed rgba(0,0,0,0.1); padding-top: 15px;">
                <div style="font-size: 13px; color: #475569; display: flex; align-items: center; gap: 6px;">
                    <i class="fa-regular fa-calendar" style="color: var(--primary-color);"></i> ${deadline}
                </div>
                <div class="task-actions">
                    <button class="btn-icon-premium" onclick="openTaskDetails('${taskId}')" title="View Task Details">
                        <i class="fa-solid fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

function sortTasks() {
    applyTasksView();
}

function filterTasks(status, buttonElem) {
    document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
    if (buttonElem) buttonElem.classList.add('active');
    applyTasksView();
}

function renderEmptyState() {
    const container = document.getElementById("tasks-container");
    if (!container) return;
    container.innerHTML = `
        <div style="padding: 80px 0; text-align: center; background: rgba(255,255,255,0.4); backdrop-filter: blur(10px); border-radius: 20px; border: 1px dashed rgba(99, 102, 241, 0.3);">
            <div style="margin-bottom: 20px; font-size: 50px; color: #cbd5e1;">
                <i class="fa-solid fa-clipboard-list"></i>
            </div>
            <h3 style="color: #1e293b; margin-bottom: 8px; font-size: 20px;">No tasks yet</h3>
            <p style="color: #64748b; font-size: 15px;">Your productivity hub is completely clear.</p>
        </div>
    `;
    setText('count-pending', 0);
    setText('count-completed', 0);
}

function animateCounter(id, targetValue) {
    const el = document.getElementById(id);
    if (!el) return;
    let current = parseInt(el.innerText) || 0;
    const duration = 1000;
    const start = performance.now();

    function update(timestamp) {
        const elapsed = timestamp - start;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutQuad = t => t * (2 - t);
        const value = Math.floor(current + (targetValue - current) * easeOutQuad(progress));
        el.innerText = value;
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

let currentTaskId = null;

function openTaskDetails(id) {
    const task = userTasks.find(t => (t._id || t.id) == id);
    if (!task) return;

    currentTaskId = id;
    document.getElementById("modalTaskTitle").innerText = task.title;
    document.getElementById("modalTaskDesc").innerText = task.description || "No description provided.";
    document.getElementById("modalTaskProject").innerText = task.projectTitle || "Unknown Project";

    const priorityBadge = document.getElementById("modalTaskPriority");
    if (priorityBadge) {
        priorityBadge.innerText = task.priority;
        priorityBadge.className = `badge ${task.priority ? task.priority.toLowerCase() : 'medium'} `;
        priorityBadge.style.color = 'inherit';
    }

    const deadlineText = task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No Deadline';
    document.getElementById("modalTaskDeadline").innerText = `Due: ${deadlineText} `;
    document.getElementById("modalTaskStatus").value = task.status;

    openModal('taskDetailsModal');
}

async function saveTaskStatus() {
    const newStatus = document.getElementById("modalTaskStatus").value;
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`${API_BASE_URL}/api/tasks/${currentTaskId}/status`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (res.ok) {
            showToast(`Task marked as ${newStatus.replace('_', ' ')}`);
            closeModal('taskDetailsModal');
            fetchUserTasks();
        } else {
            showToast("Failed to update status", "error");
        }
    } catch (e) {
        console.error("Save Task Status Error:", e);
        showToast("Server error", "error");
    }
}
